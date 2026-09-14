import os
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.deps import get_current_user
from ..db import models
from ..db.base import get_db
from ..schemas.remake import MediaAssetOut, RemakeJobOut, RemakeJobRequest
from ..services import runtime_config
from ..services.entitlements import require_feature
from ..services.jobs import jobs
from ..services.musetalk_client import MuseTalkClient, MuseTalkConfig
from ..services.remake_pipeline import RemakeConfig, process_remake

router = APIRouter(
    prefix="/remake",
    tags=["remake"],
    dependencies=[Depends(require_feature("remake"))],
)
ALLOWED = {
    "video": {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"},
    "photo": {".jpg", ".jpeg", ".png", ".webp", ".bmp"},
    "audio": {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".opus"},
}
DEFAULT_EXT = {"video": ".mp4", "photo": ".jpg", "audio": ".mp3"}


def _asset_out(row: models.MediaAsset) -> dict:
    return {
        "id": row.id, "kind": row.kind, "name": row.original_name,
        "contentType": row.content_type, "sizeBytes": int(row.size_bytes or 0),
        "url": (settings.public_base or "") + "/files/" + row.relative_path.replace(os.sep, "/"),
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def _owned(db: Session, asset_id: str, user_id: str) -> models.MediaAsset:
    row = db.get(models.MediaAsset, asset_id)
    if not row or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="Media tidak ditemukan")
    return row


def _path(row: models.MediaAsset) -> str:
    full = os.path.abspath(os.path.join(settings.work_dir, row.relative_path))
    root = os.path.abspath(settings.work_dir) + os.sep
    if not full.startswith(root) or not os.path.isfile(full):
        raise HTTPException(status_code=404, detail="File media tidak ditemukan")
    return full


@router.post("/upload", response_model=MediaAssetOut, status_code=status.HTTP_201_CREATED)
async def upload_media(
    kind: str = Form(...),
    file: UploadFile = File(...),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kind = kind.lower().strip()
    if kind not in ALLOWED:
        raise HTTPException(status_code=400, detail="kind harus video, photo, atau audio")
    original = Path(file.filename or "upload").name
    ext = Path(original).suffix.lower()
    if ext not in ALLOWED[kind]:
        ext = DEFAULT_EXT[kind]
    asset_id = uuid.uuid4().hex
    relative = os.path.join("media", user.id, asset_id + ext)
    destination = os.path.join(settings.work_dir, relative)
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    max_mb = runtime_config.get_int(db, "max_upload_mb", settings.max_upload_mb)
    size = 0
    try:
        with open(destination, "wb") as output:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_mb * 1024 * 1024:
                    raise HTTPException(status_code=413, detail=f"File maksimal {max_mb} MB")
                output.write(chunk)
    except Exception:
        if os.path.isfile(destination):
            os.remove(destination)
        raise
    finally:
        await file.close()
    if size == 0:
        raise HTTPException(status_code=400, detail="File kosong")
    row = models.MediaAsset(
        id=asset_id, user_id=user.id, kind=kind, original_name=original,
        content_type=file.content_type or "application/octet-stream",
        relative_path=relative, size_bytes=size,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _asset_out(row)


@router.get("/assets")
def list_assets(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(models.MediaAsset).filter(models.MediaAsset.user_id == user.id).order_by(models.MediaAsset.created_at.desc()).limit(100).all()
    return {"assets": [_asset_out(row) for row in rows]}


@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(asset_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned(db, asset_id, user.id)
    try:
        os.remove(_path(row))
    except (HTTPException, OSError):
        pass
    db.delete(row)
    db.commit()


@router.get("/musetalk-status")
def musetalk_status(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = MuseTalkConfig(
        runtime_config.get_string(db, "musetalk_worker_url", settings.musetalk_worker_url),
        runtime_config.get_string(db, "musetalk_worker_token", settings.musetalk_worker_token),
        runtime_config.get_int(db, "musetalk_timeout_seconds", settings.musetalk_timeout_seconds),
    )
    try:
        state = MuseTalkClient(config).health()
    except Exception as exc:
        state = {"ready": False, "error": str(exc)}
    return {"engine": "MuseTalk 1.5", **state}


@router.post("/jobs", response_model=RemakeJobOut)
def create_job(
    req: RemakeJobRequest,
    background: BackgroundTasks,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.mode == "lipsync" and not req.consentConfirmed:
        raise HTTPException(status_code=400, detail="Konfirmasi hak wajah dan audio wajib untuk lipsync")
    media = _owned(db, req.mediaId, user.id)
    audio = _owned(db, req.audioId, user.id)
    if media.kind not in {"video", "photo"} or audio.kind != "audio":
        raise HTTPException(status_code=400, detail="Kombinasi media tidak valid")
    worker_url = runtime_config.get_string(db, "musetalk_worker_url", settings.musetalk_worker_url)
    if req.mode == "lipsync" and not worker_url:
        raise HTTPException(status_code=503, detail="MuseTalk worker belum dikonfigurasi")
    worker_token = runtime_config.get_string(db, "musetalk_worker_token", settings.musetalk_worker_token)
    worker_timeout = runtime_config.get_int(db, "musetalk_timeout_seconds", settings.musetalk_timeout_seconds)
    job = "rmk_" + uuid.uuid4().hex[:12]
    initial = {"status": "processing", "progress": 0, "downloadUrl": "", "error": "", "mode": req.mode, "lipsyncApplied": False, "userId": user.id}
    jobs.set(job, initial)
    background.add_task(
        process_remake, job, user.id, _path(media), media.kind, _path(audio), req.mode,
        req.aspectRatio, req.subtitleText, req.subtitleStyle,
        RemakeConfig(settings.work_dir, settings.public_base, worker_url, worker_token, worker_timeout),
    )
    db.add(models.UsageEvent(user_id=user.id, kind="remake_start", amount=1, detail=f"{req.mode}:{job}"))
    db.commit()
    return {"job": job, **initial}


@router.get("/jobs/{job}", response_model=RemakeJobOut)
def get_job(job: str, user: models.User = Depends(get_current_user)):
    current = jobs.get(job)
    if not current or current.get("userId") != user.id:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan")
    return {"job": job, **current}

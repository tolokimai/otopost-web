import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Tuple
from fastapi import UploadFile
from sqlalchemy.orm import Session

from ..core.audit import record_audit
from ..core.config import settings
from ..core.constants import (
    CREDITS_COST_REMAKE_LIPSYNC,
    CREDITS_COST_REMAKE_OVERLAY,
    MAX_MEDIA_AUDIO_SIZE,
    MAX_MEDIA_PHOTO_SIZE,
    MAX_MEDIA_VIDEO_SIZE,
)
from ..core.errors import ForbiddenException, NotFoundException, ValidationException
from ..db import models
from ..repositories.media_repo import MediaRepository
from . import runtime_config
from .jobs import jobs
from .musetalk_client import MuseTalkClient, MuseTalkConfig
from .remake_pipeline import RemakeConfig, process_remake

ALLOWED_EXTENSIONS = {
    "video": {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"},
    "photo": {".jpg", ".jpeg", ".png", ".webp", ".bmp"},
    "audio": {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".opus"},
}
DEFAULT_EXT = {"video": ".mp4", "photo": ".jpg", "audio": ".mp3"}


def asset_to_dict(row: models.MediaAsset) -> Dict[str, Any]:
    return {
        "id": row.id,
        "kind": row.kind,
        "name": row.original_name,
        "contentType": row.content_type,
        "sizeBytes": int(row.size_bytes or 0),
        "url": (settings.public_base or "") + "/files/" + row.relative_path.replace(os.sep, "/"),
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def resolve_asset_path(row: models.MediaAsset) -> str:
    full = os.path.abspath(os.path.join(settings.work_dir, row.relative_path))
    root = os.path.abspath(settings.work_dir) + os.sep
    if not full.startswith(root) or not os.path.isfile(full):
        raise NotFoundException("File media tidak ditemukan di penyimpanan")
    return full


class RemakeService:
    def __init__(self, db: Session):
        self.db = db
        self.media_repo = MediaRepository(db)

    async def save_upload(self, user_id: str, kind: str, file: UploadFile) -> Dict[str, Any]:
        kind_clean = kind.lower().strip()
        if kind_clean not in ALLOWED_EXTENSIONS:
            raise ValidationException("Tipe media harus berupa video, photo, atau audio")

        original = Path(file.filename or "upload").name
        ext = Path(original).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS[kind_clean]:
            ext = DEFAULT_EXT[kind_clean]

        asset_id = uuid.uuid4().hex
        relative = os.path.join("media", user_id, asset_id + ext)
        destination = os.path.join(settings.work_dir, relative)
        os.makedirs(os.path.dirname(destination), exist_ok=True)

        max_mb = runtime_config.get_int(self.db, "max_upload_mb", settings.max_upload_mb)
        max_bytes = max_mb * 1024 * 1024
        size = 0

        try:
            with open(destination, "wb") as output:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > max_bytes:
                        raise ValidationException(f"Ukuran file melebihi batas {max_mb} MB")
                    output.write(chunk)
        except Exception:
            if os.path.isfile(destination):
                os.remove(destination)
            raise
        finally:
            await file.close()

        if size == 0:
            raise ValidationException("File tidak boleh kosong")

        row = models.MediaAsset(
            id=asset_id,
            user_id=user_id,
            kind=kind_clean,
            original_name=original,
            content_type=file.content_type or "application/octet-stream",
            relative_path=relative,
            size_bytes=size,
        )
        self.media_repo.add(row)
        record_audit(self.db, "UPLOAD", "media_asset", actor_id=user_id, resource_id=row.id)
        return asset_to_dict(row)

    def list_assets(self, user_id: str) -> List[Dict[str, Any]]:
        rows = self.media_repo.list_by_user(user_id=user_id, limit=100)
        return [asset_to_dict(r) for r in rows]

    def delete_asset(self, asset_id: str, user_id: str) -> None:
        row = self.media_repo.get_by_user(asset_id, user_id)
        if not row:
            raise NotFoundException("Media tidak ditemukan")

        try:
            path = resolve_asset_path(row)
            if os.path.isfile(path):
                os.remove(path)
        except Exception:
            pass

        self.media_repo.delete(row)
        record_audit(self.db, "DELETE", "media_asset", actor_id=user_id, resource_id=asset_id)

    def get_musetalk_health(self) -> Dict[str, Any]:
        config = MuseTalkConfig(
            runtime_config.get_string(self.db, "musetalk_worker_url", settings.musetalk_worker_url),
            runtime_config.get_string(self.db, "musetalk_worker_token", settings.musetalk_worker_token),
            runtime_config.get_int(self.db, "musetalk_timeout_seconds", settings.musetalk_timeout_seconds),
        )
        try:
            state = MuseTalkClient(config).health()
        except Exception as exc:
            state = {"ready": False, "error": str(exc)}
        return {"engine": "MuseTalk 1.5", **state}

    def start_remake_job(
        self,
        user: models.User,
        media_id: str,
        audio_id: str,
        mode: str,
        aspect_ratio: str,
        subtitle_text: str,
        subtitle_style: str,
        consent_confirmed: bool,
    ) -> Tuple[str, Dict[str, Any], Any]:
        if mode == "lipsync" and not consent_confirmed:
            raise ValidationException("Konfirmasi hak cipta wajah dan audio wajib dicentang untuk mode lipsync")

        media = self.media_repo.get_by_user(media_id, user.id)
        audio = self.media_repo.get_by_user(audio_id, user.id)
        if not media or not audio:
            raise NotFoundException("Media atau audio tidak ditemukan")
        if media.kind not in {"video", "photo"} or audio.kind != "audio":
            raise ValidationException("Kombinasi media dan audio tidak valid")

        worker_url = runtime_config.get_string(self.db, "musetalk_worker_url", settings.musetalk_worker_url)
        if mode == "lipsync" and not worker_url:
            raise ValidationException("MuseTalk worker belum dikonfigurasi di pengaturan admin")

        worker_token = runtime_config.get_string(self.db, "musetalk_worker_token", settings.musetalk_worker_token)
        worker_timeout = runtime_config.get_int(self.db, "musetalk_timeout_seconds", settings.musetalk_timeout_seconds)

        job_id = "rmk_" + uuid.uuid4().hex[:12]
        initial = {
            "status": "processing",
            "progress": 0,
            "downloadUrl": "",
            "error": "",
            "mode": mode,
            "lipsyncApplied": False,
            "userId": user.id,
        }
        jobs.set(job_id, initial)

        remake_cfg = RemakeConfig(settings.work_dir, settings.public_base, worker_url, worker_token, worker_timeout)
        task_args = (
            job_id,
            user.id,
            resolve_asset_path(media),
            media.kind,
            resolve_asset_path(audio),
            mode,
            aspect_ratio,
            subtitle_text,
            subtitle_style,
            remake_cfg,
        )

        cost = CREDITS_COST_REMAKE_LIPSYNC if mode == "lipsync" else CREDITS_COST_REMAKE_OVERLAY
        self.db.add(
            models.UsageEvent(
                user_id=user.id,
                kind="remake_start",
                amount=cost,
                detail=f"{mode}:{job_id}",
            )
        )
        self.db.commit()
        record_audit(self.db, "START_JOB", "remake", actor_id=user.id, resource_id=job_id, detail={"mode": mode})

        return job_id, initial, task_args


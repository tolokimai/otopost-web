from typing import Any, Dict
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from ..core.constants import RATE_LIMIT_UPLOAD_PER_MINUTE
from ..core.deps import get_current_user
from ..core.errors import NotFoundException
from ..core.limiter import rate_limit
from ..core.responses import ApiResponse, success_response
from ..db import models
from ..db.base import get_db
from ..schemas.remake import MediaAssetOut, RemakeJobOut, RemakeJobRequest
from ..services.entitlements import require_feature
from ..services.jobs import jobs
from ..services.remake_pipeline import process_remake
from ..services.remake_service import RemakeService

router = APIRouter(
    prefix="/remake",
    tags=["remake"],
    dependencies=[Depends(require_feature("remake"))],
)


@router.post(
    "/upload",
    response_model=ApiResponse[MediaAssetOut],
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=RATE_LIMIT_UPLOAD_PER_MINUTE, window_seconds=60))],
)
async def upload_media(
    kind: str = Form(...),
    file: UploadFile = File(...),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RemakeService(db)
    data = await service.save_upload(user.id, kind, file)
    return success_response(data=data, message="Media berhasil diunggah")


@router.get("/assets", response_model=ApiResponse[Dict[str, Any]])
def list_assets(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RemakeService(db)
    return success_response(data={"assets": service.list_assets(user.id)})


@router.delete("/assets/{asset_id}", response_model=ApiResponse[None])
def delete_asset(
    asset_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RemakeService(db)
    service.delete_asset(asset_id, user.id)
    return success_response(message="Media berhasil dihapus")


@router.get("/musetalk-status", response_model=ApiResponse[Dict[str, Any]])
def musetalk_status(
    _: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RemakeService(db)
    return success_response(data=service.get_musetalk_health())


@router.post("/jobs", response_model=ApiResponse[RemakeJobOut])
def create_job(
    req: RemakeJobRequest,
    background: BackgroundTasks,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = RemakeService(db)
    job_id, initial, task_args = service.start_remake_job(
        user=user,
        media_id=req.mediaId,
        audio_id=req.audioId,
        mode=req.mode,
        aspect_ratio=req.aspectRatio,
        subtitle_text=req.subtitleText,
        subtitle_style=req.subtitleStyle,
        consent_confirmed=req.consentConfirmed,
    )
    background.add_task(process_remake, *task_args)
    return success_response(data={"job": job_id, **initial}, message="Proses remake dimulai")


@router.get("/jobs/{job}", response_model=ApiResponse[RemakeJobOut])
def get_job(job: str, user: models.User = Depends(get_current_user)):
    current = jobs.get(job)
    if not current or current.get("userId") != user.id:
        raise NotFoundException("Job tidak ditemukan")
    return success_response(data={"job": job, **current})


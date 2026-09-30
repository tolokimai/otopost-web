import re
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from ..core.audit import record_audit
from ..core.config import settings
from ..core.constants import CREDITS_COST_PODCAST_CLIP, RATE_LIMIT_GENERAL_PER_MINUTE
from ..core.deps import require_user_or_open
from ..core.errors import ForbiddenException, NotFoundException, ValidationException
from ..core.limiter import rate_limit
from ..core.responses import ApiResponse, success_response
from ..db import models
from ..db.base import get_db
from ..repositories.user_repo import UserRepository
from ..schemas.clips import ClipsRequest, ClipsResponse
from ..services import clipper, runtime_config
from ..services.entitlements import require_feature
from ..services.jobs import jobs

router = APIRouter(
    tags=["clips"],
    dependencies=[
        Depends(require_feature("podcast")),
        Depends(rate_limit(max_requests=RATE_LIMIT_GENERAL_PER_MINUTE, window_seconds=60)),
    ],
)

_URL_RE = re.compile(r"^https?://", re.IGNORECASE)


def _validate(req: ClipsRequest, db: Session) -> None:
    max_segments = runtime_config.get_int(
        db, "max_segments_per_job", settings.max_segments_per_job
    )
    max_clip_seconds = runtime_config.get_int(
        db, "max_clip_seconds", settings.max_clip_seconds
    )
    if not req.url or not _URL_RE.match(req.url.strip()):
        raise ValidationException("URL video tidak valid")
    if not req.segments:
        raise ValidationException("Tidak ada segmen yang dipilih")
    if len(req.segments) > max_segments:
        raise ValidationException(f"Terlalu banyak segmen (maksimal {max_segments} per proses)")

    for seg in req.segments:
        dur = float(seg.endSec) - float(seg.startSec)
        if dur <= 0:
            raise ValidationException("Segmen tidak valid (durasi <= 0 detik)")
        if dur > max_clip_seconds:
            raise ValidationException(f"Segmen terlalu panjang (maksimal {max_clip_seconds} detik)")


def _consume_credit(db: Session, user: Optional[models.User]) -> None:
    if not settings.require_auth or user is None:
        return
    if (user.plan or "free") != "free":
        return
    if int(user.credits or 0) < CREDITS_COST_PODCAST_CLIP:
        raise ForbiddenException("Kredit tidak mencukupi. Upgrade paket untuk melanjutkan.")

    user.credits = int(user.credits) - CREDITS_COST_PODCAST_CLIP
    repo = UserRepository(db)
    repo.update(user)


def _run_job(job: str, req: ClipsRequest):
    try:
        res = clipper.process_clips(req, job=job)
        jobs.set(job, {"status": "done", "clips": res["clips"], "error": None})
    except Exception as e:
        jobs.set(job, {"status": "error", "clips": [], "error": str(e)})


@router.post("/clips", response_model=ApiResponse[ClipsResponse])
def clips(
    req: ClipsRequest,
    user: Optional[models.User] = Depends(require_user_or_open),
    db: Session = Depends(get_db),
):
    _validate(req, db)
    _consume_credit(db, user)
    result = clipper.process_clips(req)
    if user:
        record_audit(db, "CLIP_SYNC", "podcast", actor_id=user.id, detail={"count": len(result.get("clips", []))})
    return success_response(data=result, message="Klip video berhasil diproses")


@router.post("/clips-async", response_model=ApiResponse[Dict[str, Any]])
def clips_async(
    req: ClipsRequest,
    background: BackgroundTasks,
    user: Optional[models.User] = Depends(require_user_or_open),
    db: Session = Depends(get_db),
):
    _validate(req, db)
    _consume_credit(db, user)
    job = uuid.uuid4().hex[:12]
    jobs.set(
        job,
        {
            "status": "processing",
            "clips": [],
            "error": None,
            "total": len(req.segments),
            "userId": user.id if user else None,
        },
    )
    background.add_task(_run_job, job, req)
    if user:
        record_audit(db, "CLIP_ASYNC", "podcast", actor_id=user.id, resource_id=job, detail={"count": len(req.segments)})
    return success_response(data={"job": job, "status": "processing"}, message="Pemrosesan klip video dimulai di latar belakang")


@router.get("/clips/status/{job}", response_model=ApiResponse[Dict[str, Any]])
def clips_status(job: str):
    st = jobs.get(job)
    if not st:
        raise NotFoundException("Job tidak ditemukan")
    return success_response(data={"job": job, **st})


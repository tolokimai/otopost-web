import re
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.deps import require_user_or_open
from ..db import models
from ..db.base import get_db
from ..schemas.clips import ClipsRequest, ClipsResponse
from ..services import clipper
from ..services.jobs import jobs

router = APIRouter(tags=["clips"])

_URL_RE = re.compile(r"^https?://", re.IGNORECASE)


def _validate(req: ClipsRequest) -> None:
    if not req.url or not _URL_RE.match(req.url.strip()):
        raise HTTPException(status_code=400, detail="URL video tidak valid")
    if not req.segments:
        raise HTTPException(status_code=400, detail="Tidak ada segmen")
    if len(req.segments) > settings.max_segments_per_job:
        raise HTTPException(
            status_code=400,
            detail="Terlalu banyak segmen (maks %d per proses)" % settings.max_segments_per_job,
        )
    for seg in req.segments:
        dur = float(seg.endSec) - float(seg.startSec)
        if dur <= 0:
            raise HTTPException(status_code=400, detail="Segmen tidak valid (durasi <= 0)")
        if dur > settings.max_clip_seconds:
            raise HTTPException(
                status_code=400,
                detail="Segmen terlalu panjang (maks %d detik)" % settings.max_clip_seconds,
            )


def _consume_credit(db: Session, user: Optional[models.User]) -> None:
    """Kurangi 1 kredit per proses potong bila auth wajib & user paket free."""
    if not settings.require_auth or user is None:
        return
    if (user.plan or "free") != "free":
        return
    if int(user.credits or 0) <= 0:
        raise HTTPException(status_code=402, detail="Kredit habis. Upgrade paket untuk lanjut.")
    user.credits = int(user.credits) - 1
    db.add(user)
    db.commit()


def _log_usage(db: Session, user: Optional[models.User], kind: str, amount: int = 1) -> None:
    try:
        db.add(models.UsageEvent(user_id=(user.id if user else None), kind=kind, amount=amount))
        db.commit()
    except Exception:
        db.rollback()


@router.post("/clips", response_model=ClipsResponse)
def clips(
    req: ClipsRequest,
    user: Optional[models.User] = Depends(require_user_or_open),
    db: Session = Depends(get_db),
):
    """Potong sinkron (tunggu sampai selesai). Cocok untuk 1-2 segmen."""
    _validate(req)
    _consume_credit(db, user)
    result = clipper.process_clips(req)
    _log_usage(db, user, "clips", len(result.get("clips", [])))
    return result


@router.post("/clips-async")
def clips_async(
    req: ClipsRequest,
    background: BackgroundTasks,
    user: Optional[models.User] = Depends(require_user_or_open),
    db: Session = Depends(get_db),
):
    """Potong async: balikin job lalu poll /clips/status/{job}. Anti-timeout untuk banyak klip."""
    _validate(req)
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
    _log_usage(db, user, "clips_async", len(req.segments))
    return {"job": job, "status": "processing"}


def _run_job(job: str, req: ClipsRequest):
    try:
        res = clipper.process_clips(req, job=job)
        jobs.set(job, {"status": "done", "clips": res["clips"], "error": None})
    except HTTPException as e:
        jobs.set(job, {"status": "error", "clips": [], "error": str(e.detail)})
    except Exception as e:
        jobs.set(job, {"status": "error", "clips": [], "error": str(e)})


@router.get("/clips/status/{job}")
def clips_status(job: str):
    st = jobs.get(job)
    if not st:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan")
    return {"job": job, **st}

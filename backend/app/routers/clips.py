import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from ..core.security import require_token
from ..schemas.clips import ClipsRequest, ClipsResponse
from ..services import clipper
from ..services.jobs import jobs

router = APIRouter(tags=["clips"])


@router.post("/clips", response_model=ClipsResponse)
def clips(req: ClipsRequest, _: None = Depends(require_token)):
    """Potong sinkron (tunggu sampai selesai). Cocok untuk 1-2 segmen."""
    return clipper.process_clips(req)


@router.post("/clips-async")
def clips_async(req: ClipsRequest, background: BackgroundTasks, _: None = Depends(require_token)):
    """Potong async: balikin job lalu poll /clips/status/{job}. Anti-timeout untuk banyak klip."""
    if not req.segments:
        raise HTTPException(status_code=400, detail="Tidak ada segmen")
    job = uuid.uuid4().hex[:12]
    jobs.set(job, {"status": "processing", "clips": [], "error": None, "total": len(req.segments)})
    background.add_task(_run_job, job, req)
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

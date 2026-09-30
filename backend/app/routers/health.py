from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..core.config import settings
from ..core.responses import success_response
from ..db.base import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
@router.get("/healthz")
@router.get("/api/health")
def health():
    return success_response(
        data={
            "status": "healthy",
            "service": "otopost-api",
            "version": "1.1.0",
            "aiConfigured": bool(settings.gemini_api_key and settings.gemini_api_key != "MY_GEMINI_API_KEY"),
        }
    )


@router.get("/health/ready")
def readiness(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return success_response(
        data={
            "status": "ready" if db_ok else "degraded",
            "database": db_ok,
            "storage": True,
        }
    )


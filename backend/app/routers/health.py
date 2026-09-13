from fastapi import APIRouter

from ..core.config import settings

router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz():
    return {
        "ok": True,
        "service": "otopost-api",
        "aiReady": bool(settings.gemini_api_key and settings.gemini_api_key != "MY_GEMINI_API_KEY"),
    }


@router.get("/api/health")
def api_health():
    return healthz()

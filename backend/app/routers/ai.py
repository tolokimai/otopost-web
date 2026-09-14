from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core import crypto
from ..core.deps import require_user_or_open
from ..db import models
from ..db.base import get_db
from ..schemas.ai import AnalyzeRequest, AnalyzeResponse, HooksRequest, HooksResponse
from ..services import gemini
from ..services.entitlements import require_feature

router = APIRouter(
    prefix="/ai",
    tags=["ai"],
    dependencies=[Depends(require_feature("podcast"))],
)


def _resolve_gemini_key(user: Optional[models.User], db: Session) -> Optional[str]:
    """Pakai API key Gemini milik user (terenkripsi) bila ada; else key server."""
    if not user:
        return None
    row = (
        db.query(models.Credential)
        .filter(models.Credential.user_id == user.id, models.Credential.provider == "gemini")
        .first()
    )
    if not row:
        return None
    return crypto.decrypt_secret(row.encrypted_value) or None


def _log_usage(db: Session, user: Optional[models.User], kind: str, amount: int = 1) -> None:
    try:
        db.add(models.UsageEvent(user_id=(user.id if user else None), kind=kind, amount=amount))
        db.commit()
    except Exception:
        db.rollback()


@router.post("/analyze-transcript", response_model=AnalyzeResponse)
def analyze(
    req: AnalyzeRequest,
    user: Optional[models.User] = Depends(require_user_or_open),
    db: Session = Depends(get_db),
):
    key = _resolve_gemini_key(user, db)
    segments = gemini.analyze_transcript(req, api_key=key)
    _log_usage(db, user, "analyze")
    return {"segments": segments}


@router.post("/hooks-captions", response_model=HooksResponse)
def hooks(
    req: HooksRequest,
    user: Optional[models.User] = Depends(require_user_or_open),
    db: Session = Depends(get_db),
):
    key = _resolve_gemini_key(user, db)
    result = gemini.hooks_captions(req, api_key=key)
    _log_usage(db, user, "hooks")
    return result

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.deps import require_user_or_open
from ..db import models
from ..db.base import get_db
from ..schemas.transcript import TranscriptRequest, TranscriptResponse
from ..services import youtube

router = APIRouter(tags=["transcript"])

_URL_RE = re.compile(r"^https?://", re.IGNORECASE)


@router.post("/transcript", response_model=TranscriptResponse)
def transcript(
    req: TranscriptRequest,
    user: Optional[models.User] = Depends(require_user_or_open),
    db: Session = Depends(get_db),
):
    if not req.url or not _URL_RE.match(req.url.strip()):
        raise HTTPException(status_code=400, detail="URL video tidak valid")
    result = youtube.fetch_transcript(req.url.strip(), req.langs)
    try:
        db.add(models.UsageEvent(user_id=(user.id if user else None), kind="transcript"))
        db.commit()
    except Exception:
        db.rollback()
    return result

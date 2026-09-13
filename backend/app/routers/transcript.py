from fastapi import APIRouter, Depends

from ..core.security import require_token
from ..schemas.transcript import TranscriptRequest, TranscriptResponse
from ..services import youtube

router = APIRouter(tags=["transcript"])


@router.post("/transcript", response_model=TranscriptResponse)
def transcript(req: TranscriptRequest, _: None = Depends(require_token)):
    return youtube.fetch_transcript(req.url, req.langs)

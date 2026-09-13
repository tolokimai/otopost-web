from fastapi import APIRouter, Depends

from ..core.security import require_token
from ..schemas.ai import AnalyzeRequest, AnalyzeResponse, HooksRequest, HooksResponse
from ..services import gemini

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze-transcript", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest, _: None = Depends(require_token)):
    return {"segments": gemini.analyze_transcript(req)}


@router.post("/hooks-captions", response_model=HooksResponse)
def hooks(req: HooksRequest, _: None = Depends(require_token)):
    return gemini.hooks_captions(req)

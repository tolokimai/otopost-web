from typing import List, Optional

from pydantic import BaseModel


class Segment(BaseModel):
    startSec: float
    endSec: float
    title: Optional[str] = None


class ClipsRequest(BaseModel):
    url: str
    segments: List[Segment]
    aspectRatio: Optional[str] = "9:16"
    reframe: Optional[bool] = True
    maxHeight: Optional[int] = 1080
    subtitle: Optional[bool] = False
    subtitleStyle: Optional[str] = "clean"


class ClipResult(BaseModel):
    index: int
    title: str
    startSec: float
    endSec: float
    reframed: bool
    subtitled: bool
    downloadUrl: str


class ClipsResponse(BaseModel):
    job: str
    clips: List[ClipResult]

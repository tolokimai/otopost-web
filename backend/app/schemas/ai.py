from typing import List, Optional

from pydantic import BaseModel


class AnalyzeSeg(BaseModel):
    startSec: float
    text: Optional[str] = ""


class AnalyzeRequest(BaseModel):
    topic: Optional[str] = ""
    transcript: Optional[str] = ""
    segments: Optional[List[AnalyzeSeg]] = None
    maxSegments: Optional[int] = 12


class ViralSegment(BaseModel):
    startSec: int
    endSec: int
    durationFormatted: str
    title: str
    hook: str
    reasonWhyViral: str
    transcriptSnippet: str


class AnalyzeResponse(BaseModel):
    segments: List[ViralSegment]


class HooksRequest(BaseModel):
    topic: str
    style: Optional[str] = "Energetic & Insightful"


class HooksResponse(BaseModel):
    viralHook: str
    caption: str
    hashtags: str
    subtitles: List[str]

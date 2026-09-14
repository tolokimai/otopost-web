from typing import List, Optional

from pydantic import BaseModel, Field


class TranscriptRequest(BaseModel):
    url: str
    langs: Optional[List[str]] = None


class TranscriptSegment(BaseModel):
    startSec: float
    text: str


class TranscriptResponse(BaseModel):
    videoId: Optional[str] = None
    title: Optional[str] = None
    channelName: Optional[str] = None
    durationSec: Optional[int] = None
    hasTranscript: bool = False
    transcriptText: str = ""
    segments: List[TranscriptSegment] = Field(default_factory=list)

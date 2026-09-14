from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class MediaAssetOut(BaseModel):
    id: str
    kind: str
    name: str
    contentType: str
    sizeBytes: int
    url: str
    createdAt: Optional[str] = None


class RemakeJobRequest(BaseModel):
    mediaId: str
    audioId: str
    mode: Literal["overlay", "lipsync"] = "lipsync"
    aspectRatio: str = "9:16"
    subtitleText: str = Field(default="", max_length=3000)
    subtitleStyle: str = "clean"
    consentConfirmed: bool = False

    @field_validator("aspectRatio")
    @classmethod
    def valid_ratio(cls, value: str) -> str:
        if value not in {"9:16", "1:1", "16:9"}:
            raise ValueError("Rasio tidak didukung")
        return value


class RemakeJobOut(BaseModel):
    job: str
    status: str
    mode: str
    progress: int = 0
    downloadUrl: str = ""
    error: str = ""
    lipsyncApplied: bool = False

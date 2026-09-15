from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


CONTENT_STATUSES = {
    "draft", "review", "approved", "in_production", "scheduled", "published", "failed"
}
WORKFLOWS = {"carousel", "podcast", "remake", "self-video", "ai-video"}
PLAN_STATUSES = {"draft", "active", "archived"}


class PersonaBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    brandName: str = Field(default="", max_length=160)
    niche: str = Field(default="", max_length=240)
    audience: str = Field(default="", max_length=2000)
    painPoints: List[str] = Field(default_factory=list, max_length=20)
    aspirations: List[str] = Field(default_factory=list, max_length=20)
    tone: str = Field(default="Profesional, hangat, dan jelas", max_length=240)
    language: str = Field(default="Bahasa Indonesia", max_length=40)
    offers: List[str] = Field(default_factory=list, max_length=20)
    channels: List[str] = Field(default_factory=list, max_length=12)
    differentiators: str = Field(default="", max_length=2000)
    brandStory: str = Field(default="", max_length=4000)
    contentPillars: List[str] = Field(default_factory=list, max_length=12)
    isDefault: bool = False


class PersonaCreate(PersonaBase):
    pass


class PersonaUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    brandName: Optional[str] = Field(default=None, max_length=160)
    niche: Optional[str] = Field(default=None, max_length=240)
    audience: Optional[str] = Field(default=None, max_length=2000)
    painPoints: Optional[List[str]] = Field(default=None, max_length=20)
    aspirations: Optional[List[str]] = Field(default=None, max_length=20)
    tone: Optional[str] = Field(default=None, max_length=240)
    language: Optional[str] = Field(default=None, max_length=40)
    offers: Optional[List[str]] = Field(default=None, max_length=20)
    channels: Optional[List[str]] = Field(default=None, max_length=12)
    differentiators: Optional[str] = Field(default=None, max_length=2000)
    brandStory: Optional[str] = Field(default=None, max_length=4000)
    contentPillars: Optional[List[str]] = Field(default=None, max_length=12)
    isDefault: Optional[bool] = None


class PersonaGenerateRequest(BaseModel):
    brandName: str = Field(min_length=2, max_length=160)
    niche: str = Field(min_length=2, max_length=240)
    offer: str = Field(default="", max_length=1000)
    audienceHint: str = Field(default="", max_length=1000)
    channels: List[str] = Field(default_factory=lambda: ["Instagram", "TikTok"], max_length=12)
    language: str = Field(default="Bahasa Indonesia", max_length=40)


class ContentPlanGenerateRequest(BaseModel):
    personaId: str = Field(min_length=8, max_length=64)
    title: str = Field(default="", max_length=180)
    durationDays: Literal[7, 30] = 7
    startDate: date = Field(default_factory=date.today)
    goal: str = Field(default="Pertumbuhan audiens dan konversi", max_length=240)
    campaign: str = Field(default="", max_length=240)
    channels: List[str] = Field(default_factory=lambda: ["Instagram"], min_length=1, max_length=12)
    workflows: List[str] = Field(default_factory=lambda: ["carousel"], min_length=1, max_length=5)
    postsPerWeek: int = Field(default=5, ge=1, le=14)

    @field_validator("workflows")
    @classmethod
    def valid_workflows(cls, value: List[str]) -> List[str]:
        clean = list(dict.fromkeys(item.strip().lower() for item in value if item.strip()))
        if not clean or any(item not in WORKFLOWS for item in clean):
            raise ValueError("Workflow tidak didukung")
        return clean


class ContentPlanUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=180)
    goal: Optional[str] = Field(default=None, max_length=240)
    campaign: Optional[str] = Field(default=None, max_length=240)
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in PLAN_STATUSES:
            raise ValueError("Status plan tidak didukung")
        return value


class ContentItemCreate(BaseModel):
    planId: Optional[str] = None
    personaId: Optional[str] = None
    scheduledDate: Optional[date] = None
    channel: str = Field(default="Instagram", max_length=40)
    format: str = Field(default="Carousel", max_length=80)
    pillar: str = Field(default="", max_length=160)
    title: str = Field(min_length=2, max_length=220)
    hook: str = Field(default="", max_length=2000)
    angle: str = Field(default="", max_length=2000)
    objective: str = Field(default="Awareness", max_length=160)
    cta: str = Field(default="", max_length=2000)
    brief: str = Field(default="", max_length=6000)
    keywords: List[str] = Field(default_factory=list, max_length=30)
    workflow: str = "carousel"
    status: str = "draft"

    @field_validator("workflow")
    @classmethod
    def valid_workflow(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in WORKFLOWS:
            raise ValueError("Workflow tidak didukung")
        return value

    @field_validator("status")
    @classmethod
    def valid_item_status(cls, value: str) -> str:
        if value not in CONTENT_STATUSES:
            raise ValueError("Status konten tidak didukung")
        return value


class ContentItemUpdate(BaseModel):
    scheduledDate: Optional[date] = None
    clearScheduledDate: bool = False
    channel: Optional[str] = Field(default=None, max_length=40)
    format: Optional[str] = Field(default=None, max_length=80)
    pillar: Optional[str] = Field(default=None, max_length=160)
    title: Optional[str] = Field(default=None, min_length=2, max_length=220)
    hook: Optional[str] = Field(default=None, max_length=2000)
    angle: Optional[str] = Field(default=None, max_length=2000)
    objective: Optional[str] = Field(default=None, max_length=160)
    cta: Optional[str] = Field(default=None, max_length=2000)
    brief: Optional[str] = Field(default=None, max_length=6000)
    keywords: Optional[List[str]] = Field(default=None, max_length=30)
    workflow: Optional[str] = None
    status: Optional[str] = None
    outputUrl: Optional[str] = Field(default=None, max_length=2000)
    lastError: Optional[str] = Field(default=None, max_length=3000)

    @field_validator("workflow")
    @classmethod
    def valid_workflow(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            value = value.strip().lower()
            if value not in WORKFLOWS:
                raise ValueError("Workflow tidak didukung")
        return value

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in CONTENT_STATUSES:
            raise ValueError("Status konten tidak didukung")
        return value


class HandoffRequest(BaseModel):
    workflow: Optional[str] = None

    @field_validator("workflow")
    @classmethod
    def valid_workflow(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            value = value.strip().lower()
            if value not in WORKFLOWS:
                raise ValueError("Workflow tidak didukung")
        return value

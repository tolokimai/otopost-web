import re
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,39}$")


class PlanCreate(BaseModel):
    id: str
    name: str = Field(min_length=1, max_length=80)
    price: int = Field(default=0, ge=0)
    credits: int = Field(default=0, ge=0)
    durationDays: int = Field(default=30, ge=1, le=3650)
    features: List[str] = Field(default_factory=list)
    purchasable: bool = True
    highlight: bool = False
    isActive: bool = True
    sortOrder: int = 0

    @field_validator("id")
    @classmethod
    def valid_id(cls, value: str) -> str:
        value = (value or "").lower().strip()
        if not _SLUG_RE.match(value):
            raise ValueError("ID harus slug 2-40 karakter (a-z, 0-9, strip)")
        return value


class PlanUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    price: Optional[int] = Field(default=None, ge=0)
    credits: Optional[int] = Field(default=None, ge=0)
    durationDays: Optional[int] = Field(default=None, ge=1, le=3650)
    features: Optional[List[str]] = None
    purchasable: Optional[bool] = None
    highlight: Optional[bool] = None
    isActive: Optional[bool] = None
    sortOrder: Optional[int] = None


class SettingUpdate(BaseModel):
    value: str = ""
    clear: bool = False


class MenuCreate(BaseModel):
    id: str
    label: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=600)
    icon: str = Field(default="✨", max_length=32)
    href: str = Field(default="/studio", max_length=255)
    isEnabled: bool = True
    isReady: bool = False
    requiredPlan: str = Field(default="free", max_length=32)
    sortOrder: int = 0

    @field_validator("id")
    @classmethod
    def valid_id(cls, value: str) -> str:
        value = (value or "").lower().strip()
        if not _SLUG_RE.match(value):
            raise ValueError("ID harus slug 2-40 karakter")
        return value

    @field_validator("href")
    @classmethod
    def valid_href(cls, value: str) -> str:
        value = (value or "").strip()
        if not value.startswith("/"):
            raise ValueError("Href harus dimulai dengan /")
        return value


class MenuUpdate(BaseModel):
    label: Optional[str] = Field(default=None, min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=600)
    icon: Optional[str] = Field(default=None, max_length=32)
    href: Optional[str] = Field(default=None, max_length=255)
    isEnabled: Optional[bool] = None
    isReady: Optional[bool] = None
    requiredPlan: Optional[str] = Field(default=None, max_length=32)
    sortOrder: Optional[int] = None

    @field_validator("href")
    @classmethod
    def valid_href(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not value.strip().startswith("/"):
            raise ValueError("Href harus dimulai dengan /")
        return value.strip() if value is not None else value


class UserAdminUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    plan: Optional[str] = Field(default=None, max_length=32)
    credits: Optional[int] = Field(default=None, ge=0)
    planExpiresAt: Optional[datetime] = None
    clearPlanExpiry: bool = False
    isActive: Optional[bool] = None
    isAdmin: Optional[bool] = None

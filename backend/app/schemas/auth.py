import re
from typing import List, Optional

from pydantic import BaseModel, field_validator

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Email tidak valid")
        return v

    @field_validator("password")
    @classmethod
    def _valid_password(cls, v: str) -> str:
        if not v or len(v) < 8:
            raise ValueError("Password minimal 8 karakter")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str = ""
    plan: str = "free"
    credits: int = 0


class TokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    user: UserOut


class CredentialIn(BaseModel):
    provider: str
    value: str = ""


class CredentialOut(BaseModel):
    provider: str
    configured: bool


class ProviderStatus(BaseModel):
    provider: str
    configured: bool


class CredentialsStatus(BaseModel):
    providers: List[ProviderStatus]

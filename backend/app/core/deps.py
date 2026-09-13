from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..db import models
from ..db.base import get_db
from .config import settings
from .tokens import decode_access_token


def _bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None


def get_current_user_optional(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    token = _bearer(authorization)
    if not token:
        return None
    payload = decode_access_token(token, settings.jwt_key)
    if not payload:
        return None
    uid = payload.get("sub")
    if not uid:
        return None
    user = db.get(models.User, uid)
    if not user or not user.is_active:
        return None
    return user


def get_current_user(
    user: Optional[models.User] = Depends(get_current_user_optional),
) -> models.User:
    if not user:
        raise HTTPException(status_code=401, detail="Butuh login")
    return user


def require_user_or_open(
    user: Optional[models.User] = Depends(get_current_user_optional),
) -> Optional[models.User]:
    """Izinkan anonim kecuali REQUIRE_AUTH aktif."""
    if settings.require_auth and not user:
        raise HTTPException(status_code=401, detail="Butuh login untuk memakai fitur ini")
    return user

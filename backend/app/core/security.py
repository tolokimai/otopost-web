from typing import Optional

from fastapi import Header, HTTPException

from .config import settings


def require_token(authorization: Optional[str] = Header(default=None)) -> None:
    """Optional bearer-token guard. Aktif hanya bila CLIP_SERVER_TOKEN diset.

    Saat masuk fase SaaS, dependency ini bisa diganti dengan verifikasi JWT user.
    """
    if not settings.server_token:
        return
    if authorization != f"Bearer {settings.server_token}":
        raise HTTPException(status_code=401, detail="Token tidak valid")

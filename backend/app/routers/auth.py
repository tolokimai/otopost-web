from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core import crypto
from ..core.config import settings
from ..core.deps import get_current_user
from ..core.passwords import hash_password, verify_password
from ..core.tokens import create_access_token
from ..db import models
from ..db.base import get_db
from ..schemas.auth import (
    CredentialIn,
    CredentialOut,
    CredentialsStatus,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from ..services.billing import downgrade_if_expired

router = APIRouter(prefix="/auth", tags=["auth"])

SUPPORTED_PROVIDERS = {"gemini"}


def _user_out(u: models.User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "name": u.name or "",
        "plan": u.plan or "free",
        "credits": int(u.credits or 0),
        "planExpiresAt": u.plan_expires_at.isoformat() if u.plan_expires_at else None,
    }


def _issue_token(u: models.User) -> str:
    return create_access_token(
        u.id, settings.jwt_key, settings.jwt_expire_minutes, {"email": u.email}
    )


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    exists = db.query(models.User).filter(models.User.email == email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")
    user = models.User(
        email=email,
        password_hash=hash_password(req.password),
        name=(req.name or "").strip(),
        credits=settings.free_credits,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"accessToken": _issue_token(user), "tokenType": "bearer", "user": _user_out(user)}


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email = (req.email or "").lower().strip()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Akun nonaktif")
    downgrade_if_expired(db, user)
    return {"accessToken": _issue_token(user), "tokenType": "bearer", "user": _user_out(user)}


@router.get("/me", response_model=UserOut)
def me(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    downgrade_if_expired(db, user)
    return _user_out(user)


@router.get("/credentials", response_model=CredentialsStatus)
def list_credentials(
    user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    rows = db.query(models.Credential).filter(models.Credential.user_id == user.id).all()
    configured = {r.provider for r in rows}
    return {
        "providers": [
            {"provider": p, "configured": p in configured} for p in sorted(SUPPORTED_PROVIDERS)
        ]
    }


@router.put("/credentials", response_model=CredentialOut)
def upsert_credential(
    req: CredentialIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    provider = (req.provider or "").lower().strip()
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail="Provider tidak didukung")
    value = (req.value or "").strip()
    row = (
        db.query(models.Credential)
        .filter(models.Credential.user_id == user.id, models.Credential.provider == provider)
        .first()
    )
    if not value:
        if row:
            db.delete(row)
            db.commit()
        return {"provider": provider, "configured": False}
    enc = crypto.encrypt_secret(value)
    if row:
        row.encrypted_value = enc
    else:
        db.add(models.Credential(user_id=user.id, provider=provider, encrypted_value=enc))
    db.commit()
    return {"provider": provider, "configured": True}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core import crypto
from ..core.config import settings
from ..core.deps import get_current_user
from ..core.passwords import hash_password, verify_password
from ..core.tokens import create_access_token
from ..db import models
from ..db.base import get_db
from ..repositories.user_repo import UserRepository
from ..schemas.auth import (
    CredentialIn,
    CredentialOut,
    CredentialsStatus,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from ..services import runtime_config
from ..services.billing import downgrade_if_expired

router = APIRouter(prefix="/auth", tags=["auth"])
SUPPORTED_PROVIDERS = {"gemini"}


def _user_out(user: models.User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name or "",
        "plan": user.plan or "free",
        "credits": int(user.credits or 0),
        "planExpiresAt": user.plan_expires_at.isoformat() if user.plan_expires_at else None,
        "isAdmin": bool(user.is_admin),
    }


def _issue_token(user: models.User) -> str:
    return create_access_token(
        user.id,
        settings.jwt_key,
        settings.jwt_expire_minutes,
        {"email": user.email},
    )


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    repository = UserRepository(db)
    email = req.email.lower().strip()
    if repository.get_by_email(email):
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")
    user = repository.add(
        models.User(
            email=email,
            password_hash=hash_password(req.password),
            name=(req.name or "").strip(),
            credits=runtime_config.get_int(db, "free_credits", settings.free_credits),
            is_admin=settings.is_admin_email(email),
        )
    )
    return {"accessToken": _issue_token(user), "tokenType": "bearer", "user": _user_out(user)}


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = UserRepository(db).get_by_email(req.email or "")
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
    configured = {row.provider for row in UserRepository(db).list_credentials(user.id)}
    return {
        "providers": [
            {"provider": provider, "configured": provider in configured}
            for provider in sorted(SUPPORTED_PROVIDERS)
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
    repository = UserRepository(db)
    value = (req.value or "").strip()
    if not value:
        repository.delete_credential(user.id, provider)
        return {"provider": provider, "configured": False}
    repository.save_credential(user.id, provider, crypto.encrypt_secret(value))
    return {"provider": provider, "configured": True}

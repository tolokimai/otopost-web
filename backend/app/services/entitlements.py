"""Server-side feature gates backed by StudioMenu and PlanConfig."""
from typing import Callable, Optional

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.deps import get_current_user_optional
from ..db import models
from ..db.base import get_db
from .billing import downgrade_if_expired


def _rank(db: Session, plan_id: str) -> int:
    rows = db.query(models.PlanConfig).order_by(models.PlanConfig.sort_order.asc()).all()
    ranks = {row.id: index for index, row in enumerate(rows)}
    return ranks.get(plan_id or "free", -1)


def require_feature(feature_id: str) -> Callable:
    def dependency(
        user: Optional[models.User] = Depends(get_current_user_optional),
        db: Session = Depends(get_db),
    ) -> models.StudioMenu:
        menu = db.get(models.StudioMenu, feature_id)
        if not menu or not menu.is_enabled:
            raise HTTPException(status_code=404, detail="Fitur sedang dinonaktifkan")
        if not menu.is_ready:
            raise HTTPException(status_code=503, detail="Fitur belum siap digunakan")
        if user and user.is_admin:
            return menu
        required = menu.required_plan or "free"
        if required == "free":
            return menu
        if not user:
            raise HTTPException(status_code=401, detail="Login diperlukan untuk fitur ini")
        downgrade_if_expired(db, user)
        if _rank(db, user.plan or "free") < _rank(db, required):
            raise HTTPException(status_code=402, detail=f"Fitur ini membutuhkan paket {required}")
        return menu

    return dependency

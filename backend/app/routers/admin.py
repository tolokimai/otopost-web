import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.deps import require_admin
from ..db import models
from ..db.base import get_db
from ..schemas.admin import (
    MenuCreate,
    MenuUpdate,
    PlanCreate,
    PlanUpdate,
    SettingUpdate,
    UserAdminUpdate,
)
from ..services import runtime_config
from ..services.plans import get_plan, row_to_plan
from .config import menu_out

router = APIRouter(prefix="/admin", tags=["admin"])


def _plan_out(row: models.PlanConfig) -> dict:
    plan = row_to_plan(row)
    return {
        "id": plan.id,
        "name": plan.name,
        "price": plan.price,
        "credits": plan.credits,
        "durationDays": plan.duration_days,
        "features": plan.features,
        "purchasable": plan.purchasable,
        "highlight": plan.highlight,
        "isActive": plan.is_active,
        "sortOrder": plan.sort_order,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


def _user_out(row: models.User) -> dict:
    return {
        "id": row.id,
        "email": row.email,
        "name": row.name or "",
        "plan": row.plan or "free",
        "credits": int(row.credits or 0),
        "planExpiresAt": row.plan_expires_at.isoformat() if row.plan_expires_at else None,
        "isActive": bool(row.is_active),
        "isAdmin": bool(row.is_admin),
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


def _clean_features(features: list[str]) -> str:
    clean = [str(item).strip() for item in features if str(item).strip()]
    return json.dumps(clean, ensure_ascii=False)


def _clear_other_highlights(db: Session, plan_id: str) -> None:
    rows = db.query(models.PlanConfig).filter(models.PlanConfig.id != plan_id).all()
    for row in rows:
        if row.highlight:
            row.highlight = False
            db.add(row)


@router.get("/overview")
def overview(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(func.count(models.User.id)).scalar() or 0
    active_users = (
        db.query(func.count(models.User.id)).filter(models.User.is_active.is_(True)).scalar() or 0
    )
    paid_users = (
        db.query(func.count(models.User.id)).filter(models.User.plan != "free").scalar() or 0
    )
    orders = db.query(func.count(models.Order.id)).scalar() or 0
    paid_orders = (
        db.query(func.count(models.Order.id)).filter(models.Order.status == "paid").scalar() or 0
    )
    revenue = (
        db.query(func.coalesce(func.sum(models.Order.amount), 0))
        .filter(models.Order.status == "paid")
        .scalar()
        or 0
    )
    return {
        "users": int(users),
        "activeUsers": int(active_users),
        "paidUsers": int(paid_users),
        "orders": int(orders),
        "paidOrders": int(paid_orders),
        "revenue": int(revenue),
        "plans": db.query(func.count(models.PlanConfig.id)).scalar() or 0,
        "menusEnabled": (
            db.query(func.count(models.StudioMenu.id))
            .filter(models.StudioMenu.is_enabled.is_(True))
            .scalar()
            or 0
        ),
    }


@router.get("/plans")
def list_plans(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.PlanConfig)
        .order_by(models.PlanConfig.sort_order.asc(), models.PlanConfig.id.asc())
        .all()
    )
    return {"plans": [_plan_out(row) for row in rows]}


@router.post("/plans", status_code=status.HTTP_201_CREATED)
def create_plan(
    req: PlanCreate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.get(models.PlanConfig, req.id):
        raise HTTPException(status_code=409, detail="ID paket sudah dipakai")
    row = models.PlanConfig(
        id=req.id,
        name=req.name.strip(),
        price=req.price,
        credits=req.credits,
        duration_days=req.durationDays,
        features_json=_clean_features(req.features),
        purchasable=req.purchasable,
        highlight=req.highlight,
        is_active=req.isActive,
        sort_order=req.sortOrder,
    )
    if row.highlight:
        _clear_other_highlights(db, row.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _plan_out(row)


@router.put("/plans/{plan_id}")
def update_plan(
    plan_id: str,
    req: PlanUpdate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.get(models.PlanConfig, plan_id.lower().strip())
    if not row:
        raise HTTPException(status_code=404, detail="Paket tidak ditemukan")
    data = req.model_dump(exclude_unset=True)
    mapping = {
        "durationDays": "duration_days",
        "isActive": "is_active",
        "sortOrder": "sort_order",
    }
    for key, value in data.items():
        if value is None:
            continue
        if key == "features":
            row.features_json = _clean_features(value)
        else:
            setattr(row, mapping.get(key, key), value.strip() if key == "name" else value)
    if data.get("highlight") is True:
        _clear_other_highlights(db, row.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _plan_out(row)


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: str,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    plan_id = plan_id.lower().strip()
    row = db.get(models.PlanConfig, plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Paket tidak ditemukan")
    if plan_id == "free":
        raise HTTPException(status_code=400, detail="Paket free tidak dapat dihapus; nonaktifkan bila perlu")
    user_ref = db.query(models.User.id).filter(models.User.plan == plan_id).first()
    order_ref = db.query(models.Order.id).filter(models.Order.plan == plan_id).first()
    if user_ref or order_ref:
        raise HTTPException(
            status_code=409,
            detail="Paket sudah dipakai user/transaksi; nonaktifkan agar riwayat tetap utuh",
        )
    db.delete(row)
    db.commit()


@router.get("/settings")
def list_settings(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.AppSetting)
        .order_by(models.AppSetting.category.asc(), models.AppSetting.key.asc())
        .all()
    )
    return {"settings": [runtime_config.setting_out(db, row) for row in rows]}


@router.put("/settings/{key}")
def update_setting(
    key: str,
    req: SettingUpdate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.get(models.AppSetting, key)
    if not row:
        raise HTTPException(status_code=404, detail="Setting tidak dikenal")
    try:
        if row.is_secret:
            if req.clear:
                row.value = ""
            elif req.value.strip():
                runtime_config.store_value(row, req.value)
        else:
            runtime_config.store_value(row, req.value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.add(row)
    db.commit()
    db.refresh(row)
    return runtime_config.setting_out(db, row)


@router.get("/menus")
def list_menus(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.StudioMenu)
        .order_by(models.StudioMenu.sort_order.asc(), models.StudioMenu.id.asc())
        .all()
    )
    return {"menus": [menu_out(row) for row in rows]}


@router.post("/menus", status_code=status.HTTP_201_CREATED)
def create_menu(
    req: MenuCreate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.get(models.StudioMenu, req.id):
        raise HTTPException(status_code=409, detail="ID menu sudah dipakai")
    if not get_plan(req.requiredPlan, db):
        raise HTTPException(status_code=400, detail="Paket minimum tidak tersedia")
    row = models.StudioMenu(
        id=req.id,
        label=req.label.strip(),
        description=req.description.strip(),
        icon=req.icon.strip() or "✨",
        href=req.href.strip(),
        is_enabled=req.isEnabled,
        is_ready=req.isReady,
        required_plan=req.requiredPlan.lower().strip(),
        sort_order=req.sortOrder,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return menu_out(row)


@router.put("/menus/{menu_id}")
def update_menu(
    menu_id: str,
    req: MenuUpdate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.get(models.StudioMenu, menu_id.lower().strip())
    if not row:
        raise HTTPException(status_code=404, detail="Menu tidak ditemukan")
    data = req.model_dump(exclude_unset=True)
    if data.get("requiredPlan") and not get_plan(str(data["requiredPlan"]), db):
        raise HTTPException(status_code=400, detail="Paket minimum tidak tersedia")
    mapping = {
        "isEnabled": "is_enabled",
        "isReady": "is_ready",
        "requiredPlan": "required_plan",
        "sortOrder": "sort_order",
    }
    for key, value in data.items():
        if value is not None:
            setattr(row, mapping.get(key, key), value.strip() if isinstance(value, str) else value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return menu_out(row)


@router.delete("/menus/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu(
    menu_id: str,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.get(models.StudioMenu, menu_id.lower().strip())
    if not row:
        raise HTTPException(status_code=404, detail="Menu tidak ditemukan")
    db.delete(row)
    db.commit()


@router.get("/users")
def list_users(
    q: str = "",
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(models.User)
    term = q.strip()
    if term:
        like = f"%{term}%"
        query = query.filter(or_(models.User.email.ilike(like), models.User.name.ilike(like)))
    total = query.count()
    rows = query.order_by(models.User.created_at.desc()).offset(offset).limit(limit).all()
    return {"users": [_user_out(row) for row in rows], "total": total, "offset": offset}


@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    req: UserAdminUpdate,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.get(models.User, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    data = req.model_dump(exclude_unset=True)
    if row.id == admin.id and (data.get("isAdmin") is False or data.get("isActive") is False):
        raise HTTPException(status_code=400, detail="Admin tidak dapat mengunci akun sendiri")
    if settings.is_admin_email(row.email) and data.get("isAdmin") is False:
        raise HTTPException(status_code=400, detail="Admin bootstrap dari ADMIN_EMAILS tidak dapat diturunkan")
    if data.get("plan") is not None:
        plan_id = str(data["plan"]).lower().strip()
        if not get_plan(plan_id, db):
            raise HTTPException(status_code=400, detail="Paket tidak tersedia")
        row.plan = plan_id
        if plan_id == "free" and "planExpiresAt" not in data:
            row.plan_expires_at = None
    if data.get("name") is not None:
        row.name = str(data["name"]).strip()
    if data.get("credits") is not None:
        row.credits = int(data["credits"])
    if data.get("isActive") is not None:
        row.is_active = bool(data["isActive"])
    if data.get("isAdmin") is not None:
        row.is_admin = bool(data["isAdmin"])
    if data.get("clearPlanExpiry"):
        row.plan_expires_at = None
    elif data.get("planExpiresAt") is not None:
        row.plan_expires_at = data["planExpiresAt"]
    db.add(row)
    db.commit()
    db.refresh(row)
    return _user_out(row)

"""Logika billing: membuat order, menerapkan pembayaran, dan mengelola masa berlaku paket."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from ..core.audit import record_audit
from ..db import models
from ..repositories.order_repo import OrderRepository
from ..repositories.user_repo import UserRepository
from .plans import PLAN_DAYS, Plan


def _now() -> datetime:
    return datetime.now(timezone.utc)


def new_order_id() -> str:
    """ID order ringkas & unik; prefiks OTO- agar mudah dikenali di dashboard pembayaran."""
    return "OTO-" + uuid.uuid4().hex[:16].upper()


def create_order(db: Session, user: models.User, plan: Plan, provider: str) -> models.Order:
    repo = OrderRepository(db)
    order = models.Order(
        order_id=new_order_id(),
        user_id=user.id,
        provider=provider,
        plan=plan.id,
        amount=int(plan.price),
        currency="IDR",
        credits_granted=int(plan.credits),
        duration_days=max(1, int(plan.duration_days)),
        status="pending",
    )
    repo.add(order)
    record_audit(
        db,
        action="CREATE_ORDER",
        resource_type="order",
        actor_id=user.id,
        resource_id=order.order_id,
        detail={"plan": plan.id, "amount": plan.price, "provider": provider},
    )
    return order


def apply_paid_order(db: Session, order: models.Order) -> bool:
    """Tandai order lunas lalu upgrade user. Idempoten (aman untuk retry webhook)."""
    if order.status == "paid":
        return False
    order.status = "paid"
    order.paid_at = _now()
    user_repo = UserRepository(db)
    user = user_repo.get(order.user_id)
    if user is not None:
        user.plan = order.plan
        user.credits = int(user.credits or 0) + int(order.credits_granted or 0)
        base = user.plan_expires_at
        if base is not None and base.tzinfo is None:
            base = base.replace(tzinfo=timezone.utc)
        start = base if (base and base > _now()) else _now()
        duration_days = max(1, int(order.duration_days or PLAN_DAYS))
        user.plan_expires_at = start + timedelta(days=duration_days)
        db.add(user)
        db.add(
            models.UsageEvent(
                user_id=user.id,
                kind="purchase",
                amount=int(order.credits_granted or 0),
                detail=f"{order.plan}:{order.order_id}",
            )
        )
    order_repo = OrderRepository(db)
    order_repo.update(order)
    record_audit(
        db,
        action="ORDER_PAID",
        resource_type="order",
        actor_id=order.user_id,
        resource_id=order.order_id,
        detail={"plan": order.plan, "creditsGranted": order.credits_granted},
    )
    return True


def mark_order_status(db: Session, order: models.Order, status: str) -> None:
    """Perbarui status non-lunas. Tidak menimpa order yang sudah paid."""
    if order.status == "paid":
        return
    order.status = status
    order_repo = OrderRepository(db)
    order_repo.update(order)


def downgrade_if_expired(db: Session, user: models.User) -> models.User:
    """Turunkan ke free bila masa berlaku paket berbayar sudah lewat."""
    if (user.plan or "free") != "free" and user.plan_expires_at is not None:
        exp = user.plan_expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now():
            user.plan = "free"
            user.plan_expires_at = None
            user_repo = UserRepository(db)
            user_repo.update(user)
    return user


def get_user_order(db: Session, order_id: str, user_id: str) -> Optional[models.Order]:
    repo = OrderRepository(db)
    order = repo.get_by_order_id(order_id)
    if not order or order.user_id != user_id:
        return None
    return order


def list_user_orders(db: Session, user_id: str, limit: int = 50) -> List[models.Order]:
    repo = OrderRepository(db)
    return repo.list_by_user(user_id, limit=limit)


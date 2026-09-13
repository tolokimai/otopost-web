"""Logika billing: membuat order, menerapkan pembayaran, dan mengelola masa berlaku paket."""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ..db import models
from .plans import PLAN_DAYS, Plan


def _now() -> datetime:
    return datetime.now(timezone.utc)


def new_order_id() -> str:
    """ID order ringkas & unik; prefiks OTO- agar mudah dikenali di dashboard pembayaran."""
    return "OTO-" + uuid.uuid4().hex[:16].upper()


def create_order(db: Session, user: models.User, plan: Plan, provider: str) -> models.Order:
    order = models.Order(
        order_id=new_order_id(),
        user_id=user.id,
        provider=provider,
        plan=plan.id,
        amount=int(plan.price),
        currency="IDR",
        credits_granted=int(plan.credits),
        status="pending",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def apply_paid_order(db: Session, order: models.Order) -> bool:
    """Tandai order lunas lalu upgrade user. Idempoten (aman untuk retry webhook)."""
    if order.status == "paid":
        return False
    order.status = "paid"
    order.paid_at = _now()
    user = db.get(models.User, order.user_id)
    if user is not None:
        user.plan = order.plan
        user.credits = int(user.credits or 0) + int(order.credits_granted or 0)
        base = user.plan_expires_at
        if base is not None and base.tzinfo is None:
            base = base.replace(tzinfo=timezone.utc)
        start = base if (base and base > _now()) else _now()
        user.plan_expires_at = start + timedelta(days=PLAN_DAYS)
        db.add(user)
        db.add(
            models.UsageEvent(
                user_id=user.id,
                kind="purchase",
                amount=int(order.credits_granted or 0),
                detail=f"{order.plan}:{order.order_id}",
            )
        )
    db.add(order)
    db.commit()
    return True


def mark_order_status(db: Session, order: models.Order, status: str) -> None:
    """Perbarui status non-lunas. Tidak menimpa order yang sudah paid."""
    if order.status == "paid":
        return
    order.status = status
    db.add(order)
    db.commit()


def downgrade_if_expired(db: Session, user: models.User) -> models.User:
    """Turunkan ke free bila masa berlaku paket berbayar sudah lewat."""
    if (user.plan or "free") != "free" and user.plan_expires_at is not None:
        exp = user.plan_expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now():
            user.plan = "free"
            user.plan_expires_at = None
            db.add(user)
            db.commit()
            db.refresh(user)
    return user

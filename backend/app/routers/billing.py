from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.deps import get_current_user
from ..db import models
from ..db.base import get_db
from ..schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    OrderOut,
    OrdersResponse,
    PlansResponse,
)
from ..services import billing
from ..services.payments import get_provider
from ..services.payments.midtrans import MidtransProvider
from ..services.plans import get_plan, public_plans

router = APIRouter(prefix="/billing", tags=["billing"])


def _order_out(o: models.Order) -> dict:
    return {
        "orderId": o.order_id,
        "plan": o.plan,
        "amount": int(o.amount or 0),
        "currency": o.currency or "IDR",
        "status": o.status,
        "creditsGranted": int(o.credits_granted or 0),
        "createdAt": o.created_at.isoformat() if o.created_at else None,
        "paidAt": o.paid_at.isoformat() if o.paid_at else None,
    }


def _return_url(request: Request) -> str:
    """URL halaman return frontend. Prioritas: APP_BASE_URL, lalu Origin/Referer."""
    if settings.app_base_url:
        return settings.app_base_url.rstrip("/") + "/billing/return"
    origin = request.headers.get("origin") or ""
    if origin:
        return origin.rstrip("/") + "/billing/return"
    ref = request.headers.get("referer") or ""
    if ref:
        u = urlparse(ref)
        if u.scheme and u.netloc:
            return f"{u.scheme}://{u.netloc}/billing/return"
    return "/billing/return"


@router.get("/plans", response_model=PlansResponse)
def list_plans():
    return {
        "plans": public_plans(),
        "currency": "IDR",
        "provider": (settings.payment_provider or "simulate").lower(),
    }


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    req: CheckoutRequest,
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.billing_enabled:
        raise HTTPException(status_code=503, detail="Billing sedang dinonaktifkan")
    plan = get_plan(req.plan)
    if not plan or not plan.purchasable:
        raise HTTPException(status_code=400, detail="Paket tidak tersedia untuk dibeli")
    provider = get_provider()
    order = billing.create_order(db, user, plan, provider.name)
    try:
        result = provider.create_checkout(order, user, _return_url(request))
    except Exception as e:
        billing.mark_order_status(db, order, "failed")
        raise HTTPException(status_code=502, detail=f"Gagal membuat pembayaran: {e}")
    return {
        "orderId": order.order_id,
        "redirectUrl": result.redirect_url,
        "provider": provider.name,
        "simulate": provider.name == "simulate",
        "token": result.token or "",
    }


@router.post("/webhook/midtrans")
async def midtrans_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    result = MidtransProvider().parse_webhook(body, dict(request.headers))
    if not result.order_id or result.status in ("unknown", "invalid_signature"):
        raise HTTPException(status_code=400, detail="Webhook tidak valid")
    order = db.query(models.Order).filter(models.Order.order_id == result.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    if result.status == "paid":
        billing.apply_paid_order(db, order)
    else:
        billing.mark_order_status(db, order, result.status)
    return {"ok": True, "status": order.status}


@router.post("/simulate/{order_id}/pay", response_model=OrderOut)
def simulate_pay(
    order_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    provider_name = (settings.payment_provider or "simulate").lower()
    if provider_name != "simulate" and not settings.billing_simulate_allow:
        raise HTTPException(status_code=403, detail="Simulasi pembayaran dimatikan")
    order = db.query(models.Order).filter(models.Order.order_id == order_id).first()
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    billing.apply_paid_order(db, order)
    db.refresh(order)
    return _order_out(order)


@router.get("/orders", response_model=OrdersResponse)
def list_orders(
    user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    rows = (
        db.query(models.Order)
        .filter(models.Order.user_id == user.id)
        .order_by(models.Order.created_at.desc())
        .all()
    )
    return {"orders": [_order_out(o) for o in rows]}


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(
    order_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(models.Order).filter(models.Order.order_id == order_id).first()
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    return _order_out(order)

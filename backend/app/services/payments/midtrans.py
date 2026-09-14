"""Integrasi Midtrans Snap (QRIS, e-wallet, VA, kartu)."""
import base64
import hashlib
import json
import urllib.error
import urllib.request
from typing import Dict, Optional

from ...core.config import settings
from ...db import models
from .base import CheckoutResult, PaymentProvider, WebhookResult


def _snap_url(is_production: bool) -> str:
    if is_production:
        return "https://app.midtrans.com/snap/v1/transactions"
    return "https://app.sandbox.midtrans.com/snap/v1/transactions"


class MidtransProvider(PaymentProvider):
    name = "midtrans"

    def __init__(
        self,
        server_key: Optional[str] = None,
        is_production: Optional[bool] = None,
    ) -> None:
        self.server_key = settings.midtrans_server_key if server_key is None else server_key
        self.is_production = (
            settings.midtrans_is_production if is_production is None else is_production
        )

    def create_checkout(
        self, order: models.Order, user: models.User, return_url: str
    ) -> CheckoutResult:
        if not self.server_key:
            raise RuntimeError("MIDTRANS_SERVER_KEY belum diset")
        display_name = (user.name or user.email.split("@")[0])[:50]
        payload = {
            "transaction_details": {
                "order_id": order.order_id,
                "gross_amount": int(order.amount),
            },
            "credit_card": {"secure": True},
            "customer_details": {"email": user.email, "first_name": display_name},
            "item_details": [
                {
                    "id": order.plan,
                    "price": int(order.amount),
                    "quantity": 1,
                    "name": (f"OtoPost {order.plan.title()} ({order.duration_days} hari)")[:50],
                }
            ],
            "callbacks": {"finish": return_url},
        }
        data = json.dumps(payload).encode("utf-8")
        auth = base64.b64encode((self.server_key + ":").encode("utf-8")).decode("ascii")
        req = urllib.request.Request(
            _snap_url(self.is_production),
            data=data,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": "Basic " + auth,
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                out = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "ignore")
            raise RuntimeError(f"Midtrans error {exc.code}: {detail}")
        return CheckoutResult(
            redirect_url=str(out.get("redirect_url") or ""),
            token=str(out.get("token") or ""),
            extra={"token": str(out.get("token") or "")},
        )

    def parse_webhook(self, body: bytes, headers: Dict[str, str]) -> WebhookResult:
        try:
            data = json.loads(body.decode("utf-8"))
        except Exception:
            return WebhookResult(order_id="", status="unknown")
        order_id = str(data.get("order_id") or "")
        status_code = str(data.get("status_code") or "")
        gross_amount = str(data.get("gross_amount") or "")
        signature = str(data.get("signature_key") or "")
        expected = hashlib.sha512(
            (order_id + status_code + gross_amount + self.server_key).encode("utf-8")
        ).hexdigest()
        if not signature or signature != expected:
            return WebhookResult(order_id=order_id, status="invalid_signature", raw=data)
        tx = str(data.get("transaction_status") or "").lower()
        fraud = str(data.get("fraud_status") or "").lower()
        status = "pending"
        if tx == "capture":
            status = "paid" if fraud in ("accept", "") else "pending"
        elif tx == "settlement":
            status = "paid"
        elif tx == "pending":
            status = "pending"
        elif tx in ("deny", "cancel", "failure"):
            status = "failed"
        elif tx == "expire":
            status = "expired"
        return WebhookResult(order_id=order_id, status=status, raw=data)

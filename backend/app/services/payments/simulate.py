"""Provider dummy untuk dev/demo: tidak memanggil gateway apa pun.

Checkout mengarahkan user ke halaman return dengan flag simulate; frontend lalu
memanggil endpoint simulate-pay untuk melunasi order. Berguna agar billing bisa
diuji end-to-end sebelum akun Midtrans/Xendit siap.
"""
from typing import Dict

from ...db import models
from .base import CheckoutResult, PaymentProvider, WebhookResult


class SimulateProvider(PaymentProvider):
    name = "simulate"

    def create_checkout(
        self, order: models.Order, user: models.User, return_url: str
    ) -> CheckoutResult:
        sep = "&" if "?" in return_url else "?"
        url = f"{return_url}{sep}order_id={order.order_id}&simulate=1"
        return CheckoutResult(redirect_url=url, token="", extra={"simulate": "1"})

    def parse_webhook(self, body: bytes, headers: Dict[str, str]) -> WebhookResult:
        return WebhookResult(order_id="", status="unknown")

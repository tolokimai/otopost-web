"""Antarmuka provider pembayaran. Implementasi konkret: midtrans, simulate."""
from dataclasses import dataclass, field
from typing import Dict

from ...db import models


@dataclass
class CheckoutResult:
    redirect_url: str
    token: str = ""
    extra: Dict[str, str] = field(default_factory=dict)


@dataclass
class WebhookResult:
    order_id: str
    status: str  # paid | pending | failed | expired | unknown | invalid_signature
    raw: Dict[str, object] = field(default_factory=dict)


class PaymentProvider:
    """Kontrak minimal untuk sebuah gateway pembayaran."""

    name = "base"

    def create_checkout(
        self, order: models.Order, user: models.User, return_url: str
    ) -> CheckoutResult:
        raise NotImplementedError

    def parse_webhook(self, body: bytes, headers: Dict[str, str]) -> WebhookResult:
        raise NotImplementedError

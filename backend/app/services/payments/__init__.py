"""Factory provider pembayaran. Pilih lewat PAYMENT_PROVIDER (simulate|midtrans)."""
from ...core.config import settings
from .base import CheckoutResult, PaymentProvider, WebhookResult
from .midtrans import MidtransProvider
from .simulate import SimulateProvider


def get_provider() -> PaymentProvider:
    name = (settings.payment_provider or "simulate").lower().strip()
    if name == "midtrans":
        return MidtransProvider()
    return SimulateProvider()


__all__ = [
    "CheckoutResult",
    "PaymentProvider",
    "WebhookResult",
    "MidtransProvider",
    "SimulateProvider",
    "get_provider",
]

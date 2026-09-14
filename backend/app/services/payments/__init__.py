"""Factory provider pembayaran; runtime config dapat diubah dari admin panel."""
from typing import Optional

from sqlalchemy.orm import Session

from ...core.config import settings
from .. import runtime_config
from .base import CheckoutResult, PaymentProvider, WebhookResult
from .midtrans import MidtransProvider
from .simulate import SimulateProvider


def get_provider(db: Optional[Session] = None) -> PaymentProvider:
    if db is None:
        name = (settings.payment_provider or "simulate").lower().strip()
        server_key = settings.midtrans_server_key
        is_production = settings.midtrans_is_production
    else:
        name = runtime_config.get_string(db, "payment_provider", settings.payment_provider)
        name = (name or "simulate").lower().strip()
        server_key = runtime_config.get_string(db, "midtrans_server_key", settings.midtrans_server_key)
        is_production = runtime_config.get_bool(
            db, "midtrans_is_production", settings.midtrans_is_production
        )
    if name == "midtrans":
        return MidtransProvider(server_key=server_key, is_production=is_production)
    return SimulateProvider()


def get_midtrans_provider(db: Session) -> MidtransProvider:
    return MidtransProvider(
        server_key=runtime_config.get_string(
            db, "midtrans_server_key", settings.midtrans_server_key
        ),
        is_production=runtime_config.get_bool(
            db, "midtrans_is_production", settings.midtrans_is_production
        ),
    )


__all__ = [
    "CheckoutResult",
    "PaymentProvider",
    "WebhookResult",
    "MidtransProvider",
    "SimulateProvider",
    "get_provider",
    "get_midtrans_provider",
]

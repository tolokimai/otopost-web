"""Katalog paket langganan OtoPost.

Harga dalam Rupiah (IDR, tanpa desimal). Paket berbayar memberi kredit bulanan
dan (lewat routers/clips.py) tidak memotong kredit saat memproses klip.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(frozen=True)
class Plan:
    id: str
    name: str
    price: int  # IDR per bulan
    credits: int  # kredit yang diberikan saat membeli/upgrade paket
    features: List[str] = field(default_factory=list)
    purchasable: bool = True
    highlight: bool = False


PLANS: Dict[str, Plan] = {
    "free": Plan(
        id="free",
        name="Free",
        price=0,
        credits=30,
        features=["3 video / bulan", "Export 720p", "Watermark"],
        purchasable=False,
    ),
    "creator": Plan(
        id="creator",
        name="Creator",
        price=99000,
        credits=150,
        features=[
            "30 video / bulan",
            "Export 1080p",
            "Tanpa watermark",
            "Semua gaya subtitle",
        ],
        highlight=True,
    ),
    "pro": Plan(
        id="pro",
        name="Pro",
        price=249000,
        credits=1000,
        features=[
            "Video unlimited",
            "Render prioritas",
            "Caption AI penuh",
            "Dukungan cepat",
        ],
    ),
}

PLAN_DAYS = 30  # masa berlaku paket berbayar (hari)


def get_plan(plan_id: str) -> Optional[Plan]:
    return PLANS.get((plan_id or "").lower().strip())


def public_plans() -> List[dict]:
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "credits": p.credits,
            "features": list(p.features),
            "purchasable": p.purchasable,
            "highlight": p.highlight,
        }
        for p in PLANS.values()
    ]

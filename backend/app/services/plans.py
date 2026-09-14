"""DB-backed subscription catalog with safe code defaults.

Defaults are used only before/without seed data. Once plan_configs contains rows,
the database is authoritative so admin edits take effect without redeploying.
"""
import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from ..db import models


@dataclass(frozen=True)
class Plan:
    id: str
    name: str
    price: int
    credits: int
    duration_days: int = 30
    features: List[str] = field(default_factory=list)
    purchasable: bool = True
    highlight: bool = False
    is_active: bool = True
    sort_order: int = 0


DEFAULT_PLANS: Dict[str, Plan] = {
    "free": Plan(
        id="free",
        name="Free",
        price=0,
        credits=30,
        features=["3 video / bulan", "Export 720p", "Watermark"],
        purchasable=False,
        sort_order=10,
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
        sort_order=20,
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
        sort_order=30,
    ),
}

# Compatibility fallback for old orders. New orders snapshot duration_days.
PLAN_DAYS = 30


def _features(raw: str) -> List[str]:
    try:
        value = json.loads(raw or "[]")
        if isinstance(value, list):
            return [str(item) for item in value if str(item).strip()]
    except Exception:
        pass
    return []


def row_to_plan(row: models.PlanConfig) -> Plan:
    return Plan(
        id=row.id,
        name=row.name,
        price=int(row.price or 0),
        credits=int(row.credits or 0),
        duration_days=max(1, int(row.duration_days or 30)),
        features=_features(row.features_json),
        purchasable=bool(row.purchasable),
        highlight=bool(row.highlight),
        is_active=bool(row.is_active),
        sort_order=int(row.sort_order or 0),
    )


def get_plan(plan_id: str, db: Optional[Session] = None) -> Optional[Plan]:
    slug = (plan_id or "").lower().strip()
    if not slug:
        return None
    if db is not None:
        row = db.get(models.PlanConfig, slug)
        if row is not None:
            plan = row_to_plan(row)
            return plan if plan.is_active else None
        if db.query(models.PlanConfig.id).first() is not None:
            return None
    return DEFAULT_PLANS.get(slug)


def public_plans(db: Optional[Session] = None) -> List[dict]:
    if db is not None:
        rows = (
            db.query(models.PlanConfig)
            .filter(models.PlanConfig.is_active.is_(True))
            .order_by(models.PlanConfig.sort_order.asc(), models.PlanConfig.id.asc())
            .all()
        )
        plans = [row_to_plan(row) for row in rows]
        if not plans and db.query(models.PlanConfig.id).first() is None:
            plans = sorted(DEFAULT_PLANS.values(), key=lambda p: (p.sort_order, p.id))
    else:
        plans = sorted(DEFAULT_PLANS.values(), key=lambda p: (p.sort_order, p.id))
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "credits": p.credits,
            "durationDays": p.duration_days,
            "features": list(p.features),
            "purchasable": p.purchasable,
            "highlight": p.highlight,
        }
        for p in plans
    ]

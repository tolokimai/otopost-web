"""Idempotent seed data and owner-admin bootstrap."""
import json

from sqlalchemy.orm import Session

from ..core.config import settings
from ..db import models
from .plans import DEFAULT_PLANS
from .runtime_config import SETTING_SPECS


DEFAULT_MENUS = [
    {
        "id": "podcast",
        "label": "Podcast Clip",
        "description": "Transkrip, deteksi momen viral, potong, reframe, subtitle, dan caption AI.",
        "icon": "✂️",
        "href": "/studio/podcast",
        "is_enabled": True,
        "is_ready": True,
        "required_plan": "free",
        "sort_order": 10,
    },
    {
        "id": "carousel",
        "label": "Carousel",
        "description": "Buat slide edukasi/penjualan, desain visual, dan export siap unggah.",
        "icon": "🖼️",
        "href": "/studio/carousel",
        "is_enabled": True,
        "is_ready": True,
        "required_plan": "free",
        "sort_order": 20,
    },
    {
        "id": "self-video",
        "label": "Video Sendiri",
        "description": "Poles video sendiri dengan hook banner, subtitle, dan format vertikal.",
        "icon": "🎥",
        "href": "/studio/self-video",
        "is_enabled": True,
        "is_ready": False,
        "required_plan": "creator",
        "sort_order": 30,
    },
    {
        "id": "ai-video",
        "label": "Buat Video AI",
        "description": "Generate video dari prompt memakai provider model video AI.",
        "icon": "✨",
        "href": "/studio/ai-video",
        "is_enabled": True,
        "is_ready": False,
        "required_plan": "pro",
        "sort_order": 40,
    },
    {
        "id": "remake",
        "label": "Remake & Lipsync",
        "description": "Gabungkan foto/video dengan audio, overlay subtitle, dan lipsync worker.",
        "icon": "👄",
        "href": "/studio/remake",
        "is_enabled": True,
        "is_ready": True,
        "required_plan": "creator",
        "sort_order": 50,
    },
]


def seed_defaults(db: Session) -> None:
    """Seed only empty catalogs; admin deletes/changes remain authoritative."""
    if db.query(models.PlanConfig.id).first() is None:
        for plan in DEFAULT_PLANS.values():
            db.add(
                models.PlanConfig(
                    id=plan.id,
                    name=plan.name,
                    price=plan.price,
                    credits=plan.credits,
                    duration_days=plan.duration_days,
                    features_json=json.dumps(plan.features, ensure_ascii=False),
                    purchasable=plan.purchasable,
                    highlight=plan.highlight,
                    is_active=plan.is_active,
                    sort_order=plan.sort_order,
                )
            )

    for spec in SETTING_SPECS:
        if db.get(models.AppSetting, spec.key) is None:
            db.add(
                models.AppSetting(
                    key=spec.key,
                    value="" if spec.is_secret else spec.default,
                    value_type=spec.value_type,
                    category=spec.category,
                    label=spec.label,
                    description=spec.description,
                    is_secret=spec.is_secret,
                )
            )

    if db.query(models.StudioMenu.id).first() is None:
        for item in DEFAULT_MENUS:
            db.add(models.StudioMenu(**item))

    admin_emails = settings.admin_email_set
    if admin_emails:
        for user in db.query(models.User).filter(models.User.email.in_(admin_emails)).all():
            user.is_admin = True
            db.add(user)

    db.commit()

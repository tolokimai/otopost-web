from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import models
from ..db.base import get_db

router = APIRouter(prefix="/config", tags=["config"])


def menu_out(row: models.StudioMenu) -> dict:
    return {
        "id": row.id,
        "label": row.label,
        "description": row.description or "",
        "icon": row.icon or "✨",
        "href": row.href,
        "isEnabled": bool(row.is_enabled),
        "isReady": bool(row.is_ready),
        "requiredPlan": row.required_plan or "free",
        "sortOrder": int(row.sort_order or 0),
    }


@router.get("/studio-menus")
def studio_menus(db: Session = Depends(get_db)):
    rows = (
        db.query(models.StudioMenu)
        .filter(models.StudioMenu.is_enabled.is_(True))
        .order_by(models.StudioMenu.sort_order.asc(), models.StudioMenu.id.asc())
        .all()
    )
    return {"menus": [menu_out(row) for row in rows]}

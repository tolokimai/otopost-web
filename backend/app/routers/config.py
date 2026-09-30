from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.responses import ApiResponse, success_response
from ..db import models
from ..db.base import get_db
from ..repositories.menu_repo import MenuRepository

router = APIRouter(prefix="/config", tags=["config"])


def menu_out(row: models.StudioMenu) -> Dict[str, Any]:
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


@router.get("/studio-menus", response_model=ApiResponse[Dict[str, Any]])
def studio_menus(db: Session = Depends(get_db)):
    repo = MenuRepository(db)
    rows = repo.list_enabled()
    return success_response(data={"menus": [menu_out(row) for row in rows]})


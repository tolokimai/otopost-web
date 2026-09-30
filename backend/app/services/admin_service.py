import json
import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..core.audit import record_audit
from ..db import models
from ..repositories.menu_repo import MenuRepository
from ..repositories.order_repo import OrderRepository
from ..repositories.plan_repo import PlanRepository
from ..repositories.setting_repo import SettingRepository
from ..repositories.user_repo import UserRepository
from .runtime_config import setting_out, store_value


@dataclass(frozen=True)
class UserPage:
    items: List[Dict[str, Any]]
    total: int
    page: int
    limit: int
    total_pages: int


class AdminService:
    def __init__(self, db: Session):
        self.db = db
        self.menus = MenuRepository(db)
        self.orders = OrderRepository(db)
        self.plans = PlanRepository(db)
        self.settings = SettingRepository(db)
        self.users = UserRepository(db)

    def get_overview(self) -> Dict[str, int]:
        return {
            "users": self.users.count_total(),
            "activeUsers": self.users.count_active(),
            "paidUsers": self.users.count_paid(),
            "orders": self.orders.count_total(),
            "paidOrders": self.orders.count_paid(),
            "revenue": self.orders.sum_revenue(),
            "plans": self.plans.count_total(),
            "menusEnabled": self.menus.count_enabled(),
        }

    def list_plans(self) -> List[Dict[str, Any]]:
        return [self._plan_out(row) for row in self.plans.list_all()]

    def create_plan(self, data: Dict[str, Any], actor_id: str) -> Dict[str, Any]:
        plan_id = data["id"]
        if self.plans.get(plan_id):
            raise HTTPException(status_code=409, detail="Paket sudah ada")
        if data.get("highlight"):
            self.plans.clear_highlights_except(plan_id)

        row = models.PlanConfig(
            id=plan_id,
            name=data["name"],
            price=data.get("price", 0),
            credits=data.get("credits", 0),
            duration_days=data.get("durationDays", 30),
            features_json=json.dumps(data.get("features", []), ensure_ascii=False),
            purchasable=data.get("purchasable", True),
            highlight=data.get("highlight", False),
            is_active=data.get("isActive", True),
            sort_order=data.get("sortOrder", 0),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        record_audit(self.db, "CREATE", "plan", actor_id, plan_id, detail={"name": row.name})
        return self._plan_out(row)

    def update_plan(
        self, plan_id: str, data: Dict[str, Any], actor_id: str
    ) -> Dict[str, Any]:
        row = self.plans.get(plan_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Paket tidak ditemukan")
        if data.get("highlight") is True:
            self.plans.clear_highlights_except(plan_id)

        fields = {
            "name": "name",
            "price": "price",
            "credits": "credits",
            "durationDays": "duration_days",
            "purchasable": "purchasable",
            "highlight": "highlight",
            "isActive": "is_active",
            "sortOrder": "sort_order",
        }
        for source, target in fields.items():
            if source in data:
                setattr(row, target, data[source])
        if "features" in data:
            row.features_json = json.dumps(data["features"] or [], ensure_ascii=False)

        self.db.commit()
        self.db.refresh(row)
        record_audit(self.db, "UPDATE", "plan", actor_id, plan_id, detail={"fields": list(data)})
        return self._plan_out(row)

    def delete_plan(self, plan_id: str, actor_id: str) -> None:
        row = self.plans.get(plan_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Paket tidak ditemukan")
        self.db.delete(row)
        self.db.commit()
        record_audit(self.db, "DELETE", "plan", actor_id, plan_id)

    def list_settings(self) -> List[Dict[str, Any]]:
        return [setting_out(self.db, row) for row in self.settings.list_all()]

    def update_setting(
        self, key: str, value: str, clear: bool, actor_id: str
    ) -> Dict[str, Any]:
        row = self.settings.get_by_key(key)
        if row is None:
            raise HTTPException(status_code=404, detail="Pengaturan tidak ditemukan")
        try:
            store_value(row, "" if clear else value)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        record_audit(
            self.db,
            "UPDATE",
            "setting",
            actor_id,
            key,
            detail={"key": key, "cleared": clear},
        )
        return setting_out(self.db, row)

    def list_menus(self) -> List[Dict[str, Any]]:
        return [self._menu_out(row) for row in self.menus.list_all()]

    def create_menu(self, data: Dict[str, Any], actor_id: str) -> Dict[str, Any]:
        menu_id = data["id"]
        if self.menus.get(menu_id):
            raise HTTPException(status_code=409, detail="Menu sudah ada")
        row = models.StudioMenu(
            id=menu_id,
            label=data["label"],
            description=data.get("description", ""),
            icon=data.get("icon", "✨"),
            href=data.get("href", "/studio"),
            is_enabled=data.get("isEnabled", True),
            is_ready=data.get("isReady", False),
            required_plan=data.get("requiredPlan", "free"),
            sort_order=data.get("sortOrder", 0),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        record_audit(self.db, "CREATE", "studio_menu", actor_id, menu_id)
        return self._menu_out(row)

    def update_menu(
        self, menu_id: str, data: Dict[str, Any], actor_id: str
    ) -> Dict[str, Any]:
        row = self.menus.get(menu_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Menu tidak ditemukan")
        fields = {
            "label": "label",
            "description": "description",
            "icon": "icon",
            "href": "href",
            "isEnabled": "is_enabled",
            "isReady": "is_ready",
            "requiredPlan": "required_plan",
            "sortOrder": "sort_order",
        }
        for source, target in fields.items():
            if source in data:
                setattr(row, target, data[source])
        self.db.commit()
        self.db.refresh(row)
        record_audit(self.db, "UPDATE", "studio_menu", actor_id, menu_id, detail={"fields": list(data)})
        return self._menu_out(row)

    def delete_menu(self, menu_id: str, actor_id: str) -> None:
        row = self.menus.get(menu_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Menu tidak ditemukan")
        self.db.delete(row)
        self.db.commit()
        record_audit(self.db, "DELETE", "studio_menu", actor_id, menu_id)

    def list_users(self, page: int, limit: int, search: str = "") -> UserPage:
        rows, total = self.users.list_paginated(
            search=search,
            limit=limit,
            offset=(page - 1) * limit,
        )
        return UserPage(
            items=[self._user_out(row) for row in rows],
            total=total,
            page=page,
            limit=limit,
            total_pages=math.ceil(total / limit) if total else 0,
        )

    def update_user(
        self, user_id: str, data: Dict[str, Any], actor: models.User
    ) -> Dict[str, Any]:
        row = self.users.get(user_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
        if actor.id == user_id and (
            data.get("isActive") is False or data.get("isAdmin") is False
        ):
            raise HTTPException(status_code=409, detail="Tidak dapat menonaktifkan atau menurunkan role akun sendiri")

        fields = {
            "name": "name",
            "plan": "plan",
            "credits": "credits",
            "isActive": "is_active",
            "isAdmin": "is_admin",
        }
        for source, target in fields.items():
            if source in data:
                setattr(row, target, data[source])
        if data.get("clearPlanExpiry"):
            row.plan_expires_at = None
        elif "planExpiresAt" in data:
            row.plan_expires_at = data["planExpiresAt"]

        self.db.commit()
        self.db.refresh(row)
        record_audit(self.db, "UPDATE", "user", actor.id, user_id, detail={"fields": list(data)})
        return self._user_out(row)

    @staticmethod
    def _plan_out(row: models.PlanConfig) -> Dict[str, Any]:
        try:
            features = json.loads(row.features_json or "[]")
        except (TypeError, ValueError):
            features = []
        if not isinstance(features, list):
            features = []
        return {
            "id": row.id,
            "name": row.name,
            "price": int(row.price or 0),
            "credits": int(row.credits or 0),
            "durationDays": int(row.duration_days or 30),
            "features": features,
            "purchasable": bool(row.purchasable),
            "highlight": bool(row.highlight),
            "isActive": bool(row.is_active),
            "sortOrder": int(row.sort_order or 0),
        }

    @staticmethod
    def _menu_out(row: models.StudioMenu) -> Dict[str, Any]:
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

    @staticmethod
    def _user_out(row: models.User) -> Dict[str, Any]:
        return {
            "id": row.id,
            "email": row.email,
            "name": row.name,
            "plan": row.plan,
            "credits": int(row.credits or 0),
            "planExpiresAt": row.plan_expires_at.isoformat() if row.plan_expires_at else None,
            "isActive": bool(row.is_active),
            "isAdmin": bool(row.is_admin),
            "createdAt": row.created_at.isoformat() if row.created_at else None,
        }

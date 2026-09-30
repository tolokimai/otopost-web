from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..db import models
from .base import BaseRepository


class ContentPlanRepository(BaseRepository[models.ContentPlan]):
    def __init__(self, db: Session):
        super().__init__(models.ContentPlan, db)

    def list_for_user(
        self,
        user_id: str,
        persona_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[models.ContentPlan]:
        query = self.db.query(models.ContentPlan).filter(models.ContentPlan.user_id == user_id)
        if persona_id:
            query = query.filter(models.ContentPlan.persona_id == persona_id)
        if status:
            query = query.filter(models.ContentPlan.status == status.upper())
        return query.order_by(
            models.ContentPlan.day_number.asc(), models.ContentPlan.created_at.asc()
        ).all()

    def get_for_user(self, plan_id: str, user_id: str) -> Optional[models.ContentPlan]:
        return (
            self.db.query(models.ContentPlan)
            .filter(
                models.ContentPlan.id == plan_id,
                models.ContentPlan.user_id == user_id,
            )
            .first()
        )

    def create_for_user(self, user_id: str, data: Dict[str, Any]) -> models.ContentPlan:
        plan = models.ContentPlan(user_id=user_id, **data)
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan

    def create_many_for_user(
        self, user_id: str, persona_id: str, items: List[Dict[str, Any]]
    ) -> List[models.ContentPlan]:
        plans = [
            models.ContentPlan(user_id=user_id, persona_id=persona_id, **item)
            for item in items
        ]
        try:
            self.db.add_all(plans)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return plans

    def update_for_user(
        self, plan_id: str, user_id: str, data: Dict[str, Any]
    ) -> Optional[models.ContentPlan]:
        plan = self.get_for_user(plan_id, user_id)
        if plan is None:
            return None
        for field in (
            "day_number",
            "scheduled_date",
            "topic",
            "hook",
            "outline",
            "format",
            "status",
            "caption",
            "hashtags",
        ):
            if field in data and data[field] is not None:
                setattr(plan, field, data[field])
        self.db.commit()
        self.db.refresh(plan)
        return plan

    def delete_for_user(self, plan_id: str, user_id: str) -> bool:
        plan = self.get_for_user(plan_id, user_id)
        if plan is None:
            return False
        self.db.delete(plan)
        self.db.commit()
        return True
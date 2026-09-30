from typing import List, Optional
from sqlalchemy.orm import Session
from ..db import models
from .base import BaseRepository


class PlanRepository(BaseRepository[models.PlanConfig]):
    def __init__(self, db: Session):
        super().__init__(models.PlanConfig, db)

    def list_active(self) -> List[models.PlanConfig]:
        return (
            self.db.query(models.PlanConfig)
            .filter(models.PlanConfig.is_active == True)
            .order_by(models.PlanConfig.sort_order.asc(), models.PlanConfig.price.asc())
            .all()
        )

    def list_all(self) -> List[models.PlanConfig]:
        return (
            self.db.query(models.PlanConfig)
            .order_by(models.PlanConfig.sort_order.asc(), models.PlanConfig.price.asc())
            .all()
        )

    def clear_highlights_except(self, plan_id: str) -> None:
        rows = (
            self.db.query(models.PlanConfig)
            .filter(models.PlanConfig.id != plan_id, models.PlanConfig.highlight == True)
            .all()
        )
        for r in rows:
            r.highlight = False
            self.db.add(r)
        self.db.commit()

    def count_total(self) -> int:
        return self.db.query(models.PlanConfig).count()


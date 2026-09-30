from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import models
from .base import BaseRepository


class OrderRepository(BaseRepository[models.Order]):
    def __init__(self, db: Session):
        super().__init__(models.Order, db)

    def get_by_order_id(self, order_id: str) -> Optional[models.Order]:
        return (
            self.db.query(models.Order)
            .filter(models.Order.order_id == order_id)
            .first()
        )

    def list_by_user(self, user_id: str, limit: int = 50) -> List[models.Order]:
        return (
            self.db.query(models.Order)
            .filter(models.Order.user_id == user_id)
            .order_by(models.Order.created_at.desc())
            .limit(limit)
            .all()
        )

    def count_total(self) -> int:
        return self.db.query(models.Order).count()

    def count_paid(self) -> int:
        return self.db.query(models.Order).filter(models.Order.status == "paid").count()

    def sum_revenue(self) -> int:
        result = (
            self.db.query(func.coalesce(func.sum(models.Order.amount), 0))
            .filter(models.Order.status == "paid")
            .scalar()
        )
        return int(result or 0)

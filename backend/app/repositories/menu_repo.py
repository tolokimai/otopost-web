from typing import List

from sqlalchemy.orm import Session

from ..db import models
from .base import BaseRepository


class MenuRepository(BaseRepository[models.StudioMenu]):
    def __init__(self, db: Session):
        super().__init__(models.StudioMenu, db)

    def list_enabled(self) -> List[models.StudioMenu]:
        return (
            self.db.query(models.StudioMenu)
            .filter(models.StudioMenu.is_enabled.is_(True))
            .order_by(models.StudioMenu.sort_order.asc())
            .all()
        )

    def list_all(self) -> List[models.StudioMenu]:
        return (
            self.db.query(models.StudioMenu)
            .order_by(models.StudioMenu.sort_order.asc())
            .all()
        )

    def count_enabled(self) -> int:
        return (
            self.db.query(models.StudioMenu)
            .filter(models.StudioMenu.is_enabled.is_(True))
            .count()
        )

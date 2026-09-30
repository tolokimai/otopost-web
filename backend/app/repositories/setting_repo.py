from typing import List, Optional
from sqlalchemy.orm import Session
from ..db import models
from .base import BaseRepository


class SettingRepository(BaseRepository[models.AppSetting]):
    def __init__(self, db: Session):
        super().__init__(models.AppSetting, db)

    def get_by_key(self, key: str) -> Optional[models.AppSetting]:
        return self.db.get(models.AppSetting, key.lower().strip())

    def list_all(self) -> List[models.AppSetting]:
        return (
            self.db.query(models.AppSetting)
            .order_by(models.AppSetting.category.asc(), models.AppSetting.key.asc())
            .all()
        )


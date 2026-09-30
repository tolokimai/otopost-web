from typing import List, Optional

from sqlalchemy.orm import Session

from ..db import models
from .base import BaseRepository


class MediaRepository(BaseRepository[models.MediaAsset]):
    def __init__(self, db: Session):
        super().__init__(models.MediaAsset, db)

    def get_by_user(self, asset_id: str, user_id: str) -> Optional[models.MediaAsset]:
        return (
            self.db.query(models.MediaAsset)
            .filter(
                models.MediaAsset.id == asset_id,
                models.MediaAsset.user_id == user_id,
            )
            .first()
        )

    def list_by_user(self, user_id: str, limit: int = 100) -> List[models.MediaAsset]:
        return (
            self.db.query(models.MediaAsset)
            .filter(models.MediaAsset.user_id == user_id)
            .order_by(models.MediaAsset.created_at.desc())
            .limit(limit)
            .all()
        )

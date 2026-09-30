from typing import List
from sqlalchemy.orm import Session
from ..db import models
from .base import BaseRepository


class AuditRepository(BaseRepository[models.AuditLog]):
    def __init__(self, db: Session):
        super().__init__(models.AuditLog, db)

    def list_recent(self, limit: int = 50) -> List[models.AuditLog]:
        return (
            self.db.query(models.AuditLog)
            .order_by(models.AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )


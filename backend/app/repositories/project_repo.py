from typing import List, Optional

from sqlalchemy.orm import Session

from ..db import models
from .base import BaseRepository


class ProjectRepository(BaseRepository[models.StudioProject]):
    def __init__(self, db: Session):
        super().__init__(models.StudioProject, db)

    def get_by_user(self, project_id: str, user_id: str) -> Optional[models.StudioProject]:
        return (
            self.db.query(models.StudioProject)
            .filter(
                models.StudioProject.id == project_id,
                models.StudioProject.user_id == user_id,
            )
            .first()
        )

    def list_by_user(
        self, user_id: str, kind: str = "carousel", limit: int = 50
    ) -> List[models.StudioProject]:
        return (
            self.db.query(models.StudioProject)
            .filter(
                models.StudioProject.user_id == user_id,
                models.StudioProject.kind == kind,
            )
            .order_by(models.StudioProject.updated_at.desc())
            .limit(limit)
            .all()
        )

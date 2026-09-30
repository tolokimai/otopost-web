from typing import List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..db import models
from .base import BaseRepository


class UserRepository(BaseRepository[models.User]):
    def __init__(self, db: Session):
        super().__init__(models.User, db)

    def get_by_email(self, email: str) -> Optional[models.User]:
        return (
            self.db.query(models.User)
            .filter(models.User.email == email.lower().strip())
            .first()
        )

    def list_paginated(
        self, search: str = "", limit: int = 25, offset: int = 0
    ) -> Tuple[List[models.User], int]:
        query = self.db.query(models.User)
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(models.User.email.ilike(like), models.User.name.ilike(like))
            )
        total = query.count()
        rows = (
            query.order_by(models.User.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return rows, total

    def count_total(self) -> int:
        return self.db.query(models.User).count()

    def count_active(self) -> int:
        return self.db.query(models.User).filter(models.User.is_active.is_(True)).count()

    def count_paid(self) -> int:
        return self.db.query(models.User).filter(models.User.plan != "free").count()

    def get_credentials(self, user_id: str) -> List[models.Credential]:
        return (
            self.db.query(models.Credential)
            .filter(models.Credential.user_id == user_id)
            .all()
        )

    def get_credential(self, user_id: str, provider: str) -> Optional[models.Credential]:
        return (
            self.db.query(models.Credential)
            .filter(
                models.Credential.user_id == user_id,
                models.Credential.provider == provider,
            )
            .first()
        )

    def upsert_credential(
        self, user_id: str, provider: str, encrypted_value: str
    ) -> models.Credential:
        credential = self.get_credential(user_id, provider)
        if credential is None:
            credential = models.Credential(
                user_id=user_id, provider=provider, encrypted_value=encrypted_value
            )
            self.db.add(credential)
        else:
            credential.encrypted_value = encrypted_value
        self.db.commit()
        self.db.refresh(credential)
        return credential

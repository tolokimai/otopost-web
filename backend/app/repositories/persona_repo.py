from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..db import models
from .base import BaseRepository


class PersonaRepository(BaseRepository[models.Persona]):
    def __init__(self, db: Session):
        super().__init__(models.Persona, db)

    def list_for_user(self, user_id: str) -> List[models.Persona]:
        return (
            self.db.query(models.Persona)
            .filter(models.Persona.user_id == user_id)
            .order_by(models.Persona.is_default.desc(), models.Persona.created_at.desc())
            .all()
        )

    def get_for_user(self, persona_id: str, user_id: str) -> Optional[models.Persona]:
        return (
            self.db.query(models.Persona)
            .filter(
                models.Persona.id == persona_id,
                models.Persona.user_id == user_id,
            )
            .first()
        )

    def create_for_user(self, user_id: str, data: Dict[str, Any]) -> models.Persona:
        try:
            if data.get("is_default"):
                self.db.query(models.Persona).filter(
                    models.Persona.user_id == user_id
                ).update({models.Persona.is_default: False}, synchronize_session=False)
            persona = models.Persona(user_id=user_id, **data)
            self.db.add(persona)
            self.db.commit()
            self.db.refresh(persona)
            return persona
        except Exception:
            self.db.rollback()
            raise

    def update_for_user(
        self, persona_id: str, user_id: str, data: Dict[str, Any]
    ) -> Optional[models.Persona]:
        persona = self.get_for_user(persona_id, user_id)
        if persona is None:
            return None
        try:
            if data.get("is_default") is True:
                self.db.query(models.Persona).filter(
                    models.Persona.user_id == user_id,
                    models.Persona.id != persona_id,
                ).update({models.Persona.is_default: False}, synchronize_session=False)
            for field in (
                "name",
                "niche",
                "tone_of_voice",
                "target_audience",
                "signature_hook",
                "dos",
                "donts",
                "is_default",
            ):
                if field in data and data[field] is not None:
                    setattr(persona, field, data[field])
            self.db.commit()
            self.db.refresh(persona)
            return persona
        except Exception:
            self.db.rollback()
            raise

    def delete_for_user(self, persona_id: str, user_id: str) -> bool:
        persona = self.get_for_user(persona_id, user_id)
        if persona is None:
            return False
        self.db.delete(persona)
        self.db.commit()
        return True

    def set_default_for_user(self, persona_id: str, user_id: str) -> bool:
        personas = self.list_for_user(user_id)
        if not any(persona.id == persona_id for persona in personas):
            return False
        try:
            for persona in personas:
                persona.is_default = persona.id == persona_id
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return True
from typing import Optional

from sqlalchemy.orm import Session

from ..core import crypto
from ..db import models


def credential_value(db: Session, user: Optional[models.User], provider: str) -> Optional[str]:
    if user is None:
        return None
    row = (
        db.query(models.Credential)
        .filter(
            models.Credential.user_id == user.id,
            models.Credential.provider == provider.lower().strip(),
        )
        .first()
    )
    if row is None:
        return None
    return crypto.decrypt_secret(row.encrypted_value) or None

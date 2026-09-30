import json
import logging
from typing import Any, Optional
from sqlalchemy.orm import Session
from ..db import models

logger = logging.getLogger("otopost.audit")

SENSITIVE_KEYS = {"password", "token", "secret", "authorization", "cookie", "access_token", "key"}


def mask_sensitive(data: Any) -> Any:
    """Recursively mask sensitive values from audit payload."""
    if isinstance(data, dict):
        masked = {}
        for k, v in data.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                masked[k] = "***MASKED***"
            else:
                masked[k] = mask_sensitive(v)
        return masked
    elif isinstance(data, list):
        return [mask_sensitive(item) for item in data]
    return data


def record_audit(
    db: Session,
    action: str,
    resource_type: str,
    actor_id: Optional[str] = None,
    resource_id: Optional[str] = None,
    result: str = "SUCCESS",
    ip_address: Optional[str] = None,
    detail: Optional[dict] = None,
) -> None:
    """Record an audit log entry safely to database and structured log."""
    clean_detail = mask_sensitive(detail or {})
    detail_str = json.dumps(clean_detail, ensure_ascii=False)
    try:
        log_entry = models.AuditLog(
            actor_id=actor_id,
            action=action.upper(),
            resource_type=resource_type.lower(),
            resource_id=str(resource_id) if resource_id else None,
            result=result.upper(),
            ip_address=ip_address,
            detail_json=detail_str,
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to record audit log to DB: {e}", exc_info=True)
        db.rollback()

    logger.info(
        f"AUDIT: actor={actor_id} action={action} resource={resource_type}:{resource_id} result={result}"
    )


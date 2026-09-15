from datetime import date, datetime, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..core.deps import get_current_user
from ..db import content_models as cm
from ..db import models
from ..db.base import get_db
from ..schemas.content_engine import ContentItemCreate, ContentItemUpdate, HandoffRequest
from ..services import content_engine
from ..services.billing import downgrade_if_expired
from ..services.entitlements import require_feature

router = APIRouter(prefix="/content-library", tags=["content-library"], dependencies=[Depends(require_feature("content-library"))])


def _owned_item(db: Session, user_id: str, item_id: str) -> cm.ContentItem:
    row = db.get(cm.ContentItem, item_id)
    if not row or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="Konten tidak ditemukan")
    return row


def _owned_optional(db: Session, model, user_id: str, row_id: str | None):
    if not row_id:
        return None
    row = db.get(model, row_id)
    if not row or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="Referensi tidak ditemukan")
    return row


def _feature_access(db: Session, user: models.User, feature_id: str) -> models.StudioMenu:
    menu = db.get(models.StudioMenu, feature_id)
    if not menu or not menu.is_enabled:
        raise HTTPException(status_code=404, detail="Workflow sedang dinonaktifkan admin")
    if not menu.is_ready:
        raise HTTPException(status_code=503, detail="Workflow belum siap digunakan")
    if user.is_admin or (menu.required_plan or "free") == "free":
        return menu
    downgrade_if_expired(db, user)
    rows = db.query(models.PlanConfig).order_by(models.PlanConfig.sort_order.asc()).all()
    ranks = {row.id: index for index, row in enumerate(rows)}
    if ranks.get(user.plan or "free", -1) < ranks.get(menu.required_plan or "free", -1):
        raise HTTPException(status_code=402, detail=f"Workflow membutuhkan paket {menu.required_plan}")
    return menu


@router.get("")
def list_items(item_status: str = Query(default="", alias="status"), workflow: str = "", plan_id: str = Query(default="", alias="planId"), scheduled_from: date | None = Query(default=None, alias="scheduledFrom"), scheduled_to: date | None = Query(default=None, alias="scheduledTo"), limit: int = Query(default=100, ge=1, le=200), offset: int = Query(default=0, ge=0), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(cm.ContentItem).filter(cm.ContentItem.user_id == user.id)
    if item_status:
        query = query.filter(cm.ContentItem.status == item_status)
    if workflow:
        query = query.filter(cm.ContentItem.workflow == workflow)
    if plan_id:
        query = query.filter(cm.ContentItem.plan_id == plan_id)
    if scheduled_from:
        query = query.filter(cm.ContentItem.scheduled_date >= scheduled_from)
    if scheduled_to:
        query = query.filter(cm.ContentItem.scheduled_date <= scheduled_to)
    total = query.count()
    rows = query.order_by(cm.ContentItem.scheduled_date.asc(), cm.ContentItem.updated_at.desc()).offset(offset).limit(limit).all()
    return {"items": [content_engine.item_out(row) for row in rows], "total": total, "offset": offset}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_item(req: ContentItemCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = _owned_optional(db, cm.ContentPlan, user.id, req.planId)
    persona = _owned_optional(db, cm.Persona, user.id, req.personaId)
    persona_id = persona.id if persona else (plan.persona_id if plan else None)
    row = cm.ContentItem(user_id=user.id, plan_id=plan.id if plan else None, persona_id=persona_id, scheduled_date=req.scheduledDate, channel=req.channel.strip(), format=req.format.strip(), pillar=req.pillar.strip(), title=req.title.strip(), hook=req.hook.strip(), angle=req.angle.strip(), objective=req.objective.strip(), cta=req.cta.strip(), brief=req.brief.strip(), keywords_json=content_engine.dump_list(req.keywords), workflow=req.workflow, status=req.status)
    db.add(row)
    db.commit()
    db.refresh(row)
    return content_engine.item_out(row)


@router.get("/{item_id}")
def get_item(item_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return content_engine.item_out(_owned_item(db, user.id, item_id))


@router.put("/{item_id}")
def update_item(item_id: str, req: ContentItemUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_item(db, user.id, item_id)
    data = req.model_dump(exclude_unset=True)
    if data.pop("clearScheduledDate", False):
        row.scheduled_date = None
    mapping = {"scheduledDate": "scheduled_date", "outputUrl": "output_url", "lastError": "last_error"}
    for key, value in data.items():
        if value is None:
            continue
        if key == "keywords":
            row.keywords_json = content_engine.dump_list(value)
            continue
        attr = mapping.get(key, key)
        setattr(row, attr, value.strip() if isinstance(value, str) else value)
    if row.status == "scheduled" and not row.scheduled_date:
        raise HTTPException(status_code=400, detail="Konten scheduled wajib punya tanggal")
    if row.status == "published" and not row.published_at:
        row.published_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    return content_engine.item_out(row)


@router.post("/{item_id}/duplicate", status_code=status.HTTP_201_CREATED)
def duplicate_item(item_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    source = _owned_item(db, user.id, item_id)
    row = cm.ContentItem(user_id=user.id, plan_id=source.plan_id, persona_id=source.persona_id, scheduled_date=source.scheduled_date, channel=source.channel, format=source.format, pillar=source.pillar, title=f"{source.title} (salinan)"[:220], hook=source.hook, angle=source.angle, objective=source.objective, cta=source.cta, brief=source.brief, keywords_json=source.keywords_json, workflow=source.workflow, status="draft")
    db.add(row)
    db.commit()
    db.refresh(row)
    return content_engine.item_out(row)


@router.post("/{item_id}/handoff")
def handoff_item(item_id: str, req: HandoffRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_item(db, user.id, item_id)
    if row.status != "approved":
        raise HTTPException(status_code=409, detail="Konten harus berstatus approved sebelum dikirim ke Studio")
    workflow = req.workflow or row.workflow
    menu = _feature_access(db, user, workflow)
    persona = db.get(cm.Persona, row.persona_id) if row.persona_id else None
    params = {"contentItem": row.id, "title": row.title, "topic": row.title, "hook": row.hook, "brief": row.brief, "cta": row.cta, "audience": persona.audience if persona and persona.user_id == user.id else ""}
    target_url = menu.href + ("&" if "?" in menu.href else "?") + urlencode(params)
    row.workflow = workflow
    row.status = "in_production"
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"item": content_engine.item_out(row), "targetUrl": target_url, "workflow": workflow, "prefill": params}


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_item(db, user.id, item_id)
    db.delete(row)
    db.commit()

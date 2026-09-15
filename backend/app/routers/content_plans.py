import json
import math

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.deps import get_current_user
from ..db import content_models as cm
from ..db import models
from ..db.base import get_db
from ..schemas.content_engine import ContentPlanGenerateRequest, ContentPlanUpdate
from ..services import content_engine, gemini
from ..services.entitlements import require_feature
from ..services.user_credentials import credential_value

router = APIRouter(prefix="/content-plans", tags=["content-plans"], dependencies=[Depends(require_feature("content-plan"))])


def _owned_plan(db: Session, user_id: str, plan_id: str) -> cm.ContentPlan:
    row = db.get(cm.ContentPlan, plan_id)
    if not row or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="Content plan tidak ditemukan")
    return row


def _owned_persona(db: Session, user_id: str, persona_id: str) -> cm.Persona:
    row = db.get(cm.Persona, persona_id)
    if not row or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="Persona tidak ditemukan")
    return row


@router.get("")
def list_plans(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(cm.ContentPlan).filter(cm.ContentPlan.user_id == user.id).order_by(cm.ContentPlan.updated_at.desc()).limit(100).all()
    counts = dict(db.query(cm.ContentItem.plan_id, func.count(cm.ContentItem.id)).filter(cm.ContentItem.user_id == user.id, cm.ContentItem.plan_id.is_not(None)).group_by(cm.ContentItem.plan_id).all())
    return {"plans": [content_engine.plan_out(row, int(counts.get(row.id, 0))) for row in rows]}


@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_plan(req: ContentPlanGenerateRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    persona = _owned_persona(db, user.id, req.personaId)
    if not user.is_admin and int(user.credits or 0) < 1:
        raise HTTPException(status_code=402, detail="Kredit habis. Upgrade paket untuk membuat content plan AI.")
    target_count = max(1, min(60, math.ceil(req.durationDays / 7 * req.postsPerWeek)))
    persona_data = content_engine.persona_out(persona)
    prompt = (
        "Kamu adalah Head of Content dan growth strategist. Buat kalender konten yang konkret, beragam, tidak repetitif, dapat diproduksi, dan menghubungkan awareness ke conversion. Jangan mengarang testimoni, angka, atau klaim hasil.\n\n"
        f"PERSONA:\n{json.dumps(persona_data, ensure_ascii=False)}\n\nDurasi: {req.durationDays} hari mulai {req.startDate.isoformat()}\nTarget jumlah konten: tepat {target_count}\nTujuan: {req.goal}\nCampaign/offer: {req.campaign or '(evergreen)'}\nChannel: {', '.join(req.channels)}\nWorkflow yang boleh dipakai: {', '.join(req.workflows)}\n\n"
        "Sebarkan dayOffset dari 0 sampai durasi-1. Setiap ide harus punya hook spesifik, angle, CTA, brief produksi, dan workflow yang persis berasal dari daftar. Balas HANYA JSON object valid tanpa markdown:\n"
        '{"strategy":{"positioning":"...","contentMix":["..."],"conversionPath":"...","notes":"..."},"items":[{"dayOffset":0,"channel":"Instagram","format":"Carousel","pillar":"...","title":"...","hook":"...","angle":"...","objective":"Awareness|Engagement|Lead|Sale","cta":"...","brief":"...","keywords":["..."],"workflow":"carousel"}]}'
    )
    raw = gemini.generate(prompt, api_key=credential_value(db, user, "gemini"))
    try:
        strategy, generated = content_engine.parse_plan_ai(raw, req.startDate, req.durationDays, target_count, req.channels, req.workflows)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    title = req.title.strip() or f"{persona.brand_name or persona.name} · {req.durationDays} Hari"
    plan = cm.ContentPlan(user_id=user.id, persona_id=persona.id, title=title, goal=req.goal.strip(), campaign=req.campaign.strip(), duration_days=req.durationDays, start_date=req.startDate, status="active", strategy_json=json.dumps(strategy, ensure_ascii=False))
    db.add(plan)
    db.flush()
    items = []
    for data in generated:
        row = cm.ContentItem(user_id=user.id, plan_id=plan.id, persona_id=persona.id, scheduled_date=data["scheduledDate"], channel=data["channel"], format=data["format"], pillar=data["pillar"], title=data["title"], hook=data["hook"], angle=data["angle"], objective=data["objective"], cta=data["cta"], brief=data["brief"], keywords_json=content_engine.dump_list(data["keywords"]), workflow=data["workflow"], status="draft", sort_order=data["sortOrder"])
        db.add(row)
        items.append(row)
    if not user.is_admin:
        user.credits = max(0, int(user.credits or 0) - 1)
        db.add(user)
    db.add(models.UsageEvent(user_id=user.id, kind="content_plan_generate", amount=len(items), detail=json.dumps({"plan": plan.id, "days": req.durationDays}, ensure_ascii=False)))
    db.commit()
    db.refresh(plan)
    for item in items:
        db.refresh(item)
    return {"plan": content_engine.plan_out(plan, len(items)), "items": [content_engine.item_out(item) for item in items], "creditsRemaining": int(user.credits or 0)}


@router.get("/{plan_id}")
def get_plan(plan_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = _owned_plan(db, user.id, plan_id)
    items = db.query(cm.ContentItem).filter(cm.ContentItem.user_id == user.id, cm.ContentItem.plan_id == plan.id).order_by(cm.ContentItem.scheduled_date.asc(), cm.ContentItem.sort_order.asc()).all()
    return {"plan": content_engine.plan_out(plan, len(items)), "items": [content_engine.item_out(item) for item in items]}


@router.put("/{plan_id}")
def update_plan(plan_id: str, req: ContentPlanUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_plan(db, user.id, plan_id)
    data = req.model_dump(exclude_unset=True)
    for key in ("title", "goal", "campaign", "status"):
        if key in data and data[key] is not None:
            value = data[key]
            setattr(row, key, value.strip() if isinstance(value, str) else value)
    db.add(row)
    db.commit()
    db.refresh(row)
    count = db.query(func.count(cm.ContentItem.id)).filter(cm.ContentItem.plan_id == row.id).scalar() or 0
    return content_engine.plan_out(row, int(count))


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned_plan(db, user.id, plan_id)
    db.query(cm.ContentItem).filter(cm.ContentItem.user_id == user.id, cm.ContentItem.plan_id == row.id).update({cm.ContentItem.plan_id: None}, synchronize_session=False)
    db.delete(row)
    db.commit()

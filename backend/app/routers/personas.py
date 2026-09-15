import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.deps import get_current_user
from ..db import content_models as cm
from ..db import models
from ..db.base import get_db
from ..schemas.content_engine import PersonaCreate, PersonaGenerateRequest, PersonaUpdate
from ..services import content_engine, gemini
from ..services.entitlements import require_feature
from ..services.user_credentials import credential_value

router = APIRouter(prefix="/personas", tags=["personas"], dependencies=[Depends(require_feature("persona"))])


def _owned(db: Session, user_id: str, persona_id: str) -> cm.Persona:
    row = db.get(cm.Persona, persona_id)
    if not row or row.user_id != user_id:
        raise HTTPException(status_code=404, detail="Persona tidak ditemukan")
    return row


def _clear_defaults(db: Session, user_id: str, except_id: str | None = None) -> None:
    rows = db.query(cm.Persona).filter(cm.Persona.user_id == user_id).all()
    for row in rows:
        if row.id != except_id and row.is_default:
            row.is_default = False
            db.add(row)


def _apply(row: cm.Persona, data: dict) -> None:
    scalar_map = {"name": "name", "brandName": "brand_name", "niche": "niche", "audience": "audience", "tone": "tone", "language": "language", "differentiators": "differentiators", "brandStory": "brand_story", "isDefault": "is_default"}
    list_map = {"painPoints": "pain_points_json", "aspirations": "aspirations_json", "offers": "offers_json", "channels": "channels_json", "contentPillars": "content_pillars_json"}
    for key, attr in scalar_map.items():
        if key in data and data[key] is not None:
            value = data[key]
            setattr(row, attr, value.strip() if isinstance(value, str) else value)
    for key, attr in list_map.items():
        if key in data and data[key] is not None:
            setattr(row, attr, content_engine.dump_list(data[key]))


@router.get("")
def list_personas(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(cm.Persona).filter(cm.Persona.user_id == user.id).order_by(cm.Persona.is_default.desc(), cm.Persona.updated_at.desc()).limit(100).all()
    return {"personas": [content_engine.persona_out(row) for row in rows]}


@router.post("/generate")
def generate_persona(req: PersonaGenerateRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.is_admin and int(user.credits or 0) < 1:
        raise HTTPException(status_code=402, detail="Kredit habis. Upgrade paket untuk memakai generator AI.")
    prompt = (
        "Kamu adalah senior brand strategist untuk bisnis digital Indonesia. Susun brand persona yang spesifik, dapat dipakai untuk produksi konten dan penjualan, tanpa mengarang angka/klaim pasar.\n\n"
        f"Brand: {req.brandName}\nNiche: {req.niche}\nOffer: {req.offer or '(belum ditentukan)'}\nPetunjuk audiens: {req.audienceHint or '(belum ditentukan)'}\nChannel: {', '.join(req.channels)}\nBahasa: {req.language}\n\n"
        "Balas HANYA JSON object valid tanpa markdown dengan struktur: "
        '{"name":"Nama persona","brandName":"...","niche":"...","audience":"profil audiens rinci","painPoints":["..."],"aspirations":["..."],"tone":"...","language":"...","offers":["..."],"channels":["..."],"differentiators":"...","brandStory":"...","contentPillars":["minimal 5 pilar"]}'
    )
    raw = gemini.generate(prompt, api_key=credential_value(db, user, "gemini"))
    try:
        draft = content_engine.parse_persona_ai(raw, req.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    if not user.is_admin:
        user.credits = max(0, int(user.credits or 0) - 1)
        db.add(user)
    db.add(models.UsageEvent(user_id=user.id, kind="persona_generate", amount=1, detail=json.dumps({"brand": req.brandName, "niche": req.niche}, ensure_ascii=False)))
    db.commit()
    return {"persona": draft, "creditsRemaining": int(user.credits or 0)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_persona(req: PersonaCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    first = db.query(cm.Persona.id).filter(cm.Persona.user_id == user.id).first() is None
    row = cm.Persona(user_id=user.id, name=req.name.strip(), is_default=req.isDefault or first)
    _apply(row, req.model_dump())
    if first:
        row.is_default = True
    if row.is_default:
        _clear_defaults(db, user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return content_engine.persona_out(row)


@router.get("/{persona_id}")
def get_persona(persona_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return content_engine.persona_out(_owned(db, user.id, persona_id))


@router.put("/{persona_id}")
def update_persona(persona_id: str, req: PersonaUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned(db, user.id, persona_id)
    data = req.model_dump(exclude_unset=True)
    if data.get("isDefault") is True:
        _clear_defaults(db, user.id, row.id)
    _apply(row, data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return content_engine.persona_out(row)


@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_persona(persona_id: str, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = _owned(db, user.id, persona_id)
    was_default = bool(row.is_default)
    db.query(cm.ContentPlan).filter(cm.ContentPlan.user_id == user.id, cm.ContentPlan.persona_id == row.id).update({cm.ContentPlan.persona_id: None}, synchronize_session=False)
    db.query(cm.ContentItem).filter(cm.ContentItem.user_id == user.id, cm.ContentItem.persona_id == row.id).update({cm.ContentItem.persona_id: None}, synchronize_session=False)
    db.delete(row)
    db.flush()
    if was_default:
        replacement = db.query(cm.Persona).filter(cm.Persona.user_id == user.id).order_by(cm.Persona.updated_at.desc()).first()
        if replacement:
            replacement.is_default = True
            db.add(replacement)
    db.commit()

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from ..db.base import get_db
from ..db.models import User
from ..core.deps import get_current_user
from ..repositories.persona_repo import PersonaRepository
from ..services.gemini import generate, _strip_fence

router = APIRouter(prefix="/api/personas", tags=["personas"])


class PersonaCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    niche: str = ""
    tone_of_voice: str = Field(default="", alias="toneOfVoice")
    target_audience: str = Field(default="", alias="targetAudience")
    signature_hook: str = Field(default="", alias="signatureHook")
    dos: str = ""
    donts: str = ""
    is_default: bool = Field(default=False, alias="isDefault")


class PersonaUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    niche: Optional[str] = None
    tone_of_voice: Optional[str] = Field(default=None, alias="toneOfVoice")
    target_audience: Optional[str] = Field(default=None, alias="targetAudience")
    signature_hook: Optional[str] = Field(default=None, alias="signatureHook")
    dos: Optional[str] = None
    donts: Optional[str] = None
    is_default: Optional[bool] = Field(default=None, alias="isDefault")


class PersonaGenerateRequest(BaseModel):
    niche: str
    name: str
    target_audience: str = ""


@router.get("")
def list_personas(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    personas = PersonaRepository(db).list_for_user(user.id)

    return {
        "personas": [
            {
                "id": p.id,
                "name": p.name,
                "niche": p.niche,
                "toneOfVoice": p.tone_of_voice,
                "targetAudience": p.target_audience,
                "signatureHook": p.signature_hook,
                "dos": p.dos,
                "donts": p.donts,
                "isDefault": p.is_default,
                "createdAt": p.created_at.isoformat() if p.created_at else None,
            }
            for p in personas
        ]
    }


@router.post("")
def create_persona(
    req: PersonaCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    persona = PersonaRepository(db).create_for_user(user.id, req.model_dump())
    return {"ok": True, "id": persona.id}


@router.put("/{persona_id}")
def update_persona(
    persona_id: str,
    req: PersonaUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    persona = PersonaRepository(db).update_for_user(
        persona_id,
        user.id,
        req.model_dump(exclude_unset=True),
    )
    if not persona:
        raise HTTPException(status_code=404, detail="Persona tidak ditemukan")
    return {"ok": True}


@router.delete("/{persona_id}")
def delete_persona(
    persona_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = PersonaRepository(db).delete_for_user(persona_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Persona tidak ditemukan")
    return {"ok": True}


@router.post("/{persona_id}/set-default")
def set_default_persona(
    persona_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = PersonaRepository(db).set_default_for_user(persona_id, user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Persona tidak ditemukan")
    return {"ok": True}


@router.post("/generate")
def generate_persona(
    req: PersonaGenerateRequest,
    user: User = Depends(get_current_user),
):
    prompt = f"""Kamu adalah pakar branding dan media sosial kelas dunia.
Berdasarkan data berikut:
- Niche/Industri: {req.niche}
- Nama Brand/Kreator: {req.name}
- Target Audiens Awal: {req.target_audience or 'Generasi muda, profesional, pengguna aktif sosmed'}

Buat persona brand/kreator yang unik dan komprehensif dalam format JSON murni:
{{
  "toneOfVoice": "Gaya bicara detail, contoh: Santai, edukatif, berbobot, to-the-point dengan analogi praktis",
  "targetAudience": "Profil audiens spesifik (rentang usia 20-35 tahun, masalah utama, minat)",
  "signatureHook": "Gaya hook pembuka khas 3 detik pertama (contoh: '90% orang salah saat...', 'Stop scroll kalau kamu mau...')",
  "dos": "3-5 hal yang WAJIB dilakukan saat menyampaikan konten (pisahkan dengan baris baru)",
  "donts": "3-5 hal yang DILARANG dilakukan dalam konten (pisahkan dengan baris baru)"
}}
Hanya kembalikan objek JSON yang valid tanpa teks pembuka atau penutup."""

    try:
        raw = generate(prompt)
        clean = _strip_fence(raw)
        data = json.loads(clean)
        return {
            "ok": True,
            "persona": {
                "name": req.name,
                "niche": req.niche,
                "toneOfVoice": data.get("toneOfVoice", ""),
                "targetAudience": data.get("targetAudience", ""),
                "signatureHook": data.get("signatureHook", ""),
                "dos": data.get("dos", ""),
                "donts": data.get("donts", ""),
            },
        }
    except Exception as e:
        # Fallback template cerdas jika AI offline/limit
        return {
            "ok": True,
            "persona": {
                "name": req.name,
                "niche": req.niche,
                "toneOfVoice": f"Edukasi lugas, energik, berorientasi hasil dan solutif di bidang {req.niche}.",
                "targetAudience": f"Praktisi, pebisnis pemula, dan profesional usia 22-35 tahun yang ingin bertumbuh di {req.niche}.",
                "signatureHook": "Rahasia praktis yang jarang dibahas mentor di industri ini...",
                "dos": "- Berikan tips langsung tanpa bertele-tele\n- Pakai contoh kasus nyata\n- Akhiri dengan CTA jelas",
                "donts": "- Jangan gunakan istilah teknis tanpa penjelasan\n- Jangan jualan berlebihan di 10 detik pertama\n- Hindari naskah monoton tanpa emosi",
            },
            "notice": "Menggunakan template terkurasi karena Gemini AI respons tidak langsung tersedia.",
        }

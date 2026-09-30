import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from ..db.base import get_db
from ..db.models import User
from ..core.constants import CONTENT_PLAN_FORMATS
from ..core.deps import get_current_user
from ..repositories.content_plan_repo import ContentPlanRepository
from ..repositories.persona_repo import PersonaRepository
from ..services.gemini import generate, _strip_fence

router = APIRouter(prefix="/api/content-plans", tags=["content_plans"])


class ContentPlanCreate(BaseModel):
    persona_id: Optional[str] = None
    day_number: int = 1
    scheduled_date: Optional[datetime] = None
    topic: str
    hook: str = ""
    outline: str = ""
    format: str = "CAROUSEL"
    status: str = "DRAFT"
    caption: str = ""
    hashtags: str = ""


class ContentPlanUpdate(BaseModel):
    topic: Optional[str] = None
    hook: Optional[str] = None
    outline: Optional[str] = None
    format: Optional[str] = None
    status: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    caption: Optional[str] = None
    hashtags: Optional[str] = None


class GenerateThemesRequest(BaseModel):
    persona_id: str


class GenerateRoadmapRequest(BaseModel):
    persona_id: str
    theme: str
    duration_days: int = 7  # 7, 14, 30
    formats: List[str] = Field(default_factory=lambda: list(CONTENT_PLAN_FORMATS))
    save_to_db: bool = True

    @field_validator("formats")
    @classmethod
    def validate_formats(cls, value: List[str]) -> List[str]:
        formats = list(dict.fromkeys(item.upper() for item in value))
        invalid = set(formats) - set(CONTENT_PLAN_FORMATS)
        if invalid:
            raise ValueError("Jenis konten tidak didukung")
        if not formats:
            raise ValueError("Pilih minimal satu jenis konten")
        return formats


@router.get("")
def list_content_plans(
    persona_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = ContentPlanRepository(db).list_for_user(
        user.id,
        persona_id=persona_id,
        status=status_filter,
    )

    return {
        "plans": [
            {
                "id": p.id,
                "personaId": p.persona_id,
                "dayNumber": p.day_number,
                "scheduledDate": p.scheduled_date.isoformat() if p.scheduled_date else None,
                "topic": p.topic,
                "hook": p.hook,
                "outline": p.outline,
                "format": p.format,
                "status": p.status,
                "caption": p.caption,
                "hashtags": p.hashtags,
                "createdAt": p.created_at.isoformat() if p.created_at else None,
            }
            for p in items
        ]
    }


@router.post("")
def create_content_plan(
    req: ContentPlanCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = ContentPlanRepository(db).create_for_user(
        user.id,
        {
            "persona_id": req.persona_id,
            "day_number": req.day_number,
            "scheduled_date": req.scheduled_date,
            "topic": req.topic,
            "hook": req.hook,
            "outline": req.outline,
            "format": req.format.upper(),
            "status": req.status.upper(),
            "caption": req.caption,
            "hashtags": req.hashtags,
        },
    )
    return {"ok": True, "id": plan.id}


@router.put("/{plan_id}")
def update_content_plan(
    plan_id: str,
    req: ContentPlanUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updates = req.model_dump(exclude_unset=True)
    if "format" in updates and updates["format"] is not None:
        updates["format"] = updates["format"].upper()
    if "status" in updates and updates["status"] is not None:
        updates["status"] = updates["status"].upper()
    plan = ContentPlanRepository(db).update_for_user(plan_id, user.id, updates)
    if not plan:
        raise HTTPException(status_code=404, detail="Rencana konten tidak ditemukan")
    return {"ok": True}


@router.delete("/{plan_id}")
def delete_content_plan(
    plan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = ContentPlanRepository(db).delete_for_user(plan_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Rencana konten tidak ditemukan")
    return {"ok": True}


@router.post("/generate-themes")
def generate_themes(
    req: GenerateThemesRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    persona = PersonaRepository(db).get_for_user(req.persona_id, user.id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona tidak ditemukan")

    prompt = f"""Kamu adalah Social Media Strategist senior.
Buatkan 4 konsep Seri / Tema Besar (Big Themes) konten yang sangat menarik dan viral berdasarkan persona berikut:
- Nama: {persona.name}
- Niche: {persona.niche}
- Tone of Voice: {persona.tone_of_voice}
- Target Audiens: {persona.target_audience}

Format respon WAJIB berupa JSON array murni:
[
  {{
    "title": "Judul tema seri (contoh: 30 Hari Mahir Coding dari Nol)",
    "description": "Deskripsi singkat strategi seri ini",
    "targetGoal": "Tujuan utama (misal: Follower growth & lead magnet)"
  }}
]
Hanya kembalikan JSON array yang valid."""

    try:
        raw = generate(prompt)
        clean = _strip_fence(raw)
        data = json.loads(clean)
        return {"ok": True, "themes": data}
    except Exception:
        return {
            "ok": True,
            "themes": [
                {
                    "title": f"Bongkar Rahasia {persona.niche}: Dari Pemula Sampai Cuan",
                    "description": "Seri edukasi mendalam membongkar mitos dan memberikan blueprint langkah demi langkah.",
                    "targetGoal": "Otoritas brand dan follower engagement tinggi",
                },
                {
                    "title": f"30 Kesalahan Fatal di {persona.niche} yang Bikin Rungkad",
                    "description": "Format kritik edukatif berbasis studi kasus nyata yang memicu diskusi dan saves.",
                    "targetGoal": "Tingkat simpan (saves) dan shares tinggi",
                },
                {
                    "title": f"Bedah Trik Praktis 5 Menit {persona.name}",
                    "description": "Aksi langsung, template, dan cheat sheet siap pakai untuk penonton sibuk.",
                    "targetGoal": "Konversi leads dan klik link profil",
                },
                {
                    "title": f"Behind The Scene & QnA Brutal seputar {persona.niche}",
                    "description": "Menjawab pertanyaan paling kontroversial di industri dengan data transparan.",
                    "targetGoal": "Membangun loyalitas komunitas yang kuat",
                },
            ],
        }


@router.post("/generate-roadmap")
def generate_roadmap(
    req: GenerateRoadmapRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    persona = PersonaRepository(db).get_for_user(req.persona_id, user.id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona tidak ditemukan")

    duration = min(max(req.duration_days, 3), 30)

    prompt = f"""Sebagai content planner viral, rancanglah jadwal konten roadmap untuk {duration} hari.
Persona Kreator:
- Nama: {persona.name} | Niche: {persona.niche}
- Tone: {persona.tone_of_voice}
- Hook Khas: {persona.signature_hook}
- Tema Besar Terpilih: {req.theme}
- Format konten yang diizinkan: {", ".join(req.formats)}

    Hasilkan JSON array persis {duration} item. Nilai format hanya boleh dipilih dari format konten yang diizinkan di atas:
[
  {{
    "dayNumber": 1,
    "topic": "Topik spesifik hari ini",
    "hook": "Hook kalimat pembuka 3 detik pertama",
    "format": "CAROUSEL", // Pilih salah satu: CAROUSEL, PODCAST_CLIP, REMAKE, REELS
    "outline": "Poin 1\\nPoin 2\\nPoin 3\\nCTA",
    "caption": "Draft caption menarik dan ajakan interaksi",
    "hashtags": "#tag1 #tag2 #tag3"
  }}
]
Hanya kembalikan JSON array valid."""

    items = []
    try:
        raw = generate(prompt)
        clean = _strip_fence(raw)
        items = json.loads(clean)
    except Exception:
        # Fallback template
        for day in range(1, duration + 1):
            fmt = req.formats[(day - 1) % len(req.formats)]
            items.append(
                {
                    "dayNumber": day,
                    "topic": f"Hari {day}: Langkah Fundamental {req.theme}",
                    "hook": f"Kebanyakan orang gagal di {persona.niche} karena mengabaikan hal krusial satu ini...",
                    "format": fmt,
                    "outline": f"1. Masalah utama hari {day}\n2. Solusi praktis 3 langkah\n3. Studi kasus nyata\n4. Simpan video ini jika bermanfaat",
                    "caption": f"Simpan konten hari ke-{day} ini biar nggak lupa pas praktek! Tulis pertanyaanmu di kolom komentar.",
                    "hashtags": f"#{persona.niche.replace(' ', '')} #edukasi #tipsbisnis #belajaronline",
                }
            )

    saved_plans = []
    base_date = datetime.now(timezone.utc)
    for it in items:
        day_num = int(it.get("dayNumber", 1))
        target_date = base_date + timedelta(days=day_num - 1)
        fmt = str(it.get("format", "CAROUSEL")).upper()
        if fmt not in req.formats:
            fmt = req.formats[(day_num - 1) % len(req.formats)]
        it["format"] = fmt

        if req.save_to_db:
            saved_plans.append(
                {
                    "day_number": day_num,
                    "scheduled_date": target_date,
                    "topic": it.get("topic", f"Konten Hari {day_num}"),
                    "hook": it.get("hook", ""),
                    "outline": it.get("outline", ""),
                    "format": fmt,
                    "status": "DRAFT",
                    "caption": it.get("caption", ""),
                    "hashtags": it.get("hashtags", ""),
                }
            )

    if req.save_to_db:
        ContentPlanRepository(db).create_many_for_user(user.id, persona.id, saved_plans)

    return {"ok": True, "count": len(items), "roadmap": items}


@router.post("/{plan_id}/send-to-studio")
def send_to_studio(
    plan_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repository = ContentPlanRepository(db)
    plan = repository.get_for_user(plan_id, user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="Rencana konten tidak ditemukan")

    fmt = (plan.format or "CAROUSEL").upper()
    target_url = "/studio/carousel"
    if fmt == "PODCAST_CLIP":
        target_url = "/studio/podcast"
    elif fmt in ["REMAKE", "REELS"]:
        target_url = "/studio/remake"

    # Tandai status sebagai READY (atau biarkan user update)
    if plan.status == "DRAFT":
        repository.update_for_user(plan_id, user.id, {"status": "READY"})

    return {
        "ok": True,
        "targetUrl": target_url,
        "payload": {
            "id": plan.id,
            "personaId": plan.persona_id,
            "dayNumber": plan.day_number,
            "scheduledDate": plan.scheduled_date.isoformat() if plan.scheduled_date else None,
            "topic": plan.topic,
            "hook": plan.hook,
            "outline": plan.outline,
            "format": plan.format,
            "status": plan.status,
            "caption": plan.caption,
            "hashtags": plan.hashtags,
            "createdAt": plan.created_at.isoformat() if plan.created_at else None,
        },
    }

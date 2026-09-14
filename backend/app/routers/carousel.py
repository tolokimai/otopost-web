import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.deps import get_current_user, require_user_or_open
from ..db import models
from ..db.base import get_db
from ..schemas.carousel import (
    CarouselGenerateRequest,
    CarouselGenerateResponse,
    CarouselPayload,
    CarouselProjectOut,
    CarouselRenderResponse,
)
from ..services import carousel_renderer, gemini
from ..services.entitlements import require_feature
from ..services.user_credentials import credential_value

router = APIRouter(
    prefix="/carousel",
    tags=["carousel"],
    dependencies=[Depends(require_feature("carousel"))],
)


def _project_out(row: models.StudioProject) -> dict:
    try:
        payload = json.loads(row.payload_json or "{}")
    except Exception:
        payload = {}
    try:
        output = json.loads(row.output_json or "{}")
    except Exception:
        output = {}
    return {
        "id": row.id,
        "title": row.title,
        "status": row.status,
        "payload": payload,
        "output": output,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


def _slides_from_ai(raw: str, count: int) -> list[dict]:
    try:
        data = gemini.extract_json_array(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gagal parse slide AI: {exc}")
    slides = []
    for item in data:
        if not isinstance(item, dict):
            continue
        slides.append(
            {
                "headline": str(item.get("headline") or "")[:180],
                "body": str(item.get("body") or "")[:1200],
                "subtext": str(item.get("subtext") or "")[:180],
            }
        )
        if len(slides) >= count:
            break
    if len(slides) < 3:
        raise HTTPException(status_code=502, detail="AI menghasilkan terlalu sedikit slide")
    return slides


@router.post("/generate", response_model=CarouselGenerateResponse)
def generate_carousel(
    req: CarouselGenerateRequest,
    user: models.User | None = Depends(require_user_or_open),
    db: Session = Depends(get_db),
):
    prompt = (
        "Kamu adalah content strategist carousel Instagram/LinkedIn berbahasa Indonesia.\n"
        f"Topik: {req.topic}\nAudiens: {req.audience}\nTujuan: {req.goal}\n"
        f"Nada: {req.tone}\nJumlah slide: tepat {req.slideCount}.\n\n"
        "Buat alur yang kuat: slide 1 hook tajam, isi bernilai dan mudah dipindai, "
        "slide terakhir CTA. Headline maksimal 12 kata; body maksimal 45 kata. "
        "Jangan beri klaim palsu. Balas HANYA JSON array valid tanpa markdown:\n"
        '[{"headline":"...","body":"...","subtext":"HOOK|INSIGHT|LANGKAH 1|CTA"}]'
    )
    api_key = credential_value(db, user, "gemini")
    raw = gemini.generate(prompt, api_key=api_key)
    slides = _slides_from_ai(raw, req.slideCount)
    db.add(
        models.UsageEvent(
            user_id=user.id if user else None,
            kind="carousel_generate",
            amount=len(slides),
            detail=req.topic[:300],
        )
    )
    db.commit()
    return {"title": req.topic[:160], "slides": slides}


@router.post("/render", response_model=CarouselRenderResponse)
def render_carousel(
    req: CarouselPayload,
    user: models.User | None = Depends(require_user_or_open),
    db: Session = Depends(get_db),
):
    try:
        result = carousel_renderer.render_carousel(req, settings.work_dir, settings.public_base)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.add(
        models.UsageEvent(
            user_id=user.id if user else None,
            kind="carousel_render",
            amount=len(req.slides),
            detail=result["job"],
        )
    )
    db.commit()
    return result


@router.get("/projects")
def list_projects(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.StudioProject)
        .filter(models.StudioProject.user_id == user.id, models.StudioProject.kind == "carousel")
        .order_by(models.StudioProject.updated_at.desc())
        .limit(100)
        .all()
    )
    return {"projects": [_project_out(row) for row in rows]}


@router.post("/projects", response_model=CarouselProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    req: CarouselPayload,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = models.StudioProject(
        user_id=user.id,
        kind="carousel",
        title=req.title,
        status="draft",
        payload_json=req.model_dump_json(),
        output_json="{}",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _project_out(row)


@router.get("/projects/{project_id}", response_model=CarouselProjectOut)
def get_project(
    project_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.get(models.StudioProject, project_id)
    if not row or row.user_id != user.id or row.kind != "carousel":
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")
    return _project_out(row)


@router.put("/projects/{project_id}", response_model=CarouselProjectOut)
def update_project(
    project_id: str,
    req: CarouselPayload,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.get(models.StudioProject, project_id)
    if not row or row.user_id != user.id or row.kind != "carousel":
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")
    row.title = req.title
    row.payload_json = req.model_dump_json()
    db.add(row)
    db.commit()
    db.refresh(row)
    return _project_out(row)


@router.post("/projects/{project_id}/render", response_model=CarouselProjectOut)
def render_project(
    project_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.get(models.StudioProject, project_id)
    if not row or row.user_id != user.id or row.kind != "carousel":
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")
    try:
        payload = CarouselPayload.model_validate_json(row.payload_json)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Payload project rusak: {exc}")
    try:
        result = carousel_renderer.render_carousel(payload, settings.work_dir, settings.public_base)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    row.status = "rendered"
    row.output_json = json.dumps(result, ensure_ascii=False)
    db.add(row)
    db.add(
        models.UsageEvent(
            user_id=user.id,
            kind="carousel_render",
            amount=len(payload.slides),
            detail=result["job"],
        )
    )
    db.commit()
    db.refresh(row)
    return _project_out(row)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.get(models.StudioProject, project_id)
    if not row or row.user_id != user.id or row.kind != "carousel":
        raise HTTPException(status_code=404, detail="Project tidak ditemukan")
    db.delete(row)
    db.commit()

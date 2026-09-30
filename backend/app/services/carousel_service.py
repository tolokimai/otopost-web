import json
import os
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from ..core.audit import record_audit
from ..core.config import settings
from ..core.constants import CREDITS_COST_CAROUSEL_GENERATE, CREDITS_COST_CAROUSEL_RENDER
from ..core.errors import NotFoundException, ValidationException
from ..db import models
from ..repositories.project_repo import ProjectRepository
from ..schemas.carousel import CarouselPayload
from ..services import carousel_renderer, gemini
from ..services.user_credentials import credential_value


def project_to_dict(row: models.StudioProject) -> Dict[str, Any]:
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


def _load_carousel_prompt() -> str:
    path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "prompt", "carousel", "outline.md")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            pass
    return "Kamu adalah content strategist carousel Instagram/LinkedIn berbahasa Indonesia."


class CarouselService:
    def __init__(self, db: Session):
        self.db = db
        self.project_repo = ProjectRepository(db)

    def generate(
        self,
        topic: str,
        audience: str,
        goal: str,
        tone: str,
        slide_count: int,
        user: Optional[models.User],
    ) -> Dict[str, Any]:
        prompt_template = _load_carousel_prompt()
        prompt = (
            f"{prompt_template}\n\n"
            f"Topik: {topic}\nAudiens: {audience}\nTujuan: {goal}\n"
            f"Nada: {tone}\nJumlah slide: tepat {slide_count}.\n\n"
            "Buat alur yang kuat: slide 1 hook tajam, isi bernilai dan mudah dipindai, "
            "slide terakhir CTA. Headline maksimal 12 kata; body maksimal 45 kata. "
            "Balas HANYA JSON array valid tanpa markdown:\n"
            '[{"headline":"...","body":"...","subtext":"HOOK|INSIGHT|LANGKAH 1|CTA"}]'
        )
        api_key = credential_value(self.db, user, "gemini")
        raw = gemini.generate(prompt, api_key=api_key)

        try:
            data = gemini.extract_json_array(raw)
        except Exception as exc:
            raise ValidationException(f"Gagal memproses respons AI: {exc}")

        slides = []
        for item in data:
            if isinstance(item, dict):
                slides.append({
                    "headline": str(item.get("headline") or "")[:180],
                    "body": str(item.get("body") or "")[:1200],
                    "subtext": str(item.get("subtext") or "")[:180],
                })
                if len(slides) >= slide_count:
                    break

        if len(slides) < 2:
            raise ValidationException("AI menghasilkan slide kurang dari jumlah minimum")

        if user:
            self.db.add(
                models.UsageEvent(
                    user_id=user.id,
                    kind="carousel_generate",
                    amount=CREDITS_COST_CAROUSEL_GENERATE,
                    detail=topic[:300],
                )
            )
            self.db.commit()

        return {"title": topic[:160], "slides": slides}

    def render(self, payload: CarouselPayload, user: Optional[models.User]) -> Dict[str, Any]:
        try:
            result = carousel_renderer.render_carousel(payload, settings.work_dir, settings.public_base)
        except ValueError as exc:
            raise ValidationException(str(exc))

        if user:
            self.db.add(
                models.UsageEvent(
                    user_id=user.id,
                    kind="carousel_render",
                    amount=CREDITS_COST_CAROUSEL_RENDER,
                    detail=result["job"],
                )
            )
            self.db.commit()
        return result

    def list_projects(self, user_id: str) -> List[Dict[str, Any]]:
        rows = self.project_repo.list_by_user(user_id=user_id, kind="carousel")
        return [project_to_dict(r) for r in rows]

    def create_project(self, user_id: str, payload: CarouselPayload) -> Dict[str, Any]:
        row = models.StudioProject(
            user_id=user_id,
            kind="carousel",
            title=payload.title,
            status="draft",
            payload_json=payload.model_dump_json(),
            output_json="{}",
        )
        self.project_repo.add(row)
        record_audit(self.db, "CREATE", "studio_project", actor_id=user_id, resource_id=row.id)
        return project_to_dict(row)

    def get_project(self, project_id: str, user_id: str) -> Dict[str, Any]:
        row = self.project_repo.get_by_user(project_id, user_id)
        if not row or row.kind != "carousel":
            raise NotFoundException("Project tidak ditemukan")
        return project_to_dict(row)

    def update_project(self, project_id: str, user_id: str, payload: CarouselPayload) -> Dict[str, Any]:
        row = self.project_repo.get_by_user(project_id, user_id)
        if not row or row.kind != "carousel":
            raise NotFoundException("Project tidak ditemukan")
        row.title = payload.title
        row.payload_json = payload.model_dump_json()
        self.project_repo.update(row)
        record_audit(self.db, "UPDATE", "studio_project", actor_id=user_id, resource_id=row.id)
        return project_to_dict(row)

    def render_project(self, project_id: str, user_id: str) -> Dict[str, Any]:
        row = self.project_repo.get_by_user(project_id, user_id)
        if not row or row.kind != "carousel":
            raise NotFoundException("Project tidak ditemukan")
        try:
            payload = CarouselPayload.model_validate_json(row.payload_json)
        except Exception as exc:
            raise ValidationException(f"Payload project rusak: {exc}")

        result = self.render(payload, user=None)
        row.status = "rendered"
        row.output_json = json.dumps(result, ensure_ascii=False)
        self.project_repo.update(row)
        record_audit(self.db, "RENDER", "studio_project", actor_id=user_id, resource_id=row.id)
        return project_to_dict(row)

    def delete_project(self, project_id: str, user_id: str) -> None:
        row = self.project_repo.get_by_user(project_id, user_id)
        if not row or row.kind != "carousel":
            raise NotFoundException("Project tidak ditemukan")
        self.project_repo.delete(row)
        record_audit(self.db, "DELETE", "studio_project", actor_id=user_id, resource_id=project_id)


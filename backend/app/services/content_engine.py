"""Shared serialization, AI normalization, and one-time seed helpers."""
import json
from datetime import date, timedelta
from typing import Any

from sqlalchemy.orm import Session

from ..db import content_models as cm
from ..db import models
from . import gemini

CONTENT_ENGINE_SEED = "content_engine_v1"
NEW_MENUS = [
    {"id": "persona", "label": "Brand Persona", "description": "Bangun fondasi brand, audiens, tone, offer, dan pilar konten.", "icon": "🧬", "href": "/personas", "is_enabled": True, "is_ready": True, "required_plan": "free", "sort_order": 1},
    {"id": "content-plan", "label": "Content Planner", "description": "Generate kalender konten 7 atau 30 hari dari persona dan target bisnis.", "icon": "🗓️", "href": "/planner", "is_enabled": True, "is_ready": True, "required_plan": "creator", "sort_order": 2},
    {"id": "content-library", "label": "Content Library", "description": "Kelola draft, review, approval, produksi, jadwal, dan hasil konten.", "icon": "🗂️", "href": "/library", "is_enabled": True, "is_ready": True, "required_plan": "free", "sort_order": 3},
]


def seed_content_engine(db: Session) -> None:
    """Add this release's menus once without resurrecting later admin deletions."""
    if db.get(cm.SystemMeta, CONTENT_ENGINE_SEED):
        return
    for item in NEW_MENUS:
        if db.get(models.StudioMenu, item["id"]) is None:
            db.add(models.StudioMenu(**item))
    db.add(cm.SystemMeta(key=CONTENT_ENGINE_SEED, value="1"))
    db.commit()


def dump_list(values: list[str] | None) -> str:
    clean = [str(item).strip()[:500] for item in (values or []) if str(item).strip()]
    return json.dumps(list(dict.fromkeys(clean)), ensure_ascii=False)


def load_list(raw: str | None) -> list[str]:
    try:
        value = json.loads(raw or "[]")
    except Exception:
        return []
    return [str(item) for item in value] if isinstance(value, list) else []


def load_object(raw: str | None) -> dict:
    try:
        value = json.loads(raw or "{}")
    except Exception:
        return {}
    return value if isinstance(value, dict) else {}


def persona_out(row: cm.Persona) -> dict:
    return {"id": row.id, "name": row.name, "brandName": row.brand_name, "niche": row.niche, "audience": row.audience, "painPoints": load_list(row.pain_points_json), "aspirations": load_list(row.aspirations_json), "tone": row.tone, "language": row.language, "offers": load_list(row.offers_json), "channels": load_list(row.channels_json), "differentiators": row.differentiators, "brandStory": row.brand_story, "contentPillars": load_list(row.content_pillars_json), "isDefault": bool(row.is_default), "createdAt": row.created_at.isoformat() if row.created_at else None, "updatedAt": row.updated_at.isoformat() if row.updated_at else None}


def plan_out(row: cm.ContentPlan, item_count: int | None = None) -> dict:
    result = {"id": row.id, "personaId": row.persona_id, "title": row.title, "goal": row.goal, "campaign": row.campaign, "durationDays": row.duration_days, "startDate": row.start_date.isoformat(), "status": row.status, "strategy": load_object(row.strategy_json), "createdAt": row.created_at.isoformat() if row.created_at else None, "updatedAt": row.updated_at.isoformat() if row.updated_at else None}
    if item_count is not None:
        result["itemCount"] = item_count
    return result


def item_out(row: cm.ContentItem) -> dict:
    return {"id": row.id, "planId": row.plan_id, "personaId": row.persona_id, "scheduledDate": row.scheduled_date.isoformat() if row.scheduled_date else None, "channel": row.channel, "format": row.format, "pillar": row.pillar, "title": row.title, "hook": row.hook, "angle": row.angle, "objective": row.objective, "cta": row.cta, "brief": row.brief, "keywords": load_list(row.keywords_json), "workflow": row.workflow, "status": row.status, "sourceProjectId": row.source_project_id, "outputUrl": row.output_url, "externalPostId": row.external_post_id, "lastError": row.last_error, "sortOrder": row.sort_order, "publishedAt": row.published_at.isoformat() if row.published_at else None, "createdAt": row.created_at.isoformat() if row.created_at else None, "updatedAt": row.updated_at.isoformat() if row.updated_at else None}


def _text(value: Any, limit: int = 2000) -> str:
    return str(value or "").strip()[:limit]


def _list(value: Any, limit: int = 20) -> list[str]:
    if not isinstance(value, list):
        return []
    return list(dict.fromkeys(_text(item, 300) for item in value if _text(item, 300)))[:limit]


def parse_persona_ai(raw: str, fallback: dict) -> dict:
    try:
        obj = gemini.extract_json_object(raw)
    except Exception as exc:
        raise ValueError(f"Gagal membaca persona dari AI: {exc}") from exc
    if not isinstance(obj, dict):
        raise ValueError("AI tidak menghasilkan object persona")
    result = {
        "name": _text(obj.get("name") or fallback.get("brandName") or "Persona Utama", 120),
        "brandName": _text(obj.get("brandName") or fallback.get("brandName"), 160),
        "niche": _text(obj.get("niche") or fallback.get("niche"), 240),
        "audience": _text(obj.get("audience") or fallback.get("audienceHint"), 2000),
        "painPoints": _list(obj.get("painPoints")), "aspirations": _list(obj.get("aspirations")),
        "tone": _text(obj.get("tone") or "Profesional, hangat, dan jelas", 240),
        "language": _text(obj.get("language") or fallback.get("language") or "Bahasa Indonesia", 40),
        "offers": _list(obj.get("offers") or ([fallback.get("offer")] if fallback.get("offer") else [])),
        "channels": _list(obj.get("channels") or fallback.get("channels"), 12),
        "differentiators": _text(obj.get("differentiators"), 2000), "brandStory": _text(obj.get("brandStory"), 4000),
        "contentPillars": _list(obj.get("contentPillars"), 12), "isDefault": False,
    }
    if not result["audience"] or len(result["contentPillars"]) < 3:
        raise ValueError("Persona AI belum cukup lengkap; coba tambahkan detail bisnis")
    return result


def parse_plan_ai(raw: str, start_date: date, duration_days: int, target_count: int, channels: list[str], workflows: list[str]) -> tuple[dict, list[dict]]:
    try:
        obj = gemini.extract_json_object(raw)
    except Exception as exc:
        raise ValueError(f"Gagal membaca content plan dari AI: {exc}") from exc
    if not isinstance(obj, dict) or not isinstance(obj.get("items"), list):
        raise ValueError("AI tidak menghasilkan object strategy + items")
    strategy_raw = obj.get("strategy") if isinstance(obj.get("strategy"), dict) else {}
    strategy = {"positioning": _text(strategy_raw.get("positioning"), 1200), "contentMix": _list(strategy_raw.get("contentMix"), 12), "conversionPath": _text(strategy_raw.get("conversionPath"), 1200), "notes": _text(strategy_raw.get("notes"), 1200)}
    clean_channels = channels or ["Instagram"]
    clean_workflows = workflows or ["carousel"]
    items: list[dict] = []
    for index, value in enumerate(obj["items"][:target_count]):
        if not isinstance(value, dict):
            continue
        fallback_offset = round(index * max(0, duration_days - 1) / max(1, target_count - 1))
        try:
            offset = int(value.get("dayOffset", fallback_offset))
        except Exception:
            offset = fallback_offset
        offset = max(0, min(duration_days - 1, offset))
        workflow = _text(value.get("workflow"), 40).lower()
        if workflow not in clean_workflows:
            workflow = clean_workflows[index % len(clean_workflows)]
        channel = _text(value.get("channel"), 40)
        if channel not in clean_channels:
            channel = clean_channels[index % len(clean_channels)]
        title = _text(value.get("title"), 220)
        if not title:
            continue
        items.append({"scheduledDate": start_date + timedelta(days=offset), "channel": channel, "format": _text(value.get("format") or workflow.replace("-", " ").title(), 80), "pillar": _text(value.get("pillar"), 160), "title": title, "hook": _text(value.get("hook"), 2000), "angle": _text(value.get("angle"), 2000), "objective": _text(value.get("objective") or "Awareness", 160), "cta": _text(value.get("cta"), 2000), "brief": _text(value.get("brief"), 6000), "keywords": _list(value.get("keywords"), 30), "workflow": workflow, "sortOrder": index})
    minimum = min(target_count, max(3, (target_count * 2 + 2) // 3))
    if len(items) < minimum:
        raise ValueError(f"AI menghasilkan terlalu sedikit ide konten ({len(items)}/{target_count})")
    return strategy, items

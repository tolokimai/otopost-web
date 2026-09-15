"""Database models for the Persona -> Plan -> Library content engine."""
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


def _uuid() -> str:
    return uuid.uuid4().hex


class SystemMeta(Base):
    """Internal migration/seed markers that are never exposed in Admin settings."""

    __tablename__ = "system_meta"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Persona(Base):
    __tablename__ = "personas"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    brand_name: Mapped[str] = mapped_column(String(160), default="")
    niche: Mapped[str] = mapped_column(String(240), default="")
    audience: Mapped[str] = mapped_column(Text, default="")
    pain_points_json: Mapped[str] = mapped_column(Text, default="[]")
    aspirations_json: Mapped[str] = mapped_column(Text, default="[]")
    tone: Mapped[str] = mapped_column(String(240), default="Profesional, hangat, dan jelas")
    language: Mapped[str] = mapped_column(String(40), default="Bahasa Indonesia")
    offers_json: Mapped[str] = mapped_column(Text, default="[]")
    channels_json: Mapped[str] = mapped_column(Text, default="[]")
    differentiators: Mapped[str] = mapped_column(Text, default="")
    brand_story: Mapped[str] = mapped_column(Text, default="")
    content_pillars_json: Mapped[str] = mapped_column(Text, default="[]")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ContentPlan(Base):
    __tablename__ = "content_plans"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    persona_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("personas.id", ondelete="SET NULL"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    goal: Mapped[str] = mapped_column(String(240), default="Pertumbuhan audiens dan konversi")
    campaign: Mapped[str] = mapped_column(String(240), default="")
    duration_days: Mapped[int] = mapped_column(Integer, default=7)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="active", index=True)
    strategy_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ContentItem(Base):
    __tablename__ = "content_items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    plan_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("content_plans.id", ondelete="SET NULL"), index=True, nullable=True
    )
    persona_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("personas.id", ondelete="SET NULL"), index=True, nullable=True
    )
    scheduled_date: Mapped[Optional[date]] = mapped_column(Date, index=True, nullable=True)
    channel: Mapped[str] = mapped_column(String(40), default="Instagram")
    format: Mapped[str] = mapped_column(String(80), default="Carousel")
    pillar: Mapped[str] = mapped_column(String(160), default="")
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    hook: Mapped[str] = mapped_column(Text, default="")
    angle: Mapped[str] = mapped_column(Text, default="")
    objective: Mapped[str] = mapped_column(String(160), default="Awareness")
    cta: Mapped[str] = mapped_column(Text, default="")
    brief: Mapped[str] = mapped_column(Text, default="")
    keywords_json: Mapped[str] = mapped_column(Text, default="[]")
    workflow: Mapped[str] = mapped_column(String(40), default="carousel", index=True)
    status: Mapped[str] = mapped_column(String(24), default="draft", index=True)
    source_project_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    output_url: Mapped[str] = mapped_column(Text, default="")
    external_post_id: Mapped[str] = mapped_column(String(255), default="")
    last_error: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

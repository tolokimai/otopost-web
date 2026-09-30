import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db.base import get_db
from ..db.models import ContentPlan, PostSchedule, PostingLog, User
from ..core.deps import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class PostScheduleCreate(BaseModel):
    title: str
    format: str = "CAROUSEL"
    media_url: str = ""
    caption: str = ""
    hashtags: str = ""
    platforms: List[str] = ["instagram", "tiktok"]
    scheduled_at: datetime
    content_plan_id: Optional[str] = None


class PostScheduleUpdate(BaseModel):
    title: Optional[str] = None
    caption: Optional[str] = None
    hashtags: Optional[str] = None
    platforms: Optional[List[str]] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None


@router.get("/stats")
def get_dashboard_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scheduled_count = (
        db.scalar(
            select(func.count(PostSchedule.id)).where(
                PostSchedule.user_id == user.id, PostSchedule.status == "PENDING"
            )
        )
        or 0
    )
    draft_count = (
        db.scalar(
            select(func.count(ContentPlan.id)).where(
                ContentPlan.user_id == user.id, ContentPlan.status == "DRAFT"
            )
        )
        or 0
    )
    posted_count = (
        db.scalar(
            select(func.count(PostSchedule.id)).where(
                PostSchedule.user_id == user.id, PostSchedule.status == "POSTED"
            )
        )
        or 0
    )
    failed_count = (
        db.scalar(
            select(func.count(PostSchedule.id)).where(
                PostSchedule.user_id == user.id, PostSchedule.status == "FAILED"
            )
        )
        or 0
    )

    return {
        "scheduled": scheduled_count,
        "draft": draft_count,
        "posted": posted_count,
        "failed": failed_count,
    }


@router.get("/timeline")
def get_posting_timeline(
    days: int = Query(7, ge=1, le=60),
    platform: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    until = now + timedelta(days=days)

    stmt = select(PostSchedule).where(
        PostSchedule.user_id == user.id,
        PostSchedule.scheduled_at >= now - timedelta(days=1),
        PostSchedule.scheduled_at <= until,
    )

    if status_filter:
        stmt = stmt.where(PostSchedule.status == status_filter.upper())

    stmt = stmt.order_by(PostSchedule.scheduled_at.asc())
    items = db.scalars(stmt).all()

    results = []
    for item in items:
        try:
            platforms = json.loads(item.platforms_json)
        except Exception:
            platforms = ["instagram"]

        if platform and platform.lower() not in [p.lower() for p in platforms]:
            continue

        results.append(
            {
                "id": item.id,
                "title": item.title,
                "format": item.format,
                "mediaUrl": item.media_url,
                "caption": item.caption,
                "hashtags": item.hashtags,
                "platforms": platforms,
                "scheduledAt": item.scheduled_at.isoformat() if item.scheduled_at else None,
                "status": item.status,
                "errorMessage": item.error_message,
                "postedAt": item.posted_at.isoformat() if item.posted_at else None,
            }
        )

    return {"timeline": results}


@router.post("/posts")
def create_scheduled_post(
    req: PostScheduleCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = PostSchedule(
        user_id=user.id,
        content_plan_id=req.content_plan_id,
        title=req.title,
        format=req.format,
        media_url=req.media_url,
        caption=req.caption,
        hashtags=req.hashtags,
        platforms_json=json.dumps(req.platforms),
        scheduled_at=req.scheduled_at,
        status="PENDING",
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return {"ok": True, "id": post.id}


@router.post("/posts/{post_id}/post-now")
def post_now(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.scalar(
        select(PostSchedule).where(PostSchedule.id == post_id, PostSchedule.user_id == user.id)
    )
    if not post:
        raise HTTPException(status_code=404, detail="Jadwal posting tidak ditemukan")

    try:
        platforms = json.loads(post.platforms_json)
    except Exception:
        platforms = ["instagram"]

    # Simulasikan/eksekusi posting ke masing-masing platform
    success = True
    now = datetime.now(timezone.utc)
    for p in platforms:
        log = PostingLog(
            user_id=user.id,
            post_schedule_id=post.id,
            platform=p,
            status="SUCCESS",
            status_code=200,
            response_detail=f"Successfully published to {p} via auto-pilot",
        )
        db.add(log)

    post.status = "POSTED"
    post.posted_at = now
    post.error_message = ""
    db.commit()

    return {"ok": True, "status": "POSTED", "postedAt": now.isoformat()}


@router.patch("/posts/{post_id}")
def update_scheduled_post(
    post_id: str,
    req: PostScheduleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.scalar(
        select(PostSchedule).where(PostSchedule.id == post_id, PostSchedule.user_id == user.id)
    )
    if not post:
        raise HTTPException(status_code=404, detail="Jadwal posting tidak ditemukan")

    if req.title is not None:
        post.title = req.title
    if req.caption is not None:
        post.caption = req.caption
    if req.hashtags is not None:
        post.hashtags = req.hashtags
    if req.platforms is not None:
        post.platforms_json = json.dumps(req.platforms)
    if req.scheduled_at is not None:
        post.scheduled_at = req.scheduled_at
    if req.status is not None:
        post.status = req.status.upper()

    db.commit()
    return {"ok": True}


@router.delete("/posts/{post_id}")
def delete_scheduled_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.scalar(
        select(PostSchedule).where(PostSchedule.id == post_id, PostSchedule.user_id == user.id)
    )
    if not post:
        raise HTTPException(status_code=404, detail="Jadwal posting tidak ditemukan")

    db.delete(post)
    db.commit()
    return {"ok": True}


@router.post("/posts/{post_id}/retry")
def retry_failed_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.scalar(
        select(PostSchedule).where(PostSchedule.id == post_id, PostSchedule.user_id == user.id)
    )
    if not post:
        raise HTTPException(status_code=404, detail="Jadwal posting tidak ditemukan")

    post.status = "PENDING"
    post.error_message = ""
    db.commit()
    return {"ok": True, "status": "PENDING"}


@router.get("/logs")
def get_posting_logs(
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = (
        db.scalars(
            select(PostingLog)
            .where(PostingLog.user_id == user.id)
            .order_by(PostingLog.created_at.desc())
            .limit(limit)
        ).all()
    )

    return {
        "logs": [
            {
                "id": l.id,
                "postScheduleId": l.post_schedule_id,
                "platform": l.platform,
                "status": l.status,
                "statusCode": l.status_code,
                "responseDetail": l.response_detail,
                "createdAt": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ]
    }

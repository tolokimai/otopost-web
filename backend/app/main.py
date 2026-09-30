import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.config import settings
from .core.errors import register_exception_handlers
from .db.base import init_db
from .routers import (
    admin,
    ai,
    auth,
    billing,
    carousel,
    clips,
    config,
    content_library,
    content_plan,
    content_plans,
    health,
    persona,
    personas,
    remake,
    settings_integrations,
    transcript,
)

logger = logging.getLogger("otopost.main")
os.makedirs(settings.work_dir, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not settings.jwt_secret:
        logger.warning(
            "JWT_SECRET belum diset - memakai secret default yang tidak aman untuk produksi."
        )
    if not settings.admin_email_set:
        logger.warning(
            "ADMIN_EMAILS belum diset - admin panel belum memiliki owner bootstrap."
        )
    yield


app = FastAPI(title=settings.app_name, version="1.2.0", lifespan=lifespan)
register_exception_handlers(app)

_origins = (
    ["*"]
    if settings.cors_origins.strip() == "*"
    else [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/files", StaticFiles(directory=settings.work_dir), name="files")

for route in (
    health.router,
    auth.router,
    config.router,
    content_plan.router,
    settings_integrations.router,
    persona.router,
    admin.router,
    personas.router,
    content_plans.router,
    content_library.router,
    carousel.router,
    remake.router,
    transcript.router,
    clips.router,
    ai.router,
    billing.router,
):
    app.include_router(route)

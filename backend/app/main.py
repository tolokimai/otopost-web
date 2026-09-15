import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.config import settings
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
    content_plans,
    health,
    personas,
    remake,
    transcript,
)

os.makedirs(settings.work_dir, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not settings.jwt_secret:
        print("WARNING: JWT_SECRET belum diset - memakai secret default yang TIDAK aman untuk produksi.")
    if not settings.admin_email_set:
        print("WARNING: ADMIN_EMAILS belum diset - admin panel belum memiliki owner bootstrap.")
    yield


app = FastAPI(title=settings.app_name, version="1.2.0", lifespan=lifespan)

_origins = ["*"] if settings.cors_origins.strip() == "*" else [
    origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/files", StaticFiles(directory=settings.work_dir), name="files")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(config.router)
app.include_router(admin.router)
app.include_router(personas.router)
app.include_router(content_plans.router)
app.include_router(content_library.router)
app.include_router(carousel.router)
app.include_router(remake.router)
app.include_router(transcript.router)
app.include_router(clips.router)
app.include_router(ai.router)
app.include_router(billing.router)

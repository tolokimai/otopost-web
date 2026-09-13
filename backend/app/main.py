import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.config import settings
from .routers import ai, clips, health, transcript

os.makedirs(settings.work_dir, exist_ok=True)

app = FastAPI(title=settings.app_name, version="1.0.0")

_origins = ["*"] if settings.cors_origins.strip() == "*" else [
    o.strip() for o in settings.cors_origins.split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hasil clip bisa diunduh langsung dari sini.
app.mount("/files", StaticFiles(directory=settings.work_dir), name="files")

app.include_router(health.router)
app.include_router(transcript.router)
app.include_router(clips.router)
app.include_router(ai.router)

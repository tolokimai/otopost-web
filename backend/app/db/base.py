import os
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from ..core.config import settings


def _database_url() -> str:
    """Pakai DATABASE_URL bila diset (mis. Postgres), fallback ke SQLite file."""
    if settings.database_url:
        return settings.database_url
    os.makedirs(settings.work_dir, exist_ok=True)
    return "sqlite:///" + os.path.join(settings.work_dir, "otopost.db")


DATABASE_URL = _database_url()
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    future=True,
)

Base = declarative_base()


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Buat semua tabel bila belum ada (aman dipanggil berulang)."""
    from . import models  # noqa: F401  pastikan model ter-register

    Base.metadata.create_all(bind=engine)

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from ..core.config import settings


def _database_url() -> str:
    if settings.database_url:
        return settings.database_url
    work_dir = Path(settings.work_dir)
    work_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{work_dir / 'otopost.db'}"


DATABASE_URL = _database_url()
CONNECT_ARGS = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=CONNECT_ARGS,
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
    """Initialize models, apply versioned migrations, and seed idempotent defaults."""
    from . import content_models, models  # noqa: F401
    from .migrations.runner import run_migrations

    Base.metadata.create_all(bind=engine)
    run_migrations(engine)

    from ..services.bootstrap import seed_defaults
    from ..services.content_engine import seed_content_engine

    with SessionLocal() as db:
        seed_defaults(db)
        seed_content_engine(db)

import importlib
from collections.abc import Iterable

from sqlalchemy import text
from sqlalchemy.engine import Engine

MIGRATION_MODULES: tuple[str, ...] = (
    "app.db.migrations.versions.v0001_legacy_columns",
)


def _ensure_version_table(engine: Engine) -> None:
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE IF NOT EXISTS schema_migrations ("
                "version VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
                ")"
            )
        )


def _applied_versions(engine: Engine) -> set[str]:
    with engine.connect() as connection:
        rows = connection.execute(text("SELECT version FROM schema_migrations"))
        return {str(row[0]) for row in rows}


def _pending_modules(applied: set[str]) -> Iterable[object]:
    for module_name in MIGRATION_MODULES:
        module = importlib.import_module(module_name)
        if module.VERSION not in applied:
            yield module


def run_migrations(engine: Engine) -> None:
    _ensure_version_table(engine)
    applied = _applied_versions(engine)
    for migration in _pending_modules(applied):
        with engine.begin() as connection:
            migration.upgrade(connection)
            connection.execute(
                text("INSERT INTO schema_migrations (version) VALUES (:version)"),
                {"version": migration.VERSION},
            )

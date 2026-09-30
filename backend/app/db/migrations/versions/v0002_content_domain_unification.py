from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection

VERSION = "0002_content_domain_unification"

PERSONA_COLUMNS = {
    "brand_name": "VARCHAR(160) DEFAULT ''",
    "audience": "TEXT DEFAULT ''",
    "pain_points_json": "TEXT DEFAULT '[]'",
    "aspirations_json": "TEXT DEFAULT '[]'",
    "tone": "VARCHAR(240) DEFAULT ''",
    "language": "VARCHAR(40) DEFAULT 'Bahasa Indonesia'",
    "offers_json": "TEXT DEFAULT '[]'",
    "channels_json": "TEXT DEFAULT '[]'",
    "differentiators": "TEXT DEFAULT ''",
    "brand_story": "TEXT DEFAULT ''",
    "content_pillars_json": "TEXT DEFAULT '[]'",
    "tone_of_voice": "TEXT DEFAULT ''",
    "target_audience": "TEXT DEFAULT ''",
    "signature_hook": "TEXT DEFAULT ''",
    "dos": "TEXT DEFAULT ''",
    "donts": "TEXT DEFAULT ''",
    "updated_at": "TIMESTAMP",
}

CONTENT_PLAN_COLUMNS = {
    "title": "VARCHAR(180) DEFAULT ''",
    "goal": "VARCHAR(240) DEFAULT ''",
    "campaign": "VARCHAR(240) DEFAULT ''",
    "duration_days": "INTEGER DEFAULT 7",
    "start_date": "DATE",
    "strategy_json": "TEXT DEFAULT '{}'",
    "day_number": "INTEGER DEFAULT 1",
    "scheduled_date": "TIMESTAMP",
    "topic": "TEXT DEFAULT ''",
    "hook": "TEXT DEFAULT ''",
    "outline": "TEXT DEFAULT ''",
    "format": "VARCHAR(32) DEFAULT 'CAROUSEL'",
    "caption": "TEXT DEFAULT ''",
    "hashtags": "TEXT DEFAULT ''",
    "updated_at": "TIMESTAMP",
}


def _add_missing_columns(
    connection: Connection,
    table: str,
    definitions: dict[str, str],
) -> None:
    inspector = inspect(connection)
    if table not in set(inspector.get_table_names()):
        return
    existing = {column["name"] for column in inspector.get_columns(table)}
    for name, definition in definitions.items():
        if name not in existing:
            connection.execute(
                text(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {definition}')
            )


def upgrade(connection: Connection) -> None:
    _add_missing_columns(connection, "personas", PERSONA_COLUMNS)
    _add_missing_columns(connection, "content_plans", CONTENT_PLAN_COLUMNS)
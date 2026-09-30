from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection

VERSION = "0001_legacy_columns"


def upgrade(connection: Connection) -> None:
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())

    if "users" in tables:
        columns = {column["name"] for column in inspector.get_columns("users")}
        if "plan_expires_at" not in columns:
            column_type = (
                "TIMESTAMPTZ" if connection.dialect.name == "postgresql" else "TIMESTAMP"
            )
            connection.execute(text(f"ALTER TABLE users ADD COLUMN plan_expires_at {column_type}"))
        if "is_admin" not in columns:
            column_type = (
                "BOOLEAN NOT NULL DEFAULT FALSE"
                if connection.dialect.name == "postgresql"
                else "BOOLEAN NOT NULL DEFAULT 0"
            )
            connection.execute(text(f"ALTER TABLE users ADD COLUMN is_admin {column_type}"))

    if "orders" in tables:
        columns = {column["name"] for column in inspector.get_columns("orders")}
        if "duration_days" not in columns:
            connection.execute(
                text("ALTER TABLE orders ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 30")
            )

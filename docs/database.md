# Database Architecture & Guidelines

## Engine & Persistence
- Primary Support: SQLite (development) and PostgreSQL (production).
- ORM: SQLAlchemy 2.0 with mapped columns and UTC timestamps.
- Migration Strategy: Controlled migrations in `backend/app/db/base.py` / `_ensure_schema()`.

## Models Overview
- `users`: Core account identity, authentication hashes, active plans, credits balance, admin status.
- `credentials`: Encrypted third-party API keys (e.g. user-supplied Gemini keys).
- `usage_events`: Metered feature consumption logs.
- `orders`: Billing subscriptions, invoices, and payment lifecycle tracking.
- `plan_configs`: Dynamic subscription tiers and pricing parameters.
- `app_settings`: Dynamic application configuration and encrypted system credentials.
- `studio_menus`: Dynamic navigation and access policies for studio modules.
- `studio_projects`: Saved multi-slide carousel and media projects.
- `content_plans`: Per-user roadmap items linked to a Persona when available.
- `media_assets`: Uploaded media files (photos, videos, audio) with metadata.
- `personas`: Per-user creator profiles, including voice, audience, hooks, and content guidance.
- `audit_logs`: Audit trail recording WHO, WHAT, WHEN, WHERE, RESULT for system integrity.

New tables are created idempotently from registered SQLAlchemy models by `Base.metadata.create_all()` during startup.

## Repository Pattern Rule
- Direct `db.query()`, `db.execute()`, and session writes in routers or services are strictly forbidden.
- All database queries must be executed through specialized repositories located under `backend/app/repositories/`.


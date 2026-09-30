# Engineering constitution adoption plan

Owner: engineering lead  
Backup owner: repository maintainer  
Level: 2 (production)

## Delivery strategy

The migration is incremental to preserve public API behavior and keep every pull request reviewable.

1. **Foundation** — versioned migrations, repository-only data access for authentication, design tokens, modular HTTP client, and enforceable CI checks.
2. **Backend domains** — move each route to its feature boundary and remove database access from routes.
3. **Frontend domains** — split API/UI by feature, add shared DataTable/Toast/Confirm, and migrate user-facing strings to `id`/`en` catalogs.
4. **Production hardening** — rate limiting, audit coverage, structured logs/metrics/traces, object storage, queue durability, backup/restore drills, and performance budgets.

## Compatibility

Existing endpoints and response payloads remain compatible during migration. Database changes are forward-only and recorded in `schema_migrations`.

## Rollback

Application commits can be reverted. Applied migrations are not deleted; database recovery uses a forward-fix because the first migration only adds backward-compatible columns.

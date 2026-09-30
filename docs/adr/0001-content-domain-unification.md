# ADR 0001: Unify content-domain database models

Status: accepted  
Date: 2026-09-30  
Owner: engineering lead

## Context

Two concurrent implementations declared `personas` and `content_plans` with
different SQLAlchemy classes. Importing both raised duplicate-table errors and
left unresolved merge markers in production files.

## Decision

`backend/app/db/models.py` owns the unified, backward-compatible model. The
legacy `content_models` module only re-exports those classes. Migration
`0002_content_domain_unification` adds the union of missing columns without
dropping or renaming existing data.

## Consequences

Both existing API surfaces remain operational during route consolidation. New
code must import the owner model through the domain repository. Redundant old
routes will be removed only after clients migrate and contract tests cover the
replacement.

## Rollback

Application code can be reverted. Added nullable/defaulted columns remain and
are harmless; database recovery uses a forward-fix rather than destructive
column removal.
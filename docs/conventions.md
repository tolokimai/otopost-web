# Code Conventions & Style Guide

## Maximum File Length
- Every source file MUST NOT exceed 400 lines of code.
- Files approaching this limit must be divided by responsibility/domain.

## Naming Standards
- Python files: snake_case (`user_repo.py`, `auth_service.py`, `admin_router.py`).
- TypeScript components: PascalCase (`DataTable.tsx`, `UserManager.tsx`).
- TypeScript utilities: camelCase or kebab-case (`api.ts`, `theme.tsx`, `i18n.tsx`).
- CSS: semantic CSS variables (`var(--color-primary)`). No hardcoded hex or tailwind arbitrary colors in components.
- i18n keys: hierarchical lowercase strings (`domain.feature.action`, e.g. `common.save`, `admin.users.title`).

## Prohibited Patterns
- No file suffixes: `_new`, `_old`, `_final`, `_v2`, `_backup`, `_copy`.
- No silent exceptions (`except: pass` or empty `catch {}`).
- No direct database queries in controllers/routes.
- No `window.confirm` or `window.alert` in user interfaces; use standard `Toast` and `Confirm` modals.


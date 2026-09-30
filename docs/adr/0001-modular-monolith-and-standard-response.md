# ADR 0001: Modular Monolith, Standard API Contract, and Layered Boundaries

## Status
Accepted

## Date
2026-09-29

## Context
OtoPost Web requires a scalable, maintainable codebase that complies with `ENGINEERING_CONSTITUTION.md` and `AGENTS.md`. Previously, route handlers interacted directly with SQLAlchemy sessions, mixed business logic with HTTP concerns, and returned ad-hoc JSON payloads without standardized error envelopes.

## Decision
1. **Architecture & Boundaries**:
   Adopt a clean modular layered architecture:
   `Frontend → Route (thin) → Service → Repository → Database`.
   Routes only handle HTTP parsing, parameter validation, role checks, and delegating to domain services. No direct database access or business logic is allowed in routers.

2. **Standard API Response**:
   All endpoints return a standardized envelope:
   - Success: `{"success": true, "data": <payload>, "message": "<optional string>"}`
   - Error: `{"success": false, "error": {"code": "<ERROR_CODE>", "message": "<human friendly string>"}}`
   Standard Error Codes: `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.

3. **Standard Pagination**:
   Pagination queries adhere strictly to:
   `?page=1&limit=25&sort=created_at&order=desc&search=...`

4. **Frontend Standardization**:
   - Centralized DataTable with page choices 10/25/50/100/All.
   - Standard 5-state lifecycle: LOADING, SUCCESS, EMPTY, ERROR, FORBIDDEN.
   - Toast & Confirm dialogs instead of native browser alerts/confirms.
   - CSS semantic design tokens with light/dark theme switching.
   - Internationalization (i18n) for Indonesian and English.

## Consequences
- Clean separation of concerns and testability.
- Safe database evolution via dedicated repositories.
- Consistent user experience across all studio and admin tools.


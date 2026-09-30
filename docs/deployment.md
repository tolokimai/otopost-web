# Deployment & Operations Guide

## Runtime baseline
- Backend: Python 3.13.
- Frontend build: Node.js 20.

## Environments
- Development: Local FastAPI + Next.js + SQLite.
- Staging: Docker Compose with PostgreSQL + Redis + Mock worker.
- Production: Containerized deployment with SSL termination, PostgreSQL, S3-compatible storage, and remote NVIDIA GPU worker for MuseTalk.

## Health and Readiness Endpoints
- `GET /health`: Liveness probe. Returns HTTP 200 with service uptime and version.
- `GET /health/ready`: Readiness probe. Verifies database connectivity and essential storage access.
- `GET /remake/musetalk-status`: External dependency health check for GPU worker.

## Graceful Operations
- Storage: Assets written to dedicated volume with atomic write and unlink on failure.
- Database: versioned, forward-only migrations recorded in `schema_migrations`.

## Frontend API URL
- `NEXT_PUBLIC_API_BASE` is embedded in the frontend during `next build`; set it to the public HTTPS backend URL before building (for example, `https://backend.desouls.com`).
- For Docker Compose, set `NEXT_PUBLIC_API_BASE` in the environment used by Compose, then rebuild the frontend image with `docker compose --profile with-frontend up --build`.
- The backend `CORS_ORIGINS` must include the frontend's exact browser origin when using a separate frontend domain.


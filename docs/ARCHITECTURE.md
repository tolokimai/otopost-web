# Global Architecture

## Overview
OtoPost is built as a disciplined modular monorepo containing:
- **Frontend**: Next.js 14 App Router (React, Tailwind CSS, TypeScript).
- **Backend**: FastAPI (Python 3.12, SQLAlchemy, Pydantic).
- **GPU Worker**: Dedicated MuseTalk 1.5 worker service for neural lip-sync rendering.

## Layering and Dependency Direction
In accordance with the Engineering Constitution:
`Frontend (UI) → Route / Controller (Thin HTTP) → Service (Business Logic) → Repository (Data Access) → Database`

1. **Route Layer**:
   - Thin handlers that parse HTTP requests and query parameters.
   - Delegates authorization and calls domain services.
   - Returns responses wrapped in the standard `ApiResponse` envelope.

2. **Service Layer**:
   - Houses domain business rules (e.g. credit checks, billing order workflows, video generation pipelines).
   - Interacts with third-party providers strictly via abstraction boundaries.
   - Emits structured audit logs for sensitive operations.

3. **Repository Layer**:
   - The sole gateway to database persistence (`models.py`, `SessionLocal`).
   - Prevents SQL leaks into business logic or route controllers.

4. **Integration Adapters**:
   - Gemini AI adapter with prompt versioning.
   - Payment providers (Midtrans, Simulator).
   - Media processors (FFmpeg, yt-dlp, OpenCV).
   - MuseTalk 1.5 remote worker client with health verification.


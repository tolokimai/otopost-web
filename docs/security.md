# Security & Compliance Specification

## Principles
All external input is treated as untrusted. OtoPost enforces defense-in-depth across every boundary:

1. **Authentication & Authorization**:
   - JWT tokens with SHA-256 HMAC and configurable expiration.
   - Granular role checking via FastAPI dependencies (`get_current_user`, `require_admin`).
   - Identitas dan role diverifikasi di server; input client yang mengklaim status admin / plan otomatis diabaikan.

2. **Secret Management & Encryption**:
   - Sensitive values (Midtrans server keys, MuseTalk worker tokens, Gemini API keys) are encrypted with Fernet AES-128 before persisting to DB.
   - Secret keys are masked in admin settings and never returned to the frontend.
   - `.env` files are excluded from git.

3. **Rate Limiting & Abuse Prevention**:
   - In-memory sliding-window token bucket for sensitive and public endpoints:
     - Authentication (`/auth/login`, `/auth/register`): 10 req/min
     - AI Generation (`/ai/*`, `/carousel/generate`): 15 req/min
     - Media Uploads (`/remake/upload`): 20 req/min

4. **Input & File Validation**:
   - Strict file type checking, size limitations (100MB video/audio, 10MB photo), sanitized file names, and isolated media storage.

5. **Audit Logging**:
   - Critical events (LOGIN, USER_UPDATE, PLAN_UPDATE, SETTING_UPDATE, ORDER_PAID, MENU_DELETE) are immutably logged with actor ID, IP address, timestamp, target resource, and result.


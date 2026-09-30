# API Specification & Contract

Base URL local: `http://localhost:5000`. JSON endpoints use `Authorization: Bearer <JWT>` where required.

## Public/auth
- `GET /healthz`
- `POST /auth/register` — `{email,password,name?}`
- `POST /auth/login`
- `GET /auth/me`
- `GET|PUT /auth/credentials` — user Gemini key (encrypted at rest)
- `GET /config/studio-menus` — enabled menu configuration

`UserOut` includes `plan`, `credits`, `planExpiresAt`, dan `isAdmin`.

## Billing
- `GET /billing/plans` — DB-backed active plans
- `POST /billing/checkout` — `{plan}`
- `POST /billing/webhook/midtrans`
- `POST /billing/simulate/{orderId}/pay`
- `GET /billing/orders`
- `GET /billing/orders/{orderId}`

## Admin (admin JWT)
- `GET /admin/overview`
- `GET|POST /admin/plans`
- `PUT|DELETE /admin/plans/{id}`
- `GET /admin/settings`
- `PUT /admin/settings/{key}` — `{value,clear?}`; secret tidak pernah dikirim balik
- `GET|POST /admin/menus`
- `PUT|DELETE /admin/menus/{id}`
- `GET /admin/users?q=&limit=&offset=`
- `PUT /admin/users/{id}`

Bootstrap owner dengan `ADMIN_EMAILS=email@owner.com`. Existing user dengan email tersebut dipromosikan saat startup.

## Content Engine
- `GET|POST /personas`
- `GET|PUT|DELETE /personas/{id}`
- `POST /personas/generate` — draft AI, 1 kredit setelah hasil valid
- `GET /content-plans`
- `POST /content-plans/generate` — kalender 7/30 hari, 1 kredit setelah hasil valid
- `GET|PUT|DELETE /content-plans/{id}`
- `GET|POST /content-library`
- `GET|PUT|DELETE /content-library/{id}`
- `POST /content-library/{id}/duplicate`
- `POST /content-library/{id}/handoff` — hanya status `approved`

Semua endpoint membutuhkan JWT dan dibatasi ke data milik pengguna. Handoff memeriksa ulang enablement, readiness, dan paket minimum workflow tujuan di server.

## Podcast Clip
- `POST /transcript`
- `POST /ai/analyze-transcript`
- `POST /ai/hooks-captions`
- `POST /clips-async`
- `GET /clips/status/{job}`
- `POST /clips`

Batas segmen/durasi dibaca dari runtime settings. Endpoint dilindungi feature gate `podcast`.

## Carousel
- `POST /carousel/generate` — `{topic,audience,goal,tone,slideCount}`
- `POST /carousel/render` — `{title,slides[],design}` → `{images[],zipUrl}`
- `GET|POST /carousel/projects`
- `GET|PUT|DELETE /carousel/projects/{id}`
- `POST /carousel/projects/{id}/render`

Slide: `{headline,body,subtext,imageBase64?}`. Rasio: `1:1`, `4:5`, `3:4`, `9:16`, `16:9`.

## Remake
- `POST /remake/upload` — multipart `kind=photo|video|audio`, `file`
- `GET /remake/assets`
- `DELETE /remake/assets/{id}`
- `GET /remake/musetalk-status`
- `POST /remake/jobs`
- `GET /remake/jobs/{job}`

Contoh job:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operasi berhasil"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input data tidak valid"
  }
}
```

## Standard Error Code Catalog
- `AUTH_REQUIRED`: 401 Unauthorized (missing or invalid token)
- `FORBIDDEN`: 403 Forbidden (insufficient permissions, plan tier, or deactivated account)
- `NOT_FOUND`: 404 Not Found (resource does not exist)
- `VALIDATION_ERROR`: 422 Unprocessable Entity (malformed body, invalid parameters)
- `CONFLICT`: 409 Conflict (e.g. duplicate email, unique constraint violation)
- `RATE_LIMITED`: 429 Too Many Requests (rate limit exceeded)
- `INTERNAL_ERROR`: 500 Internal Server Error (unhandled system failure, internal stack hidden)

## Standard Pagination Contract
Query format: `GET /endpoint?page=1&limit=25&sort=created_at&order=desc&search=keyword`
Response format:
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 128,
    "page": 1,
    "limit": 25,
    "totalPages": 6
  }
}
```


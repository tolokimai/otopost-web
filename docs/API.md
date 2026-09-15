# API Reference

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

```json
{
  "mediaId": "...",
  "audioId": "...",
  "mode": "lipsync",
  "aspectRatio": "9:16",
  "subtitleText": "Teks opsional",
  "subtitleStyle": "bold",
  "consentConfirmed": true
}
```

`mode=lipsync` membutuhkan worker MuseTalk 1.5 yang sehat dan consent. Tidak ada fallback ke model lain. `mode=overlay` menggunakan FFmpeg lokal.

## MuseTalk worker
- `GET /health`
- `POST /v1/jobs` — multipart `face` + `audio`
- `GET /v1/jobs/{job}`
- `GET /files/{job}/result.mp4`

Bearer token diperlukan jika `WORKER_TOKEN` diset.

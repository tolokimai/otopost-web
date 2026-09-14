# Arsitektur OtoPost Web

## Prinsip

1. **Web/API tipis, pekerjaan berat terisolasi.** FastAPI menangani auth, project, billing, dan orkestrasi. FFmpeg berjalan di backend media; MuseTalk berjalan di worker NVIDIA GPU terpisah.
2. **DB-backed configuration.** `PlanConfig`, `AppSetting`, dan `StudioMenu` adalah sumber runtime. Default kode hanya seed/fallback saat tabel masih kosong.
3. **Server-side entitlement.** Menu minimum plan bukan kosmetik UI; dependency `require_feature()` memeriksa enabled/ready/required plan pada API.
4. **No fake fallback.** Mode `lipsync` hanya sukses jika MuseTalk menghasilkan video. Overlay adalah mode berbeda yang dipilih eksplisit.
5. **Async untuk proses lama.** Podcast dan Remake menggunakan job + polling agar tahan timeout proxy.

## Komponen

```text
Browser (Next.js)
  ├─ /admin                    CRUD package/settings/users/menus
  ├─ /studio                   dynamic workflow hub
  ├─ /studio/podcast           YouTube → clips
  ├─ /studio/carousel          AI → editor → PNG/ZIP
  └─ /studio/remake            uploads → overlay/MuseTalk
         │ HTTPS + JWT
FastAPI
  ├─ SQLAlchemy → SQLite/Postgres
  ├─ Gemini API
  ├─ yt-dlp / FFmpeg / OpenCV / Pillow
  ├─ Midtrans
  └─ MuseTalkClient ──HTTP──> MuseTalk 1.5 GPU Worker
                                  └─ official scripts.inference + CUDA
```

## Data model

- `User`: auth, plan, credits, expiry, active/admin.
- `Credential`: user API keys encrypted with Fernet.
- `UsageEvent`: usage and purchase events.
- `Order`: immutable purchase snapshot including credits and duration.
- `PlanConfig`: price, credits, duration, features, availability, order.
- `AppSetting`: typed runtime setting; secret values encrypted and never returned.
- `StudioMenu`: label/icon/path/order/enabled/ready/minimum plan.
- `StudioProject`: versionable JSON payload/output for Studio projects.
- `MediaAsset`: user-owned upload metadata; file below `CLIP_WORK_DIR`.

## Carousel

`POST /carousel/generate` uses Gemini with server/user key. Editor sends a validated `CarouselPayload` to `POST /carousel/render`. Pillow generates full-resolution slides for five ratios and packages them as ZIP. Project CRUD requires login.

## Remake / MuseTalk

1. User uploads a photo/video dan audio.
2. Backend validates ownership and creates a job.
3. FFmpeg normalizes visual length/aspect dan converts to 25 fps.
4. `overlay`: backend muxes audio locally.
5. `lipsync`: normalized media is sent to the isolated MuseTalk 1.5 worker.
6. Worker executes official `scripts.inference`, exposes status/result, and serializes GPU access.
7. Backend downloads output, adds optional subtitle, and exposes the result.

MuseTalk model files are never committed. Worker health verifies repository, v1.5 UNet/config, Whisper, dan FFmpeg. Production should replace multipart transfer with object storage for very large files.

## Known scaling boundaries

- `JobStore` is process memory: one API worker only until Redis is introduced.
- `/files` is public static serving: use R2/S3 signed URLs before broad launch.
- Lightweight schema migration is acceptable for current stage; move to Alembic before concurrent production migrations.

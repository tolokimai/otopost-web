# OtoPost Web — AI Podcast Clipper (SaaS-ready)

Ubah **1 video podcast panjang** menjadi **puluhan klip pendek viral** (Reels / TikTok / Shorts) secara otomatis: ambil transkrip → AI temukan momen viral → potong + reframe 9:16 + subtitle → caption & hashtag otomatis.

Repo ini adalah **penulisan ulang** dari aplikasi APK menjadi **web app** dengan arsitektur rapi yang siap tumbuh jadi produk langganan (SaaS).

> Fokus rilis pertama: **Podcast Clip**. Mode lain (Carousel, Self Video, AI Video) menyusul di roadmap.

---

## Arsitektur

```
                +---------------------------+
  Browser  <-->  |  Frontend (Next.js)       |   Vercel / Docker
                +------------+--------------+
                             | HTTPS (JSON)
                             v
                +---------------------------+
                |  Backend (FastAPI)        |   VPS Docker
                |  /transcript  /clips-async|
                |  /ai/*        /files/*     |
                +------------+--------------+
                             |
            yt-dlp  +  ffmpeg  +  OpenCV  +  Gemini API
```

- **Semua pekerjaan berat & API key ada di server** (aman, tidak bocor ke browser).
- **Pemotongan klip pakai pola async job + polling** supaya tidak kena timeout reverse-proxy (ini akar masalah “macet” di versi lama).
- **Frontend & backend beda origin** → backend meng-set `PUBLIC_BASE_URL` agar URL unduhan klip bersifat absolut.

---

## Struktur Monorepo

```
otopost-web/
├─ backend/                 # FastAPI
│  ├─ app/
│  │  ├─ core/             # config & security
│  │  ├─ schemas/          # model request/response (pydantic)
│  │  ├─ services/         # yt-dlp, ffmpeg, gemini, reframe, subtitle, jobs
│  │  ├─ routers/          # endpoint: health, transcript, clips, ai
│  │  └─ main.py           # app factory (CORS + mount /files + routers)
│  ├─ requirements.txt
│  └─ Dockerfile
├─ frontend/                # Next.js (App Router + TS + Tailwind)
│  ├─ app/                 # landing (/) + studio (/studio)
│  ├─ components/          # Header, SegmentCard, ClipCard
│  ├─ lib/api.ts           # client API + types
│  └─ Dockerfile
├─ docs/                    # ARCHITECTURE, API, ROADMAP
├─ docker-compose.yml
└─ .env.example
```

---

## Menjalankan Lokal

### 1) Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env      # isi GEMINI_API_KEY minimal
uvicorn app.main:app --reload --port 8000
```

Butuh **ffmpeg** terpasang di sistem (sudah otomatis di dalam Docker).

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE=http://localhost:8000
npm run dev                  # http://localhost:3000
```

### 3) Docker (backend saja)

```bash
docker compose up --build backend
```

Jalankan sekalian frontend:

```bash
docker compose --profile with-frontend up --build
```

---

## Environment Variables

| Variable | Sisi | Default | Keterangan |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | backend | — | **Wajib.** API key Google Gemini. |
| `GEMINI_MODEL` | backend | `gemini-2.5-flash` | Model analisis transkrip & caption. |
| `PUBLIC_BASE_URL` | backend | `""` | URL publik backend, mis. `https://handle.agenthebat.com`. Dipakai agar URL unduhan klip absolut. |
| `CLIP_WORK_DIR` | backend | `/data/clips` | Folder hasil klip (di-mount volume). |
| `CLIP_SERVER_TOKEN` | backend | `""` | Kalau diisi, semua endpoint butuh header `Authorization: Bearer <token>`. |
| `YTDLP_COOKIES` | backend | `""` | Path cookies.txt (opsional, untuk video terbatas). |
| `CORS_ORIGINS` | backend | `*` | Daftar origin frontend, pisah koma. |
| `NEXT_PUBLIC_API_BASE` | frontend | `http://localhost:8000` | URL backend yang dipanggil browser. |

---

## Deploy yang Disarankan

- **Backend** → Docker di VPS (butuh ffmpeg + CPU untuk encode). Set `GEMINI_API_KEY` & `PUBLIC_BASE_URL`.
- **Frontend** → Vercel (paling gampang) atau Docker. Set `NEXT_PUBLIC_API_BASE` ke URL backend.
- Nanti saat jadi produk berbayar, arahkan domain asli ke frontend, dan subdomain `api.` ke backend.

Lihat **[docs/ROADMAP.md](docs/ROADMAP.md)** untuk rencana menuju SaaS (login, langganan, database).

---

## Lisensi

MIT — lihat [LICENSE](LICENSE).

# OtoPost Web — AI Podcast Clipper (SaaS-ready)

Ubah **1 video podcast panjang** menjadi **puluhan klip pendek viral** (Reels / TikTok / Shorts) secara otomatis: ambil transkrip → AI temukan momen viral → potong + reframe 9:16 + subtitle → caption & hashtag otomatis.

Repo ini adalah **penulisan ulang** dari aplikasi APK menjadi **web app** dengan arsitektur rapi yang siap tumbuh jadi produk langganan (SaaS).

> Fokus rilis pertama: **Podcast Clip**. Mode lain (Carousel, Self Video, AI Video) menyusul di roadmap.

**Fase 0 (selesai):** login/registrasi + database + akun user (paket & kredit) + simpan API key Gemini sendiri (terenkripsi) + hardening endkerja (validasi input, batas segmen/durasi, TTL job, kredit).

---

## Arsitektur

```
                +---------------------------+
  Browser  <-->  |  Frontend (Next.js)       |   Vercel / Docker
                +------------+--------------+
                             | HTTPS (JSON, Bearer JWT)
                             v
                +---------------------------+
                |  Backend (FastAPI)        |   VPS Docker
                |  /auth/*  /transcript     |
                |  /clips-async  /ai/*      |
                +------------+--------------+
                             |
         SQLite/Postgres + yt-dlp + ffmpeg + OpenCV + Gemini API
```

- **Semua pekerjaan berat & API key ada di server** (aman, tidak bocor ke browser).
- **Pemotongan klip pakai pola async job + polling** supaya tidak kena timeout reverse-proxy (ini akar masalah “macet” di versi lama).
- **Frontend & backend beda origin** → backend meng-set `PUBLIC_BASE_URL` agar URL unduhan klip bersifat absolut.
- **Auth JWT + database** (SQLite default, Postgres opsional) menyimpan user, kredit, dan API key user (terenkripsi).

---

## Struktur Monorepo

```
otopost-web/
├─ backend/                 # FastAPI
│  ├─ app/
│  │  ├─ core/             # config, security, passwords, tokens (JWT), crypto, deps
│  │  ├─ db/               # engine, session, models (User, Credential, UsageEvent)
│  │  ├─ schemas/          # model request/response (pydantic)
│  │  ├─ services/         # yt-dlp, ffmpeg, gemini, reframe, subtitle, jobs
│  │  ├─ routers/          # endpoint: health, auth, transcript, clips, ai
│  │  └─ main.py           # app factory (lifespan init DB + CORS + /files + routers)
│  ├─ requirements.txt
│  └─ Dockerfile
├─ frontend/                # Next.js (App Router + TS + Tailwind)
│  ├─ app/                 # landing (/), studio (/studio), login, register, account
│  ├─ components/          # Header, SegmentCard, ClipCard
│  ├─ lib/api.ts           # client API + types
│  ├─ lib/auth.tsx         # AuthProvider + useAuth (JWT di localStorage)
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
cp ../.env.example .env      # isi GEMINI_API_KEY minimal; set JWT_SECRET untuk auth
uvicorn app.main:app --reload --port 8000
```

Butuh **ffmpeg** terpasang di sistem (sudah otomatis di dalam Docker). Database SQLite dibuat otomatis di `CLIP_WORK_DIR/otopost.db` saat start.

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

## Autentikasi & Kredit

- **Registrasi/Login** di `/register` & `/login` → dapat JWT (disimpan di `localStorage`).
- **Akun** (`/account`): lihat paket & kredit, simpan **API key Gemini sendiri** (disimpan terenkripsi di server; dipakai untuk analisis AI agar kuota tidak dibatasi server).
- **Mode wajib login:** set `REQUIRE_AUTH=true` (backend) dan `NEXT_PUBLIC_REQUIRE_AUTH=true` (frontend). Saat aktif, user paket `free` memakai 1 kredit tiap proses potong.
- **Default `false`:** Studio tetap bisa dicoba tanpa login (memudahkan demo).

---

## Environment Variables

| Variable | Sisi | Default | Keterangan |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | backend | — | API key Google Gemini (fallback server). |
| `GEMINI_MODEL` | backend | `gemini-2.5-flash` | Model analisis transkrip & caption. |
| `PUBLIC_BASE_URL` | backend | `""` | URL publik backend, mis. `https://backend.agenthebat.com`. Dipakai agar URL unduhan klip absolut. |
| `CLIP_WORK_DIR` | backend | `/data/clips` | Folder hasil klip + SQLite (di-mount volume). |
| `CLIP_SERVER_TOKEN` | backend | `""` | Legacy. Tidak lagi mem-block endpoint (digantikan JWT). |
| `YTDLP_COOKIES` | backend | `""` | Path cookies.txt (opsional). |
| `CORS_ORIGINS` | backend | `*` | Daftar origin frontend, pisah koma. |
| `DATABASE_URL` | backend | `""` | Kosong = SQLite. Postgres: `postgresql+psycopg2://...`. |
| `JWT_SECRET` | backend | `""` | **Wajib di produksi.** Kunci tanda tangan JWT. |
| `JWT_EXPIRE_MINUTES` | backend | `10080` | Masa berlaku token (default 7 hari). |
| `CREDENTIAL_ENC_KEY` | backend | `""` | Kunci enkripsi API key user. Kosong = turunkan dari `JWT_SECRET`. |
| `REQUIRE_AUTH` | backend | `false` | `true` = semua endpoint kerja wajib login. |
| `FREE_CREDITS` | backend | `30` | Kredit awal user paket free. |
| `MAX_SEGMENTS_PER_JOB` | backend | `30` | Batas jumlah segmen per proses. |
| `MAX_CLIP_SECONDS` | backend | `180` | Batas durasi tiap klip (detik). |
| `JOB_TTL_SECONDS` | backend | `3600` | Umur status job di memori. |
| `NEXT_PUBLIC_API_BASE` | frontend | `http://localhost:8000` | URL backend yang dipanggil browser. |
| `NEXT_PUBLIC_REQUIRE_AUTH` | frontend | `false` | `true` = Studio wajib login. |

> Catatan: variabel `NEXT_PUBLIC_*` di-*inline* saat build. Bila diubah, **rebuild** image/deploy frontend.

---

## Deploy yang Disarankan

- **Backend** → Docker di VPS (butuh ffmpeg + CPU untuk encode). Set `GEMINI_API_KEY`, `PUBLIC_BASE_URL`, dan `JWT_SECRET`.
- **Frontend** → Vercel (paling gampang) atau Docker. Set `NEXT_PUBLIC_API_BASE` ke URL backend.
- Produksi saat ini: backend `https://backend.agenthebat.com`, frontend `https://otopost.agenthebat.com`.
- Untuk skala: set `DATABASE_URL` ke Postgres dan pindahkan `JobStore` ke Redis.

Lihat **[docs/ROADMAP.md](docs/ROADMAP.md)** untuk rencana menuju SaaS penuh (langganan/billing, storage, worker).

---

## Lisensi

MIT — lihat [LICENSE](LICENSE).

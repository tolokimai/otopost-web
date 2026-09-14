# OtoPost Web

OtoPost adalah fondasi SaaS produksi konten: Podcast Clip, Carousel Studio, Remake/audio overlay, true lipsync MuseTalk 1.5, billing, dan admin DB-backed dalam monorepo Next.js + FastAPI.

> Status jujur: fitur di atas tersedia di kode. Persona, Content Plan, kalender, dan auto-post belum dibangun; lihat `docs/ROADMAP.md`. MuseTalk membutuhkan NVIDIA GPU/model terpisah dan tetap harus diuji pada deployment GPU milikmu.

## Yang tersedia

- **Admin `/admin`**: CRUD paket, harga, kredit, masa aktif, runtime settings/secret, user, role, menu, toggle, urutan, dan minimum plan.
- **Studio Hub `/studio`**: menu berasal dari database.
- **Podcast `/studio/podcast`**: transkrip YouTube → momen AI → potong/reframe/subtitle → caption.
- **Carousel `/studio/carousel`**: AI outline, editor, rasio/tema/warna/foto/CTA/watermark, project, PNG + ZIP.
- **Remake `/studio/remake`**: foto/video + audio, overlay FFmpeg, subtitle, dan true lipsync MuseTalk 1.5.
- **Billing**: Free/Creator/Pro seed, Midtrans/simulate, order dan expiry.

## Arsitektur ringkas

```text
Next.js ──JWT/JSON──> FastAPI ──> SQLite/Postgres
                         ├─ Gemini, yt-dlp, FFmpeg, OpenCV, Pillow
                         ├─ Midtrans
                         └─ HTTP ──> MuseTalk 1.5 NVIDIA GPU Worker
```

## Menjalankan lokal di Windows

### Backend

PowerShell:

```powershell
cd C:\Users\USER\otopost-web\backend
.\setup.ps1
Copy-Item ..\.env.example .env
```

Edit `backend\.env` minimal:

```env
CLIP_WORK_DIR=.\data\clips
PUBLIC_BASE_URL=http://localhost:5000
APP_BASE_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=ganti-dengan-random-panjang
ADMIN_EMAILS=email-kamu@example.com
PAYMENT_PROVIDER=simulate
```

Jalankan dengan interpreter venv yang sama:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

Verifikasi:

```powershell
.\.venv\Scripts\python.exe -c "import sqlalchemy; print(sqlalchemy.__version__)"
ffmpeg -version
```

`ModuleNotFoundError: sqlalchemy` berarti requirements belum dipasang pada interpreter yang menjalankan Uvicorn. Jangan mencampur Uvicorn global dengan Python venv.

### Frontend

```powershell
cd C:\Users\USER\otopost-web\frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:5000
NEXT_PUBLIC_REQUIRE_AUTH=false
```

Buka `http://localhost:3000`. Variabel `NEXT_PUBLIC_*` di-inline saat build; rebuild setelah mengubahnya.

### Owner admin

1. Set `ADMIN_EMAILS` ke email akunmu.
2. Register/login menggunakan email tersebut.
3. Startup otomatis mempromosikan existing user yang cocok.
4. Buka `/admin`.

Secret (Midtrans/MuseTalk token) dienkripsi sebelum disimpan dan tidak pernah dikirim kembali ke browser. Environment variable tetap menjadi fallback bila nilai DB belum diset.

## Docker

Backend:

```bash
docker compose up --build backend
```

Backend + frontend:

```bash
docker compose --profile with-frontend up --build
```

Frontend Docker menerima `NEXT_PUBLIC_API_BASE` sebagai **build arg**, sudah diteruskan oleh Compose.

## Billing

Tanpa akun merchant, gunakan `PAYMENT_PROVIDER=simulate`. Untuk Midtrans:

```env
PAYMENT_PROVIDER=midtrans
MIDTRANS_SERVER_KEY=...
MIDTRANS_CLIENT_KEY=...
MIDTRANS_IS_PRODUCTION=false
APP_BASE_URL=https://frontend.domain.tld
```

Notification URL: `https://backend.domain.tld/billing/webhook/midtrans`.

Harga/fitur/durasi paket setelah seed diubah lewat Admin → Paket, bukan source code.

## MuseTalk 1.5

OtoPost **tidak menggunakan Wav2Lip**. True lipsync dikerjakan oleh worker terpisah berbasis official `TMElyralab/MuseTalk` v1.5. Backend biasa tidak cocok menjalankan model ini karena membutuhkan CUDA/PyTorch/model besar.

Lihat `workers/musetalk/README.md`. Setelah worker GPU sehat, set di backend/Admin:

```env
MUSETALK_WORKER_URL=https://musetalk.domain.tld
MUSETALK_WORKER_TOKEN=token-panjang
MUSETALK_TIMEOUT_SECONDS=1800
```

Jika worker tidak siap, endpoint lipsync mengembalikan error konfigurasi; OtoPost tidak membuat output palsu. Mode audio overlay tetap dapat digunakan tanpa GPU.

## QA

```bash
cd backend
python -m compileall app
cd ../frontend
npm run build
```

Media smoke test dan struktur lengkap dijelaskan di `docs/ARCHITECTURE.md`; endpoint di `docs/API.md`.

## Batas produksi saat ini

Sebelum menjual ke banyak pengguna: pindahkan SQLite ke Postgres, JobStore ke Redis, file ke R2/S3 signed URLs, tambahkan rate limit/observability/backup, dan deploy staging. Lisensi MIT; lihat `LICENSE`.

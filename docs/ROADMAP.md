# Roadmap OtoPost Web

## Fase 1 — MVP Podcast Clip (repo ini)
- [x] Backend FastAPI modular (transcript, analyze, clips async, hooks/captions)
- [x] Reframe 9:16 berbasis deteksi wajah + 10 gaya subtitle
- [x] Frontend Next.js: landing + Studio (workflow lengkap)
- [x] Docker + docker-compose + CI
- [ ] Deploy backend ke VPS + frontend ke Vercel
- [ ] Uji end-to-end dengan video nyata

## Fase 2 — Jadi Produk (SaaS)
- [ ] **Auth**: registrasi/login (email + Google), JWT
- [ ] **Database** (Postgres): user, riwayat job, kuota
- [ ] **Langganan & pembayaran**: Midtrans / Xendit (mendukung QRIS, e-wallet, VA) — paket Free / Creator / Pro
- [ ] **Kuota & rate limit** per paket
- [ ] **Storage** hasil klip ke S3 / Cloudflare R2 (+ CDN) supaya hemat disk VPS
- [ ] **Antrian** Redis + worker terpisah untuk render paralel
- [ ] Dashboard riwayat & unduhan

## Fase 3 — Fitur Konten Lain
- [ ] Mode **Carousel** (sudah stabil di app lama — porting ke web)
- [ ] Mode **Self Video** & **AI Video** (Veo / Imagen) dengan long-running job
- [ ] Penjadwalan auto-post ke sosial media
- [ ] Analitik performa klip

## Catatan Teknis Menuju Skala
- `JobStore` in-memory → Redis (ganti isi kelas, interface tetap).
- Endpoint sudah punya guard token → ganti ke verifikasi JWT saat auth siap.
- Pisahkan worker render dari web server agar tidak saling blok.

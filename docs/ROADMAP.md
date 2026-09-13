# Roadmap OtoPost Web

## Fase 1 — MVP Podcast Clip (selesai)
- [x] Backend FastAPI modular (transcript, analyze, clips async, hooks/captions)
- [x] Reframe 9:16 berbasis deteksi wajah + 10 gaya subtitle
- [x] Frontend Next.js: landing + Studio (workflow lengkap)
- [x] Docker + docker-compose + CI
- [ ] Deploy backend ke VPS + frontend ke Vercel
- [ ] Uji end-to-end dengan video nyata

## Fase 0 — Auth, Database & Hardening (selesai)
- [x] **Auth**: registrasi/login email + JWT (HS256, stdlib), password `pbkdf2_sha256`
- [x] **Database** (SQLAlchemy): SQLite default, Postgres via `DATABASE_URL` — model User / Credential / UsageEvent
- [x] **Akun user**: paket & kredit, halaman `/account`
- [x] **API key Gemini per user** disimpan terenkripsi (Fernet); dipakai saat analisis AI
- [x] **Hardening**: validasi URL, batas jumlah segmen & durasi klip, TTL `JobStore`, konsumsi kredit
- [x] Mode `REQUIRE_AUTH` (default off agar demo mudah)
- [ ] Login Google (OAuth) — menyusul
- [ ] Verifikasi email + reset password

## Fase 2 — Langganan & Billing
- [ ] **Pembayaran**: Midtrans / Xendit (QRIS, e-wallet, VA) — paket Free / Creator / Pro
- [ ] Webhook pembayaran → upgrade paket + top-up kredit otomatis
- [ ] **Kuota & rate limit** per paket, halaman tagihan/riwayat
- [ ] Landing & pricing dipoles untuk konversi

## Fase 3 — Skala & Storage
- [ ] **Storage** hasil klip ke S3 / Cloudflare R2 (+ CDN) supaya hemat disk VPS
- [ ] **Antrian** Redis + worker terpisah untuk render paralel (ganti `JobStore`)
- [ ] Dashboard riwayat & unduhan

## Fase 4 — Fitur Konten Lain (porting dari app lama)
- [ ] Mode **Carousel** (WYSIWYG + render server + AI background + export ZIP)
- [ ] Mode **Self Video** & **AI Video** (Veo / Imagen) dengan long-running job
- [ ] **Persona** & **Content Plan** (7/30 hari)
- [ ] Penjadwalan auto-post ke sosial media (approval-gated) + analitik performa klip

## Catatan Teknis Menuju Skala
- `JobStore` in-memory → Redis (ganti isi kelas, interface `set/get` tetap).
- `require_user_or_open` → wajibkan JWT saat `REQUIRE_AUTH=true`.
- Pisahkan worker render dari web server agar tidak saling blok.
- SQLite → Postgres cukup dengan mengisi `DATABASE_URL` (model sudah kompatibel).

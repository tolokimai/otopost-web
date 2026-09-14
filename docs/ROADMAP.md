# Roadmap OtoPost Web

Status dibedakan antara **kode tersedia** dan **teruji pada infrastruktur produksi** agar tidak ada klaim palsu.

## Fondasi SaaS — selesai di kode
- [x] FastAPI modular + Next.js App Router
- [x] Auth email/JWT, User, kredit, API key Gemini terenkripsi
- [x] SQLite default / Postgres lewat `DATABASE_URL`
- [x] Billing provider-agnostic, Midtrans + mode simulasi, order idempoten
- [x] Paket 30 hari, expiry, riwayat transaksi
- [x] Admin DB-backed: paket, runtime settings/secret, user, kredit, role, menu Studio
- [x] Server-side entitlement berdasarkan paket minimum menu
- [x] Seed/fallback aman; perubahan admin tidak perlu redeploy
- [ ] OAuth Google, verifikasi email, reset password
- [ ] Alembic migration (saat ini migrasi ringan idempoten)

## Studio
### Podcast Clip — tersedia
- [x] Transkrip YouTube, rekomendasi momen AI, pilihan segmen
- [x] Async clip job, reframe wajah, rasio, 10 gaya subtitle
- [x] Hook/caption/hashtag per klip
- [ ] Uji regresi berkala terhadap video publik nyata

### Carousel — tersedia
- [x] AI outline 3–12 slide dari topik/audiens
- [x] Editor slide, reorder, tema, rasio 1:1/4:5/3:4/9:16/16:9
- [x] Warna, tipografi, efek, foto background, CTA, watermark, nomor halaman
- [x] Pillow renderer resolusi penuh + PNG individual + ZIP
- [x] Simpan/edit project per user
- [ ] Drag/pinch elemen bebas dan AI image background

### Remake & Lipsync — pipeline tersedia
- [x] Upload foto/video/audio per user
- [x] FFmpeg audio overlay: loop/trim mengikuti audio, 25 fps, rasio, subtitle
- [x] **MuseTalk 1.5** isolated GPU worker + health check + async polling
- [x] Tidak memakai Wav2Lip; lipsync gagal jujur bila worker belum siap
- [x] Consent gate untuk hak wajah/audio
- [ ] Deploy worker pada NVIDIA GPU dan uji E2E dengan media berizin
- [ ] R2/S3 untuk transfer media besar ke worker

### Belum dibangun
- [ ] Self Video: hook banner, subtitle, script AI
- [ ] AI Video: provider Veo/Imagen dengan job queue

## Sistem Otomasi Konten — berikutnya
- [ ] Persona CRUD + generator AI (brand, niche, audiens, tone, bahasa)
- [ ] Content Plan 7/30 hari dan tombol kirim ke setiap Studio workflow
- [ ] Content library + status draft/review/approved/scheduled/published/failed
- [ ] Kalender, retry, audit log
- [ ] Adapter TikTok, Instagram/Facebook, YouTube (approval-gated)
- [ ] Analytics konten, revenue attribution, eksperimen hook

## Skala produksi
- [ ] PostgreSQL wajib
- [ ] Redis + worker queue; ganti `JobStore` in-memory
- [ ] Object storage R2/S3 + signed URL + CDN
- [ ] Rate limit per paket, observability, backup, retention policy
- [ ] CI integration test + staging environment

# Arsitektur OtoPost Web

## Prinsip

1. **Server-heavy, client-thin.** Download video, transkrip, panggilan Gemini, dan encode ffmpeg semuanya di backend. Browser hanya menampilkan UI & memutar hasil. API key tidak pernah sampai ke browser.
2. **Async by default untuk kerja berat.** Pemotongan klip memakai pola *job + polling* (`/clips-async` → `/clips/status/{job}`) supaya request pendek dan tahan timeout reverse-proxy.
3. **Modular & mudah dites.** Setiap tanggung jawab dipisah ke `services/` (I/O eksternal) dan `routers/` (HTTP). Skema request/response terpusat di `schemas/`.
4. **Stateless → siap discale.** `JobStore` in-memory memakai interface `set/get` sederhana; tinggal ganti ke Redis untuk multi-worker tanpa mengubah pemanggil.

## Alur Podcast Clip

```
1. POST /transcript        { url }
   -> validasi url http(s) -> yt-dlp ambil metadata + subtitle (id -> en) -> parse VTT
   <- { title, durationSec, hasTranscript, transcriptText, segments[] }

2. POST /ai/analyze-transcript { topic, segments[] }
   -> susun transkrip ber-timestamp [MM:SS] -> Gemini (pakai key user bila ada)
   <- { segments: [ { startSec, endSec, title, hook, reasonWhyViral, ... } ] }

3. POST /clips-async       { url, segments[], aspectRatio, reframe, subtitle, subtitleStyle }
   -> validasi (jumlah/durasi) + potong kredit -> download sumber 1x
   -> loop segmen: reframe (deteksi wajah) + burn subtitle -> ffmpeg
   <- { job }

4. GET /clips/status/{job} (poll tiap 5 detik)
   <- { status: processing|done|error, clips: [ { downloadUrl, reframed, subtitled } ] }

5. (opsional) POST /ai/hooks-captions { topic, style }
   <- { viralHook, caption, hashtags, subtitles[] }
```

## Auth, Database & Kredit (Fase 0)

```
register/login -> hash password (pbkdf2_sha256) -> simpan User -> terbitkan JWT (HS256)
request kerja  -> Authorization: Bearer <JWT> -> deps resolve current user (opsional/wajib)
API key user   -> PUT /auth/credentials -> enkripsi (Fernet) -> simpan Credential
analisis AI    -> pakai API key user (didekripsi) bila ada, else key server
potong klip    -> bila REQUIRE_AUTH & paket free: kurangi 1 kredit (402 bila habis)
```

- **Password**: `pbkdf2_sha256` (stdlib `hashlib`), 200k iterasi, format `pbkdf2_sha256$iters$salt$hash`.
- **JWT**: HS256 ditulis tangan pakai stdlib (`hmac`/`hashlib`/`base64`) — tanpa dependency tambahan.
- **Enkripsi credential**: `cryptography` Fernet; kunci diturunkan dari `CREDENTIAL_ENC_KEY` (atau `JWT_SECRET`).
- **Auth mode**: `require_user_or_open` — hanya memaksa login bila `REQUIRE_AUTH=true`, sehingga demo tetap mudah.

## Backend layer

| Layer | Isi | Contoh |
| --- | --- | --- |
| `core` | konfigurasi, keamanan, auth util | `config.py`, `passwords.py`, `tokens.py`, `crypto.py`, `deps.py` |
| `db` | engine, session, model ORM | `base.py`, `models.py` (User, Credential, UsageEvent) |
| `schemas` | kontrak data (pydantic) | `auth.py`, `transcript.py`, `clips.py`, `ai.py` |
| `services` | logika + I/O eksternal | `youtube.py`, `gemini.py`, `reframe.py`, `subtitles.py`, `clipper.py`, `jobs.py` |
| `routers` | endpoint HTTP tipis | `auth.py`, `transcript.py`, `clips.py`, `ai.py`, `health.py` |

## Model Data

- **User**: `id`, `email` (unik), `password_hash`, `name`, `plan` (`free`…), `credits`, `is_active`, `is_admin`, timestamp.
- **Credential**: `user_id`, `provider` (mis. `gemini`), `encrypted_value` — unik per (user, provider).
- **UsageEvent**: `user_id` (nullable), `kind` (`transcript`/`analyze`/`clips`/…), `amount`, `detail`, `created_at` — dasar analitik & billing nanti.

## Reframe & Subtitle

- **Reframe 9:16**: ambil 1 frame di tengah segmen → deteksi wajah (OpenCV Haar cascade) → crop terpusat ke wajah, fallback ke tengah bila tak ada wajah.
- **Subtitle burn-in**: ambil cue VTT untuk jendela waktu segmen → tulis SRT relatif → `ffmpeg subtitles=...force_style=...` dengan 10 preset gaya.

## Keamanan

- JWT wajib untuk endpoint akun (`/auth/me`, `/auth/credentials`).
- Endpoint kerja mengikuti `REQUIRE_AUTH`. API key user selalu disimpan terenkripsi.
- CORS dibatasi lewat `CORS_ORIGINS` di produksi. Selalu set `JWT_SECRET` yang kuat.

# API Reference

Base URL contoh: `https://backend.agenthebat.com`

Semua body & response berformat JSON.

## Autentikasi

- Login mengembalikan **JWT**. Kirim di header `Authorization: Bearer <accessToken>`.
- Bila `REQUIRE_AUTH=false` (default), endpoint kerja (`/transcript`, `/clips*`, `/ai/*`) **boleh** dipanggil tanpa login. Bila `true`, wajib login.
- `CLIP_SERVER_TOKEN` lama tidak lagi mem-block endpoint (digantikan JWT). File `security.py` dipertahankan untuk kompatibilitas.

---

## GET /healthz

```json
{ "ok": true, "service": "otopost-api", "aiReady": true }
```

---

## POST /auth/register

**Request**
```json
{ "email": "user@mail.com", "password": "minimal8char", "name": "Nama" }
```

**Response** `200`
```json
{
  "accessToken": "eyJhbGciOi...",
  "tokenType": "bearer",
  "user": { "id": "..", "email": "user@mail.com", "name": "Nama", "plan": "free", "credits": 30 }
}
```
Error: `409` bila email sudah terdaftar.

---

## POST /auth/login

**Request**
```json
{ "email": "user@mail.com", "password": "minimal8char" }
```

**Response** sama seperti `/auth/register`. Error `401` bila kredensial salah, `403` bila akun nonaktif.

---

## GET /auth/me

Butuh `Authorization: Bearer <token>`.
```json
{ "id": "..", "email": "user@mail.com", "name": "Nama", "plan": "free", "credits": 30 }
```

---

## GET /auth/credentials

Status API key pihak ketiga milik user (nilainya tidak pernah dikirim balik).
```json
{ "providers": [ { "provider": "gemini", "configured": true } ] }
```

## PUT /auth/credentials

Simpan / hapus API key (disimpan **terenkripsi**). Kirim `value` kosong untuk menghapus.
```json
{ "provider": "gemini", "value": "AIza..." }
```
**Response**
```json
{ "provider": "gemini", "configured": true }
```
Provider yang didukung saat ini: `gemini`.

---

## POST /transcript

**Request**
```json
{ "url": "https://youtube.com/watch?v=...", "langs": ["id", "en"] }
```
Validasi: `url` wajib `http(s)://` (else `400`).

**Response**
```json
{
  "videoId": "abc123",
  "title": "Judul Podcast",
  "channelName": "Nama Channel",
  "durationSec": 3600,
  "hasTranscript": true,
  "transcriptText": "...",
  "segments": [ { "startSec": 12.3, "text": "..." } ]
}
```

---

## POST /ai/analyze-transcript

**Request**
```json
{
  "topic": "Judul / topik video",
  "segments": [ { "startSec": 12, "text": "..." } ],
  "maxSegments": 15
}
```
> Boleh juga kirim `"transcript": "teks penuh"` sebagai ganti `segments`.
> Bila user sudah menyimpan API key Gemini sendiri, key itulah yang dipakai.

**Response**
```json
{
  "segments": [
    {
      "startSec": 45,
      "endSec": 95,
      "durationFormatted": "00:45 - 01:35 (50 detik)",
      "title": "Judul klip",
      "hook": "Kalimat hook",
      "reasonWhyViral": "Alasan",
      "transcriptSnippet": "Cuplikan"
    }
  ]
}
```

---

## POST /clips-async  (disarankan)

**Request**
```json
{
  "url": "https://youtube.com/watch?v=...",
  "segments": [ { "startSec": 45, "endSec": 95, "title": "Klip 1" } ],
  "aspectRatio": "9:16",
  "reframe": true,
  "subtitle": true,
  "subtitleStyle": "tiktok",
  "maxHeight": 1080
}
```
Validasi: `url` `http(s)://`; jumlah segmen `1..MAX_SEGMENTS_PER_JOB`; tiap durasi `> 0` dan `<= MAX_CLIP_SECONDS`. Bila `REQUIRE_AUTH=true` & paket `free`, tiap proses memakai 1 kredit (`402` bila habis).

**Response**
```json
{ "job": "a1b2c3d4e5f6", "status": "processing" }
```

### GET /clips/status/{job}
```json
{
  "job": "a1b2c3d4e5f6",
  "status": "done",
  "clips": [
    {
      "index": 1,
      "title": "Klip 1",
      "startSec": 45,
      "endSec": 95,
      "reframed": true,
      "subtitled": true,
      "downloadUrl": "https://.../files/<job>/clip_1.mp4"
    }
  ]
}
```
`status`: `processing` | `done` | `error`. Job kedaluwarsa otomatis setelah `JOB_TTL_SECONDS`.

---

## POST /clips  (sinkron)

Sama seperti `/clips-async` tapi menunggu sampai selesai lalu langsung mengembalikan `{ job, clips[] }`. Cocok untuk 1–2 segmen.

---

## POST /ai/hooks-captions

**Request**
```json
{ "topic": "Judul klip", "style": "Energetic & Insightful" }
```

**Response**
```json
{
  "viralHook": "...",
  "caption": "...",
  "hashtags": "#reels #tiktok #shorts #viral",
  "subtitles": ["Baris 1", "Baris 2", "Baris 3", "Baris 4"]
}
```

---

## Gaya Subtitle

`clean`, `bold`, `box`, `yellow`, `tiktok`, `karaoke`, `minimal`, `highlight`, `neon`, `pop`.

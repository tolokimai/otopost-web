# API Reference

Base URL contoh: `https://handle.agenthebat.com`

Semua body & response berformat JSON. Bila `CLIP_SERVER_TOKEN` diset, sertakan header `Authorization: Bearer <token>`.

---

## GET /healthz

```json
{ "ok": true, "service": "otopost-api", "aiReady": true }
```

---

## POST /transcript

**Request**
```json
{ "url": "https://youtube.com/watch?v=...", "langs": ["id", "en"] }
```

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
`status`: `processing` | `done` | `error`.

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

# Arsitektur OtoPost Web

## Prinsip

1. **Server-heavy, client-thin.** Download video, transkrip, panggilan Gemini, dan encode ffmpeg semuanya di backend. Browser hanya menampilkan UI & memutar hasil. API key tidak pernah sampai ke browser.
2. **Async by default untuk kerja berat.** Pemotongan klip memakai pola *job + polling* (`/clips-async` → `/clips/status/{job}`) supaya request pendek dan tahan timeout reverse-proxy.
3. **Modular & mudah dites.** Setiap tanggung jawab dipisah ke `services/` (I/O eksternal) dan `routers/` (HTTP). Skema request/response terpusat di `schemas/`.
4. **Stateless → siap discale.** `JobStore` in-memory memakai interface `set/get` sederhana; tinggal ganti ke Redis untuk multi-worker tanpa mengubah pemanggil.

## Alur Podcast Clip

```
1. POST /transcript        { url }
   -> yt-dlp ambil metadata + subtitle (id -> en) -> parse VTT
   <- { title, durationSec, hasTranscript, transcriptText, segments[] }

2. POST /ai/analyze-transcript { topic, segments[] }
   -> susun transkrip ber-timestamp [MM:SS] -> Gemini
   <- { segments: [ { startSec, endSec, title, hook, reasonWhyViral, ... } ] }

3. POST /clips-async       { url, segments[], aspectRatio, reframe, subtitle, subtitleStyle }
   -> download sumber 1x -> loop segmen: reframe (deteksi wajah) + burn subtitle -> ffmpeg
   <- { job }

4. GET /clips/status/{job} (poll tiap 5 detik)
   <- { status: processing|done|error, clips: [ { downloadUrl, reframed, subtitled } ] }

5. (opsional) POST /ai/hooks-captions { topic, style }
   <- { viralHook, caption, hashtags, subtitles[] }
```

## Backend layer

| Layer | Isi | Contoh |
| --- | --- | --- |
| `core` | konfigurasi & keamanan | `config.py`, `security.py` |
| `schemas` | kontrak data (pydantic) | `transcript.py`, `clips.py`, `ai.py` |
| `services` | logika + I/O eksternal | `youtube.py`, `gemini.py`, `reframe.py`, `subtitles.py`, `clipper.py`, `jobs.py` |
| `routers` | endpoint HTTP tipis | `transcript.py`, `clips.py`, `ai.py`, `health.py` |

## Reframe & Subtitle

- **Reframe 9:16**: ambil 1 frame di tengah segmen → deteksi wajah (OpenCV Haar cascade) → crop terpusat ke wajah, fallback ke tengah bila tak ada wajah.
- **Subtitle burn-in**: ambil cue VTT untuk jendela waktu segmen → tulis SRT relatif → `ffmpeg subtitles=...force_style=...` dengan 10 preset gaya.

## Keamanan

- Guard opsional `CLIP_SERVER_TOKEN` (Bearer). Saat fase SaaS, dependency `require_token` diganti verifikasi JWT user.
- CORS dibatasi lewat `CORS_ORIGINS` di produksi.

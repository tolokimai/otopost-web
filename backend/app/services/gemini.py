import json
import urllib.error
import urllib.request
from typing import List, Optional

from fastapi import HTTPException

from ..core.config import settings
from ..schemas.ai import AnalyzeRequest, HooksRequest


def generate(prompt: str, api_key: Optional[str] = None, model: Optional[str] = None) -> str:
    key = (api_key or settings.gemini_api_key or "").strip()
    if not key or key == "MY_GEMINI_API_KEY":
        raise HTTPException(status_code=400, detail="GEMINI_API_KEY belum diset di server.")
    mdl = model or settings.gemini_model
    url = "https://generativelanguage.googleapis.com/v1beta/models/" + mdl + ":generateContent?key=" + key
    payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = resp.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", "ignore")
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="Gemini error " + str(e.code) + ": " + body[:300])
    except Exception as e:
        raise HTTPException(status_code=502, detail="Gagal memanggil Gemini: " + str(e))
    try:
        obj = json.loads(data)
    except Exception:
        return ""
    cands = obj.get("candidates") or []
    if not cands:
        return ""
    content = (cands[0] or {}).get("content") or {}
    parts = content.get("parts") or []
    if not parts:
        return ""
    return parts[0].get("text", "") or ""


def _strip_fence(text: str) -> str:
    clean = (text or "").strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    if clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return clean.strip()


def extract_json_array(text: str):
    clean = _strip_fence(text)
    a = clean.find("[")
    b = clean.rfind("]")
    if a != -1 and b != -1 and b > a:
        clean = clean[a:b + 1]
    return json.loads(clean)


def extract_json_object(text: str):
    clean = _strip_fence(text)
    a = clean.find("{")
    b = clean.rfind("}")
    if a != -1 and b != -1 and b > a:
        clean = clean[a:b + 1]
    return json.loads(clean)


def fmt_clock(t) -> str:
    t = int(max(0, t))
    h = t // 3600
    m = (t % 3600) // 60
    s = t % 60
    if h > 0:
        return "%d:%02d:%02d" % (h, m, s)
    return "%02d:%02d" % (m, s)


def analyze_transcript(req: AnalyzeRequest) -> List[dict]:
    """Rekomendasi potongan viral LANGSUNG dari transkrip asli + timestamp."""
    if req.segments:
        ts = "\n".join("[" + fmt_clock(s.startSec) + "] " + ((s.text or "").strip()) for s in req.segments)
    else:
        ts = req.transcript or ""
    if not ts.strip():
        raise HTTPException(status_code=400, detail="Transkrip kosong")
    if len(ts) > 100000:
        ts = ts[:100000]
    target = max(3, min(int(req.maxSegments or 12), 25))
    topic = (req.topic or "").strip() or "(umum)"
    prompt = (
        "Kamu adalah Video Editor & Content Strategist ahli Short-Form Viral Clips (TikTok, Reels, Shorts).\n"
        "Analisis transkrip video/podcast berikut tentang topik \"" + topic + "\". "
        "Setiap baris transkrip diberi timestamp [MM:SS] atau [H:MM:SS].\n\n"
        "Transkrip:\n" + ts + "\n\n"
        "Tugas: temukan SEMUA segmen paling berpotensi viral SEPANJANG video (jangan hanya bagian awal), "
        "masing-masing berdurasi 20-60 detik, yang punya emosi kuat, quote menohok, insight tak terduga, atau momen debat. "
        "Minimal 3, maksimal " + str(target) + " segmen. Gunakan timestamp untuk menentukan startSec dan endSec yang AKURAT dalam DETIK (angka bulat). "
        "Jangan mengulang segmen yang mirip. Urutkan dari yang paling berpotensi viral.\n\n"
        "Balas HANYA JSON array valid tanpa markdown, format:\n"
        "[{\"startSec\":45,\"endSec\":95,\"durationFormatted\":\"00:45 - 01:35 (50 detik)\",\"title\":\"Judul singkat menarik\",\"hook\":\"Kalimat hook 3 detik pertama\",\"reasonWhyViral\":\"Alasan kenapa berpotensi viral\",\"transcriptSnippet\":\"Cuplikan kalimat utama dari segmen\"}]"
    )
    text = generate(prompt)
    try:
        arr = extract_json_array(text)
    except Exception as e:
        raise HTTPException(status_code=502, detail="Gagal parse hasil AI: " + str(e))
    out = []
    for i, it in enumerate(arr):
        if not isinstance(it, dict):
            continue
        try:
            ss = int(round(float(it.get("startSec", 0))))
        except Exception:
            ss = 0
        try:
            es = int(round(float(it.get("endSec", ss + 45))))
        except Exception:
            es = ss + 45
        if es <= ss:
            es = ss + 30
        out.append({
            "startSec": ss,
            "endSec": es,
            "durationFormatted": it.get("durationFormatted") or (fmt_clock(ss) + " - " + fmt_clock(es) + " (" + str(es - ss) + " detik)"),
            "title": it.get("title") or ("Klip #" + str(i + 1)),
            "hook": it.get("hook") or "",
            "reasonWhyViral": it.get("reasonWhyViral") or "",
            "transcriptSnippet": it.get("transcriptSnippet") or "",
        })
    return out


def hooks_captions(req: HooksRequest) -> dict:
    prompt = (
        "Buatkan 1 Hook viral 3-detik pertama, caption media sosial lengkap dengan CTA, hashtag relevan, "
        "dan 4 baris teks subtitle untuk video pendek.\n"
        "Topik: \"" + (req.topic or "") + "\", Gaya: \"" + (req.style or "Energetic") + "\".\n\n"
        "Balas HANYA JSON valid tanpa markdown:\n"
        "{\"viralHook\":\"Teks hook besar\",\"caption\":\"Caption dengan storytelling dan CTA\",\"hashtags\":\"#reels #tiktok #shorts #viral\",\"subtitles\":[\"Baris 1\",\"Baris 2\",\"Baris 3\",\"Baris 4\"]}"
    )
    text = generate(prompt)
    try:
        obj = extract_json_object(text)
    except Exception as e:
        raise HTTPException(status_code=502, detail="Gagal parse hasil AI: " + str(e))
    subs = obj.get("subtitles") or []
    if not isinstance(subs, list):
        subs = []
    return {
        "viralHook": obj.get("viralHook", ""),
        "caption": obj.get("caption", ""),
        "hashtags": obj.get("hashtags", ""),
        "subtitles": subs,
    }

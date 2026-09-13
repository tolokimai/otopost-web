import re
from typing import List, Tuple


def parse_vtt(path: str) -> Tuple[List[dict], str]:
    """Parse VTT -> (segments[{startSec,text}], full_text)."""
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    blocks = re.split(r"\n\n+", content)
    ts_re = re.compile(r"(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->")
    segs = []
    for b in blocks:
        m = ts_re.search(b)
        if not m:
            continue
        h, mnt, s, ms = map(int, m.groups())
        start = h * 3600 + mnt * 60 + s + ms / 1000.0
        lines = [
            l for l in b.splitlines()
            if "-->" not in l and not l.strip().isdigit() and l.strip()
            and not l.strip().startswith("WEBVTT") and not l.strip().startswith("Kind:")
            and not l.strip().startswith("Language:")
        ]
        clean = re.sub(r"<[^>]+>", " ", " ".join(lines))
        clean = re.sub(r"\s+", " ", clean).strip()
        if clean:
            segs.append({"startSec": round(start, 2), "text": clean})
    dedup, full, prev = [], [], None
    for seg in segs:
        if seg["text"] != prev:
            dedup.append(seg)
            full.append(seg["text"])
        prev = seg["text"]
    return dedup, " ".join(full)


def parse_vtt_cues(path: str) -> List[dict]:
    """Parse VTT -> list cue [{start,end,text}] untuk burn-in subtitle."""
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    blocks = re.split(r"\n\n+", content)
    ts_re = re.compile(
        r"(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})"
    )
    cues = []
    for b in blocks:
        m = ts_re.search(b)
        if not m:
            continue
        h1, m1, s1, ms1, h2, m2, s2, ms2 = map(int, m.groups())
        start = h1 * 3600 + m1 * 60 + s1 + ms1 / 1000.0
        end = h2 * 3600 + m2 * 60 + s2 + ms2 / 1000.0
        lines = [
            l for l in b.splitlines()
            if "-->" not in l and not l.strip().isdigit() and l.strip()
            and not l.strip().startswith("WEBVTT") and not l.strip().startswith("Kind:")
            and not l.strip().startswith("Language:")
        ]
        clean = re.sub(r"<[^>]+>", " ", " ".join(lines))
        clean = re.sub(r"\s+", " ", clean).strip()
        if clean:
            cues.append({"start": round(start, 3), "end": round(end, 3), "text": clean})
    dedup, prev = [], None
    for c in cues:
        if c["text"] != prev:
            dedup.append(c)
        prev = c["text"]
    return dedup


def srt_time(sec: float) -> str:
    if sec < 0:
        sec = 0.0
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int(round((sec - int(sec)) * 1000))
    if ms >= 1000:
        ms = 999
    return "%02d:%02d:%02d,%03d" % (h, m, s, ms)


def write_window_srt(cues: List[dict], win_start: float, win_end: float, srt_path: str) -> bool:
    """Tulis SRT relatif terhadap awal klip (win_start) untuk 1 segmen."""
    idx = 1
    lines = []
    for c in cues:
        cs = float(c["start"])
        ce = float(c["end"])
        if ce <= win_start or cs >= win_end:
            continue
        rel_start = max(0.0, cs - win_start)
        rel_end = min(win_end, ce) - win_start
        if rel_end <= rel_start:
            rel_end = rel_start + 0.5
        lines.append(str(idx))
        lines.append(srt_time(rel_start) + " --> " + srt_time(rel_end))
        lines.append(c["text"])
        lines.append("")
        idx += 1
    if not lines:
        return False
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return True


# 10 gaya subtitle siap pakai (ASS force_style untuk filter ffmpeg subtitles=).
STYLES = {
    "clean": "FontName=Arial,Fontsize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=60",
    "bold": "FontName=Arial,Fontsize=22,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1,Alignment=2,MarginV=60",
    "box": "FontName=Arial,Fontsize=18,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H90000000,BorderStyle=3,Outline=0,Shadow=0,Alignment=2,MarginV=60",
    "yellow": "FontName=Arial,Fontsize=20,Bold=1,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1,Alignment=2,MarginV=60",
    "tiktok": "FontName=Arial,Fontsize=24,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=4,Shadow=2,Alignment=2,MarginV=90",
    "karaoke": "FontName=Arial,Fontsize=24,Bold=1,PrimaryColour=&H0000FFFF,SecondaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1,Alignment=2,MarginV=80",
    "minimal": "FontName=Arial,Fontsize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=1,Outline=1,Shadow=0,Alignment=2,MarginV=50",
    "highlight": "FontName=Arial,Fontsize=20,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&HB0000000,BorderStyle=3,Outline=0,Shadow=0,Alignment=2,MarginV=70",
    "neon": "FontName=Arial,Fontsize=22,Bold=1,PrimaryColour=&H00F0FF00,OutlineColour=&H00FF00AA,BorderStyle=1,Outline=3,Shadow=2,Alignment=2,MarginV=70",
    "pop": "FontName=Arial,Fontsize=26,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=5,Shadow=2,Alignment=2,MarginV=90",
}


def sub_style(style: str) -> str:
    return STYLES.get((style or "clean").lower(), STYLES["clean"])

import glob
import os
import uuid
from typing import Callable, List, Optional

import yt_dlp
from fastapi import HTTPException

from ..core.config import settings
from . import subtitles


def base_opts() -> dict:
    o = {"quiet": True, "no_warnings": True}
    if settings.ytdlp_cookies and os.path.exists(settings.ytdlp_cookies):
        o["cookiefile"] = settings.ytdlp_cookies
    return o


def _rank_langs(requested: List[str]) -> Callable[[str], int]:
    def rank(p: str) -> int:
        name = os.path.basename(p).lower()
        for i, lg in enumerate(requested):
            if ("." + lg.lower() + ".") in name:
                return i
        return len(requested) + 1

    return rank


def fetch_transcript(url: str, langs: Optional[List[str]] = None) -> dict:
    requested = langs or ["id", "id-ID", "en", "en-US"]
    job = "t_" + uuid.uuid4().hex[:12]
    tmp = os.path.join(settings.work_dir, job)
    os.makedirs(tmp, exist_ok=True)

    groups = [
        [lg for lg in requested if lg.lower().startswith("id")],
        [lg for lg in requested if lg.lower().startswith("en")],
    ]
    groups = [g for g in groups if g]

    try:
        meta_opts = base_opts()
        meta_opts.update({"skip_download": True})
        with yt_dlp.YoutubeDL(meta_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        raise HTTPException(status_code=502, detail="Gagal mengambil info video: " + str(e))

    vtts: List[str] = []
    for grp in groups:
        try:
            opts = base_opts()
            opts.update({
                "skip_download": True,
                "writesubtitles": True,
                "writeautomaticsub": True,
                "subtitleslangs": grp,
                "subtitlesformat": "vtt",
                "outtmpl": os.path.join(tmp, "%(id)s.%(ext)s"),
            })
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.extract_info(url, download=True)
            vtts = glob.glob(os.path.join(tmp, "*.vtt"))
            if vtts:
                break
        except Exception as e:
            print("WARNING: subtitle gagal untuk", grp, ":", str(e))
            continue

    vtts.sort(key=_rank_langs(requested))

    duration = info.get("duration")
    duration = int(duration) if duration else None

    if not vtts:
        return {
            "videoId": info.get("id"),
            "title": info.get("title"),
            "channelName": info.get("uploader"),
            "durationSec": duration,
            "hasTranscript": False,
            "transcriptText": "",
            "segments": [],
        }

    segs, full = subtitles.parse_vtt(vtts[0])
    return {
        "videoId": info.get("id"),
        "title": info.get("title"),
        "channelName": info.get("uploader"),
        "durationSec": duration,
        "hasTranscript": bool(full),
        "transcriptText": full,
        "segments": segs,
    }


def download_source(url: str, tmp: str, max_h: int) -> str:
    fmt = "bv*[height<=" + str(max_h) + "]+ba/b[height<=" + str(max_h) + "]/best"
    opts = base_opts()
    opts.update({
        "format": fmt,
        "merge_output_format": "mp4",
        "outtmpl": os.path.join(tmp, "src.%(ext)s"),
    })
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.extract_info(url, download=True)
    cands = glob.glob(os.path.join(tmp, "src.*"))
    if not cands:
        raise HTTPException(status_code=502, detail="Video gagal diunduh")
    return cands[0]


def download_vtt_cues(url: str, tmp: str) -> List[dict]:
    langs = ["id", "id-ID", "en", "en-US"]
    sub_dir = os.path.join(tmp, "subs")
    os.makedirs(sub_dir, exist_ok=True)
    opts = base_opts()
    opts.update({
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": langs,
        "subtitlesformat": "vtt",
        "outtmpl": os.path.join(sub_dir, "%(id)s.%(ext)s"),
    })
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.extract_info(url, download=True)
    except Exception as e:
        print("WARNING: subtitle download gagal:", str(e))
    vtts = glob.glob(os.path.join(sub_dir, "*.vtt"))
    vtts.sort(key=_rank_langs(langs))
    if not vtts:
        return []
    return subtitles.parse_vtt_cues(vtts[0])

import os
import subprocess
import uuid
from typing import Optional

from fastapi import HTTPException

from ..core.config import settings
from ..schemas.clips import ClipsRequest
from . import reframe, subtitles, youtube


def _file_url(rel_path: str) -> str:
    base = settings.public_base if settings.public_base else ""
    return base + "/files/" + rel_path


def process_clips(req: ClipsRequest, job: Optional[str] = None) -> dict:
    """Pipeline potong: download sumber sekali -> loop segmen -> reframe + subtitle -> encode."""
    if not req.segments:
        raise HTTPException(status_code=400, detail="Tidak ada segmen")
    if job is None:
        job = uuid.uuid4().hex[:12]
    tmp = os.path.join(settings.work_dir, job)
    os.makedirs(tmp, exist_ok=True)

    try:
        src = youtube.download_source(req.url, tmp, req.maxHeight or 1080)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail="Gagal download: " + str(e))

    src_w, src_h = reframe.probe_dim(src)

    cues = []
    if req.subtitle:
        try:
            cues = youtube.download_vtt_cues(req.url, tmp)
        except Exception as e:
            print("WARNING: gagal ambil subtitle:", str(e))
            cues = []

    style_str = subtitles.sub_style(req.subtitleStyle or "clean")
    results = []
    for idx, seg in enumerate(req.segments):
        start = max(0.0, float(seg.startSec))
        end = float(seg.endSec)
        if end <= start:
            continue
        mid = start + (end - start) / 2.0
        face_cx = reframe.face_center_x(src, mid) if req.reframe else None
        vf = reframe.build_vf(src_w, src_h, req.aspectRatio or "9:16", bool(req.reframe), face_cx)
        subtitled = False
        srt_name = "clip_" + str(idx + 1) + ".srt"
        srt_path = os.path.join(tmp, srt_name)
        if req.subtitle and cues:
            try:
                wrote = subtitles.write_window_srt(cues, start, end, srt_path)
                if wrote:
                    vf = vf + ",subtitles=" + srt_name + ":force_style='" + style_str + "'"
                    subtitled = True
            except Exception as e:
                print("WARNING: gagal tulis srt:", str(e))
        out_name = "clip_" + str(idx + 1) + ".mp4"
        out_path = os.path.join(tmp, out_name)
        cmd = [
            "ffmpeg", "-y", "-ss", str(start), "-to", str(end), "-i", src,
            "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out_name,
        ]
        proc = subprocess.run(cmd, capture_output=True, cwd=tmp)
        if proc.returncode != 0 or not os.path.exists(out_path):
            continue
        results.append({
            "index": idx + 1,
            "title": seg.title or ("Clip " + str(idx + 1)),
            "startSec": start,
            "endSec": end,
            "reframed": face_cx is not None,
            "subtitled": subtitled,
            "downloadUrl": _file_url(job + "/" + out_name),
        })
    if not results:
        raise HTTPException(status_code=500, detail="Semua segmen gagal dipotong")
    return {"job": job, "clips": results}

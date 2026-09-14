"""Remake pipeline: FFmpeg overlay or true lipsync via MuseTalk 1.5 worker."""
import os
import shutil
import subprocess
from dataclasses import dataclass

from .musetalk_client import MuseTalkClient, MuseTalkConfig
from .subtitles import srt_time, sub_style

TARGETS = {"9:16": (720, 1280), "1:1": (1080, 1080), "16:9": (1280, 720)}


@dataclass(frozen=True)
class RemakeConfig:
    work_dir: str
    public_base: str
    worker_url: str = ""
    worker_token: str = ""
    worker_timeout: int = 1800


def probe_duration(path: str) -> float:
    try:
        value = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
            stderr=subprocess.STDOUT,
        ).decode().strip()
        return max(0.0, float(value))
    except Exception:
        return 0.0


def _run(command: list[str], cwd: str | None = None) -> None:
    result = subprocess.run(command, capture_output=True, cwd=cwd)
    if result.returncode != 0:
        raise RuntimeError("FFmpeg gagal: " + result.stderr.decode("utf-8", "ignore")[-1200:])


def prepare_visual(source: str, kind: str, duration: float, aspect: str, output: str) -> None:
    width, height = TARGETS.get(aspect, TARGETS["9:16"])
    base = f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},setsar=1,fps=25,format=yuv420p"
    command = ["ffmpeg", "-y"]
    if kind == "photo":
        frames = max(1, round(duration * 25))
        zoom = (
            f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},"
            f"zoompan=z='min(zoom+0.00035,1.10)':d={frames}:s={width}x{height}:fps=25,setsar=1,format=yuv420p"
        )
        command += ["-loop", "1", "-i", source, "-vf", zoom]
    else:
        if 0 < probe_duration(source) < duration:
            command += ["-stream_loop", "-1"]
        command += ["-i", source, "-vf", base]
    command += [
        "-t", f"{duration:.3f}", "-an", "-c:v", "libx264", "-preset", "veryfast",
        "-crf", "18", "-movflags", "+faststart", output,
    ]
    _run(command)


def _write_srt(text: str, duration: float, path: str) -> None:
    clean = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(f"1\n{srt_time(0)} --> {srt_time(max(0.5, duration))}\n{clean}\n")


def _subtitle_filter(text: str, duration: float, style: str, job_dir: str) -> list[str]:
    if not text.strip():
        return []
    _write_srt(text, duration, os.path.join(job_dir, "caption.srt"))
    return ["-vf", "subtitles=caption.srt:force_style='" + sub_style(style) + "'"]


def mux_overlay(
    visual: str,
    audio: str,
    output: str,
    duration: float,
    subtitle_text: str = "",
    subtitle_style: str = "clean",
) -> None:
    job_dir = os.path.dirname(output)
    command = ["ffmpeg", "-y", "-i", visual, "-i", audio]
    command += _subtitle_filter(subtitle_text, duration, subtitle_style, job_dir)
    command += [
        "-map", "0:v:0", "-map", "1:a:0", "-t", f"{duration:.3f}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart",
        os.path.basename(output),
    ]
    _run(command, cwd=job_dir)


def add_subtitle(source: str, output: str, text: str, style: str, duration: float) -> None:
    if not text.strip():
        shutil.move(source, output)
        return
    job_dir = os.path.dirname(output)
    command = ["ffmpeg", "-y", "-i", os.path.basename(source)]
    command += _subtitle_filter(text, duration, style, job_dir)
    command += [
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "copy",
        "-movflags", "+faststart", os.path.basename(output),
    ]
    _run(command, cwd=job_dir)


def _download_url(config: RemakeConfig, relative: str) -> str:
    return config.public_base.rstrip("/") + "/files/" + relative.replace(os.sep, "/")


def process_remake(
    job: str,
    user_id: str,
    media_path: str,
    media_kind: str,
    audio_path: str,
    mode: str,
    aspect: str,
    subtitle_text: str,
    subtitle_style: str,
    config: RemakeConfig,
) -> None:
    from .jobs import jobs

    relative_dir = os.path.join("remake", job)
    job_dir = os.path.join(config.work_dir, relative_dir)
    os.makedirs(job_dir, exist_ok=True)
    prepared = os.path.join(job_dir, "visual-25fps.mp4")
    raw = os.path.join(job_dir, "musetalk-raw.mp4")
    final = os.path.join(job_dir, "result.mp4")
    try:
        duration = probe_duration(audio_path)
        if duration <= 0:
            raise RuntimeError("Durasi audio tidak terbaca")
        jobs.set(job, {"status": "processing", "progress": 10, "userId": user_id})
        prepare_visual(media_path, media_kind, duration, aspect, prepared)
        jobs.set(job, {"status": "processing", "progress": 30})
        if mode == "lipsync":
            client = MuseTalkClient(MuseTalkConfig(config.worker_url, config.worker_token, config.worker_timeout))
            jobs.set(job, {"status": "processing", "progress": 40})
            client.run(prepared, audio_path, raw)
            jobs.set(job, {"status": "processing", "progress": 90})
            add_subtitle(raw, final, subtitle_text, subtitle_style, duration)
            applied = True
        else:
            mux_overlay(prepared, audio_path, final, duration, subtitle_text, subtitle_style)
            applied = False
        if not os.path.isfile(final) or os.path.getsize(final) == 0:
            raise RuntimeError("Output remake kosong")
        jobs.set(job, {
            "status": "done", "progress": 100, "mode": mode, "userId": user_id,
            "downloadUrl": _download_url(config, os.path.join(relative_dir, "result.mp4")),
            "error": "", "lipsyncApplied": applied, "durationSec": round(probe_duration(final), 2),
        })
    except Exception as exc:
        jobs.set(job, {
            "status": "error", "progress": 100, "mode": mode, "userId": user_id,
            "downloadUrl": "", "error": str(exc)[:1000], "lipsyncApplied": False,
        })

"""OtoPost GPU worker wrapper for official MuseTalk 1.5."""
import json
import os
import shutil
import subprocess
import sys
import threading
import uuid
from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles

WORK_DIR = Path(os.environ.get("WORK_DIR", "/data/musetalk"))
MUSETALK_DIR = Path(os.environ.get("MUSETALK_DIR", "/opt/MuseTalk"))
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
WORKER_TOKEN = os.environ.get("WORKER_TOKEN", "")
MAX_UPLOAD_MB = max(1, int(os.environ.get("MAX_UPLOAD_MB", "150")))
JOB_TIMEOUT_SECONDS = max(60, int(os.environ.get("JOB_TIMEOUT_SECONDS", "1800")))
BATCH_SIZE = max(1, int(os.environ.get("MUSETALK_BATCH_SIZE", "8")))
GPU_ID = max(0, int(os.environ.get("MUSETALK_GPU_ID", "0")))

WORK_DIR.mkdir(parents=True, exist_ok=True)
app = FastAPI(title="OtoPost MuseTalk 1.5 Worker", version="1.0.0")
app.mount("/files", StaticFiles(directory=str(WORK_DIR)), name="files")
_JOBS: dict[str, dict] = {}
_JOB_LOCK = threading.Lock()
_GPU_LOCK = threading.Lock()


def _authorize(authorization: Optional[str]) -> None:
    if WORKER_TOKEN and authorization != "Bearer " + WORKER_TOKEN:
        raise HTTPException(status_code=401, detail="Token worker tidak valid")


def _checks() -> dict:
    checks = {
        "repository": (MUSETALK_DIR / "scripts" / "inference.py").is_file(),
        "unet": (MUSETALK_DIR / "models" / "musetalkV15" / "unet.pth").is_file(),
        "config": (MUSETALK_DIR / "models" / "musetalkV15" / "musetalk.json").is_file(),
        "whisper": (MUSETALK_DIR / "models" / "whisper").is_dir(),
        "ffmpeg": bool(shutil.which("ffmpeg")),
    }
    return checks


def _set_job(job: str, **values) -> None:
    with _JOB_LOCK:
        current = _JOBS.get(job, {})
        current.update(values)
        _JOBS[job] = current
        snapshot = dict(current)
    folder = WORK_DIR / job
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "status.json").write_text(json.dumps(snapshot), encoding="utf-8")


def _get_job(job: str) -> Optional[dict]:
    with _JOB_LOCK:
        if job in _JOBS:
            return dict(_JOBS[job])
    status_file = WORK_DIR / job / "status.json"
    if status_file.is_file():
        try:
            return json.loads(status_file.read_text(encoding="utf-8"))
        except Exception:
            pass
    return None


async def _save(upload: UploadFile, destination: Path) -> None:
    total = 0
    limit = MAX_UPLOAD_MB * 1024 * 1024
    try:
        with destination.open("wb") as output:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > limit:
                    raise HTTPException(status_code=413, detail=f"File maksimal {MAX_UPLOAD_MB} MB")
                output.write(chunk)
    finally:
        await upload.close()
    if total == 0:
        raise HTTPException(status_code=400, detail="File kosong")


def _run_job(job: str, face: Path, audio: Path) -> None:
    folder = WORK_DIR / job
    result_dir = folder / "results"
    task_config = folder / "task.yaml"
    task_config.write_text(
        "task_0:\n video_path: " + json.dumps(str(face)) + "\n audio_path: " + json.dumps(str(audio)) + "\n",
        encoding="utf-8",
    )
    output_name = "result.mp4"
    command = [
        sys.executable, "-m", "scripts.inference",
        "--inference_config", str(task_config),
        "--result_dir", str(result_dir),
        "--unet_model_path", str(MUSETALK_DIR / "models/musetalkV15/unet.pth"),
        "--unet_config", str(MUSETALK_DIR / "models/musetalkV15/musetalk.json"),
        "--whisper_dir", str(MUSETALK_DIR / "models/whisper"),
        "--version", "v15", "--gpu_id", str(GPU_ID),
        "--batch_size", str(BATCH_SIZE), "--output_vid_name", output_name,
        "--use_float16",
    ]
    _set_job(job, status="processing", progress=10, error="", downloadUrl="")
    try:
        with _GPU_LOCK:
            result = subprocess.run(
                command, cwd=str(MUSETALK_DIR), capture_output=True,
                timeout=JOB_TIMEOUT_SECONDS,
            )
        log = (result.stdout + b"\n" + result.stderr).decode("utf-8", "ignore")[-5000:]
        (folder / "worker.log").write_text(log, encoding="utf-8")
        expected = result_dir / "v15" / output_name
        if result.returncode != 0 or not expected.is_file():
            raise RuntimeError("MuseTalk gagal; lihat worker.log. " + log[-700:])
        final = folder / "result.mp4"
        shutil.move(str(expected), str(final))
        relative = f"/files/{job}/result.mp4"
        _set_job(
            job, status="done", progress=100, error="",
            downloadUrl=(PUBLIC_BASE_URL + relative) if PUBLIC_BASE_URL else relative,
        )
    except subprocess.TimeoutExpired:
        _set_job(job, status="error", progress=100, error="MuseTalk timeout", downloadUrl="")
    except Exception as exc:
        _set_job(job, status="error", progress=100, error=str(exc)[:1200], downloadUrl="")


@app.get("/health")
def health(authorization: Optional[str] = Header(default=None)):
    _authorize(authorization)
    checks = _checks()
    ready = all(checks.values())
    return {
        "ready": ready, "engine": "MuseTalk 1.5", "checks": checks,
        "error": "" if ready else "Repository/model MuseTalk 1.5 belum lengkap",
    }


@app.post("/v1/jobs", status_code=202)
async def create_job(
    background: BackgroundTasks,
    face: UploadFile = File(...),
    audio: UploadFile = File(...),
    authorization: Optional[str] = Header(default=None),
):
    _authorize(authorization)
    checks = _checks()
    if not all(checks.values()):
        raise HTTPException(status_code=503, detail={"message": "MuseTalk belum siap", "checks": checks})
    job = "mt_" + uuid.uuid4().hex[:12]
    folder = WORK_DIR / job
    folder.mkdir(parents=True, exist_ok=True)
    face_path = folder / ("face" + (Path(face.filename or "face.mp4").suffix.lower() or ".mp4"))
    audio_path = folder / ("audio" + (Path(audio.filename or "audio.wav").suffix.lower() or ".wav"))
    try:
        await _save(face, face_path)
        await _save(audio, audio_path)
    except Exception:
        shutil.rmtree(folder, ignore_errors=True)
        raise
    _set_job(job, status="queued", progress=0, downloadUrl="", error="")
    background.add_task(_run_job, job, face_path, audio_path)
    return {"job": job, "status": "queued"}


@app.get("/v1/jobs/{job}")
def get_job(job: str, authorization: Optional[str] = Header(default=None)):
    _authorize(authorization)
    state = _get_job(job)
    if state is None:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan")
    return {"job": job, **state}

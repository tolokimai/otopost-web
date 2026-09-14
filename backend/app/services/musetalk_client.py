"""HTTP adapter for an isolated MuseTalk 1.5 GPU worker."""
import json
import mimetypes
import os
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class MuseTalkConfig:
    base_url: str
    token: str = ""
    timeout_seconds: int = 1800


class MuseTalkClient:
    def __init__(self, config: MuseTalkConfig) -> None:
        self.base = (config.base_url or "").rstrip("/")
        self.token = config.token or ""
        self.timeout = max(60, int(config.timeout_seconds))

    def _headers(self) -> dict[str, str]:
        return {"Authorization": "Bearer " + self.token} if self.token else {}

    def _json(self, url: str) -> dict:
        req = urllib.request.Request(url, headers=self._headers())
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "ignore")[:500]
            raise RuntimeError(f"MuseTalk worker HTTP {exc.code}: {detail}")
        except Exception as exc:
            raise RuntimeError(f"MuseTalk worker tidak dapat dihubungi: {exc}")

    def health(self) -> dict:
        if not self.base:
            return {"ready": False, "error": "MUSETALK_WORKER_URL belum diset"}
        return self._json(self.base + "/health")

    @staticmethod
    def _multipart(face_path: str, audio_path: str) -> tuple[bytes, str]:
        boundary = "----OtoPost" + uuid.uuid4().hex
        chunks: list[bytes] = []
        for field, path in (("face", face_path), ("audio", audio_path)):
            filename = os.path.basename(path)
            mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
            chunks.append((f"--{boundary}\r\n").encode())
            chunks.append(
                (
                    f'Content-Disposition: form-data; name="{field}"; filename="{filename}"\r\n'
                    f"Content-Type: {mime}\r\n\r\n"
                ).encode()
            )
            with open(path, "rb") as handle:
                chunks.append(handle.read())
            chunks.append(b"\r\n")
        chunks.append((f"--{boundary}--\r\n").encode())
        return b"".join(chunks), boundary

    def submit(self, face_path: str, audio_path: str) -> str:
        if not self.base:
            raise RuntimeError("MUSETALK_WORKER_URL belum diset")
        body, boundary = self._multipart(face_path, audio_path)
        headers = {
            **self._headers(),
            "Content-Type": "multipart/form-data; boundary=" + boundary,
            "Content-Length": str(len(body)),
        }
        req = urllib.request.Request(
            self.base + "/v1/jobs", data=body, headers=headers, method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as response:
                result = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "ignore")[:500]
            raise RuntimeError(f"MuseTalk submit HTTP {exc.code}: {detail}")
        job = str(result.get("job") or "")
        if not job:
            raise RuntimeError("Worker tidak mengembalikan job ID")
        return job

    def run(self, face_path: str, audio_path: str, output_path: str) -> None:
        health = self.health()
        if not health.get("ready"):
            raise RuntimeError(str(health.get("error") or health.get("checks") or "MuseTalk worker belum siap"))
        job = self.submit(face_path, audio_path)
        deadline = time.time() + self.timeout
        while time.time() < deadline:
            state = self._json(self.base + "/v1/jobs/" + job)
            status = str(state.get("status") or "")
            if status == "done":
                url = str(state.get("downloadUrl") or "")
                if not url:
                    raise RuntimeError("Worker selesai tanpa downloadUrl")
                if url.startswith("/"):
                    url = self.base + url
                req = urllib.request.Request(url, headers=self._headers())
                with urllib.request.urlopen(req, timeout=300) as response, open(output_path, "wb") as out:
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        out.write(chunk)
                if not os.path.isfile(output_path) or os.path.getsize(output_path) == 0:
                    raise RuntimeError("Output MuseTalk kosong")
                return
            if status == "error":
                raise RuntimeError(str(state.get("error") or "MuseTalk worker gagal"))
            time.sleep(3)
        raise RuntimeError(f"MuseTalk timeout setelah {self.timeout} detik")

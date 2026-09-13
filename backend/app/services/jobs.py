import time
from threading import Lock
from typing import Dict, Optional

from ..core.config import settings


class JobStore:
    """Penyimpan status job async (in-memory, aman untuk 1 worker).

    Menyimpan timestamp dan auto-purge job kedaluwarsa supaya memori tidak
    membengkak. Untuk multi-worker, ganti implementasi ke Redis/DB dengan
    interface set/get yang sama.
    """

    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._data: Dict[str, dict] = {}
        self._lock = Lock()
        self._ttl = max(60, int(ttl_seconds))

    def set(self, job: str, value: dict) -> None:
        with self._lock:
            existing = self._data.get(job) or {}
            merged = {**existing, **value}
            merged.setdefault("createdAt", time.time())
            merged["updatedAt"] = time.time()
            self._data[job] = merged
            self._purge_locked()

    def get(self, job: str) -> Optional[dict]:
        with self._lock:
            self._purge_locked()
            return self._data.get(job)

    def _purge_locked(self) -> None:
        now = time.time()
        stale = [
            key
            for key, val in self._data.items()
            if now - float(val.get("createdAt", now)) > self._ttl
        ]
        for key in stale:
            self._data.pop(key, None)


jobs = JobStore(settings.job_ttl_seconds)

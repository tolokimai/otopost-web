from threading import Lock
from typing import Dict, Optional


class JobStore:
    """Penyimpan status job async.

    Implementasi in-memory ini cukup untuk deploy 1 worker. Untuk skala besar,
    ganti isinya dengan Redis/DB tanpa mengubah pemanggil (interface sama).
    """

    def __init__(self) -> None:
        self._data: Dict[str, dict] = {}
        self._lock = Lock()

    def set(self, job: str, value: dict) -> None:
        with self._lock:
            self._data[job] = value

    def get(self, job: str) -> Optional[dict]:
        with self._lock:
            return self._data.get(job)


jobs = JobStore()

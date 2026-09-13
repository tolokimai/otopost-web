import subprocess
from typing import Optional, Tuple


def probe_dim(path: str) -> Tuple[Optional[int], Optional[int]]:
    try:
        out = subprocess.check_output([
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", path,
        ]).decode().strip()
        w, h = out.split("x")[:2]
        return int(w), int(h)
    except Exception:
        return None, None


def face_center_x(path: str, t: float) -> Optional[float]:
    """Deteksi wajah pada detik t; kembalikan pusat-X wajah terbesar (untuk reframe 9:16)."""
    try:
        import cv2

        cap = cv2.VideoCapture(path)
        cap.set(cv2.CAP_PROP_POS_MSEC, max(t, 0.0) * 1000)
        ok, frame = cap.read()
        cap.release()
        if not ok or frame is None:
            return None
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = cascade.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))
        if len(faces) == 0:
            return None
        fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
        return fx + fw / 2.0
    except Exception:
        return None


def build_vf(src_w, src_h, aspect: str, reframe: bool, face_cx) -> str:
    """Bangun filter -vf ffmpeg: crop 9:16 / 1:1 (opsional ke wajah) lalu scale."""
    if not src_w or not src_h:
        return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
    if aspect == "9:16":
        crop_w = min(int(round(src_h * 9 / 16)), src_w)
        if reframe and face_cx is not None:
            x0 = int(round(face_cx - crop_w / 2))
        else:
            x0 = int(round((src_w - crop_w) / 2))
        x0 = max(0, min(x0, src_w - crop_w))
        return "crop=" + str(crop_w) + ":" + str(src_h) + ":" + str(x0) + ":0,scale=1080:1920"
    if aspect == "1:1":
        side = min(src_w, src_h)
        x0 = int(round((src_w - side) / 2))
        y0 = int(round((src_h - side) / 2))
        return "crop=" + str(side) + ":" + str(side) + ":" + str(x0) + ":" + str(y0) + ",scale=1080:1080"
    return "scale=-2:1080"

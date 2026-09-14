"""Typed runtime settings backed by the database, with environment fallbacks."""
from dataclasses import dataclass
from typing import Any, Optional

from sqlalchemy.orm import Session

from ..core import crypto
from ..core.config import settings
from ..db import models


@dataclass(frozen=True)
class SettingSpec:
    key: str
    label: str
    category: str
    value_type: str
    default: str
    description: str
    is_secret: bool = False


SETTING_SPECS = [
    SettingSpec("support_email", "Email dukungan", "general", "string", "", "Ditampilkan untuk bantuan pelanggan."),
    SettingSpec("require_auth", "Wajib login", "auth", "bool", str(settings.require_auth).lower(), "Wajibkan akun untuk memakai endpoint produksi."),
    SettingSpec("free_credits", "Kredit pendaftaran", "auth", "int", str(settings.free_credits), "Kredit awal untuk akun baru."),
    SettingSpec("billing_enabled", "Aktifkan billing", "billing", "bool", str(settings.billing_enabled).lower(), "Izinkan checkout paket berbayar."),
    SettingSpec("payment_provider", "Provider pembayaran", "billing", "string", settings.payment_provider or "simulate", "Nilai: simulate atau midtrans."),
    SettingSpec("app_base_url", "URL frontend", "billing", "string", settings.app_base_url, "URL publik frontend untuk halaman kembali pembayaran."),
    SettingSpec("billing_simulate_allow", "Izinkan simulasi", "billing", "bool", str(settings.billing_simulate_allow).lower(), "Izinkan endpoint simulasi walau provider bukan simulate."),
    SettingSpec("midtrans_server_key", "Midtrans Server Key", "billing", "secret", "", "Rahasia server untuk checkout dan verifikasi webhook.", True),
    SettingSpec("midtrans_client_key", "Midtrans Client Key", "billing", "secret", "", "Client key Midtrans (disimpan terenkripsi).", True),
    SettingSpec("midtrans_is_production", "Midtrans production", "billing", "bool", str(settings.midtrans_is_production).lower(), "Aktifkan endpoint produksi Midtrans."),
    SettingSpec("max_segments_per_job", "Maksimal segmen/job", "studio", "int", str(settings.max_segments_per_job), "Batas potongan dalam satu proses."),
    SettingSpec("max_clip_seconds", "Maksimal durasi klip", "studio", "int", str(settings.max_clip_seconds), "Batas durasi satu klip dalam detik."),
    SettingSpec("musetalk_worker_url", "URL worker MuseTalk", "studio", "string", settings.musetalk_worker_url, "Base URL worker GPU MuseTalk 1.5."),
    SettingSpec("musetalk_worker_token", "Token worker MuseTalk", "studio", "secret", "", "Bearer token worker GPU (disimpan terenkripsi).", True),
    SettingSpec("musetalk_timeout_seconds", "Timeout MuseTalk", "studio", "int", str(settings.musetalk_timeout_seconds), "Batas tunggu lipsync dalam detik."),
    SettingSpec("max_upload_mb", "Batas upload", "studio", "int", str(settings.max_upload_mb), "Ukuran maksimum file media dalam MB."),
]

SPEC_BY_KEY = {item.key: item for item in SETTING_SPECS}


def _fallback(key: str, default: Any = "") -> Any:
    env_map = {
        "require_auth": settings.require_auth,
        "free_credits": settings.free_credits,
        "billing_enabled": settings.billing_enabled,
        "payment_provider": settings.payment_provider,
        "app_base_url": settings.app_base_url,
        "billing_simulate_allow": settings.billing_simulate_allow,
        "midtrans_server_key": settings.midtrans_server_key,
        "midtrans_client_key": settings.midtrans_client_key,
        "midtrans_is_production": settings.midtrans_is_production,
        "max_segments_per_job": settings.max_segments_per_job,
        "max_clip_seconds": settings.max_clip_seconds,
        "musetalk_worker_url": settings.musetalk_worker_url,
        "musetalk_worker_token": settings.musetalk_worker_token,
        "musetalk_timeout_seconds": settings.musetalk_timeout_seconds,
        "max_upload_mb": settings.max_upload_mb,
    }
    return env_map.get(key, default)


def get_string(db: Session, key: str, default: str = "") -> str:
    row = db.get(models.AppSetting, key)
    fallback = str(_fallback(key, default) or "")
    if row is None or not row.value:
        return fallback
    if row.is_secret:
        plain = crypto.decrypt_secret(row.value)
        return plain or fallback
    return str(row.value)


def get_bool(db: Session, key: str, default: bool = False) -> bool:
    raw = get_string(db, key, str(_fallback(key, default)).lower()).strip().lower()
    return raw in {"1", "true", "yes", "on"}


def get_int(db: Session, key: str, default: int = 0) -> int:
    try:
        return int(get_string(db, key, str(_fallback(key, default))))
    except (TypeError, ValueError):
        return int(default)


def validate_value(row: models.AppSetting, value: str) -> str:
    value = str(value or "").strip()
    if row.value_type == "bool":
        if value.lower() not in {"true", "false", "1", "0", "yes", "no", "on", "off"}:
            raise ValueError("Nilai boolean harus true/false")
        return "true" if value.lower() in {"true", "1", "yes", "on"} else "false"
    if row.value_type == "int":
        parsed = int(value)
        if parsed < 0:
            raise ValueError("Nilai tidak boleh negatif")
        return str(parsed)
    if row.key == "payment_provider" and value.lower() not in {"simulate", "midtrans"}:
        raise ValueError("Provider harus simulate atau midtrans")
    return value


def store_value(row: models.AppSetting, value: str) -> None:
    clean = validate_value(row, value)
    row.value = crypto.encrypt_secret(clean) if row.is_secret and clean else clean


def setting_out(db: Session, row: models.AppSetting) -> dict:
    if row.is_secret:
        current = get_string(db, row.key, "")
        visible = ""
        has_value = bool(current)
    else:
        visible = row.value
        has_value = bool(row.value)
    return {
        "key": row.key,
        "value": visible,
        "valueType": row.value_type,
        "category": row.category,
        "label": row.label or row.key,
        "description": row.description or "",
        "isSecret": bool(row.is_secret),
        "hasValue": has_value,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


def spec_for(key: str) -> Optional[SettingSpec]:
    return SPEC_BY_KEY.get(key)

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Konfigurasi aplikasi. Semua bisa di-override lewat environment variable."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", populate_by_name=True)

    app_name: str = "OtoPost API"
    work_dir: str = Field(default="/data/clips", alias="CLIP_WORK_DIR")
    public_base_url: str = Field(default="", alias="PUBLIC_BASE_URL")
    server_token: str = Field(default="", alias="CLIP_SERVER_TOKEN")
    ytdlp_cookies: str = Field(default="", alias="YTDLP_COOKIES")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")

    # ===== Auth & Database (Fase 0) =====
    database_url: str = Field(default="", alias="DATABASE_URL")
    jwt_secret: str = Field(default="", alias="JWT_SECRET")
    jwt_expire_minutes: int = Field(default=60 * 24 * 7, alias="JWT_EXPIRE_MINUTES")
    credential_enc_key: str = Field(default="", alias="CREDENTIAL_ENC_KEY")
    require_auth: bool = Field(default=False, alias="REQUIRE_AUTH")
    free_credits: int = Field(default=30, alias="FREE_CREDITS")

    # ===== Hardening batas kerja =====
    max_segments_per_job: int = Field(default=30, alias="MAX_SEGMENTS_PER_JOB")
    max_clip_seconds: int = Field(default=180, alias="MAX_CLIP_SECONDS")
    job_ttl_seconds: int = Field(default=3600, alias="JOB_TTL_SECONDS")

    @property
    def public_base(self) -> str:
        return self.public_base_url.rstrip("/")

    @property
    def jwt_key(self) -> str:
        return self.jwt_secret or "otopost-dev-insecure-change-me"


settings = Settings()

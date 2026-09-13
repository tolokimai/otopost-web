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

    @property
    def public_base(self) -> str:
        return self.public_base_url.rstrip("/")


settings = Settings()

from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="DOCMINING_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Docling
    artifacts_path: str = str(Path(__file__).resolve().parents[2] / "models")
    # NOTE: Docling's PDF backends are NOT thread-safe (upstream issue #1191).
    # We keep workers=1 and rely on gunicorn -w N at the process level in Phase C
    # for concurrency. Raising this above 1 can cause silent data corruption on
    # concurrent requests.
    workers: int = Field(1, ge=1, le=1)
    ocr: bool = True
    max_file_mb: int = 50
    convert_timeout_s: int = 180
    max_pages: int = 300

    # Server
    cors_origins: str = "http://localhost:3002"   # comma-sep
    log_level: str = "INFO"

    @property
    def max_file_bytes(self) -> int:
        return self.max_file_mb * 1024 * 1024

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

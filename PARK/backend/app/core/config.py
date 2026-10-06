"""
PARK — Application Configuration
====================================
This is the ONE place environment variables get read from.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    ENV: str = Field(default="development")
    APP_NAME: str = "PARK API"
    API_V1_PREFIX: str = "/v1"

    ALLOWED_HOSTS: str = "localhost,127.0.0.1"
    # Vite dev servers are reachable at BOTH localhost and 127.0.0.1 —
    # browsers treat these as different origins for CORS purposes even
    # though they resolve to the same machine. Missing either one here
    # is a common source of "it works on my machine but not yours" CORS
    # errors depending on which URL you happen to open in the browser.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:5176,http://127.0.0.1:5176"

    SUPABASE_URL: str = "https://rsikzaugaqqkmuimvfji.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "your-service-role-key"
    SUPABASE_ANON_KEY: str = "sb_publishable_DuxYqIVUQwy7d5gPv0tsIw_NVjG1iPG"

    DATABASE_URL: str = "postgresql+asyncpg://postgres.YOURREF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"

    CLOUDINARY_CLOUD_NAME: str = "your-cloud-name"
    CLOUDINARY_API_KEY: str = "your-api-key"
    CLOUDINARY_API_SECRET: str = "your-api-secret"

    BREVO_API_KEY: str = "your-brevo-api-key"
    BREVO_SENDER_EMAIL: str = "your-verified-sender@example.com"
    BREVO_SENDER_NAME: str = "PARK"
    BREVO_SIGNUP_LIST_ID: int | None = None
    FRONTEND_URL: str = "http://localhost:5173"
    WEEKLY_DIGEST_DAY: str = "monday"
    WEEKLY_DIGEST_HOUR: int = 8

    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str = "dummy-change-me-in-real-env"
    BULK_IMPORT_ENCRYPTION_KEY: str | None = None
    JWT_ALGORITHM: str = "HS256"

    INACTIVITY_THRESHOLD_DAYS: int = 21
    MEETING_EDIT_WINDOW_HOURS: int = 24
    MEETING_MIN_NOTICE_HOURS: int = 24  # students must get at least this much notice
    MAX_CHAPTER_FILE_MB: int = 20
    DASHBOARD_CACHE_TTL_SECONDS: int = 300
    VIEW_COUNT_FLUSH_INTERVAL_SECONDS: int = 30
    # Placeholder — set to your real deployed backend URL in production
    # (e.g. https://api.p-ark.ng). Used to build absolute one-time
    # download-redirect links (see repository_service.get_download_url).
    API_BASE_URL: str = "http://localhost:8000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",") if h.strip()]

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENV.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

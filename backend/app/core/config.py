from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    app_name: str = "Plantify API"
    app_env: str = "development"
    secret_key: str = Field(default="change-me-in-production", min_length=16)
    access_token_expire_minutes: int = 60 * 24
    refresh_token_expire_days: int = 30
    algorithm: str = "HS256"
    jwt_issuer: str = "plantify-api"
    jwt_audience: str = "plantify-clients"

    sqlite_path: str = str(BACKEND_DIR / "plantify.db")
    model_path: str = str(BACKEND_DIR / "model" / "plantify_model.onnx")
    labels_path: str = str(BACKEND_DIR / "model" / "classes.json")
    checkpoint_path: str = str(BACKEND_DIR / "model" / "plantify_model.pth")
    chatbot_model_name: str = "qwen2.5:1.5b"
    chatbot_base_url: str = "http://ollama:11434"
    chatbot_auto_pull_model: bool = True
    chatbot_pull_timeout_seconds: int = 900
    upload_max_bytes: int = 5 * 1024 * 1024
    upload_allowed_mime_types: str = "image/jpeg,image/png,image/webp"
    rate_limit_signup_per_minute: int = 10
    rate_limit_login_per_minute: int = 20
    rate_limit_detect_per_minute: int = 60

    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001,"
        "http://localhost,http://127.0.0.1"
    )
    cors_origin_regex: str = (
        r"^(tauri://localhost|https://tauri\.localhost|http://tauri\.localhost|capacitor://localhost|app://localhost|https://localhost|http://localhost)$"
    )
    cors_allow_methods: str = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    cors_allow_headers: str = "Authorization,Content-Type,Accept,Origin,X-Request-ID"
    role_elevation_code: str = ""
    security_csp: str = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    security_hsts_max_age_seconds: int = 31536000
    sqlite_journal_mode: str = "WAL"
    sqlite_synchronous: str = "NORMAL"
    sqlite_busy_timeout_ms: int = 5000
    sqlite_foreign_keys: bool = True
    slo_target_availability: float = 0.99
    slo_target_p95_seconds: float = 0.75
    slo_min_requests_for_evaluation: int = 50

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def sqlite_url(self) -> str:
        db_path = Path(self.sqlite_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite+aiosqlite:///{db_path}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def upload_allowed_mime_list(self) -> list[str]:
        return [mime.strip() for mime in self.upload_allowed_mime_types.split(",") if mime.strip()]

    @property
    def cors_allow_method_list(self) -> list[str]:
        return [method.strip().upper() for method in self.cors_allow_methods.split(",") if method.strip()]

    @property
    def cors_allow_header_list(self) -> list[str]:
        return [header.strip() for header in self.cors_allow_headers.split(",") if header.strip()]

    @model_validator(mode="after")
    def validate_production_safety(self) -> "Settings":
        if not (0 < self.slo_target_availability <= 1):
            raise ValueError("SLO_TARGET_AVAILABILITY must be > 0 and <= 1")

        if self.slo_target_p95_seconds <= 0:
            raise ValueError("SLO_TARGET_P95_SECONDS must be > 0")

        if self.slo_min_requests_for_evaluation <= 0:
            raise ValueError("SLO_MIN_REQUESTS_FOR_EVALUATION must be > 0")

        if self.sqlite_busy_timeout_ms <= 0:
            raise ValueError("SQLITE_BUSY_TIMEOUT_MS must be > 0")

        if self.sqlite_journal_mode.strip().upper() not in {"DELETE", "TRUNCATE", "PERSIST", "MEMORY", "WAL", "OFF"}:
            raise ValueError("SQLITE_JOURNAL_MODE must be one of DELETE, TRUNCATE, PERSIST, MEMORY, WAL, OFF")

        if self.sqlite_synchronous.strip().upper() not in {"OFF", "NORMAL", "FULL", "EXTRA"}:
            raise ValueError("SQLITE_SYNCHRONOUS must be one of OFF, NORMAL, FULL, EXTRA")

        env = self.app_env.strip().lower()
        if env in {"production", "prod"}:
            if self.secret_key == "change-me-in-production":
                raise ValueError("SECRET_KEY must be set to a secure value in production")

            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in production")

            if not self.role_elevation_code.strip():
                raise ValueError("ROLE_ELEVATION_CODE must be set in production")

            if len(self.role_elevation_code.strip()) < 20:
                raise ValueError("ROLE_ELEVATION_CODE must be at least 20 characters in production")

            _forbidden_cors = {"*", "localhost", "127.0.0.1", "0.0.0.0"}
            for origin in self.cors_origin_list:
                origin_lower = origin.lower().rstrip("/")
                if origin_lower == "*":
                    raise ValueError(
                        "CORS_ORIGINS must not contain wildcard '*' in production"
                    )
                host = origin_lower.removeprefix("https://").removeprefix("http://").split(":")[0]
                if host in {"localhost", "127.0.0.1", "0.0.0.0"}:
                    raise ValueError(
                        f"CORS_ORIGINS must not contain localhost origin '{origin}' in production"
                    )

            if not self.cors_origin_list:
                raise ValueError("CORS_ORIGINS must be explicitly set in production")

            if not self.cors_origin_regex.strip():
                raise ValueError("CORS_ORIGIN_REGEX must not be empty in production")

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

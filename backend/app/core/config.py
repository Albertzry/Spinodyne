"""
Application settings. Values are loaded from the project root config.json first,
then overridden by environment variables (e.g. .env or CONFIG_*).
"""
import json
import os
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


def _config_path() -> Path:
    env_path = os.getenv("CONFIG_FILE")
    if env_path:
        return Path(env_path).resolve()
    # Default: Spinodyne/config.json (from backend/app/core/ -> ../../../config.json)
    return (Path(__file__).resolve().parent / "../../../config.json").resolve()


def _load_project_config() -> dict:
    path = _config_path()
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


_config = _load_project_config()


def _postgres_url() -> str:
    pg = _config.get("postgres", {})
    user = pg.get("user", "postgres")
    password = pg.get("password", "password123")
    host = pg.get("host", "localhost")
    port = pg.get("port", 5432)
    database = pg.get("database", "spinodyne")
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


def _redis_url() -> str:
    r = _config.get("redis", {})
    host = r.get("host", "127.0.0.1")
    port = r.get("port", 25698)
    db = r.get("db", 0)
    return f"redis://{host}:{port}/{db}"


def _frontend_origins() -> List[str]:
    port = _config.get("frontend", {}).get("port", 25916)
    return [
        f"http://localhost:{port}",
        f"http://127.0.0.1:{port}",
    ]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = _config.get("project_name", "Spinodyne")
    POSTGRES_URL: str = _postgres_url()
    REDIS_URL: str = _redis_url()
    MINIO_ENDPOINT: str = _config.get("minio", {}).get("endpoint", "localhost:25957")
    MINIO_ACCESS_KEY: str = _config.get("minio", {}).get("access_key", "minioadmin")
    MINIO_SECRET_KEY: str = _config.get("minio", {}).get("secret_key", "minioadmin")
    MINIO_BUCKET: str = _config.get("minio", {}).get("bucket", "spinodyne")
    MINIO_SECURE: bool = _config.get("minio", {}).get("secure", False)

    # Backend server (for uvicorn)
    BACKEND_HOST: str = _config.get("backend", {}).get("host", "0.0.0.0")
    BACKEND_PORT: int = _config.get("backend", {}).get("port", 25306)

    # CORS: allowed frontend origins
    FRONTEND_ORIGINS: List[str] = _frontend_origins()


settings = Settings()

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )
    PROJECT_NAME: str = "Spinodyne"
    POSTGRES_URL: str = "postgresql://postgres:password123@localhost:5432/spinodyne"
    REDIS_URL: str = "redis://127.0.0.1:25698/0"
    MINIO_ENDPOINT: str = "localhost:25800"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "spinodyne"

settings = Settings()

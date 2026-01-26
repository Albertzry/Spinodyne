from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Spinodyne"
    POSTGRES_URL: str = "postgresql://postgres:password123@localhost:5432/spinodyne"
    REDIS_URL: str = "redis://localhost:25698/0"
    MINIO_ENDPOINT: str = "localhost:25800"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "spinodyne"

    class Config:
        case_sensitive = True

settings = Settings()

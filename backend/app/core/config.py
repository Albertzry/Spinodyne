import os
from typing import Optional
from pydantic_settings import BaseSettings
from minio import Minio

class Settings(BaseSettings):
    PROJECT_NAME: str = "Spinodyne Backend"
    
    # 数据库配置
    DATABASE_URL: str = "postgresql://spinodyne_user:TotalSpine2026@localhost/spinodyne_db"
    
    # Redis 配置 (Internal Localhost only on Port 25698)
    REDIS_URL: str = "redis://127.0.0.1:25698/0"
    
    # CORS Origins (Allow Public Frontend)
    BACKEND_CORS_ORIGINS: list = ["http://10.1.3.100:25320", "http://localhost:25320"]

    # 文件路径配置
    BASE_UPLOAD_DIR: str = "/root/Spinodyne/data/uploads"
    MODEL_ROOT_DIR: str = "/root/TotalSpineSeg-v2"
    
    # Conda 环境配置
    # 使用 'conda run -n tss' 前缀来在 tss 环境中执行命令
    CONDA_CMD_PREFIX: str = "conda run -n tss"
    
    # MinIO 配置
    MINIO_ENDPOINT: str = "127.0.0.1:25800"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "spinodyne"
    MINIO_SECURE: bool = False  # 本地开发不使用 HTTPS
    
    class Config:
        env_file = ".env"

settings = Settings()

# 确保上传目录存在
os.makedirs(settings.BASE_UPLOAD_DIR, exist_ok=True)

# 初始化 MinIO 客户端
minio_client = Minio(
    endpoint=settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE
)

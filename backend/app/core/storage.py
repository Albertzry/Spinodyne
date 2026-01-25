"""
MinIO 存储抽象层
提供异步友好的文件上传、下载和 URL 生成功能
"""
import os
import asyncio
import functools
import logging
from datetime import timedelta
from typing import BinaryIO, Union, List
from pathlib import Path
from minio.error import S3Error

from app.core.config import settings, minio_client

logger = logging.getLogger(__name__)


async def run_in_thread(func, *args, **kwargs):
    """
    兼容 Python 3.8 的 asyncio.to_thread 替代方案
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(func, *args, **kwargs))


async def upload_file(
    file_obj: Union[BinaryIO, str, Path],
    object_name: str,
    content_type: str = "application/octet-stream"
) -> str:
    """
    上传文件到 MinIO
    
    Args:
        file_obj: 文件对象、文件路径或 Path 对象
        object_name: MinIO 中的对象名称 (例如: "tasks/uuid/raw.nii.gz")
        content_type: MIME 类型
        
    Returns:
        str: MinIO 中的对象名称
        
    Raises:
        S3Error: MinIO 操作失败
    """
    try:
        # 如果传入的是文件路径，则打开文件
        if isinstance(file_obj, (str, Path)):
            file_path = Path(file_obj)
            file_size = file_path.stat().st_size
            
            def _upload():
                with open(file_path, "rb") as f:
                    minio_client.put_object(
                        bucket_name=settings.MINIO_BUCKET,
                        object_name=object_name,
                        data=f,
                        length=file_size,
                        content_type=content_type
                    )
            
            # 在线程池中执行同步操作
            await run_in_thread(_upload)
        else:
            # 如果是文件对象，需要获取大小
            # 注意：这需要文件对象支持 seek 和 tell
            current_pos = file_obj.tell()
            file_obj.seek(0, 2)  # 移动到文件末尾
            file_size = file_obj.tell()
            file_obj.seek(current_pos)  # 恢复原位置
            
            def _upload():
                minio_client.put_object(
                    bucket_name=settings.MINIO_BUCKET,
                    object_name=object_name,
                    data=file_obj,
                    length=file_size,
                    content_type=content_type
                )
            
            await run_in_thread(_upload)
        
        logger.info(f"✅ Uploaded {object_name} to MinIO bucket {settings.MINIO_BUCKET}")
        return object_name
        
    except S3Error as e:
        logger.error(f"❌ MinIO upload error: {e}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error during upload: {e}")
        raise


async def get_presigned_url(
    object_name: str,
    expires: timedelta = timedelta(hours=1)
) -> str:
    """
    生成预签名 URL，用于前端直接访问文件
    
    Args:
        object_name: MinIO 中的对象名称
        expires: URL 有效期 (默认 1 小时)
        
    Returns:
        str: 预签名 URL
        
    Raises:
        S3Error: MinIO 操作失败
    """
    try:
        def _get_url():
            return minio_client.presigned_get_object(
                bucket_name=settings.MINIO_BUCKET,
                object_name=object_name,
                expires=expires
            )
        
        url = await run_in_thread(_get_url)
        logger.info(f"🔗 Generated presigned URL for {object_name}")
        return url
        
    except S3Error as e:
        logger.error(f"❌ MinIO presigned URL error: {e}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error generating URL: {e}")
        raise


async def download_to_local(
    object_name: str,
    local_path: Union[str, Path]
) -> str:
    """
    从 MinIO 下载文件到本地
    主要用于 Celery worker 需要处理文件的场景
    
    Args:
        object_name: MinIO 中的对象名称
        local_path: 本地保存路径
        
    Returns:
        str: 本地文件路径
        
    Raises:
        S3Error: MinIO 操作失败
    """
    try:
        local_path = Path(local_path)
        
        # 确保目录存在
        local_path.parent.mkdir(parents=True, exist_ok=True)
        
        def _download():
            minio_client.fget_object(
                bucket_name=settings.MINIO_BUCKET,
                object_name=object_name,
                file_path=str(local_path)
            )
        
        await run_in_thread(_download)
        logger.info(f"⬇️ Downloaded {object_name} to {local_path}")
        return str(local_path)
        
    except S3Error as e:
        logger.error(f"❌ MinIO download error: {e}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error during download: {e}")
        raise


async def delete_object(object_name: str) -> None:
    """
    从 MinIO 删除对象
    
    Args:
        object_name: MinIO 中的对象名称
        
    Raises:
        S3Error: MinIO 操作失败
    """
    try:
        def _delete():
            minio_client.remove_object(
                bucket_name=settings.MINIO_BUCKET,
                object_name=object_name
            )
        
        await run_in_thread(_delete)
        logger.info(f"🗑️ Deleted {object_name} from MinIO")
        
    except S3Error as e:
        logger.error(f"❌ MinIO delete error: {e}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error during delete: {e}")
        raise


async def list_objects(prefix: str = "") -> List[str]:
    """
    列出 MinIO 中的对象
    
    Args:
        prefix: 对象名称前缀 (例如: "tasks/uuid/")
        
    Returns:
        list[str]: 对象名称列表
        
    Raises:
        S3Error: MinIO 操作失败
    """
    try:
        def _list():
            objects = minio_client.list_objects(
                bucket_name=settings.MINIO_BUCKET,
                prefix=prefix,
                recursive=True
            )
            return [obj.object_name for obj in objects]
        
        object_names = await run_in_thread(_list)
        logger.info(f"📋 Listed {len(object_names)} objects with prefix '{prefix}'")
        return object_names
        
    except S3Error as e:
        logger.error(f"❌ MinIO list error: {e}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error during list: {e}")
        raise


async def object_exists(object_name: str) -> bool:
    """
    检查对象是否存在
    
    Args:
        object_name: MinIO 中的对象名称
        
    Returns:
        bool: 对象是否存在
    """
    try:
        def _stat():
            minio_client.stat_object(
                bucket_name=settings.MINIO_BUCKET,
                object_name=object_name
            )
            return True
        
        exists = await run_in_thread(_stat)
        return exists
        
    except S3Error as e:
        if e.code == "NoSuchKey":
            return False
        logger.error(f"❌ MinIO stat error: {e}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error checking existence: {e}")
        raise


def ensure_bucket_exists():
    """
    同步函数：确保 MinIO bucket 存在
    用于应用启动时初始化
    """
    try:
        if not minio_client.bucket_exists(settings.MINIO_BUCKET):
            minio_client.make_bucket(settings.MINIO_BUCKET)
            logger.info(f"✅ Created MinIO bucket: {settings.MINIO_BUCKET}")
        else:
            logger.info(f"✅ MinIO bucket already exists: {settings.MINIO_BUCKET}")
    except S3Error as e:
        logger.error(f"❌ Failed to create/check bucket: {e}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error during bucket check: {e}")
        raise


# 同步版本的辅助函数 (用于 Celery worker)
def upload_file_sync(
    file_path: Union[str, Path],
    object_name: str,
    content_type: str = "application/octet-stream"
) -> str:
    """
    同步版本的文件上传，用于 Celery worker
    """
    try:
        file_path = Path(file_path)
        file_size = file_path.stat().st_size
        
        with open(file_path, "rb") as f:
            minio_client.put_object(
                bucket_name=settings.MINIO_BUCKET,
                object_name=object_name,
                data=f,
                length=file_size,
                content_type=content_type
            )
        
        logger.info(f"✅ Uploaded {object_name} to MinIO bucket {settings.MINIO_BUCKET}")
        return object_name
        
    except Exception as e:
        logger.error(f"❌ Error during sync upload: {e}")
        raise


def download_to_local_sync(
    object_name: str,
    local_path: Union[str, Path]
) -> str:
    """
    同步版本的文件下载，用于 Celery worker
    """
    try:
        local_path = Path(local_path)
        local_path.parent.mkdir(parents=True, exist_ok=True)
        
        minio_client.fget_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=object_name,
            file_path=str(local_path)
        )
        
        logger.info(f"⬇️ Downloaded {object_name} to {local_path}")
        return str(local_path)
        
    except Exception as e:
        logger.error(f"❌ Error during sync download: {e}")
        raise


def get_presigned_url_sync(
    object_name: str,
    expires: timedelta = timedelta(hours=1)
) -> str:
    """
    同步版本的预签名 URL 生成，用于 Celery worker
    """
    try:
        url = minio_client.presigned_get_object(
            bucket_name=settings.MINIO_BUCKET,
            object_name=object_name,
            expires=expires
        )
        logger.info(f"🔗 Generated presigned URL for {object_name}")
        return url
        
    except Exception as e:
        logger.error(f"❌ Error generating presigned URL: {e}")
        raise

import io
import os
import tempfile
from datetime import timedelta
from minio import Minio
from minio.error import S3Error
from .config import settings

# Initialize MinIO client
minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=False
)

def init_storage():
    """Ensure the bucket exists."""
    try:
        if not minio_client.bucket_exists(settings.MINIO_BUCKET):
            minio_client.make_bucket(settings.MINIO_BUCKET)
            print(f"Bucket '{settings.MINIO_BUCKET}' created successfully.")
        else:
            print(f"Bucket '{settings.MINIO_BUCKET}' already exists.")
    except S3Error as e:
        print(f"Error initializing storage: {e}")

def upload_file(file_data, object_name: str, content_type: str = "application/octet-stream"):
    """
    Upload bytes or stream to MinIO.
    
    :param file_data: bytes or file-like object
    :param object_name: Destination object name in the bucket
    :param content_type: Content type of the file
    """
    try:
        if isinstance(file_data, bytes):
            data_stream = io.BytesIO(file_data)
            length = len(file_data)
        else:
            data_stream = file_data
            # Try to get length
            file_data.seek(0, os.SEEK_END)
            length = file_data.tell()
            file_data.seek(0)

        minio_client.put_object(
            settings.MINIO_BUCKET,
            object_name,
            data_stream,
            length,
            content_type=content_type
        )
        return True
    except S3Error as e:
        print(f"Error uploading file: {e}")
        raise e

def get_presigned_url(object_name: str, expires: timedelta = timedelta(hours=1)):
    """Generate a presigned URL for GET request."""
    try:
        return minio_client.presigned_get_object(
            settings.MINIO_BUCKET,
            object_name,
            expires=expires
        )
    except S3Error as e:
        print(f"Error generating presigned URL: {e}")
        return None

def download_to_temp(object_name: str, custom_path: str = None) -> str:
    """
    Download object to a local temp file.
    
    :param object_name: Name of the object to download
    :param custom_path: Optional custom path to save the file
    :return: Path to the file
    """
    try:
        if custom_path:
            os.makedirs(os.path.dirname(custom_path), exist_ok=True)
            temp_path = custom_path
        else:
            fd, temp_path = tempfile.mkstemp()
            os.close(fd)

        minio_client.fget_object(
            settings.MINIO_BUCKET,
            object_name,
            temp_path
        )
        return temp_path
    except S3Error as e:
        print(f"Error downloading file: {e}")
        if not custom_path and 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        raise e

import io
import json
import os
import tempfile
from minio import Minio
from minio.error import S3Error
from .config import settings

# Initialize MinIO client
minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)

def init_storage():
    """Ensure the bucket exists."""
    try:
        if not minio_client.bucket_exists(settings.MINIO_BUCKET):
            minio_client.make_bucket(settings.MINIO_BUCKET)
            print(f"Bucket '{settings.MINIO_BUCKET}' created successfully.")
        else:
            print(f"Bucket '{settings.MINIO_BUCKET}' already exists.")

        if settings.MINIO_PUBLIC_READ:
            # Allow anonymous read-only object access for frontend direct fetch via Nginx proxy.
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": ["*"]},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{settings.MINIO_BUCKET}/*"],
                    }
                ],
            }
            minio_client.set_bucket_policy(settings.MINIO_BUCKET, json.dumps(policy))
            print(f"Bucket '{settings.MINIO_BUCKET}' policy set to public read.")
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

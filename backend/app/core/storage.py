from __future__ import annotations

import io
import os
import tempfile
from datetime import timedelta
from pathlib import Path
from typing import BinaryIO, Union, cast

from minio import Minio
from minio.error import S3Error

from .config import get_settings


def _get_client() -> Minio:
	settings = get_settings()
	return Minio(
		settings.MINIO_ENDPOINT,
		access_key=settings.MINIO_ACCESS_KEY,
		secret_key=settings.MINIO_SECRET_KEY,
		secure=False,
	)


def init_storage() -> None:
	"""Ensure the configured bucket exists."""

	settings = get_settings()
	client = _get_client()

	try:
		exists = client.bucket_exists(settings.MINIO_BUCKET)
		if not exists:
			client.make_bucket(settings.MINIO_BUCKET)
	except S3Error as exc:
		raise RuntimeError(f"Failed to initialize MinIO bucket '{settings.MINIO_BUCKET}': {exc}") from exc


FileData = Union[bytes, bytearray, memoryview, BinaryIO, "UploadFile"]


def _normalize_file_data(file_data: FileData) -> tuple[BinaryIO, int]:
	"""Return a (stream, length) tuple for MinIO put_object."""

	# Avoid importing FastAPI at module import time.
	upload_file = getattr(file_data, "file", None)
	if upload_file is not None:
		file_data = cast(BinaryIO, upload_file)

	if isinstance(file_data, (bytes, bytearray, memoryview)):
		raw = bytes(file_data)
		return io.BytesIO(raw), len(raw)

	stream = cast(BinaryIO, file_data)

	# Try to get length without buffering.
	try:
		current = stream.tell()
		stream.seek(0, os.SEEK_END)
		end = stream.tell()
		stream.seek(current, os.SEEK_SET)
		return stream, end - current
	except Exception:
		# Fallback: buffer into memory.
		raw = stream.read()
		return io.BytesIO(raw), len(raw)


def upload_file(file_data: FileData, object_name: str) -> str:
	"""Upload data to MinIO and return the object name."""

	settings = get_settings()
	client = _get_client()

	stream, length = _normalize_file_data(file_data)

	try:
		client.put_object(
			settings.MINIO_BUCKET,
			object_name,
			data=stream,
			length=length,
		)
	except S3Error as exc:
		raise RuntimeError(f"Failed to upload '{object_name}' to MinIO: {exc}") from exc

	return object_name


def get_presigned_url(object_name: str) -> str:
	"""Generate a presigned GET URL valid for 1 hour."""

	settings = get_settings()
	client = _get_client()

	try:
		return client.presigned_get_object(
			settings.MINIO_BUCKET,
			object_name,
			expires=timedelta(hours=1),
		)
	except S3Error as exc:
		raise RuntimeError(f"Failed to create presigned URL for '{object_name}': {exc}") from exc


def download_to_temp(object_name: str) -> Path:
	"""Download an object to a local temp file for further processing."""

	settings = get_settings()
	client = _get_client()

	suffix = Path(object_name).suffix
	tmp_dir = Path(tempfile.mkdtemp(prefix="spinodyne-"))
	tmp_path = tmp_dir / f"object{suffix}"

	try:
		client.fget_object(settings.MINIO_BUCKET, object_name, str(tmp_path))
	except S3Error as exc:
		raise RuntimeError(f"Failed to download '{object_name}' from MinIO: {exc}") from exc

	return tmp_path


def download_file(object_name: str, destination: Path) -> None:
	"""Download an object to a specific destination path."""

	settings = get_settings()
	client = _get_client()

	# Ensure parent directory exists
	destination.parent.mkdir(parents=True, exist_ok=True)

	try:
		client.fget_object(settings.MINIO_BUCKET, object_name, str(destination))
	except S3Error as exc:
		raise RuntimeError(f"Failed to download '{object_name}' from MinIO: {exc}") from exc


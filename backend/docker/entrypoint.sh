#!/usr/bin/env bash
set -euo pipefail

cd /app/backend

# Ensure DB tables exist; does not drop existing data.
max_attempts=60
attempt=1
until conda run --no-capture-output -n tss python -c "from sqlmodel import SQLModel; from app.db.session import engine; import app.models.patient, app.models.task; SQLModel.metadata.create_all(engine)"; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database initialization failed after ${max_attempts} attempts."
    exit 1
  fi
  echo "Database not ready (attempt ${attempt}/${max_attempts}), retrying in 2s..."
  attempt=$((attempt + 1))
  sleep 2
done

MODE="${1:-api}"

if [ "$MODE" = "worker" ]; then
  exec conda run --no-capture-output -n tss celery -A app.worker.celery_app worker --loglevel=INFO
fi

exec conda run --no-capture-output -n tss uvicorn app.main:app --host 0.0.0.0 --port 25025 --log-level info --access-log

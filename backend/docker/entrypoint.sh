#!/usr/bin/env bash
set -euo pipefail

cd /app/backend

MODE="${1:-api}"
RUN_DB_INIT="${RUN_DB_INIT:-1}"

if [ "$RUN_DB_INIT" = "1" ]; then
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
fi

if [ "$MODE" = "worker" ]; then
  # Remove task temp leftovers from previous unclean exits (OOM/kill/power loss).
  mkdir -p /app/backend/data/uploads
  rm -rf /app/backend/data/uploads/*
  exec conda run --no-capture-output -n tss celery -A app.worker.celery_app worker --loglevel=INFO
fi

exec conda run --no-capture-output -n tss uvicorn app.main:app --host 0.0.0.0 --port 25025 --log-level info --access-log

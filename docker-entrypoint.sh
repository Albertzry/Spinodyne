#!/bin/bash
set -e

CONFIG_FILE="/root/Spinodyne/config.json"

echo "=========================================="
echo "  Spinodyne Docker Container Starting..."
echo "=========================================="

# ── Parse ports from config.json ──────────────────────────────────
REDIS_PORT=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['redis']['port'])")
MINIO_ENDPOINT=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['minio']['endpoint'])")
MINIO_PORT=$(echo "$MINIO_ENDPOINT" | awk -F':' '{print $NF}')
BACKEND_PORT=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['backend']['port'])")
FRONTEND_PORT=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['frontend']['port'])")
PG_USER=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['postgres']['user'])")
PG_PASS=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['postgres']['password'])")
PG_DB=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['postgres']['database'])")

echo "  Redis port:    $REDIS_PORT"
echo "  MinIO port:    $MINIO_PORT"
echo "  Backend port:  $BACKEND_PORT"
echo "  Frontend port: $FRONTEND_PORT"

# ── 1. Start PostgreSQL ───────────────────────────────────────────
echo ">>> Starting PostgreSQL..."
# Fix data directory permissions (needed when using volumes)
chown -R postgres:postgres /var/lib/postgresql 2>/dev/null || true
chmod 700 /var/lib/postgresql/12/main 2>/dev/null || true

# Check if PostgreSQL cluster exists, if not initialize it
if [ ! -d "/var/lib/postgresql/12/main" ] || [ -z "$(ls -A /var/lib/postgresql/12/main 2>/dev/null)" ]; then
    echo ">>> Initializing PostgreSQL cluster..."
    pg_dropcluster --stop 12 main 2>/dev/null || true
    pg_createcluster 12 main
fi

service postgresql start
sleep 2

# Create database and user if they don't exist (first run)
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'\" | grep -q 1 || psql -c \"ALTER USER $PG_USER PASSWORD '$PG_PASS';\"" 2>/dev/null || true
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='$PG_DB'\" | grep -q 1 || psql -c \"CREATE DATABASE $PG_DB OWNER $PG_USER;\"" 2>/dev/null || true

# ── 2. Start Redis ────────────────────────────────────────────────
echo ">>> Starting Redis (port: $REDIS_PORT)..."
mkdir -p /var/log/redis
touch /var/log/redis/redis-server.log
chmod 777 /var/log/redis /var/log/redis/redis-server.log
redis-server --daemonize yes --port "$REDIS_PORT"

# ── 3. Start MinIO ────────────────────────────────────────────────
echo ">>> Starting MinIO (port: $MINIO_PORT)..."
export MINIO_ROOT_USER=minioadmin
export MINIO_ROOT_PASSWORD=minioadmin
mkdir -p /data/minio
nohup minio server /data/minio --address ":$MINIO_PORT" > /var/log/minio.log 2>&1 &

# Wait for services to be ready
sleep 3

# ── 4. Initialize database (first run) ───────────────────────────
INIT_FLAG="/root/Spinodyne/.db_initialized"
if [ ! -f "$INIT_FLAG" ]; then
    echo ">>> First run: Initializing database schema and MinIO bucket..."
    cd /root/Spinodyne/backend
    python3 init_db.py
    touch "$INIT_FLAG"
    cd /root/Spinodyne
fi

# ── 5. Start Backend (Uvicorn) ────────────────────────────────────
echo ">>> Starting Backend (Uvicorn on port $BACKEND_PORT)..."
cd /root/Spinodyne/backend
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" > /var/log/uvicorn.log 2>&1 &

# ── 6. Start Celery Worker ────────────────────────────────────────
echo ">>> Starting Celery Worker..."
cd /root/Spinodyne/backend
nohup celery -A app.worker.celery_app worker --loglevel=info > /var/log/celery.log 2>&1 &

# ── 7. Start Frontend ────────────────────────────────────────────
echo ">>> Starting Frontend (Vite preview on port $FRONTEND_PORT)..."
cd /root/Spinodyne/frontend
nohup npx vite preview --host 0.0.0.0 --port "$FRONTEND_PORT" > /var/log/frontend.log 2>&1 &

echo "=========================================="
echo "  All services started!"
echo "  Frontend:  http://0.0.0.0:$FRONTEND_PORT"
echo "  Backend:   http://0.0.0.0:$BACKEND_PORT"
echo "  MinIO:     http://0.0.0.0:$MINIO_PORT"
echo "=========================================="

# Keep container running and tail all logs
exec tail -f /var/log/uvicorn.log /var/log/celery.log /var/log/frontend.log /var/log/minio.log /var/log/redis/redis-server.log

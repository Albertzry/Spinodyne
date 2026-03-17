#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.json"
BACKEND_DIR="$SCRIPT_DIR/backend"
LOG_DIR="$BACKEND_DIR/logs"
RUN_DIR="$BACKEND_DIR/run"

ACTION="${1:-start}"

mkdir -p "$LOG_DIR" "$RUN_DIR"

BACKEND_HOST=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['backend']['host'])")
BACKEND_PORT=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['backend']['port'])")

cd "$BACKEND_DIR"

pid_running() {
  local pid_file="$1"
  [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null
}

start_services() {
  if ! pid_running "$RUN_DIR/uvicorn.pid"; then
    nohup bash -c 'stdbuf -oL -eL uvicorn app.main:app --host "$0" --port "$1" --log-level info --access-log 2>&1 | while IFS= read -r line; do printf "[%(%Y-%m-%d %H:%M:%S)T] %s\n" -1 "$line"; done' "$BACKEND_HOST" "$BACKEND_PORT" </dev/null >>"$LOG_DIR/uvicorn.log" 2>&1 &
    echo $! > "$RUN_DIR/uvicorn.pid"
  fi

  if ! pid_running "$RUN_DIR/celery.pid"; then
    nohup bash -c 'stdbuf -oL -eL celery -A app.worker.celery_app worker --loglevel=INFO 2>&1 | while IFS= read -r line; do printf "[%(%Y-%m-%d %H:%M:%S)T] %s\n" -1 "$line"; done' </dev/null >>"$LOG_DIR/celery.log" 2>&1 &
    echo $! > "$RUN_DIR/celery.pid"
  fi
}

stop_services() {
  stop_pidfile() {
    local pid_file="$1"
    if ! pid_running "$pid_file"; then
      return 0
    fi
    local pid
    pid="$(cat "$pid_file")"

    # Try to stop the whole process tree (pipeline wrapper + child process).
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true

    # Best-effort cleanup if still alive.
    sleep 1
    pkill -KILL -P "$pid" 2>/dev/null || true
    kill -KILL "$pid" 2>/dev/null || true
  }

  stop_pidfile "$RUN_DIR/uvicorn.pid"
  stop_pidfile "$RUN_DIR/celery.pid"
}

status_services() {
  uvicorn_state="stopped"
  celery_state="stopped"
  pid_running "$RUN_DIR/uvicorn.pid" && uvicorn_state="running"
  pid_running "$RUN_DIR/celery.pid" && celery_state="running"
  echo "uvicorn: $uvicorn_state"
  echo "celery: $celery_state"
}

case "$ACTION" in
  start)
    start_services
    ;;
  stop)
    stop_services
    ;;
  restart)
    stop_services
    sleep 1
    start_services
    ;;
  status)
    status_services
    ;;
  *)
    exit 1
    ;;
esac

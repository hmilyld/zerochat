#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

PID_DIR="$PROJECT_ROOT/.dev-pids"
LOG_DIR="/tmp"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
REDIS_CONTAINER_NAME="zerochat-redis-dev"
BACKEND_LOG="$LOG_DIR/zerochat-backend.log"
FRONTEND_LOG="$LOG_DIR/zerochat-frontend.log"

mkdir -p "$PID_DIR"

get_version() {
  echo "$(git log -1 --format=%cd --date=format:%Y%m%d 2>/dev/null)-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
}

usage() {
  echo "Usage: $0 {start|stop|restart|status|logs}"
  echo ""
  echo "Commands:"
  echo "  start    启动本地开发服务"
  echo "  stop     停止本地开发服务"
  echo "  restart  重启本地开发服务"
  echo "  status   查看服务状态"
  echo "  logs     查看服务日志 (logs [backend|frontend|all])"
  exit 1
}

is_running() {
  local pid_file=$1
  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$pid_file"
  fi
  return 1
}

is_redis_running() {
  docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${REDIS_CONTAINER_NAME}$"
}

start_redis() {
  if is_redis_running; then
    echo "[INFO] Redis is already running."
    return
  fi
  echo "[INFO] Starting Redis container..."
  docker run -d \
    --name "$REDIS_CONTAINER_NAME" \
    -p 6379:6379 \
    redis:7-alpine \
    redis-server --appendonly yes >/dev/null
  sleep 1
  echo "[INFO] Redis started."
}

stop_redis() {
  if ! is_redis_running; then
    echo "[INFO] Redis is not running."
    return
  fi
  echo "[INFO] Stopping Redis container..."
  docker stop "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
  docker rm "$REDIS_CONTAINER_NAME" >/dev/null 2>&1 || true
  echo "[INFO] Redis stopped."
}

do_start() {
  if ! command -v pnpm &>/dev/null; then
    echo "[ERROR] pnpm is not installed. Run: npm install -g pnpm"
    exit 1
  fi

  if ! command -v docker &>/dev/null; then
    echo "[ERROR] docker is not installed."
    exit 1
  fi

  if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing dependencies..."
    pnpm install
  fi

  start_redis

  VERSION=$(get_version)

  if is_running "$BACKEND_PID_FILE"; then
    echo "[WARN] Backend is already running (PID: $(cat $BACKEND_PID_FILE))"
  else
    echo "[INFO] Starting backend..."
    nohup pnpm dev:backend > "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
    echo "[INFO] Backend started (PID: $!)"
  fi

  if is_running "$FRONTEND_PID_FILE"; then
    echo "[WARN] Frontend is already running (PID: $(cat $FRONTEND_PID_FILE))"
  else
    echo "[INFO] Starting frontend..."
    nohup pnpm dev:frontend > "$FRONTEND_LOG" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
    echo "[INFO] Frontend started (PID: $!)"
  fi

  echo ""
  echo "========================================="
  echo "  ZeroChat Development Server"
  echo "  Version:  v$VERSION"
  echo "  Redis:    localhost:6379"
  echo "  Backend:  http://localhost:3001"
  echo "  Frontend: http://localhost:5173"
  echo "========================================="
}

do_stop() {
  local stopped=0

  if is_running "$BACKEND_PID_FILE"; then
    local pid=$(cat "$BACKEND_PID_FILE")
    echo "[INFO] Stopping backend (PID: $pid)..."
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    rm -f "$BACKEND_PID_FILE"
    echo "[INFO] Backend stopped."
    stopped=1
  else
    echo "[INFO] Backend is not running."
  fi

  if is_running "$FRONTEND_PID_FILE"; then
    local pid=$(cat "$FRONTEND_PID_FILE")
    echo "[INFO] Stopping frontend (PID: $pid)..."
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    rm -f "$FRONTEND_PID_FILE"
    echo "[INFO] Frontend stopped."
    stopped=1
  else
    echo "[INFO] Frontend is not running."
  fi

  if [ $stopped -eq 0 ]; then
    echo "[INFO] No services to stop."
  fi
}

do_status() {
  echo "========================================="
  echo "  ZeroChat Development Server Status"
  echo "========================================="

  if is_redis_running; then
    echo "  Redis:    running"
  else
    echo "  Redis:    stopped"
  fi

  if is_running "$BACKEND_PID_FILE"; then
    echo "  Backend:  running (PID: $(cat $BACKEND_PID_FILE))"
  else
    echo "  Backend:  stopped"
  fi

  if is_running "$FRONTEND_PID_FILE"; then
    echo "  Frontend: running (PID: $(cat $FRONTEND_PID_FILE))"
  else
    echo "  Frontend: stopped"
  fi

  echo "========================================="
}

do_logs() {
  local target="${1:-all}"

  case "$target" in
    backend)
      if [ -f "$BACKEND_LOG" ]; then
        tail -f "$BACKEND_LOG"
      else
        echo "[WARN] No backend log file found."
      fi
      ;;
    frontend)
      if [ -f "$FRONTEND_LOG" ]; then
        tail -f "$FRONTEND_LOG"
      else
        echo "[WARN] No frontend log file found."
      fi
      ;;
    all)
      if [ -f "$BACKEND_LOG" ] || [ -f "$FRONTEND_LOG" ]; then
        tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
      else
        echo "[WARN] No log files found."
      fi
      ;;
    *)
      echo "[ERROR] Unknown target: $target"
      echo "Usage: $0 logs [backend|frontend|all]"
      exit 1
      ;;
  esac
}

COMMAND="${1:-}"
case "$COMMAND" in
  start)
    do_start
    ;;
  stop)
    do_stop
    ;;
  restart)
    do_stop
    sleep 1
    do_start
    ;;
  status)
    do_status
    ;;
  logs)
    do_logs "${2:-all}"
    ;;
  *)
    usage
    ;;
esac

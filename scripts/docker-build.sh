#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 从 git 计算版本号
APP_VERSION=$(git log -1 --format=%cd --date=format:%Y%m%d)-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# 支持通过参数指定组件: ./scripts/docker-build.sh [all|frontend|backend]
TARGET="${1:-all}"

echo "========================================="
echo "  Docker Build"
echo "  Version: $APP_VERSION"
echo "  Target:  $TARGET"
echo "========================================="

build_backend() {
  echo "[INFO] Building backend..."
  docker build \
    -f packages/backend/Dockerfile \
    -t hmilyld/zerochat-backend:latest \
    -t hmilyld/zerochat-backend:$APP_VERSION \
    .
  echo "[INFO] Backend built: hmilyld/zerochat-backend:$APP_VERSION"
}

build_frontend() {
  echo "[INFO] Building frontend..."
  docker build \
    --build-arg APP_VERSION=$APP_VERSION \
    -f packages/frontend/Dockerfile \
    -t hmilyld/zerochat-frontend:latest \
    -t hmilyld/zerochat-frontend:$APP_VERSION \
    .
  echo "[INFO] Frontend built: hmilyld/zerochat-frontend:$APP_VERSION"
}

case "$TARGET" in
  frontend)
    build_frontend
    ;;
  backend)
    build_backend
    ;;
  all)
    build_backend
    build_frontend
    ;;
  *)
    echo "[ERROR] Unknown target: $TARGET"
    echo "Usage: $0 [all|frontend|backend]"
    exit 1
    ;;
esac

echo ""
echo "[INFO] Build complete."
docker images | grep zerochat

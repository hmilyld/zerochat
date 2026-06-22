#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

APP_VERSION=$(git log -1 --format=%cd --date=format:%Y%m%d)-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
REGISTRY="hmilyld"

# 支持通过参数指定组件: ./scripts/docker-publish.sh [all|frontend|backend]
TARGET="${1:-all}"

echo "========================================="
echo "  Docker Publish"
echo "  Version:  $APP_VERSION"
echo "  Registry: $REGISTRY"
echo "  Target:   $TARGET"
echo "========================================="

# 检查是否已登录 docker hub
if ! docker info 2>/dev/null | grep -q "Username"; then
  echo "[ERROR] Not logged in to Docker Hub. Run: docker login"
  exit 1
fi

publish_backend() {
  echo "[INFO] Pushing backend..."
  docker push $REGISTRY/zerochat-backend:latest
  docker push $REGISTRY/zerochat-backend:$APP_VERSION
  echo "[INFO] Backend published."
}

publish_frontend() {
  echo "[INFO] Pushing frontend..."
  docker push $REGISTRY/zerochat-frontend:latest
  docker push $REGISTRY/zerochat-frontend:$APP_VERSION
  echo "[INFO] Frontend published."
}

# 检查本地镜像是否存在
check_image() {
  local image=$1
  if ! docker image inspect "$image" &>/dev/null; then
    echo "[ERROR] Image not found: $image"
    echo "[INFO] Run ./scripts/docker-build.sh first."
    exit 1
  fi
}

if [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; then
  check_image "$REGISTRY/zerochat-backend:$APP_VERSION"
fi
if [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; then
  check_image "$REGISTRY/zerochat-frontend:$APP_VERSION"
fi

case "$TARGET" in
  frontend)
    publish_frontend
    ;;
  backend)
    publish_backend
    ;;
  all)
    publish_backend
    publish_frontend
    ;;
  *)
    echo "[ERROR] Unknown target: $TARGET"
    echo "Usage: $0 [all|frontend|backend]"
    exit 1
    ;;
esac

echo ""
echo "========================================="
echo "  Publish complete!"
echo "  Backend:  $REGISTRY/zerochat-backend:$APP_VERSION"
echo "  Frontend: $REGISTRY/zerochat-frontend:$APP_VERSION"
echo "========================================="

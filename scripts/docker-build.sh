#!/bin/bash

# Docker构建脚本
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

APP_VERSION=$(git log -1 --format=%cd --date=format:%Y%m%d)-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# 支持通过参数指定目标: ./scripts/docker-build.sh [all|frontend|backend|unified]
TARGET="${1:-unified}"

echo "=========================================="
echo "  ZeroChat Docker构建脚本"
echo "  Version: $APP_VERSION"
echo "  Target:  $TARGET"
echo "=========================================="

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker未运行，请先启动Docker"
    exit 1
fi

build_backend() {
    echo "[INFO] 构建后端镜像..."
    docker build \
        -f packages/backend/Dockerfile \
        -t hmilyld/zerochat-backend:${APP_VERSION} \
        .
    docker tag hmilyld/zerochat-backend:${APP_VERSION} hmilyld/zerochat-backend:latest
    echo "[INFO] 后端镜像构建完成: hmilyld/zerochat-backend:${APP_VERSION}"
}

build_frontend() {
    echo "[INFO] 构建前端镜像..."
    docker build \
        -f packages/frontend/Dockerfile \
        -t hmilyld/zerochat-frontend:${APP_VERSION} \
        --build-arg APP_VERSION=${APP_VERSION} \
        .
    docker tag hmilyld/zerochat-frontend:${APP_VERSION} hmilyld/zerochat-frontend:latest
    echo "[INFO] 前端镜像构建完成: hmilyld/zerochat-frontend:${APP_VERSION}"
}

build_unified() {
    echo "[INFO] 构建统一镜像..."
    docker build \
        -f Dockerfile.unified \
        -t hmilyld/zerochat:${APP_VERSION} \
        --build-arg APP_VERSION=${APP_VERSION} \
        .
    docker tag hmilyld/zerochat:${APP_VERSION} hmilyld/zerochat:latest
    echo "[INFO] 统一镜像构建完成: hmilyld/zerochat:${APP_VERSION}"
}

case "$TARGET" in
    frontend)
        build_frontend
        ;;
    backend)
        build_backend
        ;;
    unified)
        build_unified
        ;;
    all)
        build_backend
        build_frontend
        ;;
    *)
        echo "[ERROR] 未知目标: $TARGET"
        echo "Usage: $0 [all|frontend|backend|unified]"
        echo ""
        echo "Targets:"
        echo "  all       - 构建所有镜像 (后端 + 前端)"
        echo "  backend   - 仅构建后端镜像"
        echo "  frontend  - 仅构建前端镜像"
        echo "  unified   - 仅构建统一镜像 (默认)"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "  构建完成!"
if [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; then
    echo "  Backend:  hmilyld/zerochat-backend:${APP_VERSION}"
fi
if [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; then
    echo "  Frontend: hmilyld/zerochat-frontend:${APP_VERSION}"
fi
if [ "$TARGET" = "unified" ]; then
    echo "  Unified:  hmilyld/zerochat:${APP_VERSION}"
fi
echo "=========================================="
echo ""
echo "下一步:"
echo "  推送镜像: ./scripts/docker-publish.sh $TARGET"
echo "  本地运行: docker-compose -f docker-compose.unified.yml up -d"

#!/bin/bash

# Docker部署脚本
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

APP_VERSION=$(git log -1 --format=%cd --date=format:%Y%m%d)-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# 支持通过参数指定目标: ./scripts/docker-deploy.sh [all|frontend|backend|unified]
TARGET="${1:-unified}"

echo "=========================================="
echo "  ZeroChat Docker部署脚本"
echo "  Version: $APP_VERSION"
echo "  Target:  $TARGET"
echo "=========================================="

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker未运行，请先启动Docker"
    exit 1
fi

deploy_unified() {
    local CONTAINER_NAME="zerochat-app"
    
    echo "[INFO] 部署统一镜像..."
    
    # 停止并删除旧容器
    if docker ps -a | grep -q ${CONTAINER_NAME}; then
        echo "[INFO] 停止旧容器..."
        docker stop ${CONTAINER_NAME} 2>/dev/null || true
        docker rm ${CONTAINER_NAME} 2>/dev/null || true
    fi
    
    # 拉取最新镜像
    echo "[INFO] 拉取最新镜像..."
    docker pull hmilyld/zerochat:${APP_VERSION}
    
    # 启动容器
    echo "[INFO] 启动容器..."
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${PORT:-3001}:3001 \
        -p ${FRONTEND_PORT:-5173}:5173 \
        -p 127.0.0.1:6379:6379 \
        -e REDIS_PASSWORD="${REDIS_PASSWORD}" \
        -e APP_VERSION="${APP_VERSION}" \
        -e CORS_ORIGIN="${CORS_ORIGIN:-http://localhost}" \
        -e MESSAGE_TTL_SECONDS="${MESSAGE_TTL_SECONDS:-3600}" \
        -v zerochat_redis_data:/data \
        hmilyld/zerochat:${APP_VERSION}
    
    # 等待服务启动
    echo "[INFO] 等待服务启动..."
    sleep 5
    
    # 检查服务状态
    if docker ps | grep -q ${CONTAINER_NAME}; then
        echo "✅ 部署成功"
        echo ""
        echo "服务状态:"
        docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        echo "访问地址:"
        echo "  前端: http://localhost:${FRONTEND_PORT:-5173}"
        echo "  后端: http://localhost:${PORT:-3001}"
        echo ""
        echo "查看日志: docker logs -f ${CONTAINER_NAME}"
    else
        echo "❌ 部署失败"
        echo "查看日志: docker logs ${CONTAINER_NAME}"
        exit 1
    fi
}

deploy_legacy() {
    echo "[INFO] 使用docker-compose部署三镜像架构..."
    docker-compose up -d --build
    echo "✅ 部署完成"
    echo ""
    echo "服务状态:"
    docker-compose ps
    echo ""
    echo "访问地址:"
    echo "  前端: http://localhost:5173"
    echo "  后端: http://localhost:3001"
    echo ""
    echo "查看日志: docker-compose logs -f"
}

case "$TARGET" in
    unified)
        deploy_unified
        ;;
    legacy)
        deploy_legacy
        ;;
    *)
        echo "[ERROR] 未知目标: $TARGET"
        echo "Usage: $0 [unified|legacy]"
        echo ""
        echo "Targets:"
        echo "  unified - 部署统一镜像 (默认)"
        echo "  legacy  - 使用docker-compose部署三镜像架构"
        exit 1
        ;;
esac

#!/bin/bash

# Docker日志查看脚本
set -e

CONTAINER_NAME="zerochat-app"
LOG_LINES="${1:-100}"

echo "=========================================="
echo "ZeroChat Docker日志查看"
echo "=========================================="

# 检查容器是否存在
if ! docker ps -a | grep -q ${CONTAINER_NAME}; then
    echo "错误: 容器不存在"
    echo "请先部署应用: ./scripts/docker-deploy.sh"
    exit 1
fi

# 显示容器状态
echo "容器状态:"
docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 选择日志类型
echo "日志类型:"
echo "1. 全部日志"
echo "2. 后端日志"
echo "3. 前端日志"
echo "4. Redis日志"
echo "5. 实时跟踪"
read -p "请选择 (1-5): " choice

case $choice in
    1)
        echo "显示最近 ${LOG_LINES} 行日志..."
        docker logs --tail ${LOG_LINES} ${CONTAINER_NAME}
        ;;
    2)
        echo "显示后端日志..."
        docker logs --tail ${LOG_LINES} ${CONTAINER_NAME} 2>&1 | grep -i "backend\|node\|tsx"
        ;;
    3)
        echo "显示前端日志..."
        docker logs --tail ${LOG_LINES} ${CONTAINER_NAME} 2>&1 | grep -i "serve\|frontend"
        ;;
    4)
        echo "显示Redis日志..."
        docker logs --tail ${LOG_LINES} ${CONTAINER_NAME} 2>&1 | grep -i "redis"
        ;;
    5)
        echo "实时跟踪日志 (Ctrl+C 退出)..."
        docker logs -f ${CONTAINER_NAME}
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac

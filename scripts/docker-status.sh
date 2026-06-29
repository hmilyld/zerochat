#!/bin/bash

# Docker状态检查脚本
set -e

CONTAINER_NAME="zerochat-app"

echo "=========================================="
echo "ZeroChat Docker状态检查"
echo "=========================================="

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行"
    exit 1
fi

echo "✅ Docker运行正常"
echo ""

# 检查容器状态
echo "容器状态:"
if docker ps | grep -q ${CONTAINER_NAME}; then
    echo "✅ 容器运行中"
    docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "❌ 容器未运行"
    if docker ps -a | grep -q ${CONTAINER_NAME}; then
        echo "容器已停止:"
        docker ps -a --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}"
    else
        echo "容器不存在"
    fi
fi
echo ""

# 检查端口监听
echo "端口监听状态:"
for port in 3001 5173 6379; do
    if netstat -tlnp 2>/dev/null | grep -q ":${port}"; then
        echo "✅ 端口 ${port} 已监听"
    else
        echo "❌ 端口 ${port} 未监听"
    fi
done
echo ""

# 检查服务健康状态
echo "服务健康检查:"
# 检查后端
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ 后端服务正常 (端口 3001)"
else
    echo "❌ 后端服务异常"
fi

# 检查前端
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ 前端服务正常 (端口 5173)"
else
    echo "❌ 前端服务异常"
fi

# 检查Redis
if docker exec ${CONTAINER_NAME} redis-cli -a "${REDIS_PASSWORD}" ping 2>/dev/null | grep -q "PONG"; then
    echo "✅ Redis服务正常 (端口 6379)"
else
    echo "❌ Redis服务异常"
fi
echo ""

# 显示资源使用情况
echo "资源使用情况:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" ${CONTAINER_NAME} 2>/dev/null || echo "无法获取资源统计"
echo ""

# 显示磁盘使用情况
echo "磁盘使用情况:"
docker system df

#!/bin/bash

# Docker清理脚本
set -e

echo "=========================================="
echo "ZeroChat Docker清理脚本"
echo "=========================================="

# 停止并删除容器
echo "正在停止容器..."
docker stop zerochat-app 2>/dev/null || true
docker rm zerochat-app 2>/dev/null || true

# 删除镜像
echo "正在删除镜像..."
docker rmi zerochat:latest 2>/dev/null || true
docker rmi zerochat:dev 2>/dev/null || true

# 清理悬空镜像
echo "正在清理悬空镜像..."
docker image prune -f

# 清理未使用的容器
echo "正在清理未使用的容器..."
docker container prune -f

# 清理未使用的卷（可选，会删除数据）
read -p "是否删除Redis数据卷？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "正在删除数据卷..."
    docker volume rm zerochat_redis_data 2>/dev/null || true
    docker volume prune -f
    echo "⚠️  Redis数据已删除"
else
    echo "保留Redis数据卷"
fi

echo "✅ 清理完成"

#!/bin/bash

# Docker推送脚本
set -e

# 配置
IMAGE_NAME="zerochat"
IMAGE_TAG="${APP_VERSION:-latest}"
REGISTRY="${DOCKER_REGISTRY:-docker.io}"
NAMESPACE="${DOCKER_NAMESPACE:-zerochat}"

echo "=========================================="
echo "ZeroChat Docker推送脚本"
echo "=========================================="

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "错误: Docker未运行，请先启动Docker"
    exit 1
fi

# 检查镜像是否存在
if ! docker image inspect ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG} > /dev/null 2>&1; then
    echo "错误: 镜像不存在，请先运行构建脚本"
    echo "运行: ./scripts/docker-build.sh"
    exit 1
fi

# 登录Docker Registry（如果需要）
if [ -n "${DOCKER_USERNAME}" ] && [ -n "${DOCKER_PASSWORD}" ]; then
    echo "正在登录Docker Registry..."
    echo "${DOCKER_PASSWORD}" | docker login ${REGISTRY} -u "${DOCKER_USERNAME}" --password-stdin
fi

# 推送镜像
echo "正在推送镜像..."
docker push ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}

# 推送latest版本
if [ "${IMAGE_TAG}" != "latest" ]; then
    docker push ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:latest
fi

echo "✅ 镜像推送完成"
echo "镜像地址: ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "下一步:"
echo "1. 在服务器上拉取镜像: docker pull ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
echo "2. 部署应用: ./scripts/docker-deploy.sh"

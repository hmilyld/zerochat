# Docker发布脚本使用说明

## 脚本概览

| 脚本 | 用途 | 命令 |
|------|------|------|
| docker-build.sh | 构建统一镜像 | `./scripts/docker-build.sh` |
| docker-push.sh | 推送镜像到Registry | `./scripts/docker-push.sh` |
| docker-deploy.sh | 部署应用到服务器 | `./scripts/docker-deploy.sh` |
| docker-status.sh | 查看服务状态 | `./scripts/docker-status.sh` |
| docker-logs.sh | 查看服务日志 | `./scripts/docker-logs.sh` |
| docker-cleanup.sh | 清理Docker资源 | `./scripts/docker-cleanup.sh` |

## 快速开始

### 1. 构建镜像

```bash
# 使用Make命令
make docker-build

# 或直接运行脚本
./scripts/docker-build.sh
```

### 2. 推送镜像

```bash
# 设置环境变量
export DOCKER_REGISTRY=docker.io
export DOCKER_NAMESPACE=zerochat
export DOCKER_USERNAME=your_username
export DOCKER_PASSWORD=your_password

# 推送
make docker-push
```

### 3. 部署应用

```bash
# 设置环境变量
export REDIS_PASSWORD=your_password
export APP_VERSION=1.0.0

# 部署
make docker-deploy
```

### 4. 查看状态

```bash
make docker-status
```

### 5. 查看日志

```bash
make docker-logs
```

### 6. 清理资源

```bash
make docker-cleanup
```

## 环境变量配置

### 构建相关

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| APP_VERSION | 应用版本号 | git commit hash |
| DOCKER_REGISTRY | Docker Registry地址 | docker.io |
| DOCKER_NAMESPACE | Docker命名空间 | zerochat |

### 部署相关

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| REDIS_PASSWORD | Redis密码 | 无 |
| PORT | 后端端口 | 3001 |
| FRONTEND_PORT | 前端端口 | 5173 |
| CORS_ORIGIN | 跨域来源 | http://localhost |
| MESSAGE_TTL_SECONDS | 消息过期时间 | 3600 |

## 完整发布流程

```bash
# 1. 设置版本号
export APP_VERSION=1.0.0

# 2. 构建镜像
make docker-build

# 3. 推送镜像
make docker-push

# 4. 在服务器上部署
ssh server "export REDIS_PASSWORD=secret && ./scripts/docker-deploy.sh"

# 5. 验证部署
make docker-status
```

## 生产环境建议

1. **使用CI/CD**：将构建和推送集成到CI/CD流程
2. **镜像签名**：使用Docker Content Trust进行镜像签名
3. **多阶段构建**：优化镜像大小
4. **健康检查**：添加Docker健康检查配置
5. **日志收集**：集成ELK或EFK进行日志收集
6. **监控告警**：添加Prometheus和Grafana监控

## 故障排查

### 镜像构建失败

```bash
# 检查Docker日志
docker build -f Dockerfile.unified -t zerochat:debug . 2>&1

# 检查依赖安装
docker run -it node:22-alpine sh
```

### 容器启动失败

```bash
# 查看容器日志
docker logs zerochat-app

# 进入容器调试
docker exec -it zerochat-app sh

# 检查进程状态
ps aux | grep -E "redis|node|serve"
```

### 端口冲突

```bash
# 检查端口占用
netstat -tlnp | grep -E "3001|5173|6379"

# 修改端口配置
export PORT=3002
export FRONTEND_PORT=5174
```

## 卸载

```bash
# 停止并删除容器
docker stop zerochat-app
docker rm zerochat-app

# 删除镜像
docker rmi zerochat:latest zerochat:dev

# 删除数据卷
docker volume rm zerochat_redis_data

# 清理悬空镜像
docker image prune -f
```

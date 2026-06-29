# Docker脚本更新日志

## 更新时间
2026-06-29

## 更新内容

### 1. 新增统一镜像架构
- 新增 `Dockerfile.unified` - 统一的Dockerfile，包含前端、后端和Redis
- 新增 `docker-compose.unified.yml` - 统一镜像的docker-compose配置
- 新增 `scripts/start-unified.sh` - 启动脚本
- 新增 `scripts/supervisord.conf` - 进程管理配置（备选方案）

### 2. 新增Docker发布脚本
- `scripts/docker-build.sh` - 构建脚本，支持多种构建目标
- `scripts/docker-push.sh` - 推送脚本
- `scripts/docker-deploy.sh` - 部署脚本，支持多种部署目标
- `scripts/docker-status.sh` - 状态检查脚本
- `scripts/docker-logs.sh` - 日志查看脚本
- `scripts/docker-cleanup.sh` - 清理脚本

### 3. 更新现有脚本
- `scripts/docker-publish.sh` - 更新支持统一镜像发布
- `scripts/docker-build.sh` - 更新支持多种构建目标
- `scripts/docker-deploy.sh` - 更新支持多种部署目标

### 4. 更新Makefile
- 新增 `docker-unified-up` 命令 - 启动统一镜像服务
- 新增 `docker-build` 命令 - 构建统一镜像
- 新增 `docker-push` 命令 - 推送统一镜像
- 新增 `docker-deploy` 命令 - 部署统一镜像
- 新增 `docker-status` 命令 - 查看服务状态
- 新增 `docker-logs` 命令 - 查看服务日志
- 新增 `docker-cleanup` 命令 - 清理Docker资源
- 新增 `publish-unified` 命令 - 推送统一镜像到Docker Hub
- 更新 `build-docker` 命令 - 支持三镜像架构构建
- 更新 `publish` 命令 - 支持三镜像架构发布

### 5. 新增文档
- `UNIFIED_DEPLOY.md` - 统一镜像部署说明
- `DOCKER_SCRIPTS.md` - Docker脚本使用说明

## 使用方法

### 统一镜像架构（推荐）
```bash
# 构建统一镜像
make docker-build

# 推送统一镜像
make docker-push

# 部署统一镜像
make docker-deploy

# 查看状态
make docker-status

# 查看日志
make docker-logs

# 清理资源
make docker-cleanup
```

### 三镜像架构（兼容）
```bash
# 构建所有镜像
make build-docker

# 推送所有镜像
make publish

# 启动服务
make up

# 停止服务
make down
```

## 环境变量配置

### 构建相关
- `APP_VERSION` - 应用版本号（默认使用git commit信息）
- `DOCKER_REGISTRY` - Docker Registry地址（默认docker.io）
- `DOCKER_NAMESPACE` - Docker命名空间（默认zerochat）

### 部署相关
- `REDIS_PASSWORD` - Redis密码
- `PORT` - 后端端口（默认3001）
- `FRONTEND_PORT` - 前端端口（默认5173）
- `CORS_ORIGIN` - 跨域来源（默认http://localhost）
- `MESSAGE_TTL_SECONDS` - 消息过期时间（默认3600）

## 完整发布流程

```bash
# 1. 设置版本号
export APP_VERSION=1.0.0

# 2. 构建统一镜像
make docker-build

# 3. 推送统一镜像
make docker-push

# 4. 在服务器上部署
ssh server "export REDIS_PASSWORD=secret && ./scripts/docker-deploy.sh"

# 5. 验证部署
make docker-status
```

## 注意事项

1. **数据持久化**：Redis数据通过Docker卷持久化，容器重启会保留
2. **单点故障**：一个服务崩溃可能影响其他服务
3. **生产环境**：建议保持Redis独立，使用云服务或Kubernetes部署
4. **镜像大小**：统一镜像较大，包含所有服务
5. **安全考虑**：生产环境建议使用HTTPS和防火墙

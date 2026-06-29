# CI/CD配置说明

## 概述

本项目使用GitHub Actions进行CI/CD，包括：

1. **代码检查和测试** - 自动运行lint、typecheck和测试
2. **Docker镜像构建** - 构建统一镜像和三镜像架构
3. **自动部署** - 推送到main分支时自动部署到服务器
4. **安全扫描** - 定期进行安全漏洞扫描
5. **代码质量检查** - 检查代码风格、测试覆盖率等
6. **自动发布** - 打tag时自动创建Release并部署

## 工作流文件

| 文件 | 用途 | 触发条件 |
|------|------|----------|
| `ci.yml` | CI/CD主流程 | push/PR/Release |
| `security.yml` | 安全扫描 | push/PR/每周日 |
| `quality.yml` | 代码质量检查 | push/PR |
| `release.yml` | 自动发布 | push tag (v*) |

## 配置步骤

### 1. 设置GitHub Secrets

在GitHub仓库的 Settings > Secrets and variables > Actions 中添加：

#### Docker Hub相关
```
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password
```

#### 服务器部署相关
```
SERVER_HOST=your_server_ip
SERVER_USERNAME=your_server_username
SERVER_SSH_KEY=your_ssh_private_key
REDIS_PASSWORD=your_redis_password
CORS_ORIGIN=http://your_domain.com
```

#### 生产环境相关（可选）
```
PRODUCTION_SERVER_HOST=production_server_ip
PRODUCTION_SERVER_USERNAME=production_username
PRODUCTION_SERVER_SSH_KEY=production_ssh_key
PRODUCTION_REDIS_PASSWORD=production_redis_password
PRODUCTION_CORS_ORIGIN=https://your_domain.com
```

#### 安全扫描相关（可选）
```
SNYK_TOKEN=your_snyk_token
```

### 2. 设置GitHub Environments

在GitHub仓库的 Settings > Environments 中创建：

1. **production** - 生产环境
   - 添加 reviewers（可选）
   - 配置 deployment protection rules

### 3. 配置分支保护

在GitHub仓库的 Settings > Branches 中：

1. 为 `main` 分支添加保护规则：
   - Require pull request reviews before merging
   - Require status checks to pass before merging
   - Require branches to be up to date before merging

## 工作流程

### 开发流程

1. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **开发并提交**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **推送并创建PR**
   ```bash
   git push origin feature/your-feature
   ```

4. **PR检查**
   - 自动运行lint、typecheck、测试
   - 自动进行安全扫描
   - 自动检查代码质量

5. **合并PR**
   - 合并到main分支后自动触发CI/CD

### 发布流程

1. **更新版本号**
   ```bash
   # 更新package.json中的版本号
   npm version patch/minor/major
   ```

2. **创建并推送tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **自动发布**
   - 自动构建Docker镜像
   - 自动推送到Docker Hub
   - 自动创建GitHub Release
   - 自动部署到生产环境

### 手动部署

```bash
# 使用Make命令
make docker-build
make docker-push
make docker-deploy

# 或使用脚本
./scripts/docker-build.sh
./scripts/docker-push.sh
./scripts/docker-deploy.sh
```

## 环境变量

### CI/CD环境变量

| 变量名 | 说明 | 位置 |
|--------|------|------|
| DOCKER_USERNAME | Docker Hub用户名 | GitHub Secrets |
| DOCKER_PASSWORD | Docker Hub密码 | GitHub Secrets |
| SERVER_HOST | 服务器地址 | GitHub Secrets |
| SERVER_USERNAME | 服务器用户名 | GitHub Secrets |
| SERVER_SSH_KEY | 服务器SSH私钥 | GitHub Secrets |
| REDIS_PASSWORD | Redis密码 | GitHub Secrets |
| CORS_ORIGIN | 跨域来源 | GitHub Secrets |
| SNYK_TOKEN | Snyk API Token | GitHub Secrets |

### 应用环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| APP_VERSION | 应用版本号 | git commit hash |
| REDIS_PASSWORD | Redis密码 | 无 |
| PORT | 后端端口 | 3001 |
| FRONTEND_PORT | 前端端口 | 5173 |
| CORS_ORIGIN | 跨域来源 | http://localhost |
| MESSAGE_TTL_SECONDS | 消息过期时间 | 3600 |

## 监控和告警

### GitHub Actions监控

1. **查看工作流运行**
   - 访问 GitHub仓库的 Actions 页面
   - 查看工作流运行状态和日志

2. **设置通知**
   - 在 Settings > Notifications 中配置
   - 选择接收邮件或GitHub通知

### 服务器监控

1. **查看容器状态**
   ```bash
   docker ps
   docker logs zerochat-app
   ```

2. **查看资源使用**
   ```bash
   docker stats
   ```

3. **健康检查**
   ```bash
   curl http://localhost:3001/health
   ```

## 故障排查

### 工作流失败

1. **查看工作流日志**
   - 访问 GitHub仓库的 Actions 页面
   - 点击失败的工作流查看详细日志

2. **常见问题**
   - 依赖安装失败：检查package.json和pnpm-lock.yaml
   - Docker构建失败：检查Dockerfile
   - 部署失败：检查服务器连接和权限

### 部署问题

1. **容器启动失败**
   ```bash
   docker logs zerochat-app
   ```

2. **端口冲突**
   ```bash
   netstat -tlnp | grep -E "3001|5173|6379"
   ```

3. **数据卷问题**
   ```bash
   docker volume ls
   docker volume inspect zerochat_redis_data
   ```

## 安全最佳实践

1. **保护Secrets**
   - 不要在代码中硬编码密码
   - 使用GitHub Secrets存储敏感信息
   - 定期轮换密码和API密钥

2. **镜像安全**
   - 定期更新基础镜像
   - 进行安全扫描
   - 使用最小权限原则

3. **服务器安全**
   - 使用SSH密钥认证
   - 限制服务器访问权限
   - 定期更新系统和依赖

## 优化建议

1. **缓存优化**
   - 使用GitHub Actions缓存
   - 优化Docker层缓存

2. **并行执行**
   - 独立任务并行运行
   - 减少工作流运行时间

3. **监控和日志**
   - 集成监控工具
   - 集中日志收集

## 相关文档

- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Docker文档](https://docs.docker.com/)
- [项目README](README.md)
- [Docker脚本说明](DOCKER_SCRIPTS.md)
- [统一镜像部署说明](UNIFIED_DEPLOY.md)

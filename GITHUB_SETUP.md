# GitHub配置指南

## 概述

本指南将帮助您配置GitHub仓库以支持CI/CD流程，包括：

1. 设置GitHub Secrets
2. 创建GitHub Environments
3. 配置分支保护规则
4. 验证配置

## 1. 设置GitHub Secrets

### 步骤

1. 访问您的GitHub仓库
2. 点击 **Settings** 标签
3. 在左侧菜单中选择 **Secrets and variables** > **Actions**
4. 点击 **New repository secret** 按钮
5. 添加以下Secrets

### Docker Hub相关Secrets

| Name | Value | 说明 |
|------|-------|------|
| DOCKER_USERNAME | your_docker_username | Docker Hub用户名 |
| DOCKER_PASSWORD | your_docker_password | Docker Hub密码或Access Token |

**获取Docker Hub Access Token：**
1. 登录 [Docker Hub](https://hub.docker.com/)
2. 点击右上角头像 > **Account Settings**
3. 选择 **Security** 标签
4. 点击 **New Access Token**
5. 选择权限：**Read & Write**
6. 复制生成的Token

### 服务器部署相关Secrets

| Name | Value | 说明 |
|------|-------|------|
| SERVER_HOST | 192.168.1.100 | 服务器IP地址 |
| SERVER_USERNAME | deploy | 服务器用户名 |
| SERVER_SSH_KEY | -----BEGIN OPENSSH PRIVATE KEY-----... | 服务器SSH私钥 |
| REDIS_PASSWORD | your_redis_password | Redis密码 |
| CORS_ORIGIN | http://your_domain.com | 跨域来源 |

**生成SSH密钥对：**
```bash
# 在本地生成SSH密钥对
ssh-keygen -t ed25519 -C "github-actions" -f zerochat_deploy

# 将公钥添加到服务器
ssh-copy-id -i zerochat_deploy.pub deploy@your_server_ip

# 复制私钥内容到GitHub Secret
cat zerochat_deploy
```

### 生产环境相关Secrets（可选）

| Name | Value | 说明 |
|------|-------|------|
| PRODUCTION_SERVER_HOST | production_server_ip | 生产服务器IP |
| PRODUCTION_SERVER_USERNAME | deploy | 生产服务器用户名 |
| PRODUCTION_SERVER_SSH_KEY | -----BEGIN OPENSSH PRIVATE KEY-----... | 生产服务器SSH私钥 |
| PRODUCTION_REDIS_PASSWORD | production_redis_password | 生产环境Redis密码 |
| PRODUCTION_CORS_ORIGIN | https://your_domain.com | 生产环境跨域来源 |

### 安全扫描相关Secrets（可选）

| Name | Value | 说明 |
|------|-------|------|
| SNYK_TOKEN | your_snyk_token | Snyk API Token |

**获取Snyk Token：**
1. 注册 [Snyk](https://snyk.io/)
2. 访问 [Account Settings](https://app.snyk.io/account)
3. 复制 **API Token**

## 2. 创建GitHub Environments

### 步骤

1. 访问您的GitHub仓库
2. 点击 **Settings** 标签
3. 在左侧菜单中选择 **Environments**
4. 点击 **New environment** 按骤

### 创建Production环境

1. 输入环境名称：`production`
2. 点击 **Configure environment**
3. 配置以下选项：

#### Deployment protection rules（可选）

- **Required reviewers**: 添加需要审批的用户
- **Wait timer**: 设置等待时间（分钟）
- **Branch restrictions**: 限制部署的分支

#### Environment secrets

添加以下环境特定的Secrets：

| Name | Value |
|------|-------|
| REDIS_PASSWORD | production_redis_password |
| CORS_ORIGIN | https://your_domain.com |

## 3. 配置分支保护规则

### 步骤

1. 访问您的GitHub仓库
2. 点击 **Settings** 标签
3. 在左侧菜单中选择 **Branches**
4. 点击 **Add branch protection rule**

### 为main分支添加保护

1. **Branch name pattern**: `main`
2. 配置以下选项：

#### Pull request requirements
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ **Require status checks to pass before merging**
  - 添加以下checks：
    - `lint-and-test`
    - `build-unified`
    - `security-scan`
- ✅ **Require branches to be up to date before merging**

#### Who can push to matching branches
- ✅ **Restrict who can push to matching branches**
  - 添加需要推送权限的用户或团队

#### Additional settings
- ✅ **Require conversation resolution before merging**
- ✅ **Require linear history**（可选）

## 4. 验证配置

### 验证GitHub Secrets

1. 访问您的GitHub仓库
2. 点击 **Settings** > **Secrets and variables** > **Actions**
3. 确认所有Secrets已正确添加

### 验证GitHub Environments

1. 访问您的GitHub仓库
2. 点击 **Settings** > **Environments**
3. 确认 `production` 环境已创建

### 验证分支保护

1. 访问您的GitHub仓库
2. 点击 **Settings** > **Branches**
3. 确认 `main` 分支保护规则已添加

### 测试CI/CD流程

1. **创建测试分支**
   ```bash
   git checkout -b test/ci-setup
   ```

2. **创建测试文件**
   ```bash
   echo "# CI/CD Test" > test.md
   git add test.md
   git commit -m "test: verify CI/CD setup"
   ```

3. **推送并创建PR**
   ```bash
   git push origin test/ci-setup
   ```

4. **在GitHub上创建PR**
   - 访问仓库的 **Pull requests** 标签
   - 点击 **New pull request**
   - 选择 `test/ci-setup` 分支合并到 `main`
   - 点击 **Create pull request**

5. **检查CI/CD运行**
   - 在PR页面查看 **Checks** 标签
   - 确认所有checks正在运行
   - 等待checks完成

## 5. 常见问题

### Q1: GitHub Actions工作流没有运行

**可能原因：**
- 仓库是私有的，需要启用GitHub Actions
- 分支保护规则阻止了推送

**解决方案：**
1. 访问 **Settings** > **Actions** > **General**
2. 选择 **Allow all actions and reusable workflows**
3. 保存设置

### Q2: Docker Hub登录失败

**可能原因：**
- 用户名或密码错误
- Access Token权限不足

**解决方案：**
1. 检查DOCKER_USERNAME和DOCKER_PASSWORD是否正确
2. 确认Access Token有 **Read & Write** 权限
3. 尝试在本地手动登录测试：
   ```bash
   echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
   ```

### Q3: SSH连接服务器失败

**可能原因：**
- SSH私钥格式错误
- 服务器防火墙阻止
- 用户名错误

**解决方案：**
1. 确认SSH私钥格式正确（包含BEGIN和END标记）
2. 检查服务器防火墙是否允许SSH连接
3. 测试SSH连接：
   ```bash
   ssh -i zerochat_deploy deploy@your_server_ip
   ```

### Q4: 部署后服务无法访问

**可能原因：**
- 端口未正确映射
- 防火墙阻止
- 服务启动失败

**解决方案：**
1. 检查容器状态：
   ```bash
   docker ps
   docker logs zerochat-app
   ```
2. 检查服务器防火墙：
   ```bash
   sudo ufw status
   sudo ufw allow 3001/tcp
   sudo ufw allow 5173/tcp
   ```
3. 检查服务日志：
   ```bash
   docker logs -f zerochat-app
   ```

## 6. 安全建议

### Secrets安全
- ✅ 定期轮换密码和API密钥
- ✅ 使用最小权限原则
- ✅ 不要在代码中硬编码密码
- ✅ 使用Environment secrets区分环境

### 服务器安全
- ✅ 使用SSH密钥认证
- ✅ 限制服务器访问权限
- ✅ 定期更新系统和依赖
- ✅ 使用防火墙限制端口访问

### Docker安全
- ✅ 定期更新基础镜像
- ✅ 进行安全扫描
- ✅ 使用非root用户运行容器
- ✅ 限制容器权限

## 7. 监控和维护

### 监控GitHub Actions
1. 访问仓库的 **Actions** 标签
2. 查看工作流运行状态
3. 设置通知（Settings > Notifications）

### 监控服务器
1. 查看容器状态：
   ```bash
   docker ps
   docker stats
   ```
2. 查看日志：
   ```bash
   docker logs -f zerochat-app
   ```
3. 健康检查：
   ```bash
   curl http://localhost:3001/health
   ```

### 定期维护
1. 更新依赖：
   ```bash
   pnpm update
   ```
2. 更新Docker镜像：
   ```bash
   docker pull node:22-alpine
   ```
3. 清理Docker资源：
   ```bash
   docker system prune -f
   ```

## 相关文档

- [GitHub Actions文档](https://docs.github.com/en/actions)
- [GitHub Secrets文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Environments文档](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [GitHub Branch Protection文档](https://docs.github.com/en/repositories/configuring-the-default-branch/managing-protected-branches/about-protected-branches)
- [项目README](README.md)
- [CI/CD配置说明](CICD_SETUP.md)
- [Docker脚本说明](DOCKER_SCRIPTS.md)

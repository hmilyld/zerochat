# ZeroChat — 私密通讯，零信任架构

[English](README.md)

端到端加密的阅后即焚通讯工具。一次性消息 + 加密聊天室，所有加解密在浏览器端完成，服务器永远无法看到你的内容。

## 功能

- **一次性消息** — 支持文字和图片，AES-256-GCM 加密，查看后自动销毁。
- **加密聊天室** — ECDH-X25519 密钥协商 + AES-256-GCM 逐条加密。
- **零信任** — 无需注册、无 Cookie、无追踪。密钥永不离开你的设备。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19, Vite 6, TypeScript, TailwindCSS 4, shadcn/ui |
| 后端 | Node.js 22, Express 5, ws, TypeScript |
| 存储 | Redis 7 (ioredis) |
| 加密 | @noble/ciphers (AES-GCM), @noble/curves (X25519) |

## 快速开始

### 本地开发

```bash
pnpm install
echo 'REDIS_URL=redis://:your_password@127.0.0.1:6379' > .env.local
pnpm dev:backend    # 端口 3001
pnpm dev:frontend   # 端口 5173
```

### 生产部署（Docker）

```bash
echo 'REDIS_PASSWORD=你的密码' > .env
make up
```

所有服务（前端、后端、Redis）运行在单个容器中。端口：5173（前端）、3001（后端）、6379（Redis）。

### Docker 常用命令

```bash
make up             # 构建并启动
make build          # 仅构建镜像
make push           # 推送到 Docker Hub
make down           # 停止服务
make logs           # 查看日志
make clean          # 清理资源
```

### CI/CD

推送代码到 `master` 分支后，GitHub Actions 自动构建并推送统一镜像到 Docker Hub（`hmilyld/zerochat`）。

需要配置的 GitHub Secrets：`DOCKER_USERNAME`、`DOCKER_PASSWORD`。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REDIS_PASSWORD` | *必填* | Redis 密码 |
| `PORT` | 3001 | 后端端口 |
| `CORS_ORIGIN` | `http://localhost` | CORS 允许来源 |
| `MESSAGE_TTL_SECONDS` | 3600 | 一次性消息过期时间（秒） |

## 许可证

MIT

# ZeroChat — 私密通讯，零信任架构

[English](README.md)

端到端加密的阅后即焚通讯工具。一次性消息 + 加密聊天室，所有加解密在浏览器端完成，服务器永远无法看到你的内容。

## 功能

- **一次性消息** — 支持文字和图片，AES-256-GCM 加密，查看后自动销毁。可选密码保护、自定义有效期、二维码分享。
- **加密聊天室** — ECDH-X25519 密钥协商 + AES-256-GCM 逐条加密。服务器盲转发密文，任意一方可销毁房间清除所有记录。
- **零信任** — 无需注册、无 Cookie、无追踪。密钥永不离开你的设备。
- **暗色模式** — 明亮/暗黑/随系统切换，偏好持久化。
- **多语言** — 中文 / English 切换。
- **移动优先** — 响应式布局，安全区域适配。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19, Vite 6, TypeScript, TailwindCSS 4, shadcn/ui, Zustand |
| 后端 | Node.js 22, Express 5, ws, TypeScript |
| 存储 | Redis 7 (ioredis) |
| 加密 | @noble/ciphers (AES-GCM), @noble/curves (X25519), @noble/hashes (HKDF, PBKDF2) |
| 部署 | Docker Compose (Node + Redis, 前端独立部署) |

## 项目结构

```
zerochat/
├── packages/
│   ├── shared/        # 前后端共享：加密工具 & 类型定义
│   ├── backend/       # Express + WebSocket + Redis
│   └── frontend/      # Vite + React SPA
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## 快速开始

### 环境要求

- Node.js 22+
- pnpm 10+
- Redis（或使用 Docker Compose 内置的）

### 本地开发

```bash
# 安装依赖
pnpm install

# 配置 Redis 连接
echo 'REDIS_URL=redis://:your_password@127.0.0.1:6379' > .env.local

# 启动后端（端口 3001）
pnpm dev:backend

# 启动前端（端口 5173，自动代理 /api 和 /ws 到后端）
pnpm dev:frontend
```

### 生产部署（Docker）

```bash
echo 'REDIS_PASSWORD=你的密码' > .env.production
docker compose up -d
```
前端端口 5173，后端端口 3001。使用反向代理（Nginx/OpenResty/Caddy）配置 HTTPS。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REDIS_URL` | *必填* | Redis 连接字符串 |
| `REDIS_PASSWORD` | *必填* | Redis 密码（docker-compose 使用） |
| `PORT` | 3001 | 后端 HTTP 端口 |
| `CORS_ORIGIN` | `http://localhost:5173` | 允许的跨域来源 |
| `MESSAGE_TTL_SECONDS` | 3600 | 一次性消息默认存活时间（秒） |
| `ROOM_TTL_SECONDS` | 3600 | 聊天室仅有单人时自动销毁时间（秒） |
| `ROOM_IDLE_SECONDS` | 3600 | 聊天室空闲自动销毁时间（秒） |

配置文件加载顺序：`.env` → `.env.local`（开发） / `.env.production`（生产）。

## 安全机制

- **客户端加密** — 所有密码学运算在浏览器完成，使用 @noble/* 系列库。
- **ECDH 密钥协商** — X25519 椭圆曲线，HKDF-SHA256 派生会话密钥。
- **AES-256-GCM** — 认证加密，每条消息独立随机 12 字节 nonce。
- **URL Fragment 传密** — 一次性消息解密密钥放在 URL hash 中，浏览器不会发送到服务器。
- **速率限制** — 所有 API 端点均有 IP 级别频率限制。
- **CSP 策略** — 生产环境在反向代理中配置 Content-Security-Policy 头部。
- **零追踪** — 无账号系统、无 Cookie、无分析统计。

## 许可证

MIT

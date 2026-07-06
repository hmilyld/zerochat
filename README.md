# ZeroChat — Private Communication, Zero Trust

End-to-end encrypted ephemeral messaging. One-time burn-after-reading messages and encrypted chat rooms — all encryption happens in your browser. The server never sees your content.

## Features

- **One-Time Messages** — text or image, AES-256-GCM encrypted, auto-destroyed after viewing.
- **Encrypted Chat Rooms** — ECDH-X25519 key exchange + AES-256-GCM per-message encryption.
- **Zero Trust** — no registration, no cookies, no tracking. Keys never leave your device.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 6, TypeScript, TailwindCSS 4, shadcn/ui |
| Backend | Node.js 22, Express 5, ws, TypeScript |
| Storage | Redis 7 (ioredis) |
| Crypto | @noble/ciphers (AES-GCM), @noble/curves (X25519) |

## Quick Start

### Development

```bash
pnpm install
echo 'REDIS_URL=redis://:your_password@127.0.0.1:6379' > .env.local
pnpm dev:backend    # port 3001
pnpm dev:frontend   # port 5173
```

### Production (Docker)

```bash
echo 'REDIS_PASSWORD=your_password' > .env
make up
```

All services (frontend, backend, Redis) run in a single container. Ports: 5173 (frontend), 3001 (backend), 6379 (Redis).

### Docker Commands

```bash
make up             # 构建并启动
make build          # 仅构建镜像
make push           # 推送到 Docker Hub
make down           # 停止服务
make logs           # 查看日志
make clean          # 清理资源
```

### CI/CD

Push to `master` triggers GitHub Actions to build and push the image to Docker Hub (`hmilyld/zerochat`).

Required GitHub Secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_PASSWORD` | *required* | Redis 密码 |
| `PORT` | 3001 | 后端端口 |
| `CORS_ORIGIN` | `http://localhost` | CORS 允许来源 |
| `MESSAGE_TTL_SECONDS` | 3600 | 一次性消息过期时间（秒） |

## License

MIT

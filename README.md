# ZeroChat — Private Communication, Zero Trust

[中文版](README.zh.md)

End-to-end encrypted ephemeral messaging. One-time burn-after-reading messages and encrypted chat rooms — all encryption happens in your browser. The server never sees your content.

## Features

- **One-Time Messages** — text or image, AES-256-GCM encrypted, auto-destroyed after viewing. Optional password protection, configurable TTL, QR code sharing.
- **Encrypted Chat Rooms** — ECDH-X25519 key exchange + AES-256-GCM per-message encryption. Server blind-relays ciphertext. Either party can destroy the room, wiping all data.
- **Zero Trust** — no registration, no cookies, no tracking. Keys never leave your device.
- **Dark Mode** — light / dark / system toggle, persisted.
- **i18n** — 中文 / English switch.
- **Mobile First** — responsive layout, safe area insets.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 6, TypeScript, TailwindCSS 4, shadcn/ui, Zustand |
| Backend | Node.js 22, Express 5, ws, TypeScript |
| Storage | Redis 7 (ioredis) |
| Crypto | @noble/ciphers (AES-GCM), @noble/curves (X25519), @noble/hashes (HKDF, PBKDF2) |
| Deployment | Docker Compose (Node + Redis, frontend served standalone) |

## Project Structure

```
zerochat/
├── packages/
│   ├── shared/        # Crypto utils & types (shared between frontend/backend)
│   ├── backend/       # Express + WebSocket + Redis
│   └── frontend/      # Vite + React SPA
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Redis (or use the Docker Compose one)

### Development

```bash
# Install
pnpm install

# Set Redis URL
echo 'REDIS_URL=redis://:your_password@127.0.0.1:6379' > .env.local

# Start backend (port 3001)
pnpm dev:backend

# Start frontend (port 5173, proxies /api and /ws)
pnpm dev:frontend
```

### Production (Docker)

```bash
echo 'REDIS_PASSWORD=your_password' > .env.production
docker compose --env-file .env.production up -d
```
Frontend on port 5173, backend on port 3001. Use a reverse proxy (Nginx/OpenResty/Caddy) for HTTPS.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | *required* | Redis connection string |
| `REDIS_PASSWORD` | *required* | Redis password (docker-compose) |
| `PORT` | 3001 | Backend HTTP port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `MESSAGE_TTL_SECONDS` | 3600 | Default one-time message expiry (seconds) |
| `ROOM_TTL_SECONDS` | 3600 | Room auto-destroy if incomplete (seconds) |
| `ROOM_IDLE_SECONDS` | 3600 | Room auto-destroy if idle (seconds) |

Env files: `.env` (base) → `.env.local` (dev) / `.env.production` (prod).

## Security

- **Client-side encryption** — all crypto operations run in the browser using @noble/* libraries.
- **ECDH key exchange** — X25519, HKDF-SHA256 for session key derivation.
- **AES-256-GCM** — authenticated encryption with random 12-byte nonce per message.
- **URL fragment** — one-time message keys transmitted in the URL fragment (never sent to the server).
- **Rate limiting** — all API endpoints rate-limited per IP.
- **CSP headers** — configure Content-Security-Policy in your reverse proxy for production.
- **No tracking** — no accounts, no cookies, no analytics.

## License

MIT

# ZeroChat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-trust private communication H5 app with one-time burn-after-reading messages and end-to-end encrypted chat rooms.

**Architecture:** pnpm workspace monorepo with three packages — shared (crypto + types), backend (Express + ws + Redis), frontend (Vite + React + shadcn/ui + TailwindCSS). BrowserRouter used so decryption keys stay in URL fragments (never sent to server). ECDH-X25519 + AES-256-GCM for chat E2EE.

**Tech Stack:** React 19, Vite 6, React Router 7, Zustand 5, TailwindCSS 4, shadcn/ui, @noble/ciphers, @noble/curves, @noble/hashes, Express 5, ws, ioredis, browser-image-compression, qrcode

---

### Phase 1: Workspace Scaffold

### Task 1.1: Initialize pnpm workspace root

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Create root package.json**

```bash
cd /home/hmilyld/WebCode/zerochat.com && cat > package.json << 'JSONEOF'
{
  "name": "zerochat",
  "private": true,
  "scripts": {
    "dev:backend": "pnpm --filter @zerochat/backend dev",
    "dev:frontend": "pnpm --filter @zerochat/frontend dev",
    "build:shared": "pnpm --filter @zerochat/shared build",
    "build:backend": "pnpm --filter @zerochat/backend build",
    "build:frontend": "pnpm --filter @zerochat/frontend build",
    "build": "pnpm build:shared && pnpm build:backend && pnpm build:frontend"
  }
}
JSONEOF
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
EOF
```

- [ ] **Step 3: Create .gitignore**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/.gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
EOF
```

- [ ] **Step 4: Create tsconfig.base.json**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
EOF
```

- [ ] **Step 5: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git init && git add -A && git commit -m "feat: initialize pnpm workspace root"
```

---

### Task 1.2: Scaffold shared package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/crypto/random.ts`
- Create: `packages/shared/src/crypto/aes.ts`
- Create: `packages/shared/src/crypto/ecdh.ts`
- Create: `packages/shared/src/crypto/hkdf.ts`
- Create: `packages/shared/src/types/messages.ts`

- [ ] **Step 1: Create shared package.json**

```bash
mkdir -p /home/hmilyld/WebCode/zerochat.com/packages/shared/src/crypto /home/hmilyld/WebCode/zerochat.com/packages/shared/src/types && cat > /home/hmilyld/WebCode/zerochat.com/packages/shared/package.json << 'JSONEOF'
{
  "name": "@zerochat/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./crypto": "./src/crypto/index.ts",
    "./types": "./src/types/messages.ts"
  },
  "dependencies": {
    "@noble/ciphers": "^1.2.1",
    "@noble/curves": "^1.8.1",
    "@noble/hashes": "^1.7.1"
  }
}
JSONEOF
```

- [ ] **Step 2: Create shared tsconfig.json**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/shared/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
EOF
```

- [ ] **Step 3: Create random.ts**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/shared/src/crypto/random.ts << 'TSEOF'
import { randomBytes as nobleRandomBytes } from '@noble/hashes/utils';

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function randomBytes(length: number): Uint8Array {
  return nobleRandomBytes(length);
}

export function randomBase64Url(length: number): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE64URL[bytes[i] & 63];
  }
  return result;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return base64ToBytes(b64);
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
TSEOF
```

- [ ] **Step 4: Create aes.ts**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/shared/src/crypto/aes.ts << 'TSEOF'
import { gcm } from '@noble/ciphers/aes';
import { randomBytes, bytesToBase64, base64ToBytes, concatBytes } from './random.ts';

const NONCE_LEN = 12;

export function encryptAES(key: Uint8Array, plaintext: Uint8Array): string {
  const nonce = randomBytes(NONCE_LEN);
  const cipher = gcm(key, nonce);
  const ciphertext = cipher.encrypt(plaintext);
  // Format: nonce(12) + ciphertext + tag(16)
  // noble gcm.encrypt appends tag automatically
  const combined = concatBytes(nonce, ciphertext);
  return bytesToBase64(combined);
}

export function decryptAES(key: Uint8Array, base64Data: string): Uint8Array | null {
  try {
    const combined = base64ToBytes(base64Data);
    if (combined.length < NONCE_LEN + 16) return null;
    const nonce = combined.slice(0, NONCE_LEN);
    const ciphertext = combined.slice(NONCE_LEN);
    const cipher = gcm(key, nonce);
    return cipher.decrypt(ciphertext);
  } catch {
    return null;
  }
}
TSEOF
```

- [ ] **Step 5: Create ecdh.ts**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/shared/src/crypto/ecdh.ts << 'TSEOF'
import { x25519 } from '@noble/curves/ed25519';
import { randomBytes, bytesToBase64, base64ToBytes } from './random.ts';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export function generateKeyPair(): KeyPair {
  const privateKey = randomBytes(32);
  const publicKey = x25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

export function computeSharedSecret(privateKey: Uint8Array, peerPublicKey: Uint8Array): Uint8Array {
  return x25519.getSharedSecret(privateKey, peerPublicKey);
}

export function publicKeyToBase64(pk: Uint8Array): string {
  return bytesToBase64(pk);
}

export function base64ToPublicKey(b64: string): Uint8Array {
  return base64ToBytes(b64);
}

export function privateKeyToBase64(sk: Uint8Array): string {
  return bytesToBase64(sk);
}

export function base64ToPrivateKey(b64: string): Uint8Array {
  return base64ToBytes(b64);
}
TSEOF
```

- [ ] **Step 6: Create hkdf.ts**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/shared/src/crypto/hkdf.ts << 'TSEOF'
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

export function deriveAESKey(sharedSecret: Uint8Array, salt: Uint8Array, info: string): Uint8Array {
  const infoBytes = new TextEncoder().encode(info);
  return hkdf(sha256, sharedSecret, salt, infoBytes, 32);
}
TSEOF
```

- [ ] **Step 7: Create crypto barrel export**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/shared/src/crypto/index.ts << 'EOF'
export { encryptAES, decryptAES } from './aes.ts';
export { generateKeyPair, computeSharedSecret, publicKeyToBase64, base64ToPublicKey, privateKeyToBase64, base64ToPrivateKey } from './ecdh.ts';
export type { KeyPair } from './ecdh.ts';
export { deriveAESKey } from './hkdf.ts';
export { randomBytes, randomBase64Url, bytesToBase64, base64ToBytes, bytesToBase64Url, base64UrlToBytes, concatBytes } from './random.ts';
EOF
```

- [ ] **Step 8: Create WebSocket message types**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/shared/src/types/messages.ts << 'TSEOF'
// Client → Server messages
export type ClientMessage =
  | { type: 'create-room' }
  | { type: 'join-room'; roomId: string }
  | { type: 'exchange-key'; roomId: string; publicKey: string; salt: string }
  | { type: 'send-message'; roomId: string; encryptedData: string }
  | { type: 'destroy-room'; roomId: string }
  | { type: 'typing'; roomId: string };

// Server → Client messages
export type ServerMessage =
  | { type: 'room-created'; roomId: string }
  | { type: 'room-joined'; roomId: string; userId: string }
  | { type: 'peer-joined'; userId: string }
  | { type: 'peer-public-key'; publicKey: string; salt: string }
  | { type: 'new-message'; encryptedData: string }
  | { type: 'user-typing' }
  | { type: 'peer-disconnected' }
  | { type: 'room-destroyed' }
  | { type: 'error'; message: string };
TSEOF
```

- [ ] **Step 9: Create shared index.ts**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/shared/src/index.ts << 'EOF'
export * from './crypto/index.ts';
export * from './types/messages.ts';
EOF
```

- [ ] **Step 10: Install dependencies and verify build**

```bash
cd /home/hmilyld/WebCode/zerochat.com && pnpm install
```

Expected: `pnpm install` succeeds without errors.

- [ ] **Step 11: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: scaffold shared package with crypto and types"
```

---

### Task 1.3: Scaffold backend package

**Files:**
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`

- [ ] **Step 1: Create backend package.json**

```bash
mkdir -p /home/hmilyld/WebCode/zerochat.com/packages/backend/src && cat > /home/hmilyld/WebCode/zerochat.com/packages/backend/package.json << 'JSONEOF'
{
  "name": "@zerochat/backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@zerochat/shared": "workspace:*",
    "express": "^5.1.0",
    "ws": "^8.18.0",
    "ioredis": "^5.5.0",
    "helmet": "^8.0.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.5.0",
    "@types/express": "^5.0.0",
    "@types/ws": "^8.5.13",
    "@types/cors": "^2.8.17"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
JSONEOF
```

- [ ] **Step 2: Create backend tsconfig.json**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/backend/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src"]
}
EOF
```

- [ ] **Step 3: Install dependencies**

```bash
cd /home/hmilyld/WebCode/zerochat.com && pnpm install
```

- [ ] **Step 4: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: scaffold backend package"
```

---

### Task 1.4: Scaffold frontend package

**Files:**
- Create: `packages/frontend/` via Vite

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
cd /home/hmilyld/WebCode/zerochat.com/packages && pnpm create vite frontend --template react-ts
```

- [ ] **Step 2: Update frontend package.json**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/package.json << 'JSONEOF'
{
  "name": "@zerochat/frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@zerochat/shared": "workspace:*",
    "@noble/ciphers": "^1.2.1",
    "@noble/curves": "^1.8.1",
    "@noble/hashes": "^1.7.1",
    "browser-image-compression": "^2.0.2",
    "qrcode": "^1.5.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "zustand": "^5.0.0",
    "lucide-react": "^0.468.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
JSONEOF
```

- [ ] **Step 3: Create vite.config.ts**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/vite.config.ts << 'TSEOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
TSEOF
```

- [ ] **Step 4: Create CSS entry with Tailwind import**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/index.css << 'CSSEOF'
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --border: 214.3 31.8% 91.4%;
  --radius: 0.75rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
  }
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  -webkit-tap-highlight-color: transparent;
}

/* Safe area for mobile devices */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.safe-top {
  padding-top: env(safe-area-inset-top, 0px);
}
CSSEOF
```

- [ ] **Step 5: Create index.html with mobile viewport meta**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/index.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#2563eb" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>ZeroChat - 私密通讯</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
HTMLEOF
```

- [ ] **Step 6: Install**

```bash
cd /home/hmilyld/WebCode/zerochat.com && pnpm install
```

- [ ] **Step 7: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: scaffold frontend package with Vite + React + TailwindCSS"
```

---

### Phase 2: Shared Crypto & Backend Foundation

### Task 2.1: Create Redis client

**Files:**
- Create: `packages/backend/src/redis/client.ts`

- [ ] **Step 1: Create Redis client**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/backend/src/redis/client.ts << 'TSEOF'
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://:redis_cndnfs@127.0.0.1:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

export async function connectRedis(): Promise<void> {
  await redis.connect();
  console.log('Redis connected');
}

const DEFAULT_TTL = parseInt(process.env.MESSAGE_TTL_SECONDS || '86400', 10); // 24h

export async function storeCiphertext(id: string, ciphertext: string, ttl?: number): Promise<void> {
  await redis.setex(`msg:${id}`, ttl || DEFAULT_TTL, ciphertext);
}

export async function getAndDeleteCiphertext(id: string): Promise<string | null> {
  const key = `msg:${id}`;
  const val = await redis.get(key);
  if (val) {
    await redis.del(key);
  }
  return val;
}

export async function createRoom(roomId: string): Promise<void> {
  await redis.hset(`room:${roomId}`, {
    members: '0',
    createdAt: Date.now().toString(),
    lastActive: Date.now().toString(),
  });
  await redis.expire(`room:${roomId}`, 3600); // 1h auto-expire
}

export async function joinRoom(roomId: string, userId: string): Promise<number> {
  const key = `room:${roomId}`;
  const exists = await redis.exists(key);
  if (!exists) return -1;
  const members = await redis.hget(key, 'members');
  const count = parseInt(members || '0', 10);
  if (count >= 2) return -2;
  await redis.hset(key, 'members', (count + 1).toString(), 'lastActive', Date.now().toString());
  await redis.expire(key, 3600);
  return count + 1;
}

export async function getRoom(roomId: string): Promise<Record<string, string> | null> {
  const key = `room:${roomId}`;
  const exists = await redis.exists(key);
  if (!exists) return null;
  await redis.hset(key, 'lastActive', Date.now().toString());
  await redis.expire(key, 3600);
  return redis.hgetall(key);
}

export async function destroyRoom(roomId: string): Promise<void> {
  await redis.del(`room:${roomId}`);
}
TSEOF
```

- [ ] **Step 2: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: add Redis client with room management"
```

---

### Task 2.2: Create Express + WebSocket server entry

**Files:**
- Create: `packages/backend/src/index.ts`
- Create: `packages/backend/src/websocket/server.ts`
- Create: `packages/backend/src/websocket/handler.ts`
- Create: `packages/backend/src/api/message.ts`

- [ ] **Step 1: Create WebSocket handler**

```bash
mkdir -p /home/hmilyld/WebCode/zerochat.com/packages/backend/src/websocket /home/hmilyld/WebCode/zerochat.com/packages/backend/src/api && cat > /home/hmilyld/WebCode/zerochat.com/packages/backend/src/websocket/handler.ts << 'TSEOF'
import { WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '@zerochat/shared';
import { createRoom, joinRoom, getRoom, destroyRoom } from '../redis/client.ts';
import { randomBase64Url } from '@zerochat/shared';

interface RoomSocket extends WebSocket {
  userId?: string;
  roomId?: string;
}

const clients = new Map<string, RoomSocket>();

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastToRoom(roomId: string, msg: ServerMessage, excludeUserId?: string): void {
  for (const [uid, ws] of clients) {
    if (ws.roomId === roomId && uid !== excludeUserId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}

export async function handleMessage(ws: RoomSocket, raw: string): Promise<void> {
  let data: ClientMessage;
  try {
    data = JSON.parse(raw);
  } catch {
    send(ws, { type: 'error', message: 'Invalid JSON' });
    return;
  }

  switch (data.type) {
    case 'create-room': {
      const roomId = randomBase64Url(16);
      await createRoom(roomId);
      const userId = randomBase64Url(12);
      ws.userId = userId;
      ws.roomId = roomId;
      clients.set(userId, ws);
      send(ws, { type: 'room-created', roomId });
      send(ws, { type: 'room-joined', roomId, userId });
      break;
    }

    case 'join-room': {
      const result = await joinRoom(data.roomId, 'dummy');
      if (result === -1) {
        send(ws, { type: 'error', message: '房间不存在或已过期' });
        return;
      }
      if (result === -2) {
        send(ws, { type: 'error', message: '房间已满' });
        return;
      }
      const userId = randomBase64Url(12);
      ws.userId = userId;
      ws.roomId = data.roomId;
      clients.set(userId, ws);
      send(ws, { type: 'room-joined', roomId: data.roomId, userId });
      broadcastToRoom(data.roomId, { type: 'peer-joined', userId }, userId);
      break;
    }

    case 'exchange-key': {
      if (!ws.roomId) return;
      broadcastToRoom(ws.roomId, {
        type: 'peer-public-key',
        publicKey: data.publicKey,
        salt: data.salt,
      }, ws.userId);
      break;
    }

    case 'send-message': {
      if (!ws.roomId) return;
      broadcastToRoom(ws.roomId, {
        type: 'new-message',
        encryptedData: data.encryptedData,
      }, ws.userId);
      break;
    }

    case 'typing': {
      if (!ws.roomId) return;
      broadcastToRoom(ws.roomId, { type: 'user-typing' }, ws.userId);
      break;
    }

    case 'destroy-room': {
      if (!ws.roomId) return;
      broadcastToRoom(ws.roomId, { type: 'room-destroyed' });
      await destroyRoom(ws.roomId);
      // Close all connections in room
      for (const [uid, client] of clients) {
        if (client.roomId === ws.roomId) {
          client.close();
          clients.delete(uid);
        }
      }
      break;
    }
  }
}

export function removeClient(ws: RoomSocket): void {
  if (ws.userId) {
    clients.delete(ws.userId);
    if (ws.roomId) {
      broadcastToRoom(ws.roomId, { type: 'peer-disconnected' }, ws.userId);
    }
  }
}
TSEOF
```

- [ ] **Step 2: Create WebSocket server setup**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/backend/src/websocket/server.ts << 'TSEOF'
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { handleMessage, removeClient } from './handler.ts';

export function setupWebSocket(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    perMessageDeflate: false, // Disable compression to prevent CRIME attack
  });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (raw) => {
      handleMessage(ws, raw.toString());
    });

    ws.on('close', () => {
      removeClient(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
  });

  console.log('WebSocket server ready on /ws');
  return wss;
}
TSEOF
```

- [ ] **Step 3: Create one-time message REST API**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/backend/src/api/message.ts << 'TSEOF'
import { Router, Request, Response } from 'express';
import { randomBase64Url } from '@zerochat/shared';
import { storeCiphertext, getAndDeleteCiphertext } from '../redis/client.ts';

export const messageRouter = Router();

const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB

messageRouter.post('/api/message', async (req: Request, res: Response) => {
  try {
    const { ciphertext, ttl } = req.body as { ciphertext: string; ttl?: number };

    if (!ciphertext || typeof ciphertext !== 'string') {
      res.status(400).json({ error: 'Missing ciphertext' });
      return;
    }

    if (ciphertext.length > MAX_BODY_SIZE) {
      res.status(413).json({ error: 'Message too large' });
      return;
    }

    const id = randomBase64Url(16);
    await storeCiphertext(id, ciphertext, ttl);
    res.json({ id });
  } catch (err) {
    console.error('POST /api/message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

messageRouter.get('/api/message/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.length > 64) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const ciphertext = await getAndDeleteCiphertext(id);
    if (!ciphertext) {
      res.status(404).json({ error: '消息已销毁或链接无效' });
      return;
    }

    res.json({ ciphertext });
  } catch (err) {
    console.error('GET /api/message/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
TSEOF
```

- [ ] **Step 4: Create server entry point**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/backend/src/index.ts << 'TSEOF'
import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectRedis } from './redis/client.ts';
import { messageRouter } from './api/message.ts';
import { setupWebSocket } from './websocket/server.ts';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
    },
  },
}));

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: '请求过于频繁，请稍后再试' },
  keyGenerator: (req) => req.ip || 'unknown',
});
app.use('/api/message/:id', readLimiter);

app.use(messageRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = createServer(app);
setupWebSocket(server);

async function start() {
  await connectRedis();
  server.listen(PORT, () => {
    console.log(`ZeroChat backend running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
TSEOF
```

- [ ] **Step 5: Test backend starts**

```bash
cd /home/hmilyld/WebCode/zerochat.com && pnpm dev:backend
```

**Expected:** "Redis connected" and "ZeroChat backend running on http://localhost:3001" in console. Stop with Ctrl+C after verifying.

- [ ] **Step 6: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: add Express + WebSocket server with one-time message API"
```

---

### Phase 3: Frontend Shell & shadcn/ui

### Task 3.1: Set up shadcn/ui and helper utilities

**Files:**
- Create: `packages/frontend/src/lib/utils.ts`
- Create: `packages/frontend/components.json`
- Create: `packages/frontend/src/components/ui/button.tsx`
- Create: `packages/frontend/src/components/ui/input.tsx`
- Create: `packages/frontend/src/components/ui/textarea.tsx`
- Create: `packages/frontend/src/components/ui/card.tsx`
- Create: `packages/frontend/src/components/ui/dialog.tsx`
- Create: `packages/frontend/src/components/ui/badge.tsx`

- [ ] **Step 1: Create utils.ts**

```bash
mkdir -p /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/lib && cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/lib/utils.ts << 'TSEOF'
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
TSEOF
```

- [ ] **Step 2: Create components.json for shadcn**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/components.json << 'EOF'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
EOF
```

- [ ] **Step 3: Create shadcn/ui button**

```bash
mkdir -p /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/components/ui && cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/components/ui/button.tsx << 'TSEOF'
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] min-w-[44px]',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-900',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        ghost: 'hover:bg-gray-100 text-gray-700',
        link: 'text-blue-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
TSEOF
```

- [ ] **Step 4: Create shadcn/ui input**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/components/ui/input.tsx << 'TSEOF'
import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
TSEOF
```

- [ ] **Step 5: Create textarea**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/components/ui/textarea.tsx << 'TSEOF'
import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[120px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
TSEOF
```

- [ ] **Step 6: Create card**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/components/ui/card.tsx << 'TSEOF'
import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-2xl border bg-white shadow-sm', className)} {...props} />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
TSEOF
```

- [ ] **Step 7: Create badge**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/components/ui/badge.tsx << 'TSEOF'
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-blue-100 text-blue-800',
        destructive: 'bg-red-100 text-red-800',
        outline: 'border text-gray-600',
        success: 'bg-green-100 text-green-800',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
TSEOF
```

- [ ] **Step 8: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: add shadcn/ui components and utils"
```

---

### Task 3.2: Create App shell with routing and Home page

**Files:**
- Create: `packages/frontend/src/main.tsx`
- Create: `packages/frontend/src/App.tsx`
- Create: `packages/frontend/src/pages/Home.tsx`

- [ ] **Step 1: Create main.tsx**

```bash
mkdir -p /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/pages && cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/main.tsx << 'TSEOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
TSEOF
```

- [ ] **Step 2: Create App.tsx**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/App.tsx << 'TSEOF'
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <main className="mx-auto max-w-lg px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}
TSEOF
```

- [ ] **Step 3: Create Home page**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/pages/Home.tsx << 'TSEOF'
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, MessageCircle, Shield } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ZeroChat</h1>
        <p className="text-sm text-gray-500">私密通讯，零信任架构</p>
      </div>

      <Card
        className="cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => navigate('/create')}
      >
        <CardHeader className="flex-row items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-base">一次性消息</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">阅后即焚 · 不可追溯</p>
          </div>
        </CardHeader>
      </Card>

      <Card
        className="cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => navigate('/chat')}
      >
        <CardHeader className="flex-row items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-base">加密聊天室</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">端到端加密 · 双向阅后即焚</p>
          </div>
        </CardHeader>
      </Card>

      <p className="text-center text-xs text-gray-400">
        无需注册 · 不收集信息 · 端到端加密
      </p>
    </div>
  );
}
TSEOF
```

- [ ] **Step 4: Verify frontend starts**

```bash
cd /home/hmilyld/WebCode/zerochat.com && pnpm dev:frontend
```

Expected: Vite dev server on port 5173, Home page renders with two cards.

- [ ] **Step 5: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: add App shell with routing and Home page"
```

---

### Phase 4: One-Time Message Module

### Task 4.1: Create CreateMessage page

**Files:**
- Create: `packages/frontend/src/pages/CreateMessage.tsx`
- Create: `packages/frontend/src/components/ImageUploader.tsx`
- Create: `packages/frontend/src/components/QRCode.tsx`
- Create: `packages/frontend/src/components/CopyButton.tsx`
- Modify: `packages/frontend/src/App.tsx`

- [ ] **Step 1: Create ImageUploader component**

```bash
mkdir -p /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/components && cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/components/ImageUploader.tsx << 'TSEOF'
import { useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';

interface Props {
  onImageReady: (bytes: ArrayBuffer, mimeType: string) => void;
  onClear: () => void;
}

export default function ImageUploader({ onImageReady, onClear }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setCompressing(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      const buf = await compressed.arrayBuffer();
      setPreview(URL.createObjectURL(compressed));
      onImageReady(buf, compressed.type || 'image/webp');
    } catch (err) {
      console.error('Image compression failed:', err);
    } finally {
      setCompressing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleClear() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onClear();
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative rounded-xl overflow-hidden">
          <img src={preview} alt="Preview" className="w-full max-h-64 object-contain bg-gray-100" />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={compressing}
          >
            <Upload className="w-5 h-5" />
            {compressing ? '压缩中...' : '选择图片'}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="flex-1 gap-2"
            onClick={() => {
              fileRef.current?.setAttribute('capture', 'environment');
              fileRef.current?.click();
            }}
            disabled={compressing}
          >
            <Camera className="w-5 h-5" />
            拍照
          </Button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
TSEOF
```

- [ ] **Step 2: Create QRCode component**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/components/QRCode.tsx << 'TSEOF'
import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface Props {
  url: string;
  size?: number;
}

export default function QRCode({ url, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }
  }, [url, size]);

  return (
    <div className="flex justify-center">
      <canvas ref={canvasRef} className="rounded-xl" />
    </div>
  );
}
TSEOF
```

- [ ] **Step 3: Create CopyButton component**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/components/CopyButton.tsx << 'TSEOF'
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';

interface Props {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label = '复制链接' }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button onClick={handleCopy} variant={copied ? 'secondary' : 'default'} className="gap-2">
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? '已复制' : label}
    </Button>
  );
}
TSEOF
```

- [ ] **Step 4: Create CreateMessage page**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/pages/CreateMessage.tsx << 'TSEOF'
import { useState } from 'react';
import { encryptAES, randomBytes, bytesToBase64 } from '@zerochat/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import ImageUploader from '@/components/ImageUploader';
import QRCode from '@/components/QRCode';
import CopyButton from '@/components/CopyButton';
import { ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CreateMessage() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [imageBytes, setImageBytes] = useState<ArrayBuffer | null>(null);
  const [imageType, setImageType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string } | null>(null);
  const [error, setError] = useState('');

  const hasContent = text.trim() || imageBytes;

  async function handleSubmit() {
    setError('');
    setLoading(true);

    try {
      const key = randomBytes(32);
      let plaintext: Uint8Array;

      if (imageBytes) {
        // Format: "IMAGE:" + mimeType + "\x00" + image bytes
        const mimeBytes = new TextEncoder().encode(`IMAGE:${imageType}\x00`);
        const imgArr = new Uint8Array(imageBytes);
        const combined = new Uint8Array(mimeBytes.length + imgArr.length);
        combined.set(mimeBytes);
        combined.set(imgArr, mimeBytes.length);
        plaintext = combined;
      } else {
        plaintext = new TextEncoder().encode(text);
      }

      const encrypted = encryptAES(key, plaintext);
      const keyB64 = bytesToBase64(key);

      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciphertext: encrypted }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '创建失败');
      }

      const { id } = await res.json();
      const url = `${window.location.origin}/read/${id}#${keyB64}`;
      setResult({ url });
    } catch (err: any) {
      setError(err.message || '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setText('');
    setImageBytes(null);
    setResult(null);
    setError('');
  }

  if (result) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">加密链接已生成</h2>
          <p className="text-sm text-gray-500 mt-1">分享下方链接，对方打开后消息自动销毁</p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 break-all text-sm text-gray-800 font-mono">
              {result.url}
            </div>
            <div className="flex gap-2">
              <CopyButton text={result.url} />
              <Button variant="outline" onClick={handleReset}>再创建一个</Button>
            </div>
          </CardContent>
        </Card>

        <QRCode url={result.url} />

        <Button variant="ghost" className="w-full gap-2" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">创建一次性消息</h2>
          <p className="text-xs text-gray-500">消息在对方查看后自动销毁</p>
        </div>
      </div>

      <Textarea
        placeholder="请输入消息内容..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!!imageBytes}
      />

      <div className="text-center text-sm text-gray-400">或</div>

      <ImageUploader
        onImageReady={(bytes, mimeType) => {
          setImageBytes(bytes);
          setImageType(mimeType);
          setText('');
        }}
        onClear={() => {
          setImageBytes(null);
          setImageType('');
        }}
      />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">{error}</div>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={!hasContent || loading}
        onClick={handleSubmit}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '加密并生成链接'}
      </Button>
    </div>
  );
}
TSEOF
```

- [ ] **Step 5: Update App.tsx to add /create route**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/App.tsx << 'TSEOF'
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import CreateMessage from './pages/CreateMessage.tsx';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <main className="mx-auto max-w-lg px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateMessage />} />
        </Routes>
      </main>
    </div>
  );
}
TSEOF
```

- [ ] **Step 6: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: add CreateMessage page with image upload and QR code"
```

---

### Task 4.2: Create ReadMessage page

**Files:**
- Create: `packages/frontend/src/pages/ReadMessage.tsx`
- Modify: `packages/frontend/src/App.tsx`

- [ ] **Step 1: Create ReadMessage page**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/pages/ReadMessage.tsx << 'TSEOF'
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decryptAES, base64ToBytes } from '@zerochat/shared';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';

type Status = 'loading' | 'decrypting' | 'success-text' | 'success-image' | 'destroyed' | 'error';

export default function ReadMessage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const keyB64 = window.location.hash.slice(1); // Remove leading #
    if (!keyB64 || !id) {
      setStatus('error');
      return;
    }

    let cancelled = false;

    async function fetchAndDecrypt() {
      try {
        const res = await fetch(`/api/message/${id}`);
        if (!res.ok) {
          if (!cancelled) setStatus('destroyed');
          return;
        }
        const { ciphertext } = await res.json();
        if (!ciphertext) {
          if (!cancelled) setStatus('destroyed');
          return;
        }

        if (!cancelled) setStatus('decrypting');

        const key = base64ToBytes(keyB64);
        const decrypted = decryptAES(key, ciphertext);

        if (!decrypted) {
          if (!cancelled) setStatus('error');
          return;
        }

        if (!cancelled) {
          const decStr = new TextDecoder().decode(decrypted);

          // Check if it's an image message
          if (decStr.startsWith('IMAGE:')) {
            const nullIdx = decStr.indexOf('\x00');
            const mimeType = decStr.slice(6, nullIdx);
            const imgBytes = decrypted.slice(nullIdx + 1);
            const blob = new Blob([imgBytes], { type: mimeType });
            setImageUrl(URL.createObjectURL(blob));
            setStatus('success-image');
          } else {
            setContent(decStr);
            setStatus('success-text');
          }
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    fetchAndDecrypt();

    return () => { cancelled = true; };
  }, [id]);

  const stateConfig: Record<Status, { icon: React.ReactNode; title: string; desc: string }> = {
    loading: { icon: <Loader2 className="w-10 h-10 animate-spin text-blue-500" />, title: '正在获取消息...', desc: '' },
    decrypting: { icon: <Loader2 className="w-10 h-10 animate-spin text-blue-500" />, title: '正在解密...', desc: '' },
    'success-text': { icon: null, title: '', desc: '' },
    'success-image': { icon: null, title: '', desc: '' },
    destroyed: {
      icon: <AlertTriangle className="w-10 h-10 text-orange-500" />,
      title: '消息已销毁',
      desc: '该消息已被查看或链接已过期',
    },
    error: {
      icon: <AlertTriangle className="w-10 h-10 text-red-500" />,
      title: '解密失败',
      desc: '密钥不正确或消息数据损坏',
    },
  };

  const config = stateConfig[status];

  if (status === 'success-text') {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <p className="text-gray-900 whitespace-pre-wrap break-words">{content}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          此消息已被销毁，关闭页面后将无法再次查看
        </div>
        <Button variant="ghost" className="w-full gap-2" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> 返回首页
        </Button>
      </div>
    );
  }

  if (status === 'success-image') {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
          <img src={imageUrl} alt="Decrypted" className="w-full" />
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          此消息已被销毁，关闭页面后将无法再次查看
        </div>
        <Button variant="ghost" className="w-full gap-2" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> 返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      {config.icon}
      <h2 className="text-lg font-semibold text-gray-900">{config.title}</h2>
      {config.desc && <p className="text-sm text-gray-500">{config.desc}</p>}
      <Button variant="ghost" className="mt-4 gap-2" onClick={() => navigate('/')}>
        <ArrowLeft className="w-4 h-4" /> 返回首页
      </Button>
    </div>
  );
}
TSEOF
```

- [ ] **Step 2: Update App.tsx to add /read route**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/App.tsx << 'TSEOF'
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import CreateMessage from './pages/CreateMessage.tsx';
import ReadMessage from './pages/ReadMessage.tsx';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <main className="mx-auto max-w-lg px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateMessage />} />
          <Route path="/read/:id" element={<ReadMessage />} />
        </Routes>
      </main>
    </div>
  );
}
TSEOF
```

- [ ] **Step 3: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: add ReadMessage page with decryption"
```

---

### Phase 5: Zustand Store & WebSocket Hook

### Task 5.1: Create Zustand chat store and WebSocket hook

**Files:**
- Create: `packages/frontend/src/stores/chatStore.ts`
- Create: `packages/frontend/src/hooks/useWebSocket.ts`

- [ ] **Step 1: Create Zustand chat store**

```bash
mkdir -p /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/stores /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/hooks && cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/stores/chatStore.ts << 'TSEOF'
import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  encryptedData: string;
  fromMe: boolean;
  timestamp: number;
}

export interface DecryptedMessage {
  id: string;
  content: string;
  isImage: boolean;
  imageUrl?: string;
  fromMe: boolean;
  timestamp: number;
}

interface ChatState {
  // Connection
  ws: WebSocket | null;
  connected: boolean;
  roomId: string | null;
  userId: string | null;

  // E2EE keys
  peerPublicKey: string | null;
  peerSalt: string | null;
  aesKey: CryptoKey | null;

  // Messages
  encryptedMessages: ChatMessage[];
  decryptedMessages: DecryptedMessage[];

  // UI state
  peerTyping: boolean;
  peerConnected: boolean;
  error: string | null;

  // Actions
  setWs: (ws: WebSocket | null) => void;
  setConnected: (v: boolean) => void;
  setRoomInfo: (roomId: string, userId: string) => void;
  setPeerKey: (publicKey: string, salt: string) => void;
  setAesKey: (key: CryptoKey) => void;
  addEncryptedMessage: (msg: ChatMessage) => void;
  addDecryptedMessage: (msg: DecryptedMessage) => void;
  setPeerTyping: (v: boolean) => void;
  setPeerConnected: (v: boolean) => void;
  setError: (err: string | null) => void;
  reset: () => void;
}

const initialState = {
  ws: null,
  connected: false,
  roomId: null,
  userId: null,
  peerPublicKey: null,
  peerSalt: null,
  aesKey: null,
  encryptedMessages: [],
  decryptedMessages: [],
  peerTyping: false,
  peerConnected: false,
  error: null,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  setWs: (ws) => set({ ws }),
  setConnected: (v) => set({ connected: v }),
  setRoomInfo: (roomId, userId) => set({ roomId, userId }),
  setPeerKey: (publicKey, salt) => set({ peerPublicKey: publicKey, peerSalt: salt }),
  setAesKey: (key) => set({ aesKey: key }),
  addEncryptedMessage: (msg) =>
    set((s) => ({ encryptedMessages: [...s.encryptedMessages, msg] })),
  addDecryptedMessage: (msg) =>
    set((s) => ({ decryptedMessages: [...s.decryptedMessages, msg] })),
  setPeerTyping: (v) => set({ peerTyping: v }),
  setPeerConnected: (v) => set({ peerConnected: v }),
  setError: (err) => set({ error: err }),
  reset: () => set(initialState),
}));
TSEOF
```

- [ ] **Step 2: Create useWebSocket hook**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/hooks/useWebSocket.ts << 'TSEOF'
import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import type { ServerMessage } from '@zerochat/shared';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

let typingTimer: ReturnType<typeof setTimeout> | null = null;

export function useWebSocket() {
  const {
    ws, setWs, setConnected,
    setRoomInfo, setPeerKey,
    addEncryptedMessage, addDecryptedMessage,
    setPeerTyping, setPeerConnected, setError,
    aesKey, roomId, userId, decryptedMessages, reset,
    peerPublicKey,
  } = useChatStore();

  const decryptedRef = useRef(decryptedMessages);
  decryptedRef.current = decryptedMessages;

  const connect = useCallback(() => {
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      setWs(socket);
      setConnected(true);
      setError(null);
    };

    socket.onmessage = async (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        handleServerMessage(msg, socket);
      } catch {
        console.error('Failed to parse server message');
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = () => {
      setError('连接失败');
    };
  }, []);

  function handleServerMessage(msg: ServerMessage, socket: WebSocket) {
    switch (msg.type) {
      case 'room-created':
      case 'room-joined':
        setRoomInfo(msg.roomId, msg.userId);
        break;

      case 'peer-joined':
        setPeerConnected(true);
        break;

      case 'peer-public-key':
        setPeerKey(msg.publicKey, msg.salt);
        break;

      case 'new-message':
        addEncryptedMessage({
          id: crypto.randomUUID(),
          encryptedData: msg.encryptedData,
          fromMe: false,
          timestamp: Date.now(),
        });
        break;

      case 'user-typing':
        setPeerTyping(true);
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(() => setPeerTyping(false), 2000);
        break;

      case 'peer-disconnected':
        setPeerConnected(false);
        setPeerTyping(false);
        break;

      case 'room-destroyed':
        reset();
        break;

      case 'error':
        setError(msg.message);
        break;
    }
  }

  function send(data: object) {
    const store = useChatStore.getState();
    if (store.ws && store.ws.readyState === WebSocket.OPEN) {
      store.ws.send(JSON.stringify(data));
    }
  }

  function disconnect() {
    const store = useChatStore.getState();
    if (store.ws) {
      store.ws.close();
      setWs(null);
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimer) clearTimeout(typingTimer);
    };
  }, []);

  return { connect, send, disconnect };
}
TSEOF
```

- [ ] **Step 3: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: add Zustand chat store and WebSocket hook"
```

---

### Phase 6: Encryption Hook & Chat Room

### Task 6.1: Create useChatCrypto hook

**Files:**
- Create: `packages/frontend/src/hooks/useChatCrypto.ts`

- [ ] **Step 1: Create useChatCrypto hook with Web Crypto API for AES-GCM**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/hooks/useChatCrypto.ts << 'TSEOF'
import { useCallback, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { base64ToPublicKey, publicKeyToBase64, bytesToBase64, base64ToBytes, randomBytes, generateKeyPair, computeSharedSecret, deriveAESKey } from '@zerochat/shared';

export function useChatCrypto() {
  const { peerPublicKey, peerSalt, setAesKey, aesKey, decryptedMessages } = useChatStore();

  // Generate our keypair on mount
  const keyPair = generateKeyPair();

  // Import AES key to Web Crypto API format
  async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // When we receive peer's public key and salt, compute the shared AES key
  useEffect(() => {
    if (!peerPublicKey || !peerSalt) return;

    const peerPubBytes = base64ToPublicKey(peerPublicKey);
    const saltBytes = base64ToBytes(peerSalt);
    const sharedSecret = computeSharedSecret(keyPair.privateKey, peerPubBytes);
    const aesKeyRaw = deriveAESKey(sharedSecret, saltBytes, 'zerochat-room-key');

    importAesKey(aesKeyRaw).then((key) => {
      setAesKey(key);
    });
  }, [peerPublicKey, peerSalt]);

  // Encrypt a text message
  const encryptText = useCallback(async (text: string): Promise<string> => {
    if (!aesKey) throw new Error('No AES key');
    const iv = randomBytes(12);
    const encoded = new TextEncoder().encode(text);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encoded
    );
    // Format: iv(12) + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return bytesToBase64(combined);
  }, [aesKey]);

  // Decrypt a text message
  const decryptText = useCallback(async (encryptedBase64: string): Promise<string> => {
    if (!aesKey) throw new Error('No AES key');
    const combined = base64ToBytes(encryptedBase64);
    if (combined.length < 13) throw new Error('Invalid encrypted data');
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      ciphertext
    );
    return new TextDecoder().decode(plaintext);
  }, [aesKey]);

  // Encrypt an image
  const encryptImage = useCallback(async (imageBytes: ArrayBuffer, mimeType: string): Promise<string> => {
    if (!aesKey) throw new Error('No AES key');
    const iv = randomBytes(12);
    // Prefix with "IMG:" + mimeType + "\x00"
    const mimeBytes = new TextEncoder().encode(`IMG:${mimeType}\x00`);
    const plaintext = new Uint8Array(mimeBytes.length + imageBytes.byteLength);
    plaintext.set(mimeBytes);
    plaintext.set(new Uint8Array(imageBytes), mimeBytes.length);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      plaintext
    );
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return bytesToBase64(combined);
  }, [aesKey]);

  // Decrypt a message and determine if it's text or image
  const decryptMessage = useCallback(async (encryptedBase64: string): Promise<{ content: string; isImage: boolean; imageUrl?: string }> => {
    const decrypted = await decryptText(encryptedBase64);
    if (decrypted.startsWith('IMG:')) {
      const nullIdx = decrypted.indexOf('\x00');
      const mimeType = decrypted.slice(4, nullIdx);
      const imgBase64 = decrypted.slice(nullIdx + 1);
      const imgBytes = base64ToBytes(imgBase64);
      const blob = new Blob([imgBytes], { type: mimeType });
      const imageUrl = URL.createObjectURL(blob);
      return { content: '', isImage: true, imageUrl };
    }
    return { content: decrypted, isImage: false };
  }, [decryptText]);

  // Get our public key + salt for key exchange
  const getExchangeData = (): { publicKey: string; salt: string } => {
    const salt = randomBytes(32);
    return {
      publicKey: publicKeyToBase64(keyPair.publicKey),
      salt: bytesToBase64(salt),
    };
  };

  // Public key fingerprint for safety verification
  const getFingerprint = (): string => {
    const pkB64 = publicKeyToBase64(keyPair.publicKey);
    // Simple fingerprint: first 8 chars of base64
    return pkB64.slice(0, 8);
  };

  return {
    getExchangeData,
    getFingerprint,
    encryptText,
    encryptImage,
    decryptMessage,
    isReady: !!aesKey,
  };
}
TSEOF
```

- [ ] **Step 2: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: add useChatCrypto hook with ECDH + Web Crypto AES-GCM"
```

---

### Task 6.2: Create ChatEntry and ChatRoom pages

**Files:**
- Create: `packages/frontend/src/pages/ChatEntry.tsx`
- Create: `packages/frontend/src/pages/ChatRoom.tsx`
- Create: `packages/frontend/src/components/MessageBubble.tsx`
- Modify: `packages/frontend/src/App.tsx`

- [ ] **Step 1: Create ChatEntry page**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/pages/ChatEntry.tsx << 'TSEOF'
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, LogIn, Loader2 } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useChatStore } from '@/stores/chatStore';

export default function ChatEntry() {
  const navigate = useNavigate();
  const [roomInput, setRoomInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const { connect, send } = useWebSocket();
  const { connected, roomId } = useChatStore();

  // Watch for room creation/join success
  const store = useChatStore;

  async function handleCreate() {
    setCreating(true);
    setJoinError('');
    connect();

    // Poll until connected then send create-room
    const checkConnected = setInterval(() => {
      const state = store.getState();
      if (state.connected) {
        clearInterval(checkConnected);
        state.ws!.send(JSON.stringify({ type: 'create-room' }));
        // Poll for room-created response
        const checkRoom = setInterval(() => {
          const s = store.getState();
          if (s.roomId && s.userId) {
            clearInterval(checkRoom);
            setCreating(false);
            navigate(`/chat/${s.roomId}`);
          }
        }, 100);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkConnected);
      if (!store.getState().roomId) {
        setCreating(false);
        setJoinError('创建房间超时');
      }
    }, 10000);
  }

  async function handleJoin() {
    if (!roomInput.trim()) return;
    setJoining(true);
    setJoinError('');
    connect();

    const roomId = roomInput.trim();
    const checkConnected = setInterval(() => {
      const state = store.getState();
      if (state.connected) {
        clearInterval(checkConnected);
        state.ws!.send(JSON.stringify({ type: 'join-room', roomId }));
        const checkJoin = setInterval(() => {
          const s = store.getState();
          if (s.roomId) {
            clearInterval(checkJoin);
            setJoining(false);
            navigate(`/chat/${roomId}`);
          }
          if (s.error) {
            clearInterval(checkJoin);
            setJoining(false);
            setJoinError(s.error);
          }
        }, 100);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkConnected);
      if (!store.getState().roomId && !store.getState().error) {
        setJoining(false);
        setJoinError('加入房间超时');
      }
    }, 10000);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">加密聊天室</h2>
          <p className="text-xs text-gray-500">端到端加密，阅后即焚</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium">创建新房间</h3>
          <p className="text-sm text-gray-500">创建一个加密聊天室，分享链接给对方</p>
          <Button className="w-full gap-2" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {creating ? '创建中...' : '创建房间'}
          </Button>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-400">或</div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-medium">加入已有房间</h3>
          <Input
            placeholder="输入房间 ID"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
          />
          {joinError && (
            <p className="text-sm text-red-600">{joinError}</p>
          )}
          <Button
            className="w-full gap-2"
            variant="outline"
            onClick={handleJoin}
            disabled={joining || !roomInput.trim()}
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {joining ? '加入中...' : '加入房间'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
TSEOF
```

- [ ] **Step 2: Create MessageBubble component**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/components/MessageBubble.tsx << 'TSEOF'
import type { DecryptedMessage } from '@/stores/chatStore';

interface Props {
  message: DecryptedMessage;
}

export default function MessageBubble({ message }: Props) {
  const time = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
          message.fromMe
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white border text-gray-900 rounded-bl-md shadow-sm'
        }`}
      >
        {message.isImage ? (
          <img
            src={message.imageUrl}
            alt="Shared"
            className="max-w-full rounded-lg"
            loading="lazy"
          />
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <p className={`text-[10px] mt-1 ${message.fromMe ? 'text-blue-200' : 'text-gray-400'}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
TSEOF
```

- [ ] **Step 3: Create ChatRoom page**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/pages/ChatRoom.tsx << 'TSEOF'
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useChatCrypto } from '@/hooks/useChatCrypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MessageBubble from '@/components/MessageBubble';
import ImageUploader from '@/components/ImageUploader';
import { ArrowLeft, Send, AlertTriangle, Shield, ImageIcon, X, Loader2 } from 'lucide-react';

export default function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { send, disconnect } = useWebSocket();
  const {
    connected, userId, peerConnected, peerPublicKey,
    decryptedMessages, addDecryptedMessage, peerTyping,
    aesKey, encryptedMessages, reset, setError,
  } = useChatStore();
  const { getExchangeData, getFingerprint, encryptText, encryptImage, decryptMessage, isReady } = useChatCrypto();
  const [input, setInput] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [destroyConfirm, setDestroyConfirm] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef<Set<string>>(new Set());

  // Connect WebSocket
  useEffect(() => {
    connect();
    return () => { disconnect(); };
  }, []);

  // Key exchange once both peers are connected
  useEffect(() => {
    if (peerConnected && !peerPublicKey && connected) {
      const exchangeData = getExchangeData();
      send({
        type: 'exchange-key',
        roomId,
        ...exchangeData,
      });
    }
  }, [peerConnected, peerPublicKey, connected]);

  // Decrypt new encrypted messages
  useEffect(() => {
    const last = encryptedMessages[encryptedMessages.length - 1];
    if (!last || processedRef.current.has(last.id) || last.fromMe || !isReady) return;

    processedRef.current.add(last.id);
    decryptMessage(last.encryptedData).then((result) => {
      addDecryptedMessage({
        id: last.id,
        ...result,
        fromMe: false,
        timestamp: last.timestamp,
      });
    });
  }, [encryptedMessages, isReady]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [decryptedMessages]);

  const handleSendText = useCallback(async () => {
    if (!input.trim() || !isReady || encrypting) return;
    setEncrypting(true);
    try {
      const encrypted = await encryptText(input);
      send({ type: 'send-message', roomId, encryptedData: encrypted });
      addDecryptedMessage({
        id: crypto.randomUUID(),
        content: input,
        isImage: false,
        fromMe: true,
        timestamp: Date.now(),
      });
      setInput('');
    } catch (err) {
      console.error('Encrypt failed:', err);
    } finally {
      setEncrypting(false);
    }
  }, [input, isReady, encrypting, encryptText, roomId, send, addDecryptedMessage]);

  const handleSendImage = useCallback(async (bytes: ArrayBuffer, mimeType: string) => {
    if (!isReady || encrypting) return;
    setEncrypting(true);
    try {
      const encrypted = await encryptImage(bytes, mimeType);
      send({ type: 'send-message', roomId, encryptedData: encrypted });
      const blob = new Blob([bytes], { type: mimeType });
      const imageUrl = URL.createObjectURL(blob);
      addDecryptedMessage({
        id: crypto.randomUUID(),
        content: '',
        isImage: true,
        imageUrl,
        fromMe: true,
        timestamp: Date.now(),
      });
      setShowImageUpload(false);
    } catch (err) {
      console.error('Image encrypt failed:', err);
    } finally {
      setEncrypting(false);
    }
  }, [isReady, encrypting, encryptImage, roomId, send, addDecryptedMessage]);

  const handleDestroy = () => {
    send({ type: 'destroy-room', roomId });
    reset();
    navigate('/', { replace: true });
  };

  const fingerprint = getFingerprint();

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between py-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => { disconnect(); reset(); navigate('/'); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-sm font-medium">加密聊天</p>
            <p className="text-xs text-gray-500">
              {peerConnected ? (isReady ? '已加密' : '协商密钥中...') : '等待对方加入...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Shield className="w-3 h-3" />
            {fingerprint}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDestroyConfirm(true)}
          >
            销毁房间
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3">
        {decryptedMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {peerTyping && (
          <div className="flex justify-start mb-3">
            <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image upload area */}
      {showImageUpload && (
        <div className="border-t p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">发送图片</span>
            <button onClick={() => setShowImageUpload(false)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <ImageUploader
            onImageReady={(bytes, mimeType) => handleSendImage(bytes, mimeType)}
            onClear={() => {}}
          />
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 pt-2 pb-4 safe-bottom">
        <div className="flex items-end gap-2">
          <button
            className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-gray-600"
            onClick={() => setShowImageUpload(!showImageUpload)}
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            placeholder="输入消息..."
            className="flex-1"
            disabled={!isReady || encrypting}
          />
          <Button
            size="icon"
            onClick={handleSendText}
            disabled={!input.trim() || !isReady || encrypting}
          >
            {encrypting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Destroy confirmation dialog */}
      {destroyConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <h3 className="font-semibold">确认销毁房间？</h3>
                <p className="text-sm text-gray-500">双方的所有聊天记录将立即清除</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDestroyConfirm(false)}>
                取消
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDestroy}>
                确认销毁
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
TSEOF
```

- [ ] **Step 4: Update App.tsx to add chat routes**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/App.tsx << 'TSEOF'
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import CreateMessage from './pages/CreateMessage.tsx';
import ReadMessage from './pages/ReadMessage.tsx';
import ChatEntry from './pages/ChatEntry.tsx';
import ChatRoom from './pages/ChatRoom.tsx';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <main className="mx-auto max-w-lg px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateMessage />} />
          <Route path="/read/:id" element={<ReadMessage />} />
          <Route path="/chat" element={<ChatEntry />} />
        </Routes>
      </main>
    </div>
  );
}
TSEOF
```

Wait — ChatRoom needs to render without the main wrapper for full-height. Let me fix that.

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/App.tsx << 'TSEOF'
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import CreateMessage from './pages/CreateMessage.tsx';
import ReadMessage from './pages/ReadMessage.tsx';
import ChatEntry from './pages/ChatEntry.tsx';
import ChatRoom from './pages/ChatRoom.tsx';

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <main className="mx-auto max-w-lg px-4 py-6">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
      <Route path="/create" element={<PageWrapper><CreateMessage /></PageWrapper>} />
      <Route path="/read/:id" element={<PageWrapper><ReadMessage /></PageWrapper>} />
      <Route path="/chat" element={<PageWrapper><ChatEntry /></PageWrapper>} />
      <Route path="/chat/:roomId" element={
        <div className="min-h-screen bg-gray-50 safe-top">
          <div className="mx-auto max-w-lg px-4 h-screen flex flex-col">
            <ChatRoom />
          </div>
        </div>
      } />
    </Routes>
  );
}
TSEOF
```

- [ ] **Step 5: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: add ChatEntry, ChatRoom pages with E2EE chat"
```

---

### Phase 7: Polish & Fixes

### Task 7.1: Fix WebSocket hook issues and enable typing indicator

**Files:**
- Modify: `packages/frontend/src/hooks/useWebSocket.ts`
- Modify: `packages/frontend/src/pages/ChatRoom.tsx`

- [ ] **Step 1: Rewrite useWebSocket.ts to fix hook ordering and exports**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/src/hooks/useWebSocket.ts << 'TSEOF'
import { useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import type { ServerMessage } from '@zerochat/shared';

let typingTimer: ReturnType<typeof setTimeout> | null = null;

const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

export function useWebSocket() {
  const setWs = useChatStore((s) => s.setWs);
  const setConnected = useChatStore((s) => s.setConnected);
  const setRoomInfo = useChatStore((s) => s.setRoomInfo);
  const setPeerKey = useChatStore((s) => s.setPeerKey);
  const addEncryptedMessage = useChatStore((s) => s.addEncryptedMessage);
  const setPeerTyping = useChatStore((s) => s.setPeerTyping);
  const setPeerConnected = useChatStore((s) => s.setPeerConnected);
  const setError = useChatStore((s) => s.setError);
  const reset = useChatStore((s) => s.reset);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'room-created':
      case 'room-joined':
        setRoomInfo(msg.roomId, msg.userId);
        break;
      case 'peer-joined':
        setPeerConnected(true);
        break;
      case 'peer-public-key':
        setPeerKey(msg.publicKey, msg.salt);
        break;
      case 'new-message':
        addEncryptedMessage({
          id: crypto.randomUUID(),
          encryptedData: msg.encryptedData,
          fromMe: false,
          timestamp: Date.now(),
        });
        break;
      case 'user-typing':
        setPeerTyping(true);
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(() => setPeerTyping(false), 2000);
        break;
      case 'peer-disconnected':
        setPeerConnected(false);
        setPeerTyping(false);
        break;
      case 'room-destroyed':
        reset();
        break;
      case 'error':
        setError(msg.message);
        break;
    }
  }, []);

  const connect = useCallback(() => {
    const socket = new WebSocket(WS_BASE);
    socket.onopen = () => {
      setWs(socket);
      setConnected(true);
      setError(null);
    };
    socket.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch {
        console.error('Failed to parse server message');
      }
    };
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setError('连接失败');
  }, []);

  const send = useCallback((data: object) => {
    const ws = useChatStore.getState().ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const disconnect = useCallback(() => {
    const ws = useChatStore.getState().ws;
    if (ws) {
      ws.close();
      setWs(null);
    }
  }, []);

  return { connect, send, disconnect };
}
TSEOF
```

- [ ] **Step 2: Add typing indicator send to ChatRoom**

Add to the input onChange handler in ChatRoom.tsx — send typing event on text change:

Read the ChatRoom.tsx file to find the right place to add typing indicator:

The Input's `onChange` handler should throttle-send a typing event. Replace the Input in ChatRoom.tsx with one that sends typing events.

Edit `packages/frontend/src/pages/ChatRoom.tsx`:

Find:
```tsx
            onChange={(e) => setInput(e.target.value)}
```

Replace with:
```tsx
            onChange={(e) => {
              setInput(e.target.value);
              if (e.target.value) send({ type: 'typing', roomId });
            }}
```

- [ ] **Step 3: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "fix: improve WebSocket hook, add typing indicator"
```

---

### Phase 8: Docker Deployment

### Task 8.1: Create Docker configuration

**Files:**
- Create: `docker-compose.yml`
- Create: `packages/backend/Dockerfile`
- Create: `packages/frontend/Dockerfile`
- Create: `packages/frontend/nginx.conf`

- [ ] **Step 1: Create docker-compose.yml**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/docker-compose.yml << 'EOF'
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis_cndnfs}
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: packages/backend/Dockerfile
    ports:
      - "${PORT:-3001}:3001"
    environment:
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis_cndnfs}@redis:6379
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost}
      - PORT=3001
      - MESSAGE_TTL_SECONDS=${MESSAGE_TTL_SECONDS:-86400}
    depends_on:
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: packages/frontend/Dockerfile
    ports:
      - "${FRONTEND_PORT:-80}:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  redis_data:
EOF
```

- [ ] **Step 2: Create backend Dockerfile**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/backend/Dockerfile << 'EOF'
FROM node:22-alpine AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
RUN npm install -g pnpm@10 && pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/
RUN pnpm build:shared && cd packages/backend && pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/backend/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
EOF
```

- [ ] **Step 3: Create frontend Dockerfile with nginx**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/Dockerfile << 'EOF'
FROM node:22-alpine AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
RUN npm install -g pnpm@10 && pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/
RUN pnpm build:shared && cd packages/frontend && pnpm build

FROM nginx:alpine
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
```

- [ ] **Step 4: Create nginx.conf**

```bash
cat > /home/hmilyld/WebCode/zerochat.com/packages/frontend/nginx.conf << 'EOF'
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;

    # API proxy
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

- [ ] **Step 5: Commit**

```bash
cd /home/hmilyld/WebCode/zerochat.com && git add -A && git commit -m "feat: add Docker and nginx deployment configuration"
```

---

### Verification Checklist

After all tasks complete, verify:

- [ ] `pnpm install` succeeds at root
- [ ] Backend starts: `pnpm dev:backend` on port 3001 with Redis connected
- [ ] Frontend starts: `pnpm dev:frontend` on port 5173
- [ ] One-time message: create a text message, receive a link, open link, see decrypted text, refresh to see "已销毁"
- [ ] One-time message with image: create image message, open link, see decrypted image
- [ ] Chat room: create room from page A, join from page B, verify key exchange, send text messages both ways
- [ ] Chat room image: send image in chat, verify decryption on other side
- [ ] Chat room destroy: click destroy on one side, verify both sides clear and redirect
- [ ] Mobile layout: all pages render correctly at 375px width
- [ ] TypeScript: `pnpm -r exec tsc --noEmit` has no errors

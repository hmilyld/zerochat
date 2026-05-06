# ZeroChat — 私密通讯 H5 架构设计

**日期**: 2026-05-06
**状态**: 已确认

## 概述

ZeroChat 是一个纯网页的前后端应用（移动优先），提供两种私密通信方式：
1. 一次性消息（阅后即焚）
2. 双向端到端加密聊天室（E2EE + 阅后即焚）

核心原则：零信任架构 — 所有加解密在客户端完成，服务器只存储/转发密文。

## 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 前端框架 | React + TypeScript | 19.x |
| 构建工具 | Vite | 6.x |
| 路由 | React Router (BrowserRouter) | 7.x |
| 状态管理 | Zustand | 5.x |
| 样式 | TailwindCSS + shadcn/ui | 4.x / latest |
| 加密 | @noble/ciphers, @noble/curves, @noble/hashes | latest |
| 后端框架 | Express + TypeScript | 5.x |
| WebSocket | ws | latest |
| 缓存/存储 | Redis | 7.x (Docker) |
| 包管理 | pnpm workspace | 10.x |
| 图片压缩 | browser-image-compression | latest |
| 二维码 | qrcode | latest |

## 项目结构（pnpm workspace monorepo）

```
packages/
├── shared/          # 前后端共用加解密 + 类型定义
├── backend/         # Express + ws + Redis
└── frontend/        # Vite + React + shadcn/ui
```

## 加密体系

### 一次性消息
- 前端生成随机 AES-256 密钥
- AES-256-GCM 加密（nonce=12B, tag=16B）
- 密钥放入 URL fragment（`/read/:id#key=base64key`），永不到服务器
- 后端 GET 读取即删除（Redis GETDEL）

### 加密聊天室
- ECDH 密钥协商：X25519 密钥对
- HKDF-SHA256 派生会话密钥（info="zerochat-room-key"）
- AES-256-GCM 加密每条消息（随机 nonce）
- 服务器盲转发密文，不知任何密钥

## 路由设计

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | Home | 功能导航 |
| `/create` | CreateMessage | 创建一次性消息 |
| `/read/:id` | ReadMessage | 读取即焚消息（key 在 fragment） |
| `/chat` | ChatEntry | 创建/加入聊天室入口 |
| `/chat/:roomId` | ChatRoom | 加密聊天界面 |

## WebSocket 协议

客户端→服务端：create-room, join-room, exchange-key, send-message, destroy-room, typing
服务端→客户端：room-created, room-joined, peer-joined, peer-public-key, new-message, user-typing, peer-disconnected, room-destroyed, error

## 安全措施

- 密钥永不到服务器（fragment / 纯客户端 ECDH）
- 防暴力破解：API 同 IP 10次/分钟
- Helmet CSP 限制同源
- ws 禁用 perMessageDeflate（防 CRIME）
- 房间 Redis TTL 1小时自动过期
- 公钥指纹 SHA-256 前8位验证
- 无登录、无注册、无 Cookie

## 开发顺序

1. pnpm workspace + 三包骨架
2. shared 加解密模块
3. 后端 Redis + Express + ws 基础
4. 一次性消息完整模块
5. WebSocket 基础通信
6. ECDH 协商 + AES 消息加解密
7. 聊天室完整 UI + 销毁
8. 移动端适配 + 安全加固
9. Docker 部署

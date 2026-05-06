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

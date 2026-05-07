FROM node:22-alpine AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
RUN npm install -g pnpm@10 && pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/
RUN cd packages/frontend && pnpm build

FROM node:22-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/packages/frontend/dist /app/dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]

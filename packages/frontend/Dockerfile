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

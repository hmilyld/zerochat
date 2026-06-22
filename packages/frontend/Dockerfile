FROM node:22-alpine AS builder
ARG APP_VERSION
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
RUN npm install -g pnpm@10 && pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/
ENV APP_VERSION=${APP_VERSION}
RUN if [ -n "${APP_VERSION}" ]; then \
      echo "v${APP_VERSION}" > packages/frontend/.version; \
    else \
      echo "v$(date +%Y%m%d)-docker" > packages/frontend/.version; \
    fi
RUN cd packages/frontend && pnpm build

FROM node:22-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/packages/frontend/dist /app/dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:5173"]

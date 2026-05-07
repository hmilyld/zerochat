FROM node:22-alpine
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
RUN npm install -g pnpm@10 && pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/
EXPOSE 3001
CMD ["npx", "tsx", "packages/backend/src/index.ts"]

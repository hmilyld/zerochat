.PHONY: dev dev-stop dev-restart dev-status dev-logs up build build-docker publish down logs clean help docker-build docker-push docker-deploy docker-status docker-logs docker-cleanup docker-unified-up

APP_VERSION := $(shell git log -1 --format=%cd --date=format:%Y%m%d)-$(shell git rev-parse --short HEAD)

help: ## 显示帮助信息
	@echo "ZeroChat Makefile"
	@echo ""
	@echo "Development:"
	@echo "  make dev              启动本地开发服务"
	@echo "  make dev-stop         停止本地开发服务"
	@echo "  make dev-restart      重启本地开发服务"
	@echo "  make dev-status       查看服务状态"
	@echo "  make dev-logs         查看服务日志"
	@echo ""
	@echo "Docker (三镜像架构):"
	@echo "  make up               Docker Compose 启动"
	@echo "  make build            Docker Compose 构建"
	@echo "  make build-docker     构建 Docker 镜像"
	@echo "  make publish          推送镜像到 Docker Hub"
	@echo "  make down             停止服务"
	@echo "  make logs             查看日志"
	@echo "  make clean            清理镜像"
	@echo ""
	@echo "Docker (统一镜像):"
	@echo "  make docker-unified-up    启动统一镜像服务"
	@echo "  make docker-build         构建统一镜像"
	@echo "  make docker-push          推送统一镜像"
	@echo "  make docker-deploy        部署统一镜像"
	@echo "  make docker-status        查看服务状态"
	@echo "  make docker-logs          查看服务日志"
	@echo "  make docker-cleanup       清理Docker资源"
	@echo "  make publish-unified      推送统一镜像到Docker Hub"

dev: ## 启动本地开发服务
	./scripts/dev.sh start

dev-stop: ## 停止本地开发服务
	./scripts/dev.sh stop

dev-restart: ## 重启本地开发服务
	./scripts/dev.sh restart

dev-status: ## 查看服务状态
	./scripts/dev.sh status

dev-logs: ## 查看服务日志
	./scripts/dev.sh logs all

up: ## Docker Compose 启动
	APP_VERSION=$(APP_VERSION) docker compose up -d --build

build: ## Docker Compose 构建
	APP_VERSION=$(APP_VERSION) docker compose build

build-docker: ## 构建 Docker 镜像 (三镜像架构)
	./scripts/docker-build.sh all

publish: ## 推送镜像到 Docker Hub (三镜像架构)
	./scripts/docker-publish.sh all

publish-unified: ## 推送统一镜像到 Docker Hub
	APP_VERSION=$(APP_VERSION) ./scripts/docker-push.sh

down: ## 停止服务
	docker compose down

logs: ## 查看日志
	docker compose logs -f

clean: ## 清理镜像
	docker rmi hmilyld/zerochat-backend:latest hmilyld/zerochat-backend:$(APP_VERSION) \
		hmilyld/zerochat-frontend:latest hmilyld/zerochat-frontend:$(APP_VERSION) 2>/dev/null || true
	docker system prune -f

docker-unified-up: ## 启动统一镜像服务
	APP_VERSION=$(APP_VERSION) docker-compose -f docker-compose.unified.yml up -d --build

docker-build: ## 构建统一镜像
	APP_VERSION=$(APP_VERSION) ./scripts/docker-build.sh

docker-push: ## 推送统一镜像
	APP_VERSION=$(APP_VERSION) ./scripts/docker-push.sh

docker-deploy: ## 部署统一镜像
	APP_VERSION=$(APP_VERSION) ./scripts/docker-deploy.sh

docker-status: ## 查看统一镜像服务状态
	./scripts/docker-status.sh

docker-logs: ## 查看统一镜像服务日志
	./scripts/docker-logs.sh

docker-cleanup: ## 清理Docker资源
	./scripts/docker-cleanup.sh

.PHONY: dev dev-stop dev-restart dev-status dev-logs up build push down logs clean help

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
	@echo "Docker:"
	@echo "  make up               构建并启动服务"
	@echo "  make build            仅构建镜像"
	@echo "  make push             推送镜像到 Docker Hub"
	@echo "  make down             停止服务"
	@echo "  make logs             查看日志"
	@echo "  make clean            清理 Docker 资源"

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

up: ## 构建并启动服务
	APP_VERSION=$(APP_VERSION) docker compose up -d --build

build: ## 仅构建镜像
	docker build -t hmilyld/zerochat:$(APP_VERSION) --build-arg APP_VERSION=$(APP_VERSION) . && \
	docker tag hmilyld/zerochat:$(APP_VERSION) hmilyld/zerochat:latest

push: ## 推送镜像到 Docker Hub
	docker push hmilyld/zerochat:$(APP_VERSION) && docker push hmilyld/zerochat:latest

down: ## 停止服务
	docker compose down

logs: ## 查看日志
	docker compose logs -f

clean: ## 清理 Docker 资源
	docker compose down -v
	docker image prune -f

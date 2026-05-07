.PHONY: up build down logs

APP_VERSION := $(shell git log -1 --format=%cd --date=format:%Y%m%d)-$(shell git rev-parse --short HEAD)

up:
	APP_VERSION=$(APP_VERSION) docker compose up -d --build

build:
	APP_VERSION=$(APP_VERSION) docker compose build

down:
	docker compose down

logs:
	docker compose logs -f

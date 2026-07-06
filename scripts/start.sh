#!/bin/sh

# 设置Redis密码（如果提供了环境变量）
if [ -n "$REDIS_PASSWORD" ]; then
    echo "requirepass $REDIS_PASSWORD" > /etc/redis.conf
    echo "dir /data" >> /etc/redis.conf
    echo "save 60 1000" >> /etc/redis.conf
else
    echo "dir /data" > /etc/redis.conf
    echo "save 60 1000" >> /etc/redis.conf
fi

# 创建数据目录
mkdir -p /data

# 启动Redis（后台运行）
redis-server /etc/redis.conf --daemonize yes

# 等待Redis启动
sleep 2

# 设置后端环境变量
export REDIS_URL="redis://:${REDIS_PASSWORD:-}@127.0.0.1:6379"
export PORT=3001

# 启动后端（后台运行）
cd /app
npx tsx packages/backend/src/index.ts &

# 启动前端
serve -s /app/packages/frontend/dist -l tcp://0.0.0.0:5173

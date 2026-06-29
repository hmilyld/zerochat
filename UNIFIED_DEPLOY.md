# 统一镜像部署说明

## 文件说明

- `Dockerfile.unified` - 统一的Dockerfile，包含前端、后端和Redis
- `docker-compose.unified.yml` - 统一镜像的docker-compose配置
- `scripts/start-unified.sh` - 启动脚本
- `scripts/supervisord.conf` - 进程管理配置（备选方案）

## 使用方法

### 方法1：使用docker-compose（推荐）

```bash
# 设置环境变量
export REDIS_PASSWORD=your_password
export APP_VERSION=1.0.0

# 使用统一镜像启动
docker-compose -f docker-compose.unified.yml up -d --build
```

### 方法2：手动构建和运行

```bash
# 构建镜像
docker build -f Dockerfile.unified -t zerochat-unified .

# 运行容器
docker run -d \
  --name zerochat \
  -p 3001:3001 \
  -p 5173:5173 \
  -p 127.0.0.1:6379:6379 \
  -e REDIS_PASSWORD=your_password \
  -v redis_data:/data \
  zerochat-unified
```

## 端口说明

- `3001` - 后端API服务
- `5173` - 前端静态文件服务
- `6379` - Redis服务（仅本地访问）

## 数据持久化

Redis数据存储在`/data`目录，通过`redis_data`卷持久化。

**注意**：容器重启时数据会保留，但删除容器或卷时数据会丢失。

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| REDIS_PASSWORD | Redis密码 | 无 |
| APP_VERSION | 应用版本号 | dev |
| PORT | 后端端口 | 3001 |
| FRONTEND_PORT | 前端端口 | 5173 |
| CORS_ORIGIN | 跨域来源 | http://localhost |
| MESSAGE_TTL_SECONDS | 消息过期时间 | 3600 |

## 优缺点

### 优点
- ✅ 单一镜像，管理简单
- ✅ 部署快速，只需一个命令
- ✅ 所有服务在同一网络，通信快

### 缺点
- ❌ Redis数据可能丢失（容器删除时）
- ❌ 无法单独扩容某个服务
- ❌ 一个服务崩溃可能影响其他服务
- ❌ 不适合生产环境高可用部署

## 生产环境建议

如果需要生产环境部署，建议：

1. **保持Redis独立**：使用云Redis服务或独立Redis容器
2. **使用Kubernetes**：便于服务发现和扩缩容
3. **数据备份**：定期备份Redis数据
4. **监控告警**：监控服务健康状态

## 故障排查

```bash
# 查看容器日志
docker logs zerochat

# 进入容器调试
docker exec -it zerochat sh

# 检查进程状态
ps aux | grep -E "redis|node|serve"

# 检查端口
netstat -tlnp
```

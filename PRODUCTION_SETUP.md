# 生产环境配置指南

## 概述

本指南将帮助您配置生产环境，包括：

1. 服务器准备
2. Docker安装和配置
3. 应用部署
4. 监控和日志
5. 备份和恢复
6. 安全配置

## 1. 服务器准备

### 最低配置

| 资源 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 2核 | 4核 |
| 内存 | 2GB | 4GB |
| 磁盘 | 20GB | 50GB |
| 网络 | 100Mbps | 1Gbps |

### 操作系统

推荐使用：
- Ubuntu 22.04 LTS
- Debian 12
- CentOS 9 Stream

### 基础配置

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y curl wget git vim ufw

# 设置时区
sudo timedatectl set-timezone Asia/Shanghai

# 创建部署用户
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy

# 配置SSH
sudo mkdir -p /home/deploy/.ssh
sudo touch /home/deploy/.ssh/authorized_keys
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
```

## 2. Docker安装和配置

### 安装Docker

```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 将用户添加到docker组
sudo usermod -aG docker deploy

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

### 配置Docker

```bash
# 创建Docker配置目录
sudo mkdir -p /etc/docker

# 配置Docker守护进程
sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF

# 重启Docker
sudo systemctl restart docker
```

## 3. 应用部署

### 克隆代码

```bash
# 切换到部署用户
su - deploy

# 克隆代码
git clone https://github.com/your-username/zerochat.git
cd zerochat

# 创建环境变量文件
cat > .env <<EOF
REDIS_PASSWORD=your_secure_redis_password
APP_VERSION=latest
PORT=3001
FRONTEND_PORT=5173
CORS_ORIGIN=https://your_domain.com
MESSAGE_TTL_SECONDS=3600
EOF
```

### 构建和部署

```bash
# 使用Make命令
make docker-build
make docker-deploy

# 或使用脚本
./scripts/docker-build.sh unified
./scripts/docker-deploy.sh unified
```

### 验证部署

```bash
# 查看容器状态
docker ps

# 查看日志
docker logs -f zerochat-app

# 健康检查
curl http://localhost:3001/health
curl http://localhost:5173
```

## 4. Nginx反向代理

### 安装Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 配置Nginx

```bash
# 创建配置文件
sudo tee /etc/nginx/sites-available/zerochat <<EOF
server {
    listen 80;
    server_name your_domain.com;
    
    # 重定向到HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your_domain.com;
    
    # SSL证书
    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;
    
    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 前端静态文件
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 后端API
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
sudo ln -s /etc/nginx/sites-available/zerochat /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 配置SSL证书

```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your_domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 5. 防火墙配置

```bash
# 启用防火墙
sudo ufw enable

# 允许SSH
sudo ufw allow 22/tcp

# 允许HTTP和HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许应用端口（仅本地）
sudo ufw allow from 127.0.0.1 to any port 3001
sudo ufw allow from 127.0.0.1 to any port 5173
sudo ufw allow from 127.0.0.1 to any port 6379

# 查看状态
sudo ufw status
```

## 6. 监控和日志

### 安装监控工具

```bash
# 安装htop
sudo apt install -y hop

# 安装netdata（可选）
curl -Ss https://my-netdata.io/kickstart.sh | sudo bash
```

### 配置日志轮转

```bash
# 创建日志轮转配置
sudo tee /etc/logrotate.d/zerochat <<EOF
/var/lib/docker/containers/*/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root adm
    sharedscripts
    postrotate
        /usr/bin/docker kill --signal=USR1 \$(docker ps -q) 2>/dev/null || true
    endscript
}
EOF
```

### 创建监控脚本

```bash
# 创建监控脚本
tee /home/deploy/monitor.sh <<EOF
#!/bin/bash

# 监控脚本
LOG_FILE="/var/log/zerochat-monitor.log"

# 检查容器状态
if ! docker ps | grep -q zerochat-app; then
    echo "\$(date): 容器未运行，尝试重启..." >> \$LOG_FILE
    cd /home/deploy/zerochat
    ./scripts/docker-deploy.sh unified
fi

# 检查端口
if ! netstat -tlnp | grep -q :3001; then
    echo "\$(date): 端口3001未监听" >> \$LOG_FILE
fi

if ! netstat -tlnp | grep -q :5173; then
    echo "\$(date): 端口5173未监听" >> \$LOG_FILE
fi
EOF

chmod +x /home/deploy/monitor.sh

# 添加定时任务
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/deploy/monitor.sh") | crontab -
```

## 7. 备份和恢复

### 配置自动备份

```bash
# 创建备份脚本
tee /home/deploy/backup.sh <<EOF
#!/bin/bash

# 备份脚本
BACKUP_DIR="/home/deploy/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=7

# 创建备份目录
mkdir -p \$BACKUP_DIR

# 备份Redis数据
docker exec zerochat-app redis-cli -a "\${REDIS_PASSWORD}" BGSAVE
sleep 5
docker cp zerochat-app:/data/dump.rdb \$BACKUP_DIR/redis_\$DATE.rdb

# 备份环境变量
cp /home/deploy/zerochat/.env \$BACKUP_DIR/env_\$DATE

# 删除旧备份
find \$BACKUP_DIR -name "*.rdb" -mtime +\$KEEP_DAYS -delete
find \$BACKUP_DIR -name "env_*" -mtime +\$KEEP_DAYS -delete

echo "\$(date): 备份完成" >> /var/log/zerochat-backup.log
EOF

chmod +x /home/deploy/backup.sh

# 添加定时任务（每天凌晨2点）
(crontab -l 2>/dev/null; echo "0 2 * * * /home/deploy/backup.sh") | crontab -
```

### 恢复数据

```bash
# 恢复Redis数据
docker stop zerochat-app
docker run -d \
  --name zerochat-restore \
  -v zerochat_redis_data:/data \
  redis:7-alpine

docker cp /home/deploy/backups/redis_YYYYMMDD_HHMMSS.rdb zerochat-restore:/data/dump.rdb

docker stop zerochat-restore
docker rm zerochat-restore

# 重启应用
docker start zerochat-app
```

## 8. 安全配置

### SSH安全

```bash
# 编辑SSH配置
sudo tee /etc/ssh/sshd_config <<EOF
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# 重启SSH
sudo systemctl restart sshd
```

### 应用安全

```bash
# 使用非root用户运行容器
# 在Dockerfile.unified中添加：
# RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# USER appuser

# 限制容器资源
docker update --memory=2g --cpus=2 zerochat-app
```

## 9. 性能优化

### 系统优化

```bash
# 优化内核参数
sudo tee /etc/sysctl.conf <<EOF
net.ipv4.tcp_max_syn_backlog = 65535
net.core.somaxconn = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_keepalive_intvl = 15
vm.overcommit_memory = 1
EOF

sudo sysctl -p
```

### Docker优化

```bash
# 清理未使用的资源
docker system prune -f

# 使用多阶段构建优化镜像
# 已在Dockerfile.unified中实现
```

## 10. 故障排查

### 常见问题

```bash
# 容器无法启动
docker logs zerochat-app

# 端口冲突
netstat -tlnp | grep -E "3001|5173|6379"

# 内存不足
docker stats
free -h

# 磁盘空间不足
df -h
docker system df
```

### 恢复服务

```bash
# 重启容器
docker restart zerochat-app

# 重新部署
cd /home/deploy/zerochat
./scripts/docker-deploy.sh unified

# 查看详细日志
docker logs -f --tail 100 zerochat-app
```

## 相关文档

- [项目README](README.md)
- [CI/CD配置说明](CICD_SETUP.md)
- [Docker脚本说明](DOCKER_SCRIPTS.md)
- [统一镜像部署说明](UNIFIED_DEPLOY.md)
- [GitHub配置指南](GITHUB_SETUP.md)

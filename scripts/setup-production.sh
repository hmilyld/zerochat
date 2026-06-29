#!/bin/bash

# 生产环境快速部署脚本
set -e

echo "=========================================="
echo "  ZeroChat 生产环境快速部署"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查是否为root用户
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}请不要使用root用户运行此脚本${NC}"
    exit 1
fi

# 检查系统要求
echo ""
echo "1. 检查系统要求"
echo "----------------------------------------"

# 检查操作系统
if ! grep -q "Ubuntu\|Debian" /etc/os-release; then
    echo -e "${YELLOW}警告: 此脚本针对Ubuntu/Debian系统，其他系统可能需要调整${NC}"
fi

# 检查内存
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MEM" -lt 2048 ]; then
    echo -e "${YELLOW}警告: 内存少于2GB，建议至少4GB${NC}"
fi

# 检查磁盘空间
FREE_SPACE=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
if [ "$FREE_SPACE" -lt 20 ]; then
    echo -e "${YELLOW}警告: 磁盘空间少于20GB，建议至少50GB${NC}"
fi

echo -e "${GREEN}系统检查完成${NC}"

# 安装必要工具
echo ""
echo "2. 安装必要工具"
echo "----------------------------------------"

sudo apt update
sudo apt install -y curl wget git vim ufw net-tools

# 安装Docker
echo ""
echo "3. 安装Docker"
echo "----------------------------------------"

if ! command -v docker &> /dev/null; then
    echo "安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # 将用户添加到docker组
    sudo usermod -aG docker $USER
    
    echo -e "${GREEN}Docker安装完成${NC}"
else
    echo -e "${GREEN}Docker已安装${NC}"
fi

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 配置Docker
echo ""
echo "4. 配置Docker"
echo "----------------------------------------"

sudo mkdir -p /etc/docker
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

sudo systemctl restart docker

# 配置防火墙
echo ""
echo "5. 配置防火墙"
echo "----------------------------------------"

sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

echo -e "${GREEN}防火墙配置完成${NC}"

# 创建部署目录
echo ""
echo "6. 准备部署目录"
echo "----------------------------------------"

DEPLOY_DIR="/home/$USER/zerochat"
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# 检查是否已有代码
if [ -d ".git" ]; then
    echo "拉取最新代码..."
    git pull origin main
else
    echo "克隆代码..."
    # 这里需要用户输入仓库地址
    read -p "请输入GitHub仓库地址: " REPO_URL
    if [ -n "$REPO_URL" ]; then
        git clone "$REPO_URL" .
    else
        echo -e "${RED}未提供仓库地址${NC}"
        exit 1
    fi
fi

# 创建环境变量文件
echo ""
echo "7. 配置环境变量"
echo "----------------------------------------"

if [ ! -f ".env" ]; then
    echo "创建环境变量文件..."
    
    # 生成随机Redis密码
    REDIS_PASSWORD=$(openssl rand -hex 16)
    
    read -p "请输入域名 (默认: localhost): " DOMAIN
    DOMAIN=${DOMAIN:-localhost}
    
    read -p "请输入后端端口 (默认: 3001): " PORT
    PORT=${PORT:-3001}
    
    read -p "请输入前端端口 (默认: 5173): " FRONTEND_PORT
    FRONTEND_PORT=${FRONTEND_PORT:-5173}
    
    cat > .env <<EOF
REDIS_PASSWORD=$REDIS_PASSWORD
APP_VERSION=latest
PORT=$PORT
FRONTEND_PORT=$FRONTEND_PORT
CORS_ORIGIN=http://$DOMAIN
MESSAGE_TTL_SECONDS=3600
EOF
    
    echo -e "${GREEN}环境变量配置完成${NC}"
    echo ""
    echo "重要: 请保存以下信息"
    echo "Redis密码: $REDIS_PASSWORD"
    echo "前端访问: http://$DOMAIN:$FRONTEND_PORT"
    echo "后端API: http://$DOMAIN:$PORT"
else
    echo -e "${GREEN}环境变量文件已存在${NC}"
fi

# 构建和部署
echo ""
echo "8. 构建和部署"
echo "----------------------------------------"

# 设置脚本权限
chmod +x scripts/*.sh

# 构建镜像
echo "构建Docker镜像..."
./scripts/docker-build.sh unified

# 部署应用
echo "部署应用..."
./scripts/docker-deploy.sh unified

# 验证部署
echo ""
echo "9. 验证部署"
echo "----------------------------------------"

sleep 10

if docker ps | grep -q zerochat-app; then
    echo -e "${GREEN}部署成功!${NC}"
    echo ""
    echo "服务状态:"
    docker ps --filter "name=zerochat-app" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "访问地址:"
    echo "  前端: http://localhost:$FRONTEND_PORT"
    echo "  后端: http://localhost:$PORT"
else
    echo -e "${RED}部署失败${NC}"
    echo "查看日志: docker logs zerochat-app"
    exit 1
fi

# 创建监控脚本
echo ""
echo "10. 配置监控"
echo "----------------------------------------"

tee /home/$USER/monitor.sh <<EOF
#!/bin/bash
# 监控脚本
if ! docker ps | grep -q zerochat-app; then
    echo "\$(date): 容器未运行，尝试重启..." >> /var/log/zerochat-monitor.log
    cd $DEPLOY_DIR
    ./scripts/docker-deploy.sh unified
fi
EOF

chmod +x /home/$USER/monitor.sh

# 添加定时任务
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/$USER/monitor.sh") | crontab -

echo -e "${GREEN}监控配置完成${NC}"

# 完成
echo ""
echo "=========================================="
echo "  部署完成!"
echo "=========================================="
echo ""
echo "下一步操作:"
echo "1. 配置域名和SSL证书 (参考PRODUCTION_SETUP.md)"
echo "2. 配置GitHub Actions (参考GITHUB_SETUP.md)"
echo "3. 配置备份 (参考PRODUCTION_SETUP.md)"
echo ""
echo "常用命令:"
echo "  查看状态: docker ps"
echo "  查看日志: docker logs -f zerochat-app"
echo "  重启服务: docker restart zerochat-app"
echo "  停止服务: docker stop zerochat-app"
echo "  更新部署: cd $DEPLOY_DIR && ./scripts/docker-deploy.sh unified"

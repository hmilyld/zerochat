#!/bin/bash

# CI/CD配置验证脚本
set -e

echo "=========================================="
echo "  CI/CD配置验证脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_item() {
    local name=$1
    local command=$2
    
    echo -n "检查 $name... "
    if eval $command > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

# 检查Git配置
echo ""
echo "1. Git配置检查"
echo "----------------------------------------"
check_item "Git已安装" "git --version"
check_item "在Git仓库中" "git rev-parse --git-dir"
check_item "有远程仓库" "git remote -v"

# 检查GitHub CLI
echo ""
echo "2. GitHub CLI检查"
echo "----------------------------------------"
if command -v gh &> /dev/null; then
    echo -n "检查 GitHub CLI... "
    echo -e "${GREEN}✓${NC}"
    
    echo -n "检查 GitHub登录状态... "
    if gh auth status &> /dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        echo "  请运行: gh auth login"
    fi
else
    echo -e "${YELLOW}GitHub CLI未安装 (可选)${NC}"
    echo "  安装: brew install gh"
fi

# 检查Docker
echo ""
echo "3. Docker检查"
echo "----------------------------------------"
check_item "Docker已安装" "docker --version"
check_item "Docker正在运行" "docker info"
check_item "Docker Compose已安装" "docker compose version"

# 检查项目文件
echo ""
echo "4. 项目文件检查"
echo "----------------------------------------"
check_item "Dockerfile.unified存在" "test -f Dockerfile.unified"
check_item "docker-compose.unified.yml存在" "test -f docker-compose.unified.yml"
check_item "scripts/docker-build.sh存在" "test -f scripts/docker-build.sh"
check_item "scripts/docker-push.sh存在" "test -f scripts/docker-push.sh"
check_item "scripts/docker-deploy.sh存在" "test -f scripts/docker-deploy.sh"
check_item ".github/workflows/ci.yml存在" "test -f .github/workflows/ci.yml"
check_item ".github/workflows/release.yml存在" "test -f .github/workflows/release.yml"

# 检查脚本可执行权限
echo ""
echo "5. 脚本权限检查"
echo "----------------------------------------"
check_item "docker-build.sh可执行" "test -x scripts/docker-build.sh"
check_item "docker-push.sh可执行" "test -x scripts/docker-push.sh"
check_item "docker-deploy.sh可执行" "test -x scripts/docker-deploy.sh"

# 检查环境变量
echo ""
echo "6. 环境变量检查"
echo "----------------------------------------"
if [ -n "$DOCKER_USERNAME" ]; then
    echo -e "检查 DOCKER_USERNAME... ${GREEN}✓${NC}"
else
    echo -e "检查 DOCKER_USERNAME... ${YELLOW}未设置${NC}"
fi

if [ -n "$DOCKER_PASSWORD" ]; then
    echo -e "检查 DOCKER_PASSWORD... ${GREEN}✓${NC}"
else
    echo -e "检查 DOCKER_PASSWORD... ${YELLOW}未设置${NC}"
fi

# 测试Docker构建
echo ""
echo "7. Docker构建测试"
echo "----------------------------------------"
echo -n "测试构建统一镜像... "
if docker build -f Dockerfile.unified -t zerochat:test . > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    
    # 清理测试镜像
    docker rmi zerochat:test > /dev/null 2>&1 || true
else
    echo -e "${RED}✗${NC}"
    echo "  请检查Dockerfile.unified"
fi

# 总结
echo ""
echo "=========================================="
echo "  验证完成"
echo "=========================================="

echo ""
echo "下一步操作:"
echo "1. 确保GitHub Secrets已配置"
echo "2. 确保GitHub Environments已创建"
echo "3. 创建测试PR验证CI/CD流程"
echo ""
echo "测试命令:"
echo "  git checkout -b test/ci-setup"
echo "  echo '# Test' > test.md"
echo "  git add test.md"
echo "  git commit -m 'test: verify CI/CD setup'"
echo "  git push origin test/ci-setup"
echo "  # 然后在GitHub上创建PR"

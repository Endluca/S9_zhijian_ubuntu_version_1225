#!/bin/bash
# ==========================================
# 数据库初始化脚本（Shell版本）
# ==========================================
# 使用方法：
#   chmod +x scripts/init_database.sh
#   ./scripts/init_database.sh
# ==========================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置（可通过环境变量覆盖）
DB_NAME="${DB_NAME:-video_analysis}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "=========================================="
echo "数据库初始化脚本"
echo "=========================================="
echo "数据库名称: $DB_NAME"
echo "数据库用户: $DB_USER"
echo "数据库主机: $DB_HOST"
echo "数据库端口: $DB_PORT"
echo "=========================================="
echo ""

# 检查 psql 是否安装
if ! command -v psql &> /dev/null; then
    echo -e "${RED}错误: 未找到 psql 命令，请先安装 PostgreSQL 客户端${NC}"
    exit 1
fi

# 检查数据库是否存在
echo "检查数据库是否存在..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${GREEN}✓ 数据库 $DB_NAME 已存在${NC}"
else
    echo -e "${YELLOW}数据库 $DB_NAME 不存在，正在创建...${NC}"
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    echo -e "${GREEN}✓ 数据库创建成功${NC}"
fi

# 执行 SQL 脚本
echo ""
echo "执行数据库初始化脚本..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f init_database.sql; then
    echo -e "${GREEN}✓ 数据库初始化成功${NC}"
else
    echo -e "${RED}✗ 数据库初始化失败${NC}"
    exit 1
fi

# 生成密码哈希（可选）
echo ""
echo "是否需要生成默认管理员密码哈希？(y/n)"
read -r answer
if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    echo "正在生成密码哈希..."
    if command -v python3 &> /dev/null; then
        python3 scripts/generate_password_hash.py 123456
    else
        echo -e "${YELLOW}警告: 未找到 python3，无法生成密码哈希${NC}"
        echo "请手动运行: python3 scripts/generate_password_hash.py 123456"
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}数据库初始化完成！${NC}"
echo "=========================================="
echo ""
echo "默认管理员账号："
echo "  邮箱: 51talk"
echo "  密码: 123456"
echo ""
echo "请确保已更新 init_database.sql 中的密码哈希值！"


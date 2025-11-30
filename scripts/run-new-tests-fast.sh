#!/bin/bash

# 快速运行新测试脚本（只运行新创建的测试，排除慢测试）

set -e

echo "=========================================="
echo "快速运行新测试套件（排除慢测试）"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

echo -e "${YELLOW}运行新测试（快速模式，排除慢测试）...${NC}"
echo ""

# 使用 TEST_FAST=true 来排除慢测试
TEST_FAST=true npm run test:new

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ 所有新测试通过！${NC}"
else
    echo ""
    echo -e "${RED}✗ 部分测试失败${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}测试完成！${NC}"
echo "=========================================="


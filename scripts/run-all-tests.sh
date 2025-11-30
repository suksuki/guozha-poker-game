#!/bin/bash

# 完整的测试运行脚本
# 在WSL环境下运行所有测试

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始运行完整测试套件"
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

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到Node.js，请先安装Node.js${NC}"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: 未找到npm，请先安装npm${NC}"
    exit 1
fi

echo -e "${YELLOW}检查依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装依赖...${NC}"
    npm install
fi

echo ""
echo "=========================================="
echo "1. 运行单元测试"
echo "=========================================="
npm run test:quick -- comprehensiveUnitTests

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 单元测试通过${NC}"
else
    echo -e "${RED}✗ 单元测试失败${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo "2. 运行回归测试"
echo "=========================================="
npm run test:quick -- comprehensiveRegressionTests

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 回归测试通过${NC}"
else
    echo -e "${RED}✗ 回归测试失败${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo "3. 运行集成测试"
echo "=========================================="
npm run test:quick -- integrationTests

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 集成测试通过${NC}"
else
    echo -e "${RED}✗ 集成测试失败${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo "4. 运行所有现有测试"
echo "=========================================="
npm run test:all

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过${NC}"
else
    echo -e "${RED}✗ 部分测试失败${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}所有测试完成！${NC}"
echo "=========================================="


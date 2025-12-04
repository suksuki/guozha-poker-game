#!/bin/bash

# AI Brain MCTS集成测试脚本

echo "========================================"
echo "   AI Brain - MCTS模块集成测试"
echo "========================================"
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 编译TypeScript
echo "正在编译TypeScript..."
npx tsc --noEmit src/services/ai/brain/test-mcts-integration.ts

if [ $? -ne 0 ]; then
    echo ""
    echo "编译失败，请检查类型错误"
    exit 1
fi

echo "编译通过！"
echo ""

# 运行测试
echo "开始运行测试..."
echo ""

npx ts-node src/services/ai/brain/test-mcts-integration.ts

echo ""
echo "测试完成！"


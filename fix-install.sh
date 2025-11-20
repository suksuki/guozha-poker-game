#!/bin/bash
echo "正在清理并重新安装依赖..."
echo ""

# 清理
rm -rf node_modules
rm -rf package-lock.json

# 重新安装
echo "安装依赖中..."
npm install

echo ""
echo "安装完成！现在运行: npm run dev"


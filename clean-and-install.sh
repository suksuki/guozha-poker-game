#!/bin/bash
echo "=========================================="
echo "清理并重新安装项目"
echo "=========================================="
echo ""

echo "1. 清理旧文件..."
rm -rf node_modules
rm -rf package-lock.json
rm -rf .vite
rm -rf dist
rm -rf node_modules/.vite

echo "✓ 清理完成"
echo ""

echo "2. 重新安装依赖..."
npm install

echo ""
echo "=========================================="
echo "安装完成！"
echo "=========================================="
echo ""
echo "现在运行: npm run dev"


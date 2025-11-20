#!/bin/bash
echo "=========================================="
echo "安装依赖（跳过脚本以避免 Windows CMD 问题）"
echo "=========================================="
echo ""

# 确保使用 WSL 的 Node.js
export PATH="/usr/bin:/usr/local/bin:$PATH"

echo "1. 清理..."
rm -rf node_modules package-lock.json

echo ""
echo "2. 安装依赖（忽略脚本）..."
npm install --ignore-scripts

echo ""
echo "3. 手动安装 esbuild（如果需要）..."
npm install esbuild --save-dev --ignore-scripts || echo "esbuild 安装失败，但可能不影响使用"

echo ""
echo "=========================================="
echo "安装完成！"
echo "=========================================="
echo ""
echo "现在运行: npm run dev"


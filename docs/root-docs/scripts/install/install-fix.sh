#!/bin/bash
echo "正在清理..."
rm -rf node_modules package-lock.json

echo ""
echo "正在安装依赖（忽略脚本以避免 Windows CMD 问题）..."
npm install --ignore-scripts

echo ""
echo "安装完成后，运行: npm run dev"


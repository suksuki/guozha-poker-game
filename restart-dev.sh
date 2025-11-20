#!/bin/bash
echo "=========================================="
echo "重启开发服务器"
echo "=========================================="
echo ""

# 确保使用 WSL 的 Node.js
export PATH="/usr/bin:/usr/local/bin:$PATH"

echo "检查 Node.js 版本..."
node --version
npm --version

echo ""
echo "启动开发服务器..."
echo "服务器将在 http://localhost:3000 或 http://localhost:5173 启动"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "=========================================="
echo ""

npm run dev


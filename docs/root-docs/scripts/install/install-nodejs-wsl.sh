#!/bin/bash
echo "=========================================="
echo "在 WSL 中安装 Node.js"
echo "=========================================="
echo ""

echo "1. 更新包列表..."
sudo apt update

echo ""
echo "2. 安装 Node.js 和 npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo ""
echo "3. 验证安装..."
node --version
npm --version

echo ""
echo "=========================================="
echo "安装完成！"
echo "=========================================="
echo ""
echo "现在运行:"
echo "  cd /home/jin/guozha_poker_game"
echo "  npm install"
echo "  npm run dev"


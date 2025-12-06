#!/bin/bash
echo "=========================================="
echo "修复 WSL Node.js 路径问题"
echo "=========================================="
echo ""

echo "1. 检查当前 Node.js 路径..."
echo "which node: $(which node)"
echo "which npm: $(which npm)"
echo "node --version: $(node --version 2>&1)"
echo "npm --version: $(npm --version 2>&1)"
echo ""

echo "2. 检查是否安装了 WSL 的 Node.js..."
if [ -f "/usr/bin/node" ] || [ -f "/usr/local/bin/node" ]; then
    echo "✓ WSL Node.js 已安装"
else
    echo "✗ WSL Node.js 未安装，正在安装..."
    sudo apt update
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo ""
echo "3. 设置 PATH 优先使用 WSL 的 Node.js..."
export PATH="/usr/bin:/usr/local/bin:$PATH"

echo ""
echo "4. 验证..."
echo "which node: $(which node)"
echo "which npm: $(which npm)"
echo "node --version: $(node --version 2>&1)"
echo "npm --version: $(npm --version 2>&1)"

echo ""
echo "=========================================="
echo "如果显示 /usr/bin/node，说明修复成功！"
echo "=========================================="


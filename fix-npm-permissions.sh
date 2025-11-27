#!/bin/bash
# 修复npm权限问题的脚本

echo "=== 修复npm权限问题 ==="
echo ""

echo "1. 清理npm缓存..."
npm cache clean --force

echo ""
echo "2. 修复npm缓存目录权限..."
echo "请输入您的密码（如果需要）："
sudo chown -R $(whoami) ~/.npm

echo ""
echo "3. 删除有问题的缓存文件..."
rm -rf ~/.npm/_cacache/content-v2/sha512/b4/fb

echo ""
echo "4. 重新安装Electron依赖..."
npm install --save-dev electron electron-builder concurrently wait-on

echo ""
echo "=== 完成 ==="


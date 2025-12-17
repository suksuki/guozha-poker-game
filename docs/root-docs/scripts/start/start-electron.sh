#!/bin/bash

# 设置UTF-8编码环境变量（解决Ubuntu乱码问题）
export LANG=zh_CN.UTF-8
export LC_ALL=zh_CN.UTF-8
export LC_CTYPE=zh_CN.UTF-8

# 设置Node.js编码选项
export NODE_OPTIONS="--max-old-space-size=4096"

cd /home/jin/guozha_poker_game
echo "正在启动 Electron 开发环境..."
echo "这将启动 Vite 开发服务器和 Electron 窗口"
echo "当前语言环境: $LANG"
echo ""
npm run electron:dev


#!/bin/bash
# 重启应用脚本

echo "=== 重启过炸扑克游戏应用 ==="
echo ""

# 查找并停止现有的 vite 进程
echo "检查是否有正在运行的开发服务器..."
VITE_PID=$(ps aux | grep -E "vite|node.*vite" | grep -v grep | awk '{print $2}')

if [ ! -z "$VITE_PID" ]; then
    echo "发现正在运行的进程 (PID: $VITE_PID)，正在停止..."
    kill $VITE_PID 2>/dev/null
    sleep 2
    echo "已停止"
else
    echo "没有发现正在运行的进程"
fi

echo ""
echo "启动开发服务器..."
echo ""

# 启动开发服务器
npm run dev


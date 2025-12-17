#!/bin/bash
# 同时启动APP和Piper TTS服务

echo "=========================================="
echo "🚀 正在启动所有服务..."
echo "=========================================="

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 函数：检查端口是否被占用
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            return 0  # 端口被占用
        fi
    fi
    if command -v netstat >/dev/null 2>&1; then
        if netstat -an 2>/dev/null | grep -q ":$port.*LISTEN"; then
            return 0  # 端口被占用
        fi
    fi
    if command -v ss >/dev/null 2>&1; then
        if ss -tln 2>/dev/null | grep -q ":$port "; then
            return 0  # 端口被占用
        fi
    fi
    return 1  # 端口未被占用
}

# 检查Piper TTS端口（5000）
if check_port 5000; then
    echo "⚠️  警告: 端口 5000 已被占用，Piper TTS服务可能已在运行"
else
    echo "📢 启动Piper TTS服务（端口5000）..."
    # 启动Piper TTS服务（后台运行）
    bash start-piper-tts.sh > /tmp/piper-tts.log 2>&1 &
    PIPER_PID=$!
    echo "✅ Piper TTS服务已启动（PID: $PIPER_PID）"
    echo "📄 日志文件: /tmp/piper-tts.log"
fi

# 等待一下让Piper TTS服务启动
sleep 2

# 检查开发服务器端口（3000，根据vite.config.ts）
if check_port 3000; then
    echo "⚠️  警告: 端口 3000 已被占用，开发服务器可能已在运行"
else
    echo "🌐 启动开发服务器（端口3000）..."
    # 启动开发服务器（前台运行，这样可以看到输出）
    bash start.sh
fi

# 如果前台进程被中断，清理后台进程
trap "kill $PIPER_PID 2>/dev/null" EXIT


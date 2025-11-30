#!/bin/bash
# 启动所有服务脚本 (WSL)
# 使用方法: ./start-all-services.sh

echo "=========================================="
echo "🚀 启动 APP 和 Piper TTS 服务"
echo "=========================================="
echo ""

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
    if command -v ss >/dev/null 2>&1; then
        if ss -tln 2>/dev/null | grep -q ":$port "; then
            return 0  # 端口被占用
        fi
    fi
    return 1  # 端口未被占用
}

# 检查虚拟环境
if [ ! -f "venv-piper/bin/activate" ]; then
    echo "❌ 错误: 未找到 venv-piper 虚拟环境"
    echo "💡 请先运行: ./scripts/setup-piper-tts.sh"
    exit 1
fi

# 检查并启动 Piper TTS 服务
if check_port 5000; then
    echo "✅ Piper TTS 服务已在运行（端口 5000）"
else
    echo "📢 正在启动 Piper TTS 服务（端口 5000）..."
    source venv-piper/bin/activate
    nohup python scripts/piper-tts-server.py > /tmp/piper-tts.log 2>&1 &
    PIPER_PID=$!
    echo "✅ Piper TTS 服务已启动（PID: $PIPER_PID）"
    echo "📄 日志文件: /tmp/piper-tts.log"
    
    # 等待服务就绪
    echo "⏳ 等待 Piper TTS 服务就绪..."
    for i in {1..30}; do
        if curl -s http://localhost:5000/health >/dev/null 2>&1; then
            echo "✅ Piper TTS 服务已就绪！"
            break
        fi
        sleep 1
        echo -n "."
    done
    echo ""
fi

# 检查并启动前端服务
if check_port 3000; then
    echo "✅ 前端服务已在运行（端口 3000）"
    echo "🌐 访问: http://localhost:3000"
else
    echo ""
    echo "🌐 正在启动前端开发服务器（端口 3000）..."
    echo "📱 服务启动后访问: http://localhost:3000"
    echo ""
    echo "按 Ctrl+C 停止服务"
    echo ""
    
    # 清理函数
    cleanup() {
        echo ""
        echo "正在停止服务..."
        if [ ! -z "$PIPER_PID" ]; then
            kill $PIPER_PID 2>/dev/null
            echo "✅ Piper TTS 服务已停止"
        fi
        exit 0
    }
    
    trap cleanup EXIT INT TERM
    
    # 启动前端服务（前台运行）
    npm run dev
fi


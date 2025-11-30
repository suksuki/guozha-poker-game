#!/bin/bash
# WSL快速启动脚本 - 同时启动Piper TTS和前端APP

echo "=========================================="
echo "🚀 WSL方式启动APP和Piper TTS服务"
echo "=========================================="
echo ""

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查虚拟环境
if [ ! -f "venv-piper/bin/activate" ]; then
    echo "❌ 错误: 未找到 venv-piper 虚拟环境"
    echo "💡 请先运行安装脚本: ./scripts/setup-piper-tts.sh"
    exit 1
fi

# 启动Piper TTS服务（后台）
echo "📢 启动Piper TTS服务..."
source venv-piper/bin/activate
python scripts/piper-tts-server.py > /tmp/piper-tts.log 2>&1 &
PIPER_PID=$!
echo "✅ Piper TTS服务已启动（PID: $PIPER_PID）"

# 等待服务就绪
echo "⏳ 等待Piper TTS服务就绪..."
for i in {1..30}; do
    if curl -s http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ Piper TTS服务已就绪！"
        curl -s http://localhost:5000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5000/health
        break
    fi
    sleep 1
done

echo ""
echo "🚀 启动前端开发服务器..."
echo "📱 APP将在 http://localhost:3000 启动"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 清理函数
cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $PIPER_PID 2>/dev/null
    wait $PIPER_PID 2>/dev/null
    echo "✅ 服务已停止"
    exit 0
}

trap cleanup EXIT INT TERM

# 启动前端
npm run dev


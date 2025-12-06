#!/bin/bash
# WSL下启动APP和Piper TTS服务的脚本
# 使用方法: ./start-wsl-dev.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🚀 WSL方式启动APP和Piper TTS服务"
echo "=========================================="
echo ""

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

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

# 函数：停止占用端口的进程
kill_port() {
    local port=$1
    print_warning "端口 $port 被占用，正在停止占用该端口的进程..."
    
    if command -v lsof >/dev/null 2>&1; then
        local pid=$(lsof -ti :$port)
        if [ -n "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            print_success "已停止占用端口 $port 的进程 (PID: $pid)"
            sleep 1
            return 0
        fi
    fi
    
    if command -v fuser >/dev/null 2>&1; then
        fuser -k $port/tcp 2>/dev/null || true
        sleep 1
        return 0
    fi
    
    print_warning "无法自动停止占用端口 $port 的进程，请手动停止"
    return 1
}

# 检查虚拟环境
if [ ! -f "venv-piper/bin/activate" ]; then
    print_error "未找到 venv-piper 虚拟环境"
    echo ""
    print_info "请先运行安装脚本:"
    echo "  ./scripts/setup-piper-tts.sh"
    exit 1
fi

# 检查Node.js
if ! command -v node >/dev/null 2>&1; then
    print_error "未找到 Node.js"
    echo ""
    print_info "请先安装 Node.js"
    exit 1
fi

# 检查npm依赖
if [ ! -d "node_modules" ]; then
    print_warning "未找到 node_modules，正在安装依赖..."
    npm install
fi

# 检查Piper TTS端口（5000）
if check_port 5000; then
    print_warning "端口 5000 已被占用"
    read -p "是否停止占用该端口的进程并继续? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 5000
    else
        print_info "使用已运行的Piper TTS服务"
        PIPER_PID=""
    fi
fi

# 启动Piper TTS服务（如果端口未被占用）
if ! check_port 5000; then
    print_info "启动Piper TTS服务（端口5000）..."
    source venv-piper/bin/activate
    python scripts/piper-tts-server.py > /tmp/piper-tts.log 2>&1 &
    PIPER_PID=$!
    print_success "Piper TTS服务已启动（PID: $PIPER_PID）"
    print_info "日志文件: /tmp/piper-tts.log"
    
    # 等待服务就绪
    print_info "等待Piper TTS服务就绪..."
    for i in {1..30}; do
        if curl -s http://localhost:5000/health >/dev/null 2>&1; then
            print_success "Piper TTS服务已就绪！"
            echo ""
            curl -s http://localhost:5000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5000/health
            echo ""
            break
        fi
        if [ $i -eq 30 ]; then
            print_warning "Piper TTS服务启动超时，但继续启动前端..."
        fi
        sleep 1
    done
else
    PIPER_PID=""
    print_info "使用已运行的Piper TTS服务"
fi

# 检查开发服务器端口（3000）
if check_port 3000; then
    print_warning "端口 3000 已被占用"
    read -p "是否停止占用该端口的进程并继续? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 3000
    else
        print_error "无法启动开发服务器，端口被占用"
        if [ -n "$PIPER_PID" ]; then
            kill $PIPER_PID 2>/dev/null || true
        fi
        exit 1
    fi
fi

# 清理函数
cleanup() {
    echo ""
    print_info "正在停止服务..."
    if [ -n "$PIPER_PID" ]; then
        kill $PIPER_PID 2>/dev/null || true
        wait $PIPER_PID 2>/dev/null || true
        print_success "Piper TTS服务已停止"
    fi
    print_success "所有服务已停止"
    exit 0
}

# 注册清理函数
trap cleanup EXIT INT TERM

# 显示服务信息
echo ""
echo "=========================================="
print_success "所有服务已启动！"
echo "=========================================="
echo ""
print_info "Piper TTS服务: http://localhost:5000"
print_info "前端APP: http://localhost:3000"
echo ""
print_info "按 Ctrl+C 停止所有服务"
echo ""
echo "=========================================="
echo ""

# 启动前端开发服务器（前台运行）
print_info "启动前端开发服务器..."
npm run dev


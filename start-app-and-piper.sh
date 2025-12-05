#!/bin/bash
# 启动APP和Piper TTS服务的完整脚本
# 使用方法: ./start-app-and-piper.sh

# 不设置 set -e，因为我们需要处理一些可能失败的命令

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}=========================================="
echo -e "🚀 启动APP和Piper TTS服务"
echo -e "==========================================${NC}"

# 函数：检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}❌ 错误: 未找到命令 $1${NC}"
        return 1
    fi
    return 0
}

# 函数：检查端口是否被占用
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            return 0  # 端口被占用
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -an 2>/dev/null | grep -q ":$port.*LISTEN"; then
            return 0  # 端口被占用
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -tln 2>/dev/null | grep -q ":$port "; then
            return 0  # 端口被占用
        fi
    fi
    return 1  # 端口未被占用
}

# 函数：等待服务就绪
wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=0
    
    # 如果没有 curl，只等待固定时间
    if ! command -v curl &> /dev/null; then
        echo -e "${YELLOW}⏳ 等待服务启动（5秒）...${NC}"
        sleep 5
        return 0
    fi
    
    echo -e "${YELLOW}⏳ 等待服务就绪: $url${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 服务已就绪: $url${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        if [ $((attempt % 5)) -eq 0 ]; then
            echo -e "${YELLOW}   尝试 $attempt/$max_attempts...${NC}"
        fi
        sleep 1
    done
    
    echo -e "${RED}❌ 服务启动超时: $url${NC}"
    return 1
}

# 函数：清理函数
cleanup() {
    echo -e "\n${YELLOW}正在清理资源...${NC}"
    
    # 终止Piper TTS进程
    if [ ! -z "$PIPER_PID" ] && kill -0 "$PIPER_PID" 2>/dev/null; then
        echo -e "${YELLOW}停止Piper TTS服务 (PID: $PIPER_PID)...${NC}"
        kill "$PIPER_PID" 2>/dev/null || true
        wait "$PIPER_PID" 2>/dev/null || true
    fi
    
    # 检查并清理端口占用
    if check_port 5000; then
        echo -e "${YELLOW}清理端口 5000...${NC}"
        lsof -ti :5000 | xargs kill -9 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 设置退出时的清理
trap cleanup EXIT INT TERM

# 检查必要的命令
echo -e "${BLUE}📋 检查依赖...${NC}"
if ! check_command "node"; then
    echo -e "${RED}请先安装 Node.js${NC}"
    exit 1
fi
if ! check_command "npm"; then
    echo -e "${RED}请先安装 npm${NC}"
    exit 1
fi
if ! check_command "python3"; then
    echo -e "${RED}请先安装 Python3${NC}"
    exit 1
fi
if ! check_command "curl"; then
    echo -e "${YELLOW}⚠️  警告: 未找到 curl，将跳过服务健康检查${NC}"
fi

# 检查虚拟环境
if [ ! -d "venv-piper" ]; then
    echo -e "${RED}❌ 错误: 未找到虚拟环境 venv-piper${NC}"
    echo -e "${YELLOW}💡 提示: 请先运行 ./scripts/setup-piper-tts.sh 设置Piper TTS${NC}"
    exit 1
fi

# 检查Piper TTS服务器脚本
if [ ! -f "scripts/piper-tts-server.py" ]; then
    echo -e "${RED}❌ 错误: 未找到Piper TTS服务器脚本 scripts/piper-tts-server.py${NC}"
    exit 1
fi

# 检查Piper TTS端口（5000）
if check_port 5000; then
    echo -e "${YELLOW}⚠️  警告: 端口 5000 已被占用，Piper TTS服务可能已在运行${NC}"
    echo -e "${YELLOW}💡 提示: 如果服务已运行，将跳过启动Piper TTS${NC}"
    PIPER_RUNNING=true
else
    echo -e "${BLUE}📢 启动Piper TTS服务（端口5000）...${NC}"
    
    # 激活虚拟环境并启动Piper TTS服务（后台运行）
    source venv-piper/bin/activate
    python3 scripts/piper-tts-server.py > /tmp/piper-tts.log 2>&1 &
    PIPER_PID=$!
    
    echo -e "${GREEN}✅ Piper TTS服务已启动（PID: $PIPER_PID）${NC}"
    echo -e "${BLUE}📄 日志文件: /tmp/piper-tts.log${NC}"
    
    # 等待Piper TTS服务就绪
    if ! wait_for_service "http://localhost:5000/health"; then
        echo -e "${RED}❌ Piper TTS服务启动失败，请查看日志: /tmp/piper-tts.log${NC}"
        exit 1
    fi
    
    PIPER_RUNNING=false
fi

# 检查开发服务器端口（3000）
if check_port 3000; then
    echo -e "${YELLOW}⚠️  警告: 端口 3000 已被占用，开发服务器可能已在运行${NC}"
    echo -e "${YELLOW}💡 提示: 如果服务器已运行，请在浏览器中访问 http://localhost:3000${NC}"
else
    echo -e "${BLUE}🌐 启动开发服务器（端口3000）...${NC}"
    echo -e "${GREEN}✅ 所有服务已启动！${NC}"
    echo -e "${BLUE}📖 访问地址: http://localhost:3000${NC}"
    echo -e "${BLUE}📊 Piper TTS状态: http://localhost:5000/health${NC}"
    echo -e "${YELLOW}💡 提示: 按 Ctrl+C 停止所有服务${NC}"
    echo ""
    
    # 启动开发服务器（前台运行，这样可以看到输出和交互）
    npm run dev
fi


#!/bin/bash
# MeloTTS 服务状态检查脚本

echo "=========================================="
echo "🔍 MeloTTS 服务状态检查"
echo "=========================================="
echo ""

# 1. 检查 screen 会话
echo "📺 Screen 会话状态："
screen -ls | grep melo || echo "   ❌ 未找到 melo screen 会话"
echo ""

# 2. 检查进程
echo "🔄 进程状态："
if ps aux | grep -v grep | grep melo-multilang > /dev/null; then
    ps aux | grep -v grep | grep melo-multilang | awk '{print "   ✅ PID:", $2, "CPU:", $3"%", "MEM:", $4"%"}'
else
    echo "   ❌ MeloTTS 进程未运行"
fi
echo ""

# 3. 检查端口
echo "🌐 端口状态："
if lsof -i :7860 > /dev/null 2>&1; then
    lsof -i :7860 | tail -n +2 | awk '{print "   ✅ 端口 7860:", $1, "PID:", $2}'
else
    echo "   ❌ 端口 7860 未被监听"
fi
echo ""

# 4. 健康检查
echo "💊 健康检查："
if curl -s http://localhost:7860/health > /dev/null 2>&1; then
    HEALTH=$(curl -s http://localhost:7860/health)
    echo "   ✅ 服务响应正常"
    echo "   📄 返回: $HEALTH"
else
    echo "   ❌ 服务无响应"
fi
echo ""

# 5. 日志文件
echo "📋 最近日志（最后 5 行）："
if [ -f ~/melotts/MeloTTS/server.log ]; then
    tail -n 5 ~/melotts/MeloTTS/server.log | sed 's/^/   /'
else
    echo "   ⚠️  日志文件不存在"
fi
echo ""

echo "=========================================="
echo "✅ 检查完成"
echo "=========================================="


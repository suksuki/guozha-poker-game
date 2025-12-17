#!/bin/bash

echo "=== 测试语音引擎 ==="
echo ""

# 检查espeak
echo "1. 检查espeak..."
if command -v espeak &> /dev/null; then
    echo "   ✅ espeak已安装"
    espeak --version | head -1 | sed 's/^/   /'
    
    echo ""
    echo "   测试espeak中文语音（应该听到'测试'）..."
    espeak -v zh "测试" 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ espeak可以工作"
    else
        echo "   ⚠️  espeak测试失败"
    fi
else
    echo "   ❌ espeak未安装"
    echo "   请运行: ./install-voice-packages.sh"
fi

echo ""
echo "2. 检查speech-dispatcher..."
if pgrep -x speech-dispatcher > /dev/null; then
    echo "   ✅ speech-dispatcher正在运行 (PID: $(pgrep -x speech-dispatcher))"
elif systemctl --user is-active --quiet speech-dispatcher 2>/dev/null; then
    echo "   ✅ speech-dispatcher正在运行（用户服务）"
else
    echo "   ⚠️  speech-dispatcher未运行"
    echo "   尝试启动..."
    speech-dispatcher -d 2>/dev/null && echo "   ✅ 已启动" || echo "   ❌ 启动失败"
fi

echo ""
echo "3. 检查语音包..."
if dpkg -l | grep -q "espeak-data-zh"; then
    echo "   ✅ 中文语音包已安装"
else
    echo "   ⚠️  中文语音包未安装"
    echo "   请运行: sudo apt-get install espeak-data-zh"
fi

echo ""
echo "=== 测试完成 ==="
echo ""
echo "如果espeak可以工作但Electron中仍然没有语音，请："
echo "1. 确保speech-dispatcher正在运行"
echo "2. 重启Electron应用"
echo "3. 在开发者工具控制台运行："
echo "   const voices = window.speechSynthesis.getVoices();"
echo "   console.log('可用语音:', voices.length);"


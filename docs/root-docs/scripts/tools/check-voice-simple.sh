#!/bin/bash

echo "=== 检查语音引擎状态 ==="
echo ""

# 检查espeak
if command -v espeak >/dev/null 2>&1; then
    echo "✅ espeak已安装"
    espeak --version 2>/dev/null | head -1
else
    echo "❌ espeak未安装"
fi

echo ""

# 检查speech-dispatcher进程
if pgrep -x speech-dispatcher >/dev/null 2>&1; then
    echo "✅ speech-dispatcher正在运行"
elif systemctl --user is-active --quiet speech-dispatcher 2>/dev/null; then
    echo "✅ speech-dispatcher正在运行（用户服务）"
else
    echo "❌ speech-dispatcher未运行"
fi

echo ""

# 检查中文语音包
if dpkg -l 2>/dev/null | grep -q "espeak-data-zh"; then
    echo "✅ 中文语音包已安装"
else
    echo "❌ 中文语音包未安装"
fi

echo ""
echo "=== 检查完成 ==="
echo ""
echo "如果espeak未安装，请运行："
echo "  sudo apt-get install -y speech-dispatcher espeak espeak-data espeak-data-zh"
echo ""
echo "如果speech-dispatcher未运行，请运行："
echo "  speech-dispatcher -d"
echo ""


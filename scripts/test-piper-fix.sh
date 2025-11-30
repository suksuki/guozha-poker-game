#!/bin/bash
# 测试修复后的Piper TTS服务

echo "=========================================="
echo "测试修复后的Piper TTS服务"
echo "=========================================="

# 检查服务是否运行
if ! curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "❌ 服务未运行"
    echo "💡 请先启动服务:"
    echo "   source venv-piper/bin/activate"
    echo "   python scripts/piper-tts-server.py"
    exit 1
fi

echo "✅ 服务正在运行"
echo ""
echo "测试TTS合成..."
curl -X POST http://localhost:5000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好，这是测试"}' \
  --output test-piper-fixed.wav \
  --silent --show-error

if [ -f test-piper-fixed.wav ] && [ -s test-piper-fixed.wav ]; then
    file_type=$(file test-piper-fixed.wav | cut -d: -f2)
    if echo "$file_type" | grep -q "WAVE\|Audio\|audio"; then
        echo "✅ TTS合成成功！"
        echo "   文件: test-piper-fixed.wav"
        echo "   大小: $(ls -lh test-piper-fixed.wav | awk '{print $5}')"
        echo "   类型: $file_type"
        echo ""
        echo "💡 可以在Windows中播放这个文件测试音质"
    else
        echo "❌ 返回的不是音频文件"
        echo "   类型: $file_type"
        head -c 200 test-piper-fixed.wav
        echo ""
        exit 1
    fi
else
    echo "❌ TTS合成失败"
    exit 1
fi


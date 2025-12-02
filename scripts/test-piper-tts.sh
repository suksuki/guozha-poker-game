#!/bin/bash
# 测试Piper TTS服务

echo "=========================================="
echo "测试Piper TTS服务"
echo "=========================================="

# 检查服务是否运行
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ 服务正在运行"
    curl -s http://localhost:5000/health | python3 -m json.tool
else
    echo "❌ 服务未运行"
    echo "💡 请先启动服务:"
    echo "   source venv-piper/bin/activate"
    echo "   python scripts/piper-tts-server.py"
    exit 1
fi

echo ""
echo "测试TTS合成..."
curl -X POST http://localhost:5000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好，这是测试"}' \
  --output test-piper.wav

if [ -f test-piper.wav ] && [ -s test-piper.wav ]; then
    echo "✅ TTS合成成功！"
    echo "   文件: test-piper.wav"
    echo "   大小: $(ls -lh test-piper.wav | awk '{print $5}')"
    echo ""
    echo "💡 可以在Windows中播放这个文件测试音质"
else
    echo "❌ TTS合成失败"
    exit 1
fi


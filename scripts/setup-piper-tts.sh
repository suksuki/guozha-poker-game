#!/bin/bash
# Piper TTS 安装脚本
# 解决虚拟环境和模型下载问题

set -e

echo "=========================================="
echo "Piper TTS 安装脚本"
echo "=========================================="

# 1. 创建虚拟环境
echo ""
echo "📦 步骤1: 创建Python虚拟环境..."
if [ ! -d "venv-piper" ]; then
    python3 -m venv venv-piper
    echo "✅ 虚拟环境已创建: venv-piper"
else
    echo "✅ 虚拟环境已存在: venv-piper"
fi

# 2. 激活虚拟环境并安装依赖
echo ""
echo "📦 步骤2: 安装Python依赖..."
source venv-piper/bin/activate
pip install --upgrade pip
pip install flask flask-cors

# 3. 检查piper-tts包
echo ""
echo "📦 步骤3: 检查piper-tts包..."
if ! pip show piper-tts > /dev/null 2>&1; then
    echo "⚠️  piper-tts包未安装，尝试安装..."
    pip install piper-tts || {
        echo "❌ piper-tts包安装失败"
        echo "💡 提示: piper-tts可能需要从源码安装，或者使用预编译版本"
        echo "💡 我们将使用替代方案：直接使用piper命令行工具"
    }
else
    echo "✅ piper-tts包已安装"
fi

# 4. 创建模型目录
echo ""
echo "📦 步骤4: 创建模型目录..."
mkdir -p tts-services/models
cd tts-services/models

# 5. 下载模型（尝试多个URL）
echo ""
echo "📦 步骤5: 下载中文模型..."

# 尝试多个可能的模型URL
MODEL_URLS=(
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyan/medium/xiaoyan-medium.onnx"
    "https://github.com/rhasspy/piper/releases/download/v1.2.0/zh_CN-xiaoyan-medium.onnx"
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyi/medium/xiaoyi-medium.onnx"
)

JSON_URLS=(
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyan/medium/xiaoyan-medium.onnx.json"
    "https://github.com/rhasspy/piper/releases/download/v1.2.0/zh_CN-xiaoyan-medium.onnx.json"
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyi/medium/xiaoyi-medium.onnx.json"
)

MODEL_NAME="xiaoyan-medium.onnx"
JSON_NAME="xiaoyan-medium.onnx.json"

# 下载模型文件
if [ ! -f "$MODEL_NAME" ]; then
    echo "正在下载模型文件..."
    for url in "${MODEL_URLS[@]}"; do
        echo "尝试: $url"
        if wget -q --spider "$url" 2>/dev/null; then
            wget "$url" -O "$MODEL_NAME" && echo "✅ 模型下载成功" && break
        fi
    done
    
    if [ ! -f "$MODEL_NAME" ]; then
        echo "❌ 模型下载失败，尝试手动下载..."
        echo "💡 请访问以下链接手动下载："
        echo "   https://huggingface.co/rhasspy/piper-voices/tree/main/zh/zh_CN"
        echo "   或使用 piper 命令行工具下载："
        echo "   piper download --model zh_CN-xiaoyan-medium"
    fi
else
    echo "✅ 模型文件已存在: $MODEL_NAME"
fi

# 下载JSON配置文件
if [ ! -f "$JSON_NAME" ]; then
    echo "正在下载JSON配置文件..."
    for url in "${JSON_URLS[@]}"; do
        echo "尝试: $url"
        if wget -q --spider "$url" 2>/dev/null; then
            wget "$url" -O "$JSON_NAME" && echo "✅ JSON配置下载成功" && break
        fi
    done
    
    if [ ! -f "$JSON_NAME" ]; then
        echo "⚠️  JSON配置文件下载失败（可选，不影响使用）"
    fi
else
    echo "✅ JSON配置文件已存在: $JSON_NAME"
fi

cd ../..

# 6. 检查piper命令行工具
echo ""
echo "📦 步骤6: 检查piper命令行工具..."
if command -v piper > /dev/null 2>&1; then
    echo "✅ piper命令行工具已安装"
    echo "   版本: $(piper --version 2>/dev/null || echo '未知')"
elif [ -f "tts-services/piper/piper" ] || [ -f "tts-services/piper/piper.exe" ]; then
    echo "✅ 找到本地piper可执行文件"
else
    echo "⚠️  piper命令行工具未安装"
    echo "💡 提示: 可以使用Python服务脚本，不需要piper命令行工具"
fi

# 7. 创建启动脚本
echo ""
echo "📦 步骤7: 创建启动脚本..."
cat > start-piper-tts.sh << 'EOF'
#!/bin/bash
# 启动Piper TTS服务

source venv-piper/bin/activate
python scripts/piper-tts-server.py
EOF
chmod +x start-piper-tts.sh
echo "✅ 启动脚本已创建: start-piper-tts.sh"

# 8. 总结
echo ""
echo "=========================================="
echo "✅ 安装完成！"
echo "=========================================="
echo ""
echo "📝 下一步："
echo "   1. 启动服务: ./start-piper-tts.sh"
echo "   或: source venv-piper/bin/activate && python scripts/piper-tts-server.py"
echo ""
echo "   2. 测试服务:"
echo "      curl -X POST http://localhost:5000/api/tts \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"text\":\"你好，这是测试\"}' \\"
echo "        --output test.wav"
echo ""
echo "   3. 在游戏中使用:"
echo "      在浏览器控制台运行:"
echo "      await window.checkLocalTTS.printStatus();"
echo "      const { setTTSProvider } = await import('./services/multiChannelVoiceService');"
echo "      setTTSProvider('piper');"
echo ""
echo "💡 如果模型下载失败，可以："
echo "   1. 手动访问 https://huggingface.co/rhasspy/piper-voices/tree/main/zh/zh_CN"
echo "   2. 下载 xiaoyan-medium.onnx 和 xiaoyan-medium.onnx.json"
echo "   3. 放到 tts-services/models/ 目录"
echo ""


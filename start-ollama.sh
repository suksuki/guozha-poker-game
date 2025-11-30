#!/bin/bash
# 启动 Ollama LLM 服务脚本

echo "🚀 检查并启动 Ollama LLM 服务..."

# 检查 Ollama 是否已安装
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama 未安装，正在安装..."
    curl -fsSL https://ollama.com/install.sh | sh
    if [ $? -ne 0 ]; then
        echo "❌ Ollama 安装失败，请手动安装："
        echo "   curl -fsSL https://ollama.com/install.sh | sh"
        exit 1
    fi
    echo "✅ Ollama 安装成功！"
else
    echo "✅ Ollama 已安装"
fi

# 检查 Ollama 服务是否运行
echo "🔍 检查 Ollama 服务状态..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama 服务正在运行"
else
    echo "⚠️  Ollama 服务未运行，正在启动..."
    # 尝试启动服务（后台运行）
    ollama serve > /dev/null 2>&1 &
    sleep 3
    
    # 再次检查
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama 服务启动成功"
    else
        echo "❌ Ollama 服务启动失败，请手动启动："
        echo "   ollama serve"
        exit 1
    fi
fi

# 检查默认模型是否存在
echo "🔍 检查模型 qwen2:0.5b..."
if ollama list 2>/dev/null | grep -q "qwen2:0.5b"; then
    echo "✅ 模型 qwen2:0.5b 已存在"
else
    echo "📥 模型 qwen2:0.5b 不存在，正在下载..."
    echo "   这可能需要几分钟，请耐心等待..."
    ollama pull qwen2:0.5b
    if [ $? -eq 0 ]; then
        echo "✅ 模型下载成功"
    else
        echo "⚠️  模型下载失败，但可以继续使用其他模型"
    fi
fi

# 显示模型列表
echo ""
echo "📋 可用的模型列表："
ollama list

echo ""
echo "✅ Ollama LLM 服务已就绪！"
echo "   API 地址: http://localhost:11434/api/chat"
echo "   默认模型: qwen2:0.5b"
echo ""
echo "💡 提示："
echo "   - 在游戏配置面板中可以查看和选择模型"
echo "   - 如果遇到问题，请查看 docs/setup/start-ollama.md"


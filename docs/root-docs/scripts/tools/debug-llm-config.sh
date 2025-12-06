#!/bin/bash
echo "========================================"
echo "🔍 调试 LLM 配置"
echo "========================================"
echo ""

# 1. 检查服务器上的可用模型
echo "1️⃣ 192.168.0.13 上的可用模型:"
curl -s http://192.168.0.13:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4
echo ""

# 2. 测试每个模型
echo "2️⃣ 测试每个模型的聊天功能:"
for model in $(curl -s http://192.168.0.13:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4); do
    echo "   测试: $model"
    response=$(curl -s -X POST http://192.168.0.13:11434/api/chat \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"stream\":false}" 2>&1)
    
    if echo "$response" | grep -q "error"; then
        echo "      ❌ 不支持聊天: $(echo "$response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)"
    elif echo "$response" | grep -q "message"; then
        echo "      ✅ 支持聊天"
    else
        echo "      ⚠️  未知响应"
    fi
done
echo ""

echo "3️⃣ 推荐使用的聊天模型:"
for model in $(curl -s http://192.168.0.13:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4); do
    if echo "$model" | grep -qE "qwen|chat|deepseek|llama"; then
        echo "   ✅ $model"
    fi
done
echo ""
echo "========================================"


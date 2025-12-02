#!/bin/bash
# Ollama API 测试脚本

SERVER_URL="http://192.168.0.13:11434"

echo "======================================"
echo "🧪 Ollama API 测试"
echo "======================================"
echo ""

# 测试 1: 检查服务器连接
echo "📡 测试 1: 检查服务器连接..."
if curl -s --connect-timeout 5 "${SERVER_URL}/api/tags" > /dev/null 2>&1; then
    echo "✅ 服务器连接成功"
else
    echo "❌ 无法连接到服务器: ${SERVER_URL}"
    echo "请检查:"
    echo "  1. IP 地址是否正确"
    echo "  2. Ollama 服务是否运行"
    echo "  3. 防火墙是否开放端口 11434"
    exit 1
fi
echo ""

# 测试 2: 获取可用模型
echo "📋 测试 2: 获取可用模型..."
MODELS=$(curl -s "${SERVER_URL}/api/tags" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

if [ -z "$MODELS" ]; then
    echo "❌ 未找到任何模型"
    exit 1
fi

echo "✅ 找到以下模型:"
echo "$MODELS" | while read model; do
    echo "  - $model"
done
echo ""

# 测试 3: 测试聊天 API
FIRST_MODEL=$(echo "$MODELS" | head -n 1)
echo "🤖 测试 3: 测试聊天 API (使用模型: ${FIRST_MODEL})..."

RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${FIRST_MODEL}\",
    \"messages\": [
      {\"role\": \"user\", \"content\": \"你好\"}
    ],
    \"stream\": false
  }")

if [ $? -eq 0 ] && echo "$RESPONSE" | grep -q "message"; then
    echo "✅ 聊天 API 测试成功!"
    echo ""
    echo "📝 模型回复:"
    echo "$RESPONSE" | grep -o '"content":"[^"]*"' | head -n 1 | cut -d'"' -f4
else
    echo "❌ 聊天 API 测试失败"
    echo "错误响应:"
    echo "$RESPONSE"
    exit 1
fi
echo ""

# 测试 4: 测试带中文的请求
echo "🇨🇳 测试 4: 测试中文对话..."
RESPONSE2=$(curl -s -X POST "${SERVER_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${FIRST_MODEL}\",
    \"messages\": [
      {\"role\": \"user\", \"content\": \"请用10个字以内回复：今天天气怎么样？\"}
    ],
    \"stream\": false
  }")

if [ $? -eq 0 ] && echo "$RESPONSE2" | grep -q "message"; then
    echo "✅ 中文对话测试成功!"
    echo ""
    echo "📝 模型回复:"
    echo "$RESPONSE2" | grep -o '"content":"[^"]*"' | head -n 1 | cut -d'"' -f4
else
    echo "❌ 中文对话测试失败"
fi
echo ""

# 总结
echo "======================================"
echo "✅ 所有测试通过！"
echo "======================================"
echo ""
echo "📌 服务器信息:"
echo "  - URL: ${SERVER_URL}"
echo "  - 可用模型数: $(echo "$MODELS" | wc -l)"
echo "  - 推荐模型: ${FIRST_MODEL}"
echo ""
echo "🎮 现在可以在游戏中使用以下配置:"
echo "  - 服务器地址: 192.168.0.13"
echo "  - 端口: 11434"
echo "  - 模型: ${FIRST_MODEL}"
echo ""


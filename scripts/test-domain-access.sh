#!/bin/bash
# 测试域名访问脚本

echo "================================"
echo "🧪 测试域名访问"
echo "================================"
echo ""

# 测试 DNS 解析
echo "📡 1. 测试 DNS 解析..."
echo "-------------------"
for domain in tts.dblife.com ollama.dblife.com api.dblife.com; do
    echo -n "$domain: "
    IP=$(nslookup $domain 2>/dev/null | grep -A1 "Name:" | grep "Address:" | awk '{print $2}' | head -1)
    if [ -n "$IP" ]; then
        echo "✅ $IP"
    else
        echo "❌ 解析失败"
    fi
done

echo ""
echo "🔍 2. 测试本地服务..."
echo "-------------------"

# 测试 MeLo TTS
echo -n "MeLo TTS (localhost:7860): "
if curl -s http://localhost:7860/health > /dev/null 2>&1; then
    echo "✅ 运行中"
else
    echo "❌ 未运行"
fi

# 测试 Ollama
echo -n "Ollama (localhost:11434): "
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ 运行中"
else
    echo "❌ 未运行"
fi

# 测试 Nginx
echo -n "Nginx: "
if systemctl is-active --quiet nginx; then
    echo "✅ 运行中"
else
    echo "❌ 未运行"
fi

echo ""
echo "🌐 3. 测试域名访问..."
echo "-------------------"

# 测试 TTS 域名
echo -n "tts.dblife.com: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://tts.dblife.com/health 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 可访问 (HTTP $HTTP_CODE)"
elif [ -n "$HTTP_CODE" ]; then
    echo "⚠️  HTTP $HTTP_CODE"
else
    echo "❌ 无法访问（可能是 DNS 未生效或端口转发未配置）"
fi

# 测试 Ollama 域名
echo -n "ollama.dblife.com: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://ollama.dblife.com/api/tags 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 可访问 (HTTP $HTTP_CODE)"
elif [ -n "$HTTP_CODE" ]; then
    echo "⚠️  HTTP $HTTP_CODE"
else
    echo "❌ 无法访问（可能是 DNS 未生效或端口转发未配置）"
fi

# 测试统一 API
echo -n "api.dblife.com: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://api.dblife.com/health 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 可访问 (HTTP $HTTP_CODE)"
elif [ -n "$HTTP_CODE" ]; then
    echo "⚠️  HTTP $HTTP_CODE"
else
    echo "❌ 无法访问（可能是 DNS 未生效或端口转发未配置）"
fi

echo ""
echo "🔊 4. 测试 TTS 功能..."
echo "-------------------"
echo "正在合成测试音频..."
if curl -X POST http://tts.dblife.com/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "域名访问测试成功", "lang": "ZH"}' \
  --output /tmp/test-domain.wav 2>/dev/null; then
    SIZE=$(ls -lh /tmp/test-domain.wav 2>/dev/null | awk '{print $5}')
    echo "✅ TTS 功能正常，生成文件: /tmp/test-domain.wav ($SIZE)"
else
    echo "❌ TTS 功能测试失败"
fi

echo ""
echo "🤖 5. 测试 Ollama 对话..."
echo "-------------------"
echo "正在测试对话功能..."
RESPONSE=$(curl -s -X POST http://ollama.dblife.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2:0.5b",
    "messages": [{"role": "user", "content": "你好，说一句话测试一下"}],
    "stream": false
  }' 2>/dev/null)

if [ -n "$RESPONSE" ] && echo "$RESPONSE" | grep -q "message"; then
    echo "✅ Ollama 对话功能正常"
    echo "   回复: $(echo $RESPONSE | jq -r '.message.content' 2>/dev/null || echo '无法解析')"
else
    echo "❌ Ollama 对话功能测试失败"
fi

echo ""
echo "================================"
echo "📊 测试摘要"
echo "================================"
echo ""
echo "如果域名访问失败，请检查："
echo "1. DNS 是否已生效（可能需要等待几分钟到几小时）"
echo "2. 路由器端口转发是否配置正确"
echo "3. 防火墙是否允许相应端口"
echo ""
echo "查看详细日志："
echo "  sudo tail -f /var/log/nginx/tts-error.log"
echo "  sudo tail -f /var/log/nginx/ollama-error.log"
echo "  sudo journalctl -u ollama -f"
echo ""


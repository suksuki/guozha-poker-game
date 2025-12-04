#!/bin/bash
# 直接使用公网IP访问配置脚本（无需域名）
# 在 192.168.0.13 服务器上运行

set -e

echo "================================"
echo "🚀 配置公网IP直接访问"
echo "================================"
echo ""

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

# 1. 获取公网IP
echo "📡 步骤 1/4: 检测公网IP..."
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "无法自动检测")
if [ "$PUBLIC_IP" != "无法自动检测" ]; then
    echo "✅ 检测到公网IP: $PUBLIC_IP"
else
    echo "⚠️  无法自动检测公网IP，请手动查看路由器WAN IP"
fi

# 2. 配置 Ollama
echo ""
echo "🤖 步骤 2/4: 配置 Ollama 服务..."
OLLAMA_USER=$(logname 2>/dev/null || echo $SUDO_USER)
cat > /etc/systemd/system/ollama.service << EOF
[Unit]
Description=Ollama LLM Service
After=network.target

[Service]
Type=simple
User=$OLLAMA_USER
Environment="OLLAMA_HOST=0.0.0.0:11434"
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ollama
systemctl restart ollama

# 3. 配置防火墙
echo ""
echo "🔥 步骤 3/4: 配置防火墙..."
ufw allow 7860/tcp comment "MeLo TTS" 2>/dev/null || true
ufw allow 11434/tcp comment "Ollama" 2>/dev/null || true

echo "✅ 防火墙规则已添加"

# 4. 验证服务
echo ""
echo "✅ 步骤 4/4: 验证服务..."
sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 服务状态检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查 Ollama
if systemctl is-active --quiet ollama; then
    echo "✅ Ollama: 运行中 (端口 11434)"
    if ss -tlnp | grep -q ":11434.*0.0.0.0"; then
        echo "   ✅ 正确监听 0.0.0.0:11434"
    else
        echo "   ⚠️  监听地址可能不正确"
    fi
else
    echo "❌ Ollama: 未运行"
fi

# 检查 MeLo TTS
if curl -s http://localhost:7860/health > /dev/null 2>&1; then
    echo "✅ MeLo TTS: 运行中 (端口 7860)"
else
    echo "⚠️  MeLo TTS: 未运行（需要手动启动）"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 配置完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$PUBLIC_IP" != "无法自动检测" ]; then
    echo "📍 你的公网IP: $PUBLIC_IP"
    echo ""
    echo "🌐 外网访问地址："
    echo "   MeLo TTS:  http://$PUBLIC_IP:7860"
    echo "   Ollama:    http://$PUBLIC_IP:11434"
    echo ""
fi

echo "📋 下一步操作："
echo ""
echo "1️⃣  如果 MeLo TTS 未运行，手动启动："
echo "   cd ~/melotts/MeloTTS"
echo "   nohup python3 start-melo-tts-server.py > ~/melotts.log 2>&1 &"
echo ""
echo "2️⃣  配置路由器端口转发："
echo "   登录路由器 (通常是 http://192.168.0.1)"
echo "   添加端口转发规则："
echo ""
echo "   外部端口    内部IP          内部端口"
echo "   7860   →   192.168.0.13   →   7860"
echo "   11434  →   192.168.0.13   →   11434"
echo ""
echo "3️⃣  从外网测试访问："
echo "   curl http://你的公网IP:7860/health"
echo "   curl http://你的公网IP:11434/api/tags"
echo ""
echo "💡 提示："
echo "   - 如果不知道公网IP，运行: curl ifconfig.me"
echo "   - 或者登录路由器查看 WAN IP 地址"
echo ""


#!/bin/bash
# 检查公网IP和网络配置

echo "================================"
echo "🔍 检查网络配置和公网IP"
echo "================================"
echo ""

# 方法1: ifconfig.me
echo "📡 方法1: ifconfig.me"
IP1=$(curl -s --max-time 5 ifconfig.me 2>/dev/null)
if [ -n "$IP1" ]; then
    echo "   IP: $IP1"
else
    echo "   ❌ 无法获取"
fi

# 方法2: ipinfo.io
echo ""
echo "📡 方法2: ipinfo.io"
IP2=$(curl -s --max-time 5 ipinfo.io/ip 2>/dev/null)
if [ -n "$IP2" ]; then
    echo "   IP: $IP2"
else
    echo "❌ 无法获取"
fi

# 方法3: ip.sb
echo ""
echo "📡 方法3: ip.sb"
IP3=$(curl -s --max-time 5 https://api.ip.sb/ip 2>/dev/null)
if [ -n "$IP3" ]; then
    echo "   IP: $IP3"
else
    echo "   ❌ 无法获取"
fi

# 方法4: ipify
echo ""
echo "📡 方法4: ipify"
IP4=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null)
if [ -n "$IP4" ]; then
    echo "   IP: $IP4"
else
    echo "   ❌ 无法获取"
fi

echo ""
echo "================================"

# 确定最终IP
PUBLIC_IP=""
if [ -n "$IP1" ]; then
    PUBLIC_IP="$IP1"
elif [ -n "$IP2" ]; then
    PUBLIC_IP="$IP2"
elif [ -n "$IP3" ]; then
    PUBLIC_IP="$IP3"
elif [ -n "$IP4" ]; then
    PUBLIC_IP="$IP4"
fi

if [ -n "$PUBLIC_IP" ]; then
    echo "✅ 你的公网IP: $PUBLIC_IP"
    echo ""
    echo "📋 IP信息："
    curl -s ipinfo.io/$PUBLIC_IP 2>/dev/null | grep -E '"ip"|"city"|"region"|"country"|"org"' || echo "无法获取详细信息"
else
    echo "❌ 无法检测公网IP"
    echo ""
    echo "💡 可能的原因："
    echo "   1. 服务器没有外网访问权限"
    echo "   2. 防火墙阻止了出站连接"
    echo "   3. 网络连接问题"
    echo ""
    echo "🔧 手动查看公网IP的方法："
    echo "   1. 登录路由器管理界面 (通常是 http://192.168.0.1)"
    echo "   2. 查看 WAN 口的 IP 地址"
    echo "   3. 如果是 10.x.x.x 或 100.x.x.x，则不是真正的公网IP"
fi

echo ""
echo "================================"
echo "🔍 本机网络信息"
echo "================================"

# 内网IP
echo ""
echo "📍 内网IP地址："
ip addr show | grep "inet " | grep -v "127.0.0.1" | awk '{print "   " $2}' || ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print "   " $2}'

# 监听端口
echo ""
echo "👂 正在监听的服务端口："
ss -tlnp 2>/dev/null | grep -E "7860|11434" | awk '{print "   " $1 " " $4}' || netstat -tlnp 2>/dev/null | grep -E "7860|11434" | awk '{print "   " $1 " " $4}'

# 防火墙状态
echo ""
echo "🔥 防火墙状态："
if command -v ufw &> /dev/null; then
    ufw status 2>/dev/null | grep -E "7860|11434|Status" | sed 's/^/   /' || echo "   无法查看"
else
    echo "   UFW 未安装"
fi

echo ""
echo "================================"
echo "📝 下一步操作"
echo "================================"
echo ""

if [ -n "$PUBLIC_IP" ]; then
    echo "✅ 已检测到公网IP: $PUBLIC_IP"
    echo ""
    echo "🔗 外网访问地址："
    echo "   MeLo TTS:  http://$PUBLIC_IP:7860"
    echo "   Ollama:    http://$PUBLIC_IP:11434"
    echo ""
    echo "⚠️  注意：需要在路由器配置端口转发才能从外网访问！"
else
    echo "需要手动查看路由器 WAN IP"
fi

echo ""


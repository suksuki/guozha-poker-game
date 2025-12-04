#!/bin/bash
# 一键配置域名访问脚本
# 在 192.168.0.13 服务器上运行

set -e

echo "================================"
echo "🚀 配置域名访问到本服务器"
echo "================================"
echo ""

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

# 1. 安装 Nginx
echo "📦 步骤 1/6: 安装 Nginx..."
apt update -qq
apt install -y nginx

# 2. 创建 Nginx 配置
echo "⚙️  步骤 2/6: 配置 Nginx..."
cat > /etc/nginx/sites-available/poker-services << 'EOF'
# MeLo TTS 服务
server {
    listen 80;
    server_name tts.dblife.com;

    access_log /var/log/nginx/tts-access.log;
    error_log /var/log/nginx/tts-error.log;

    location / {
        proxy_pass http://127.0.0.1:7860;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Ollama 服务
server {
    listen 80;
    server_name ollama.dblife.com;

    access_log /var/log/nginx/ollama-access.log;
    error_log /var/log/nginx/ollama-error.log;

    location / {
        proxy_pass http://127.0.0.1:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        chunked_transfer_encoding on;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}

# 统一 API 入口
server {
    listen 80;
    server_name api.dblife.com;

    access_log /var/log/nginx/api-access.log;
    error_log /var/log/nginx/api-error.log;

    location /tts/ {
        proxy_pass http://127.0.0.1:7860/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ollama/ {
        proxy_pass http://127.0.0.1:11434/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
        proxy_http_version 1.1;
    }

    location /health {
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
EOF

# 启用配置
ln -sf /etc/nginx/sites-available/poker-services /etc/nginx/sites-enabled/

# 3. 配置防火墙
echo "🔥 步骤 3/6: 配置防火墙..."
ufw allow 80/tcp comment "HTTP" 2>/dev/null || true
ufw allow 443/tcp comment "HTTPS" 2>/dev/null || true
ufw allow 7860/tcp comment "MeLo TTS" 2>/dev/null || true
ufw allow 11434/tcp comment "Ollama" 2>/dev/null || true

# 4. 配置 Ollama systemd 服务
echo "🤖 步骤 4/6: 配置 Ollama 服务..."
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

# 5. 启动服务
echo "▶️  步骤 5/6: 启动服务..."
systemctl daemon-reload
systemctl enable nginx
systemctl enable ollama
systemctl restart ollama
nginx -t && systemctl restart nginx

# 6. 验证服务
echo "✅ 步骤 6/6: 验证服务..."
sleep 3

echo ""
echo "检查服务状态："
echo "-------------------"

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx: 运行中"
else
    echo "❌ Nginx: 未运行"
fi

if systemctl is-active --quiet ollama; then
    echo "✅ Ollama: 运行中"
else
    echo "❌ Ollama: 未运行"
fi

if curl -s http://localhost:7860/health > /dev/null 2>&1; then
    echo "✅ MeLo TTS: 运行中"
else
    echo "⚠️  MeLo TTS: 未运行（需要手动启动）"
fi

echo ""
echo "================================"
echo "🎉 配置完成！"
echo "================================"
echo ""
echo "📋 下一步操作："
echo ""
echo "1️⃣  如果 MeLo TTS 未运行，执行："
echo "   cd ~/melotts/MeloTTS"
echo "   nohup python3 start-melo-tts-server.py > ~/melotts.log 2>&1 &"
echo ""
echo "2️⃣  配置路由器端口转发："
echo "   外部端口 80  → 192.168.0.13:80"
echo "   外部端口 443 → 192.168.0.13:443"
echo ""
echo "3️⃣  等待 DNS 生效后测试："
echo "   curl http://tts.dblife.com/health"
echo "   curl http://ollama.dblife.com/api/tags"
echo ""
echo "4️⃣  配置 HTTPS 证书（推荐）："
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d tts.dblife.com -d ollama.dblife.com -d api.dblife.com"
echo ""
echo "📊 查看日志："
echo "   sudo tail -f /var/log/nginx/tts-access.log"
echo "   sudo journalctl -u ollama -f"
echo ""


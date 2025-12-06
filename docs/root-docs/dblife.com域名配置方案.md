# 🌐 使用 dblife.com 域名访问 0.13 服务器配置方案

## 📊 当前架构分析

```
互联网
   ↓
公网 IP (有域名 dblife.com)
   ↓
路由器/网关
   ↓
内网 192.168.0.13 (MeLo TTS + Ollama)
```

## 🎯 配置方案

根据你的公网IP所在位置，有两种配置方案：

---

## 方案一：公网IP在路由器上（最常见）

### 第 1 步：配置域名解析

登录域名服务商（阿里云、腾讯云、GoDaddy等），添加 DNS 解析记录：

```
类型    主机记录    记录值           TTL
A       tts        你的公网IP        600
A       ollama     你的公网IP        600
A       api        你的公网IP        600
```

**解析后的访问地址：**
- `tts.dblife.com` → MeLo TTS 服务
- `ollama.dblife.com` → Ollama 服务
- `api.dblife.com` → 统一API入口（推荐）

### 第 2 步：在 0.13 服务器上安装 Nginx

```bash
# SSH 登录到 192.168.0.13
ssh hlsystem@192.168.0.13

# 安装 Nginx
sudo apt update
sudo apt install nginx -y

# 创建配置文件
sudo nano /etc/nginx/sites-available/poker-services
```

### 第 3 步：配置 Nginx 反向代理

**创建配置文件：**

```nginx
# /etc/nginx/sites-available/poker-services

# MeLo TTS 服务
server {
    listen 80;
    server_name tts.dblife.com;

    # 日志
    access_log /var/log/nginx/tts-access.log;
    error_log /var/log/nginx/tts-error.log;

    location / {
        proxy_pass http://127.0.0.1:7860;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置（语音合成可能需要较长时间）
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Ollama 服务
server {
    listen 80;
    server_name ollama.dblife.com;

    # 日志
    access_log /var/log/nginx/ollama-access.log;
    error_log /var/log/nginx/ollama-error.log;

    location / {
        proxy_pass http://127.0.0.1:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Ollama 流式输出需要特殊配置
        proxy_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        chunked_transfer_encoding on;
        
        # 超时设置
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}

# 统一 API 入口（推荐）
server {
    listen 80;
    server_name api.dblife.com;

    # 日志
    access_log /var/log/nginx/api-access.log;
    error_log /var/log/nginx/api-error.log;

    # MeLo TTS
    location /tts/ {
        proxy_pass http://127.0.0.1:7860/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Ollama
    location /ollama/ {
        proxy_pass http://127.0.0.1:11434/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_http_version 1.1;
    }

    # 健康检查
    location /health {
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
```

**启用配置：**

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/poker-services /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx

# 确保 Nginx 开机自启
sudo systemctl enable nginx
```

### 第 4 步：配置路由器端口转发

登录路由器管理界面（通常是 http://192.168.0.1），配置端口转发：

| 服务名称 | 外部端口 | 内部IP | 内部端口 | 协议 |
|---------|---------|---------|---------|------|
| HTTP | 80 | 192.168.0.13 | 80 | TCP |
| HTTPS | 443 | 192.168.0.13 | 443 | TCP |

**或者使用更具体的端口（如果80端口已被占用）：**

| 服务名称 | 外部端口 | 内部IP | 内部端口 | 协议 |
|---------|---------|---------|---------|------|
| MeLo-TTS | 7860 | 192.168.0.13 | 7860 | TCP |
| Ollama | 11434 | 192.168.0.13 | 11434 | TCP |

### 第 5 步：确保 Ollama 绑定到正确地址

```bash
# 在 0.13 服务器上
# 停止当前 Ollama
pkill ollama

# 设置环境变量
export OLLAMA_HOST=0.0.0.0:11434

# 启动 Ollama
nohup ollama serve > ~/ollama.log 2>&1 &

# 或者创建 systemd 服务（推荐）
sudo tee /etc/systemd/system/ollama.service > /dev/null << 'EOF'
[Unit]
Description=Ollama LLM Service
After=network.target

[Service]
Type=simple
User=hlsystem
Environment="OLLAMA_HOST=0.0.0.0:11434"
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama
```

### 第 6 步：配置防火墙

```bash
# 在 0.13 服务器上开放端口
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"
sudo ufw allow 7860/tcp comment "MeLo TTS"
sudo ufw allow 11434/tcp comment "Ollama"

# 重载防火墙
sudo ufw reload

# 查看状态
sudo ufw status numbered
```

### 第 7 步：配置 HTTPS（SSL证书）

```bash
# 在 0.13 服务器上安装 certbot
sudo apt install certbot python3-certbot-nginx -y

# 为域名申请证书
sudo certbot --nginx -d tts.dblife.com -d ollama.dblife.com -d api.dblife.com

# 测试自动续期
sudo certbot renew --dry-run
```

Certbot 会自动修改 Nginx 配置，添加 HTTPS 支持。

---

## 方案二：公网IP在另一台服务器上

如果公网IP在另一台服务器（比如云服务器）上：

### 架构图

```
互联网
   ↓
公网服务器 (dblife.com)
   ↓ (通过内网或VPN)
0.13 服务器 (192.168.0.13)
```

### 在公网服务器上配置 Nginx

**场景A：0.13 可以通过内网访问**

```nginx
# 在公网服务器的 Nginx 配置

server {
    listen 80;
    server_name tts.dblife.com;

    location / {
        # 直接代理到内网地址
        proxy_pass http://192.168.0.13:7860;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name ollama.dblife.com;

    location / {
        proxy_pass http://192.168.0.13:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
    }
}
```

**场景B：需要通过 VPN 或隧道连接**

```bash
# 在 0.13 服务器上建立反向 SSH 隧道
# 将本地端口转发到公网服务器

ssh -fNR 17860:localhost:7860 user@公网服务器IP
ssh -fNR 11434:localhost:11434 user@公网服务器IP
```

然后在公网服务器的 Nginx 中代理到 localhost 的对应端口。

---

## ✅ 测试配置

### 1. 测试 DNS 解析

```bash
# 等待 DNS 生效（可能需要几分钟到几小时）
nslookup tts.dblife.com
nslookup ollama.dblife.com
nslookup api.dblife.com
```

### 2. 测试 HTTP 访问

```bash
# 测试 MeLo TTS
curl http://tts.dblife.com/health
# 或
curl http://api.dblife.com/tts/health

# 测试 TTS 功能
curl -X POST http://tts.dblife.com/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "域名访问测试成功", "lang": "ZH"}' \
  --output test-domain.wav
```

```bash
# 测试 Ollama
curl http://ollama.dblife.com/api/tags
# 或
curl http://api.dblife.com/ollama/api/tags

# 测试对话
curl -X POST http://ollama.dblife.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2:0.5b",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": false
  }'
```

### 3. 测试 HTTPS 访问（配置证书后）

```bash
curl https://tts.dblife.com/health
curl https://ollama.dblife.com/api/tags
```

---

## 🔒 安全配置（重要！）

### 1. 限制访问IP（可选）

如果只有特定IP需要访问，在 Nginx 配置中添加：

```nginx
server {
    listen 80;
    server_name tts.dblife.com;

    # 只允许特定 IP 访问
    allow 你的办公室IP;
    allow 你的家庭IP;
    deny all;

    location / {
        proxy_pass http://127.0.0.1:7860;
        # ...
    }
}
```

### 2. 添加基本认证

```bash
# 安装 htpasswd 工具
sudo apt install apache2-utils

# 创建密码文件
sudo htpasswd -c /etc/nginx/.htpasswd admin

# 在 Nginx 配置中添加
auth_basic "Restricted Access";
auth_basic_user_file /etc/nginx/.htpasswd;
```

### 3. 配置速率限制

```nginx
# 在 nginx.conf 的 http 块中
http {
    limit_req_zone $binary_remote_addr zone=tts_limit:10m rate=10r/m;
    
    # 在 server 块中应用
    location /tts {
        limit_req zone=tts_limit burst=5;
        proxy_pass http://127.0.0.1:7860;
    }
}
```

---

## 📝 修改应用配置

配置完成后，在游戏应用中修改配置：

```typescript
// src/App.tsx 或配置文件

const config = {
  // 使用域名访问（推荐）
  meloTTS: {
    baseUrl: 'https://tts.dblife.com'  // 或 https://api.dblife.com/tts
  },
  ollama: {
    baseUrl: 'https://ollama.dblife.com',  // 或 https://api.dblife.com/ollama
    model: 'qwen2:0.5b'
  }
};
```

---

## 🚀 一键启动脚本

创建服务管理脚本：

```bash
#!/bin/bash
# ~/manage-services.sh

case "$1" in
  start)
    echo "🚀 启动所有服务..."
    sudo systemctl start ollama
    sudo systemctl start nginx
    cd ~/melotts/MeloTTS && nohup python3 start-melo-tts-server.py > ~/melotts.log 2>&1 &
    echo "✅ 服务已启动"
    ;;
  stop)
    echo "⏹️  停止所有服务..."
    sudo systemctl stop ollama
    sudo systemctl stop nginx
    pkill -f start-melo-tts-server
    echo "✅ 服务已停止"
    ;;
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
  status)
    echo "📊 服务状态："
    echo "--- Ollama ---"
    sudo systemctl status ollama --no-pager -l
    echo "--- Nginx ---"
    sudo systemctl status nginx --no-pager -l
    echo "--- MeLo TTS ---"
    ps aux | grep start-melo-tts-server | grep -v grep
    ;;
  *)
    echo "用法: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
```

```bash
chmod +x ~/manage-services.sh

# 使用方法
~/manage-services.sh start    # 启动
~/manage-services.sh stop     # 停止
~/manage-services.sh restart  # 重启
~/manage-services.sh status   # 查看状态
```

---

## 📊 监控和日志

### 查看服务日志

```bash
# Nginx 访问日志
sudo tail -f /var/log/nginx/tts-access.log
sudo tail -f /var/log/nginx/ollama-access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/tts-error.log
sudo tail -f /var/log/nginx/ollama-error.log

# Ollama 日志
sudo journalctl -u ollama -f

# MeLo TTS 日志
tail -f ~/melotts.log
```

### 监控服务状态

```bash
# 实时监控服务
watch -n 2 'systemctl status ollama nginx --no-pager; echo "---"; ss -tlnp | grep -E "7860|11434|80|443"'
```

---

## ❓ 常见问题

### Q1: DNS 解析不生效？

```bash
# 检查 DNS 解析
nslookup tts.dblife.com
dig tts.dblife.com

# 清除本地 DNS 缓存
# Windows
ipconfig /flushdns

# Linux
sudo systemd-resolve --flush-caches

# macOS
sudo dscacheutil -flushcache
```

### Q2: 端口转发配置后仍无法访问？

**检查清单：**
1. ✅ DNS 是否解析到正确的公网 IP？
2. ✅ 路由器端口转发是否配置正确？
3. ✅ 0.13 服务器防火墙是否开放？
4. ✅ Nginx 是否正常运行？
5. ✅ 后端服务是否运行？

```bash
# 在 0.13 服务器上测试
curl http://localhost:7860/health
curl http://localhost:11434/api/tags

# 从外网测试（使用公网IP）
curl http://你的公网IP:80
```

### Q3: HTTPS 证书申请失败？

确保：
1. 域名 DNS 已解析到正确的 IP
2. 80 端口可以从外网访问
3. Nginx 正在运行
4. 防火墙允许 80 端口

```bash
# 手动测试证书申请
sudo certbot certonly --webroot -w /var/www/html -d tts.dblife.com

# 查看详细日志
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Q4: Ollama 无法访问？

```bash
# 检查 Ollama 是否监听 0.0.0.0
ss -tlnp | grep 11434

# 应该显示 0.0.0.0:11434，而不是 127.0.0.1:11434

# 如果不对，重新配置
sudo systemctl stop ollama
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

---

## 🎉 完成！

配置完成后，你可以使用以下地址访问：

### HTTP 访问（初期测试）
- **MeLo TTS**: http://tts.dblife.com
- **Ollama**: http://ollama.dblife.com
- **统一API**: http://api.dblife.com

### HTTPS 访问（推荐生产环境）
- **MeLo TTS**: https://tts.dblife.com
- **Ollama**: https://ollama.dblife.com
- **统一API**: https://api.dblife.com

---

需要我帮你执行哪一步配置吗？😊


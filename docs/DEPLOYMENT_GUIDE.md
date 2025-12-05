# 部署指南

**版本:** v1.0  
**更新:** 2024-12-05

---

## 📋 系统要求

### 服务器环境

**最低配置:**
- CPU: 2核
- 内存: 4GB
- 硬盘: 20GB
- 系统: Ubuntu 20.04+ / CentOS 8+

**推荐配置:**
- CPU: 4核+
- 内存: 8GB+
- 硬盘: 50GB+
- 系统: Ubuntu 22.04 LTS

### 软件依赖

```bash
Node.js: >= 18.0.0
npm: >= 9.0.0
WSL2: 最新版本 (Windows环境)
Git: >= 2.30.0
```

---

## 🚀 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/your-username/guozha-poker-game.git
cd guozha-poker-game
```

### 2. 安装依赖

```bash
# 主项目依赖
npm install

# Vue移动端依赖
cd vue-mobile
npm install
cd ..
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑`.env`文件：
```env
# 服务器配置
PORT=3000
HOST=0.0.0.0

# LLM配置
LLM_API_URL=your-llm-api-url
LLM_API_KEY=your-api-key

# TTS配置
TTS_SERVICE_URL=http://localhost:5000
TTS_ENABLED=true

# 游戏配置
MAX_PLAYERS=4
GAME_TIMEOUT=300000
```

### 4. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test tests/unit/
npm test tests/e2e/
```

### 5. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

---

## 📦 Docker部署

### 1. 构建镜像

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# 构建
docker build -t guozha-poker:v1.0 .

# 运行
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  --name guozha-poker \
  guozha-poker:v1.0
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  piper-tts:
    image: rhasspy/piper:latest
    ports:
      - "5000:5000"
    restart: unless-stopped
```

```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

---

## 🌐 Nginx配置

### 反向代理

```nginx
# /etc/nginx/sites-available/guozha-poker
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源缓存
    location /assets/ {
        proxy_pass http://localhost:3000/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### HTTPS配置

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 📱 Vue移动端部署

### 1. 构建生产版本

```bash
cd vue-mobile
npm run build
```

### 2. 配置Nginx

```nginx
server {
    listen 80;
    server_name mobile.your-domain.com;
    root /app/vue-mobile/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # PWA支持
    location /service-worker.js {
        add_header Cache-Control "no-cache";
    }

    # 资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. PWA配置

确保`vue-mobile/public/manifest.json`正确配置：

```json
{
  "name": "锅炸扑克",
  "short_name": "锅炸",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1989fa",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 🔧 服务管理

### Systemd服务

```ini
# /etc/systemd/system/guozha-poker.service
[Unit]
Description=Guozha Poker Game
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/app/guozha-poker-game
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# 启用服务
sudo systemctl enable guozha-poker
sudo systemctl start guozha-poker

# 查看状态
sudo systemctl status guozha-poker

# 查看日志
sudo journalctl -u guozha-poker -f
```

---

## 📊 监控配置

### PM2进程管理

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "guozha-poker" -- start

# 开机自启
pm2 startup
pm2 save

# 监控
pm2 monit

# 日志
pm2 logs guozha-poker
```

### PM2配置文件

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'guozha-poker',
    script: 'npm',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '500M'
  }]
};
```

```bash
pm2 start ecosystem.config.js
```

---

## 🔒 安全配置

### 1. 防火墙

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. 环境变量加密

```bash
# 使用dotenv-vault
npm install -g dotenv-vault

# 加密环境变量
dotenv-vault encrypt

# 部署时解密
dotenv-vault decrypt
```

### 3. 访问限制

```nginx
# 限制API访问频率
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20;
    proxy_pass http://localhost:3000;
}
```

---

## 📈 性能优化

### 1. 启用Gzip

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### 2. 缓存策略

```nginx
# 静态资源缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API响应缓存
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;
location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
}
```

### 3. CDN配置

推荐使用Cloudflare或阿里云CDN：

```nginx
# 设置正确的缓存头
add_header X-Cache-Status $upstream_cache_status;
```

---

## 🐛 故障排查

### 常见问题

1. **端口占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :3000
   
   # 杀死进程
   kill -9 <PID>
   ```

2. **依赖安装失败**
   ```bash
   # 清理缓存
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **服务无法启动**
   ```bash
   # 检查日志
   pm2 logs guozha-poker
   
   # 检查系统资源
   free -h
   df -h
   ```

### 日志位置

```
应用日志: ./logs/
Nginx日志: /var/log/nginx/
系统日志: /var/log/syslog
PM2日志: ~/.pm2/logs/
```

---

## 🔄 更新部署

### 零停机更新

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build

# PM2重载（零停机）
pm2 reload guozha-poker
```

### 回滚

```bash
# 查看部署历史
git log --oneline

# 回滚到指定版本
git checkout <commit-hash>

# 重新部署
npm install
npm run build
pm2 reload guozha-poker
```

---

## 📞 支持

- **文档:** [docs/](./docs/)
- **问题:** [GitHub Issues](https://github.com/your-repo/issues)
- **讨论:** [GitHub Discussions](https://github.com/your-repo/discussions)

---

## 📝 检查清单

部署前检查：

- [ ] 环境变量配置正确
- [ ] 所有测试通过
- [ ] 构建成功无错误
- [ ] 防火墙规则配置
- [ ] HTTPS证书有效
- [ ] 监控系统运行
- [ ] 备份策略就位
- [ ] 回滚方案准备

---

**文档版本:** v1.0  
**最后更新:** 2024-12-05  
**维护者:** Dev Team


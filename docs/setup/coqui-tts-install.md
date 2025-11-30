# Coqui TTS 安装指南

## ⚠️ 重要提示

**Coqui TTS 目前不支持 Python 3.12**（需要 Python 3.9-3.11）。

如果你的系统是 Python 3.12，**强烈推荐使用项目中的 Piper TTS**，它：
- ✅ 支持 Python 3.12
- ✅ 更轻量（模型只有几MB）
- ✅ 速度更快
- ✅ 已完全集成到项目中

**快速使用 Piper TTS：**
```bash
# 使用项目提供的脚本
./scripts/setup-piper-tts.sh
./start-piper-tts.sh
```

详细文档：`docs/setup/piper-tts-quick-start.md`

---

## 如果你仍想使用 Coqui TTS

如果你的系统是 Python 3.9-3.11，可以尝试以下方法：

## 方法 1：使用 Docker（推荐）

### 快速启动

```bash
# 使用提供的脚本
./scripts/start-coqui-tts.sh

# 或手动启动
docker run -d \
  --name coqui-tts-server \
  -p 5002:5002 \
  --restart unless-stopped \
  coqui/tts:latest \
  tts-server --port 5002
```

### 验证服务

```bash
# 检查容器状态
docker ps | grep coqui-tts-server

# 查看日志
docker logs -f coqui-tts-server

# 测试 API
curl -X POST http://localhost:5002/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，世界"}'
```

### 停止服务

```bash
# 停止容器
docker stop coqui-tts-server

# 删除容器
docker rm coqui-tts-server
```

## 方法 2：使用 Python 虚拟环境（Python 3.9-3.11）

如果你的系统有 Python 3.9-3.11，可以使用虚拟环境：

```bash
# 创建虚拟环境（使用 Python 3.11）
python3.11 -m venv venv-coqui

# 激活虚拟环境
source venv-coqui/bin/activate

# 安装 Coqui TTS
pip install --upgrade pip
pip install TTS[server]

# 启动服务器
tts-server --port 5002
```

## 方法 3：使用 pipx（推荐用于单用户安装）

```bash
# 安装 pipx（如果未安装）
sudo apt-get install pipx
pipx ensurepath

# 使用 pipx 安装 TTS（会自动管理虚拟环境）
pipx install TTS[server]

# 启动服务器
tts-server --port 5002
```

## 常见问题

### Q: Docker 未安装？

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io
sudo systemctl start docker
sudo systemctl enable docker

# 将用户添加到 docker 组（避免使用 sudo）
sudo usermod -aG docker $USER
# 需要重新登录才能生效
```

### Q: 端口 5002 被占用？

```bash
# 查看占用端口的进程
sudo lsof -i :5002

# 或使用 netstat
sudo netstat -tulpn | grep 5002

# 停止占用端口的容器
docker stop $(docker ps -q --filter "publish=5002")
```

### Q: 如何查看日志？

```bash
# 实时查看日志
docker logs -f coqui-tts-server

# 查看最近 100 行日志
docker logs --tail 100 coqui-tts-server
```

### Q: 如何更新 Coqui TTS？

```bash
# 拉取最新镜像
docker pull coqui/tts:latest

# 停止并删除旧容器
docker stop coqui-tts-server
docker rm coqui-tts-server

# 重新启动（使用新镜像）
./scripts/start-coqui-tts.sh
```

## 推荐配置

对于 Python 3.12 系统，**强烈推荐使用 Docker 方式**：
- ✅ 无需管理 Python 版本
- ✅ 隔离环境，不影响系统
- ✅ 易于更新和维护
- ✅ 跨平台兼容


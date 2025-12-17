# WSL 启动服务脚本

## 🚀 一键启动脚本

### 推荐方式：使用 `start-wsl.sh`

```bash
cd ~/guozha_poker_game
./start-wsl.sh
```

**功能：**
- ✅ 自动检查虚拟环境
- ✅ 启动 Piper TTS 服务（端口 5000）
- ✅ 等待服务就绪（最多30秒）
- ✅ 启动前端开发服务器（端口 3000）
- ✅ 按 Ctrl+C 自动清理所有服务

### 备用方式：使用 `start-all-services.sh`

```bash
cd ~/guozha_poker_game
./start-all-services.sh
```

**功能相同，但包含更多端口检查逻辑**

## 📋 手动分步启动

### 方式1：两个终端窗口

**终端1 - Piper TTS 服务：**
```bash
cd ~/guozha_poker_game
source venv-piper/bin/activate
python scripts/piper-tts-server.py
```

**终端2 - 前端服务：**
```bash
cd ~/guozha_poker_game
npm run dev
```

### 方式2：后台运行 Piper TTS

**终端1 - 后台启动 Piper TTS：**
```bash
cd ~/guozha_poker_game
source venv-piper/bin/activate
nohup python scripts/piper-tts-server.py > /tmp/piper-tts.log 2>&1 &
```

**终端2 - 前端服务：**
```bash
cd ~/guozha_poker_game
npm run dev
```

## ✅ 验证服务

### 检查 Piper TTS（端口 5000）

```bash
curl http://localhost:5000/health
```

**预期输出：**
```json
{
  "status": "ok",
  "service": "piper-tts",
  "model": "zh_CN-huayan-medium.onnx"
}
```

### 检查前端（端口 3000）

浏览器访问：`http://localhost:3000`

或者：
```bash
curl http://localhost:3000
```

## 📄 查看日志

### Piper TTS 日志

```bash
tail -f /tmp/piper-tts.log
```

### 前端日志

前端服务运行时直接显示在终端中

## 🛑 停止服务

### 如果使用启动脚本

直接按 `Ctrl+C`

### 如果手动启动

**停止 Piper TTS：**
```bash
ps aux | grep piper-tts-server
kill <PID>
```

**停止前端：**
在运行前端的终端中按 `Ctrl+C`

## 🔧 故障排查

### 端口被占用

```bash
# 查看占用端口的进程
lsof -i :5000
lsof -i :3000

# 停止进程
kill <PID>
```

### 虚拟环境不存在

```bash
# 创建虚拟环境
./scripts/setup-piper-tts.sh
```

### 服务无法访问

检查防火墙和 WSL 网络配置

## 📍 服务地址

- **Piper TTS**: `http://localhost:5000`
  - 健康检查: `http://localhost:5000/health`
  - TTS API: `http://localhost:5000/api/tts`

- **前端 APP**: `http://localhost:3000`
  - 本地访问: `http://localhost:3000`
  - 网络访问: `http://<WSL_IP>:3000`


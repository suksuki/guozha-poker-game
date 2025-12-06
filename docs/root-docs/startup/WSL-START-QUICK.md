# WSL 快速启动指南

## 🚀 一键启动（推荐）

在 WSL Ubuntu 终端中运行：

```bash
cd ~/guozha_poker_game
./start-wsl.sh
```

这个脚本会：
1. ✅ 自动检查虚拟环境
2. ✅ 启动 Piper TTS 服务（端口 5000，后台运行）
3. ✅ 等待服务就绪（最多30秒）
4. ✅ 启动前端开发服务器（端口 3000）
5. ✅ 按 Ctrl+C 自动清理所有服务

## 📋 手动启动（两个终端）

### 终端1：启动 Piper TTS 服务

```bash
cd ~/guozha_poker_game
source venv-piper/bin/activate
python scripts/piper-tts-server.py
```

### 终端2：启动前端 APP

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

在浏览器中访问：`http://localhost:3000`

## 🛑 停止服务

### 如果使用启动脚本

直接按 `Ctrl+C`，脚本会自动清理所有后台进程。

### 如果手动启动

**停止 Piper TTS：**
```bash
ps aux | grep piper-tts-server
kill <PID>
```

**停止前端：**
在运行前端的终端中按 `Ctrl+C`

## 📍 服务地址

- **Piper TTS**: `http://localhost:5000`
  - 健康检查: `http://localhost:5000/health`
  - TTS API: `http://localhost:5000/api/tts`

- **前端 APP**: `http://localhost:3000`

## 🔧 常见问题

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

### Windows 浏览器无法访问 localhost:3000

1. **获取 WSL IP 地址**：
   ```bash
   hostname -I
   ```

2. **在 Windows 浏览器中访问**：
   ```
   http://<WSL_IP>:3000
   ```

3. **或配置端口转发**（在 Windows PowerShell 管理员中）：
   ```powershell
   $wslIp = (wsl hostname -I).Trim()
   netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp
   netsh interface portproxy add v4tov4 listenport=5000 listenaddress=0.0.0.0 connectport=5000 connectaddress=$wslIp
   ```

## 📄 查看日志

### Piper TTS 日志

```bash
tail -f /tmp/piper-tts.log
```

### 前端日志

前端服务运行时直接显示在终端中。


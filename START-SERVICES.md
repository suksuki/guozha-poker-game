# 启动服务指南

## 快速启动

### 方法1: 使用启动脚本（推荐）

```bash
cd ~/guozha_poker_game
./start-wsl.sh
```

这个脚本会：
1. ✅ 自动检查虚拟环境
2. ✅ 启动 Piper TTS 服务（端口 5000）
3. ✅ 等待服务就绪
4. ✅ 启动前端开发服务器（端口 3000）
5. ✅ 自动清理资源（按 Ctrl+C 时）

### 方法2: 手动分步启动

#### 步骤1: 启动 Piper TTS 服务

在 WSL 终端中：

```bash
cd ~/guozha_poker_game
source venv-piper/bin/activate
python scripts/piper-tts-server.py
```

或者后台运行：

```bash
cd ~/guozha_poker_game
bash start-piper-tts.sh > /tmp/piper-tts.log 2>&1 &
```

#### 步骤2: 启动前端 APP

在另一个 WSL 终端中：

```bash
cd ~/guozha_poker_game
npm run dev
```

## 验证服务

### 检查 Piper TTS 服务

```bash
curl http://localhost:5000/health
```

应该返回：
```json
{
  "status": "ok",
  "service": "piper-tts",
  "model": "zh_CN-huayan-medium.onnx"
}
```

### 检查前端服务

在浏览器中访问：
- `http://localhost:3000`（如果在 Windows 浏览器中）
- 或使用 WSL IP：`http://<WSL_IP>:3000`

## 查看日志

### Piper TTS 日志

```bash
tail -f /tmp/piper-tts.log
```

### 前端服务日志

```bash
tail -f /tmp/vite-dev.log
```

## 停止服务

### 如果使用启动脚本

直接按 `Ctrl+C`，脚本会自动清理所有后台进程。

### 如果手动启动

#### 停止 Piper TTS

```bash
# 查找进程
ps aux | grep piper-tts-server

# 停止进程
kill <PID>
```

#### 停止前端服务

在前端服务运行的终端中按 `Ctrl+C`。

## 服务地址

- **Piper TTS**: `http://localhost:5000`
- **前端 APP**: `http://localhost:3000`


# WSL 快速启动指南

## 一键启动（推荐）

```bash
cd ~/guozha_poker_game
./start-all-services.sh
```

这个脚本会：
1. ✅ 检查端口是否被占用
2. ✅ 启动 Piper TTS 服务（端口 5000）
3. ✅ 等待服务就绪
4. ✅ 启动前端开发服务器（端口 3000）
5. ✅ 按 Ctrl+C 自动清理所有服务

## 分步启动

### 1. 启动 Piper TTS 服务

在一个终端中运行：

```bash
cd ~/guozha_poker_game
source venv-piper/bin/activate
python scripts/piper-tts-server.py
```

或者后台运行：

```bash
cd ~/guozha_poker_game
source venv-piper/bin/activate
nohup python scripts/piper-tts-server.py > /tmp/piper-tts.log 2>&1 &
```

### 2. 启动前端 APP

在另一个终端中运行：

```bash
cd ~/guozha_poker_game
npm run dev
```

## 验证服务

### 检查 Piper TTS

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

### 检查前端

浏览器访问：`http://localhost:3000`

## 查看日志

```bash
# Piper TTS 日志
tail -f /tmp/piper-tts.log

# 前端日志
# 直接查看运行前端的终端输出
```

## 停止服务

### 如果使用启动脚本

按 `Ctrl+C` 即可

### 如果手动启动

#### 停止 Piper TTS

```bash
# 查找进程
ps aux | grep piper-tts-server

# 停止进程
kill <PID>
```

#### 停止前端

在运行前端的终端中按 `Ctrl+C`

## 服务地址

- **Piper TTS**: `http://localhost:5000`
- **前端 APP**: `http://localhost:3000`


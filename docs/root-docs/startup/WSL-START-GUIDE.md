# WSL启动指南

## 快速启动

### 方法1：使用新的启动脚本（推荐）

```bash
# 在WSL终端中
cd ~/guozha_poker_game

# 设置执行权限（首次使用）
chmod +x start-wsl-dev.sh

# 启动服务
./start-wsl-dev.sh
```

这个脚本会：
- ✅ 自动检查端口是否被占用
- ✅ 自动停止占用端口的进程（可选）
- ✅ 启动Piper TTS服务（端口5000）
- ✅ 等待服务就绪
- ✅ 启动前端开发服务器（端口3000）
- ✅ 自动清理资源（按Ctrl+C时）

### 方法2：使用现有的启动脚本

```bash
# 在WSL终端中
cd ~/guozha_poker_game
./start-wsl.sh
```

或者：

```bash
./start-app-with-piper.sh
```

## 服务地址

- **Piper TTS服务**: http://localhost:5000
  - 健康检查: http://localhost:5000/health
  - TTS接口: http://localhost:5000/api/tts

- **前端APP**: http://localhost:3000
  - 开发服务器自动刷新
  - 支持热模块替换(HMR)

## 停止服务

直接按 `Ctrl+C`，脚本会自动清理所有后台进程。

## 查看日志

### Piper TTS日志

```bash
# 实时查看日志
tail -f /tmp/piper-tts.log

# 查看完整日志
cat /tmp/piper-tts.log
```

### 前端服务日志

前端服务的日志会直接显示在启动它的终端中。

## 常见问题

### 端口被占用

脚本会自动检测并询问是否停止占用端口的进程。你也可以手动停止：

```bash
# 查看占用端口的进程
lsof -i :5000
lsof -i :3000

# 停止进程（替换<PID>为实际进程ID）
kill <PID>
```

### WSL IP地址访问问题

如果Windows浏览器无法访问 `http://localhost:3000`：

1. **获取WSL IP地址**：
   ```bash
   hostname -I
   ```

2. **在Windows浏览器中访问**：
   ```
   http://<WSL_IP>:3000
   ```

3. **或配置端口转发**（在Windows PowerShell管理员中）：
   ```powershell
   $wslIp = (wsl hostname -I).Trim()
   netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp
   netsh interface portproxy add v4tov4 listenport=5000 listenaddress=0.0.0.0 connectport=5000 connectaddress=$wslIp
   ```

### Piper TTS模型未找到

如果出现模型未找到错误：

1. **检查模型文件**：
   ```bash
   ls -lh tts-services/models/
   ```

2. **下载模型**（如果需要）：
   ```bash
   python scripts/download-piper-model.py
   ```

3. **参考安装指南**：
   - `docs/setup/piper-tts-setup.md`

## 开发建议

1. **使用启动脚本**：
   - 最简单的启动方式
   - 自动处理所有检查
   - 自动清理资源

2. **监控日志**：
   - 定期查看Piper TTS日志以发现问题
   - 前端服务的错误会显示在浏览器控制台

3. **保持服务运行**：
   - Piper TTS服务可以一直运行（后台）
   - 前端服务在开发时会自动刷新


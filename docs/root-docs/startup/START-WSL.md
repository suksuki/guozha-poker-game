# WSL方式启动APP和Piper TTS服务

## 快速启动

### 方法1：使用启动脚本（推荐）

在WSL Ubuntu终端中运行：

```bash
cd ~/guozha_poker_game
./start-app-with-piper.sh
```

这个脚本会：
1. ✅ 自动检查端口是否被占用
2. ✅ 启动Piper TTS服务（端口5000）
3. ✅ 等待服务就绪
4. ✅ 启动前端开发服务器（端口3000）
5. ✅ 自动清理资源（按Ctrl+C时）

### 方法2：分别启动服务

#### 步骤1：启动Piper TTS服务

在第一个WSL终端中：

```bash
cd ~/guozha_poker_game
source venv-piper/bin/activate
python scripts/piper-tts-server.py
```

服务将在 `http://localhost:5000` 启动

#### 步骤2：启动前端APP

在第二个WSL终端中：

```bash
cd ~/guozha_poker_game
npm run dev
```

APP将在 `http://localhost:3000` 启动

### 方法3：使用Windows PowerShell启动

在Windows PowerShell中运行：

```powershell
.\start-app-with-piper.ps1
```

这个PowerShell脚本会：
- 在WSL中启动Piper TTS服务
- 在当前PowerShell中启动前端开发服务器

## 验证服务状态

### 检查Piper TTS服务

在WSL终端中：

```bash
curl http://localhost:5000/health
```

应该返回类似：

```json
{
  "status": "ok",
  "service": "piper-tts",
  "model": "zh_CN-huayan-medium.onnx"
}
```

### 检查前端服务

在浏览器中访问：
- `http://localhost:3000`（如果在Windows浏览器中）
- 或使用WSL IP地址：`http://<WSL_IP>:3000`

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

## 停止服务

### 如果使用启动脚本

直接按 `Ctrl+C`，脚本会自动清理所有后台进程。

### 如果分别启动

#### 停止Piper TTS服务

```bash
# 查找进程
ps aux | grep piper-tts-server

# 停止进程（替换<PID>为实际进程ID）
kill <PID>
```

#### 停止前端服务

在前端服务运行的终端中按 `Ctrl+C`。

## 常见问题

### 端口被占用

如果端口5000或3000被占用：

```bash
# 查看占用端口的进程
lsof -i :5000
lsof -i :3000

# 或者使用
netstat -tlnp | grep :5000
netstat -tlnp | grep :3000

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

## 服务地址总结

- **Piper TTS服务**：`http://localhost:5000`
  - 健康检查：`http://localhost:5000/health`
  - TTS接口：`http://localhost:5000/api/tts`

- **前端APP**：`http://localhost:3000`
  - 开发服务器自动刷新
  - 支持热模块替换(HMR)

## 开发建议

1. **使用两个终端窗口**：
   - 一个运行Piper TTS服务（可以最小化）
   - 一个运行前端服务（查看输出）

2. **使用启动脚本**：
   - 最简单的启动方式
   - 自动处理所有检查
   - 自动清理资源

3. **监控日志**：
   - 定期查看Piper TTS日志以发现问题
   - 前端服务的错误会显示在浏览器控制台


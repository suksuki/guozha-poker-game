# Piper TTS 快速启动指南（最终版）

## ✅ 当前状态

- ✅ 虚拟环境已创建：`venv-piper`
- ✅ 依赖已安装：flask, flask-cors, piper-tts
- ✅ 模型已下载：`zh_CN-huayan-medium.onnx` (61MB)
- ✅ JSON配置文件已下载：`zh_CN-huayan-medium.onnx.json`

## 🚀 启动服务

### 方式1：直接启动（推荐）

在WSL终端中运行：

```bash
cd ~/guozha_poker_game
source venv-piper/bin/activate
python scripts/piper-tts-server.py
```

### 方式2：使用启动脚本

```bash
cd ~/guozha_poker_game
# 使用整理后的脚本路径
./docs/root-docs/scripts/start/start-piper-tts.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
./start-piper-tts.sh
```

### 方式3：后台运行

```bash
cd ~/guozha_poker_game
source venv-piper/bin/activate
nohup python scripts/piper-tts-server.py > /tmp/piper-tts.log 2>&1 &
```

查看日志：
```bash
tail -f /tmp/piper-tts.log
```

## 🧪 测试服务

### 1. 健康检查

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

### 2. TTS合成测试

```bash
curl -X POST http://localhost:5000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好，这是测试"}' \
  --output test.wav
```

如果生成了 `test.wav` 文件，说明服务正常！

### 3. 使用测试脚本

```bash
./scripts/test-piper-tts.sh
```

## 🎮 在游戏中使用

### 1. 确保服务正在运行

```bash
curl http://localhost:5000/health
```

### 2. 在浏览器控制台运行

```javascript
// 检查服务状态
await window.checkLocalTTS.printStatus();

// 切换到Piper TTS
const { setTTSProvider } = await import('./services/multiChannelVoiceService');
setTTSProvider('piper');
console.log('✅ 已切换到Piper TTS');

// 测试多声道播放
const { multiChannelVoiceService } = await import('./services/multiChannelVoiceService');
const { ChannelType } = await import('./types/channel');

await Promise.all([
  multiChannelVoiceService.speak('我是玩家1', undefined, ChannelType.PLAYER_0),
  multiChannelVoiceService.speak('我是玩家2', undefined, ChannelType.PLAYER_1),
]);
```

## ⚠️ 常见问题

### Q: 服务启动失败？

**检查：**
1. 虚拟环境是否激活：`which python` 应该指向 `venv-piper/bin/python`
2. 模型文件是否存在：`ls -lh tts-services/models/zh_CN-huayan-medium.onnx`
3. 端口5000是否被占用：`lsof -i:5000` 或 `netstat -tuln | grep 5000`

### Q: 健康检查返回错误？

**可能原因：**
- 模型文件不存在或为空
- JSON配置文件缺失

**解决：**
```bash
# 检查模型文件
ls -lh tts-services/models/

# 如果xiaoyan-medium.onnx是空文件，删除它
rm tts-services/models/xiaoyan-medium.onnx

# 确保zh_CN-huayan-medium.onnx存在且大小正确（约61MB）
```

### Q: TTS合成返回错误？

**检查服务日志：**
```bash
# 如果使用nohup运行
tail -f /tmp/piper-tts.log

# 或直接运行查看输出
python scripts/piper-tts-server.py
```

### Q: 如何停止服务？

```bash
# 查找进程
ps aux | grep piper-tts-server

# 停止进程
pkill -f piper-tts-server.py
```

## 📝 下一步

1. ✅ 启动服务
2. ✅ 测试服务
3. ✅ 在游戏中使用
4. ✅ 享受轻量级、快速、高质量的多声道语音！

## 💡 提示

- 服务启动后会在 `http://localhost:5000` 运行
- 健康检查端点：`/health`
- TTS合成端点：`/api/tts` (POST)
- 模型文件：`tts-services/models/zh_CN-huayan-medium.onnx`


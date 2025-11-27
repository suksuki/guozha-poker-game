# 在游戏中使用 Piper TTS

## ✅ 服务状态

Piper TTS 服务已成功运行并测试通过！

- **服务地址：** `http://localhost:5000`
- **健康检查：** `http://localhost:5000/health`
- **TTS接口：** `http://localhost:5000/api/tts`

## 🎮 在游戏中使用

### 1. 确保服务正在运行

在WSL终端中检查：
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

### 2. 在浏览器控制台切换到Piper TTS

打开游戏，按F12打开开发者工具，在控制台运行：

```javascript
// 检查所有TTS服务状态
await window.checkLocalTTS.printStatus();
```

你应该看到：
```
✅ 健康 Piper TTS (piper)
  地址: http://localhost:5000
  说明: 轻量级本地TTS（推荐用于训练场景），极轻量、速度快、音质好
```

### 3. 切换到Piper TTS

```javascript
const { setTTSProvider } = await import('./services/multiChannelVoiceService');
setTTSProvider('piper');
console.log('✅ 已切换到Piper TTS');
```

### 4. 测试多声道播放

```javascript
const { multiChannelVoiceService } = await import('./services/multiChannelVoiceService');
const { ChannelType } = await import('./types/channel');

// 同时播放两个语音（测试多声道）
await Promise.all([
  multiChannelVoiceService.speak('我是玩家1，正在出牌', undefined, ChannelType.PLAYER_0),
  multiChannelVoiceService.speak('我是玩家2，我也要出牌', undefined, ChannelType.PLAYER_1),
]);

console.log('✅ 如果听到两个声音同时播放，说明多声道工作正常！');
```

## 🎯 自动使用Piper TTS

如果你想在游戏启动时自动使用Piper TTS，可以修改代码：

在 `src/main.tsx` 或游戏初始化代码中添加：

```typescript
// 检查并切换到Piper TTS
import { getTTSServiceManager } from './tts/ttsServiceManager';
import { multiChannelVoiceService } from './services/multiChannelVoiceService';

async function initTTS() {
  const ttsManager = getTTSServiceManager();
  const status = await ttsManager.getProviderStatus();
  
  if (status.piper?.healthy) {
    multiChannelVoiceService.setTTSProvider('piper');
    console.log('✅ 已自动切换到Piper TTS');
  }
}

initTTS();
```

## 📊 性能特点

- **内存占用：** ~50MB（极轻量）
- **响应速度：** 实时合成（<100ms延迟）
- **音质：** 高质量（VITS架构）
- **资源消耗：** 低（适合训练场景）

## 🔧 故障排除

### 问题：服务显示不健康

**检查：**
1. 服务是否运行：`curl http://localhost:5000/health`
2. 端口是否被占用：`lsof -i:5000`
3. 防火墙是否阻止（WSL通常不需要配置）

### 问题：无法听到声音

**检查：**
1. 浏览器控制台是否有错误
2. 是否已切换到Piper TTS：`await window.checkLocalTTS.printStatus()`
3. 音频上下文是否已激活（需要用户交互）

### 问题：服务启动失败

**检查：**
1. 虚拟环境是否激活：`which python` 应该指向 `venv-piper/bin/python`
2. 模型文件是否存在：`ls -lh tts-services/models/zh_CN-huayan-medium.onnx`
3. 查看服务日志：直接运行 `python scripts/piper-tts-server.py` 查看错误

## 🎉 完成！

现在你可以：
1. ✅ 使用轻量级的本地TTS服务
2. ✅ 享受高质量的多声道语音
3. ✅ 在训练吵架功能时使用（语音消耗小）

享受你的多声道语音游戏体验！


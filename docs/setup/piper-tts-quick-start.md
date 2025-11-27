# Piper TTS 快速开始指南

## 为什么选择 Piper TTS？

✅ **极轻量** - 模型只有几MB，内存占用~50MB  
✅ **速度快** - 实时合成，延迟低  
✅ **音质好** - 基于VITS架构，自然度高  
✅ **支持中文** - 有专门的中文模型  
✅ **免费开源** - 完全免费，无限制  
✅ **易于部署** - 有预编译版本和Docker镜像  

**完美适合你的需求：训练吵架功能，语音消耗小！**

## 最快安装方式（推荐）

### 方式1：使用 Python 服务（最简单）

1. **安装依赖：**
   ```bash
   pip install flask flask-cors piper-tts
   ```

2. **下载中文模型：**
   ```bash
   # 创建模型目录
   mkdir -p tts-services/models
   cd tts-services/models
   
   # 下载中文女声模型（推荐）
   wget https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyan/medium/xiaoyan-medium.onnx
   wget https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyan/medium/xiaoyan-medium.onnx.json
   ```

3. **启动服务：**
   ```bash
   python scripts/piper-tts-server.py
   ```

4. **测试服务：**
   ```bash
   curl -X POST http://localhost:5000/api/tts \
     -H "Content-Type: application/json" \
     -d '{"text":"你好，这是测试"}' \
     --output test.wav
   
   # 如果生成了 test.wav 文件，说明安装成功！
   ```

### 方式2：使用 Docker（一键启动）

1. **拉取镜像：**
   ```bash
   docker pull rhasspy/piper:latest
   ```

2. **下载模型（同上）**

3. **启动服务：**
   ```bash
   docker run -d \
     --name piper-tts \
     -p 5000:5000 \
     -v $(pwd)/tts-services/models:/app/models \
     rhasspy/piper:latest \
     --model /app/models/xiaoyan-medium.onnx \
     --port 5000
   ```

## 在游戏中使用

### 1. 检查服务状态

在浏览器控制台运行：
```javascript
await window.checkLocalTTS.printStatus();
```

你应该看到：
```
✅ 健康 Piper TTS (piper)
  地址: http://localhost:5000
  说明: 轻量级本地TTS（推荐用于训练场景），极轻量、速度快、音质好
```

### 2. 切换到 Piper TTS

```javascript
const { setTTSProvider } = await import('./services/multiChannelVoiceService');
setTTSProvider('piper');
console.log('✅ 已切换到 Piper TTS');
```

### 3. 测试多声道播放

```javascript
const { multiChannelVoiceService } = await import('./services/multiChannelVoiceService');
const { ChannelType } = await import('./types/channel');

// 同时播放两个语音
await Promise.all([
  multiChannelVoiceService.speak('我是玩家1', undefined, ChannelType.PLAYER_0),
  multiChannelVoiceService.speak('我是玩家2', undefined, ChannelType.PLAYER_1),
]);

console.log('✅ 如果听到两个声音同时播放，说明多声道工作正常！');
```

## 资源消耗

| 项目 | 数值 |
|------|------|
| 模型大小 | ~5MB |
| 内存占用 | ~50MB |
| CPU占用 | 低（实时合成） |
| 启动时间 | <1秒 |
| 合成速度 | 实时（比说话快） |

**对比其他TTS：**
- Coqui TTS: ~500MB内存，~5秒启动
- GPT-SoVITS: ~2GB内存，~10秒启动

**Piper TTS 是最轻量的选择！**

## 常见问题

### Q: 模型下载很慢？
A: 模型只有几MB，如果下载慢可以：
1. 使用镜像站点
2. 或使用Docker方式（会自动下载）

### Q: 支持其他语言吗？
A: 支持，但需要下载对应的语言模型。中文模型已经很好用了。

### Q: 可以同时使用多个音色吗？
A: 可以，启动多个服务实例，使用不同端口和模型即可。

### Q: 音质如何？
A: 对于轻量级TTS来说，音质非常好，接近商业TTS的水平。

## 下一步

1. ✅ 安装 Piper TTS（选择方式1或方式2）
2. ✅ 启动服务
3. ✅ 在游戏中切换到 Piper TTS
4. ✅ 享受轻量级、快速、高质量的多声道语音！

## 详细文档

更多信息请参考：`docs/setup/piper-tts-setup.md`


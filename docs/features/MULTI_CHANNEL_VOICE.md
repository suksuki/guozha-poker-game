# 多声道语音实现指南

## 当前限制

**重要**：无论是浏览器还是Electron，`window.speechSynthesis` API都只支持**单声道播放**。多个utterance同时播放时会互相覆盖。

## 解决方案

### 方案1：Web Audio API混合（推荐）

使用Web Audio API捕获每个语音输出，然后混合到不同的声道。

#### 实现步骤：

1. **使用MediaRecorder或AudioWorklet捕获语音**
2. **将每个玩家的语音分配到不同的声道**
3. **使用AudioContext混合多个声道**

#### 代码示例（需要进一步完善）：

```typescript
// 使用AudioWorklet处理多声道
class MultiChannelVoiceProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    // 处理多声道混合逻辑
    return true;
  }
}
```

### 方案2：使用TTS API + 音频文件

1. 使用TTS API（如Google TTS、Azure TTS）生成音频文件
2. 使用Web Audio API播放多个音频文件
3. 每个音频文件可以分配到不同的声道

### 方案3：原生音频库（Electron）

在Electron主进程中使用原生音频库：
- **Windows**: DirectSound, WASAPI
- **macOS**: Core Audio
- **Linux**: ALSA, PulseAudio

通过IPC与渲染进程通信。

## 当前实现状态

已创建 `multiChannelVoiceService.ts` 作为基础框架，但**尚未实现真正的多声道混合**。

### 下一步工作：

1. **实现AudioWorklet处理器**用于多声道混合
2. **或者**使用TTS API生成音频文件，然后用Web Audio API播放
3. **或者**在Electron主进程中使用原生音频库

## 建议

如果多声道是核心需求，建议：

1. **短期**：使用Web Audio API + AudioWorklet实现多声道混合
2. **中期**：使用TTS API生成音频文件，然后用Web Audio API播放
3. **长期**：考虑使用React Native或原生应用开发

## 测试多声道

在浏览器中测试Web Audio API：

```javascript
// 创建AudioContext
const audioContext = new AudioContext();

// 创建多个音频源
const source1 = audioContext.createBufferSource();
const source2 = audioContext.createBufferSource();

// 连接到不同的声道
source1.connect(audioContext.destination);
source2.connect(audioContext.destination);

// 播放
source1.start();
source2.start();
```

## 参考资源

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [Electron Audio](https://www.electronjs.org/docs/latest/tutorial/audio)


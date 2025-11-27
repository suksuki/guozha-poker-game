# 多声道音频实现指南

> 本文档由以下文档合并而成：
- `docs/features/MULTI_CHANNEL_VOICE.md`
- `docs/features/MULTI_CHANNEL_IMPLEMENTATION.md`
- `docs/features/MULTI_CHANNEL_USAGE.md`
- `docs/features/MULTI_PLAYER_CONCURRENT_SPEECH.md`

---

## 来源: MULTI_CHANNEL_VOICE.md

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



---

## 来源: MULTI_CHANNEL_IMPLEMENTATION.md

## 需求
- 每个玩家一个声道（4个玩家 = 4个声道）
- 系统声音单独一个声道（中央）
- 总共5个声道

## 技术限制

**重要**：浏览器无法直接捕获 `speechSynthesis` 的输出。

## 实现方案

### 方案1：Web Audio API + 声像定位（当前实现）

使用 Web Audio API 的 `StereoPannerNode` 来模拟多声道效果：

- **玩家0**：左声道（pan = -0.8）
- **玩家1**：右声道（pan = 0.8）
- **玩家2**：左中（pan = -0.4）
- **玩家3**：右中（pan = 0.4）
- **系统声音**：中央（pan = 0.0）

**优点**：
- 不需要额外权限
- 实现简单
- 可以同时播放多个声音

**缺点**：
- 仍然是立体声，不是真正的多声道
- 无法捕获 speechSynthesis 的输出

### 方案2：在线 TTS API + Web Audio API（推荐）

使用在线 TTS API（如 Google TTS、Azure TTS）生成音频文件，然后用 Web Audio API 播放：

1. 调用 TTS API 生成音频
2. 下载音频文件
3. 使用 Web Audio API 播放到不同声道

**优点**：
- 真正的多声道
- 可以缓存音频
- 音质好

**缺点**：
- 需要 API 密钥
- 需要网络连接
- 可能有延迟

### 方案3：MediaRecorder + 系统音频捕获（实验性）

使用 `getUserMedia` + `MediaRecorder` 捕获系统音频输出：

1. 请求系统音频捕获权限
2. 使用 speechSynthesis 播放
3. 同时用 MediaRecorder 捕获
4. 解码后通过 Web Audio API 播放

**优点**：
- 可以使用浏览器内置语音
- 真正的多声道

**缺点**：
- 需要用户授权
- 浏览器支持有限（Chrome 需要特殊标志）
- 实现复杂

## 当前实现状态

已创建 `webAudioVoiceService.ts`，提供：
- 多声道语音播放框架
- 系统声音独立声道
- 声像定位（StereoPannerNode）

## 下一步

### 短期方案（立即可用）

使用声像定位模拟多声道：
- 每个玩家分配到不同的声像位置
- 系统声音在中央
- 虽然还是立体声，但可以区分不同玩家

### 中期方案（需要开发）

实现 TTS API 集成：
1. 集成 Google TTS 或 Azure TTS
2. 生成音频文件
3. 缓存音频
4. 通过 Web Audio API 播放

### 长期方案（可选）

实现系统音频捕获：
1. 检测浏览器是否支持
2. 请求用户授权
3. 捕获 speechSynthesis 输出
4. 通过 Web Audio API 播放

## 使用说明

### 当前实现（声像定位）

```typescript
import { webAudioVoiceService } from './services/webAudioVoiceService';
import { ChannelType } from './services/multiChannelVoiceService';

// 播放玩家语音（会自动分配到对应声道）
await webAudioVoiceService.speak('你好', voiceConfig, ChannelType.PLAYER_0);

// 播放系统声音（中央声道）
const audioBuffer = await loadAudioBuffer('/sounds/dun-small.mp3');
webAudioVoiceService.playSystemSound(audioBuffer, 1.0);
```

### 集成到现有代码

需要修改 `multiChannelVoiceService.ts`，让它使用 `webAudioVoiceService` 而不是直接使用 `speechSynthesis`。



---

## 来源: MULTI_CHANNEL_USAGE.md

## 当前实现

已创建以下服务：

1. **`webAudioVoiceService.ts`** - Web Audio API 多声道服务
   - 支持语音和系统声音的多声道播放
   - 使用 StereoPannerNode 进行声像定位
   - 系统声音有独立声道（中央）

2. **`multiChannelVoiceServiceWithWebAudio.ts`** - 带 Web Audio 的多声道语音服务
   - 集成了 Web Audio API 的声像定位
   - 每个玩家分配到不同的声像位置

3. **`soundService.ts`** - 已更新，支持通过多声道服务播放系统声音

## 声道分配

- **玩家0**：左声道（pan = -0.8）
- **玩家1**：右声道（pan = 0.8）
- **玩家2**：左中（pan = -0.4）
- **玩家3**：右中（pan = 0.4）
- **报牌**：中央（pan = 0.0）
- **系统声音**：中央（pan = 0.0）

## 技术限制

**重要**：浏览器无法直接捕获 `speechSynthesis` 的输出，所以：

1. **语音播放**：仍然使用 `speechSynthesis` API（单声道）
   - 但可以通过不同的音量、语速、音调来区分不同玩家
   - Web Audio API 的声像定位节点已创建，但无法应用到 speechSynthesis 的输出

2. **系统声音**：可以通过 Web Audio API 真正实现多声道
   - 音效文件可以加载到 AudioBuffer
   - 然后通过 Web Audio API 播放到不同声道

## 使用方式

### 当前代码（无需修改）

现有代码已经使用了 `multiChannelVoiceService`，它会：
- 自动为每个玩家分配不同的声道
- 系统声音通过 `soundService` 播放（已更新为使用多声道服务）

### 如果要使用新的 Web Audio 服务

```typescript
import { webAudioVoiceService } from './services/webAudioVoiceService';
import { ChannelType } from './services/multiChannelVoiceService';

// 播放玩家语音（会尝试使用Web Audio API）
await webAudioVoiceService.speak('你好', voiceConfig, ChannelType.PLAYER_0);

// 播放系统声音（真正的多声道）
const audioBuffer = await loadAudioBuffer('/sounds/dun-small.mp3');
webAudioVoiceService.playSystemSound(audioBuffer, 1.0);
```

## 未来改进方向

### 方案1：使用在线 TTS API（推荐）

使用 Google TTS 或 Azure TTS 生成音频文件，然后用 Web Audio API 播放：

1. 调用 TTS API 生成音频
2. 下载音频文件
3. 使用 Web Audio API 播放到不同声道

**优点**：
- 真正的多声道
- 可以缓存音频
- 音质好

**缺点**：
- 需要 API 密钥
- 需要网络连接

### 方案2：系统音频捕获（实验性）

使用 `getUserMedia` + `MediaRecorder` 捕获系统音频：

1. 请求系统音频捕获权限
2. 使用 speechSynthesis 播放
3. 同时用 MediaRecorder 捕获
4. 解码后通过 Web Audio API 播放

**缺点**：
- 需要用户授权
- 浏览器支持有限（Chrome 需要 `--enable-audio-capture` 标志）
- 实现复杂

## 当前效果

虽然无法真正实现多声道语音，但可以通过以下方式区分：

1. **音量差异**：不同玩家使用不同音量
2. **语速差异**：不同玩家使用不同语速
3. **音调差异**：不同玩家使用不同音调
4. **系统声音**：通过 Web Audio API 真正实现多声道（中央声道）

## 测试

在浏览器中运行应用，然后：

1. 让不同玩家说话，观察控制台日志
2. 播放系统声音，应该通过 Web Audio API 播放
3. 检查 Network 标签，确认音频文件正确加载

## 总结

- ✅ **系统声音**：已实现真正的多声道（通过 Web Audio API）
- ⚠️ **玩家语音**：受浏览器限制，仍使用 speechSynthesis（单声道）
- 🔄 **未来改进**：可以使用在线 TTS API 实现真正的多声道语音



---

## 来源: MULTI_PLAYER_CONCURRENT_SPEECH.md

## 📋 功能概述

实现了多人同时说话的"伪并发"方案，允许最多 **2个玩家** 同时说话，营造真实的聊天氛围。

## 🎯 实现原理

由于浏览器的 `speechSynthesis` API 是单声道的，无法真正同时播放多个语音。我们通过以下方式实现"伪并发"：

1. **时间错开**：多个语音错开 150ms 播放，营造"同时说话"的感觉
2. **音量调整**：并发播放时，每个语音的音量降低到 75%，避免声音过大
3. **智能队列**：超过并发上限的语音会进入队列，等待播放

## ⚙️ 配置参数

在 `src/services/multiChannelVoiceService.ts` 中：

```typescript
// 并发播放控制
private maxConcurrentSpeakers: number = 2; // 最多同时播放2个玩家
private concurrentTimeOffset: number = 150; // 并发播放时间错开（毫秒）
```

### 可调整参数

- **`maxConcurrentSpeakers`**：最多同时播放的玩家数（默认：2）
  - 可以调整为 1-3，建议不超过 3（避免声音混乱）
  
- **`concurrentTimeOffset`**：时间错开间隔（默认：150ms）
  - 可以调整为 100-200ms，建议 150ms（既能营造同时感，又不会太混乱）

- **音量调整**：并发时音量降低到 75%
  - 可以在 `setupAudioParams` 方法中调整 `volumeMultiplier`

## 🔄 工作流程

### 场景：玩家0和玩家1同时说话

```
1. 玩家0开始说话
   ├─> 并发数：0/2
   ├─> 立即播放（第1个）
   └─> 并发数：1/2

2. 玩家1开始说话（在玩家0播放期间）
   ├─> 并发数：1/2（未满）
   ├─> 延迟 150ms 播放（时间错开）
   ├─> 音量降低到 75%
   └─> 并发数：2/2

3. 玩家2也想说话（在玩家0和玩家1播放期间）
   ├─> 并发数：2/2（已满）
   └─> 加入全局队列，等待播放

4. 玩家0播放完成
   ├─> 从并发集合移除
   ├─> 并发数：1/2
   └─> 触发全局队列处理，玩家2开始播放
```

## 📊 日志输出

系统会输出详细的日志，帮助调试：

```
[玩家0（左）] ✅ 立即播放（并发播放第1个）: 好牌！
[玩家1（右）] ✅ 允许并发播放（当前2/2），延迟 150ms: 要不起
[玩家2（左中）] ⏳ 并发数已达上限(2)，加入队列: 我也要不起
[玩家0（左）] 从并发播放集合移除，当前并发数: 1/2
[玩家2（左中）] 从全局队列中取出（并发数: 1/2）: 我也要不起
```

## 🎨 用户体验

### 效果

- ✅ **真实感**：多个玩家可以"同时"说话，营造真实的聊天氛围
- ✅ **清晰度**：通过时间错开和音量调整，保持语音清晰
- ✅ **流畅度**：智能队列管理，确保所有语音都能播放

### 限制

- ⚠️ **单声道限制**：由于浏览器限制，无法实现真正的多声道同时播放
- ⚠️ **并发上限**：最多同时播放 2 个玩家（可调整）
- ⚠️ **时间错开**：多个语音会有 150ms 的时间差（营造"同时"感）

## 🔧 调试技巧

### 1. 查看并发状态

在浏览器控制台：

```javascript
// 查看当前并发播放的玩家
console.log('并发播放:', multiChannelVoiceService.concurrentSpeakers);
```

### 2. 调整并发参数

在 `multiChannelVoiceService.ts` 中修改：

```typescript
// 增加并发数（最多3个）
this.maxConcurrentSpeakers = 3;

// 减少时间错开（更快）
this.concurrentTimeOffset = 100;

// 增加时间错开（更慢，但更清晰）
this.concurrentTimeOffset = 200;
```

### 3. 调整音量

在 `setupAudioParams` 方法中：

```typescript
// 并发时音量降低到 60%（更清晰）
const volumeMultiplier = concurrentCount > 1 ? 0.6 : 1.0;

// 并发时音量降低到 80%（更响亮）
const volumeMultiplier = concurrentCount > 1 ? 0.8 : 1.0;
```

## 📝 测试建议

1. **测试并发播放**
   - 让多个玩家快速连续说话
   - 观察是否能够"同时"播放

2. **测试队列管理**
   - 让3个以上玩家同时说话
   - 观察队列是否正确处理

3. **测试音量平衡**
   - 并发播放时，检查音量是否合适
   - 调整 `volumeMultiplier` 找到最佳平衡

## 🚀 未来优化

1. **动态调整**：根据语音长度动态调整并发数
2. **优先级**：重要消息优先播放
3. **智能混合**：使用 Web Audio API 实现真正的多声道混合（需要 TTS API）

---

**注意**：由于浏览器限制，这是目前最佳的"伪并发"方案。如果需要真正的多声道同时播放，需要使用在线 TTS API + Web Audio API。



---


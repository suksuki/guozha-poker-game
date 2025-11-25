# 多声道语音使用指南

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


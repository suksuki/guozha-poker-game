# 多声道语音实现方案

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


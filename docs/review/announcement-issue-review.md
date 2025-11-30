# 报牌问题 Review

## 🔍 问题描述

报牌功能不工作，出牌时没有语音播报。

## 📋 调用链分析

### 1. 出牌触发
**文件**: `src/utils/asyncPlayHandler.ts`
```typescript
// 5.5 生成TTS并播放语音
if (!moduleCallbacks?.announcePlayAudio) {
  throw new Error('音频模块未初始化');
}

await Promise.race([
  moduleCallbacks.announcePlayAudio(play, player.voiceConfig),
  new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error('TTS 生成或播放超时（10秒）'));
    }, 10000);
  })
]);
```

### 2. 回调设置
**文件**: `src/hooks/useMultiPlayerGame.ts`
```typescript
const { announcePlay: announcePlayAudio } = useAudioModule();

newGame.setModuleCallbacks({
  recordTrackingPlay,
  announcePlayAudio  // ✅ 回调已设置
});
```

### 3. useAudioModule Hook
**文件**: `src/hooks/useAudioModule.ts`
```typescript
const announcePlay = async (play: Play, voiceConfig?: VoiceConfig, onStart?: () => void) => {
  if (audioModule && isReady) {
    return audioModule.announcePlay(play, voiceConfig, onStart);
  } else {
    // ⚠️ 之前：直接返回 undefined，导致报牌失败
    // ✅ 现在：降级到 systemAnnouncementService
    const { announcePlay: systemAnnouncePlay } = await import('../services/systemAnnouncementService');
    return systemAnnouncePlay(play, voiceConfig, onStart);
  }
};
```

### 4. AudioModule
**文件**: `src/services/system/modules/audio/AudioModule.ts`
```typescript
async announcePlay(play: Play, voiceConfig?: VoiceConfig, onStart?: () => void): Promise<void> {
  if (!this.isEnabled() || !this.config?.announcement.enabled) {
    // ⚠️ 之前：直接返回，不执行任何操作
    // ✅ 现在：即使未启用，也尝试报牌（降级处理）
    return systemAnnouncementService.announcePlay(play, voiceConfig, onStart);
  }
  return systemAnnouncementService.announcePlay(play, voiceConfig, onStart);
}
```

### 5. SystemAnnouncementService
**文件**: `src/services/systemAnnouncementService.ts`
```typescript
async announcePlay(play: Play, voiceConfig?: VoiceConfig, onStart?: () => void): Promise<void> {
  const text = playToSpeechText(play);
  // ... 去重检查 ...
  await voiceService.speakImmediate(text, voiceConfig, { ... });
}
```

### 6. VoiceService
**文件**: `src/services/voiceService.ts`
```typescript
speakImmediate(text: string, voiceConfig?: VoiceConfig, events?: SpeechPlaybackEvents): Promise<void> {
  return multiChannelVoiceService.speak(
    text, 
    voiceConfig, 
    ChannelType.ANNOUNCEMENT,  // ✅ 使用报牌专用声道
    events,
    4 // ✅ 报牌优先级最高
  );
}
```

### 7. MultiChannelVoiceService
**文件**: `src/services/multiChannelVoiceService.ts`
```typescript
async speak(..., channel: ChannelType, ..., priority: number): Promise<void> {
  // 如果启用多声道，使用TTS Audio Service
  if (this.multiChannelConfig.enabled) {
    return await ttsAudioService.speak(text, voiceConfig, channel, events, priority);
  }
  // 否则使用 speechSynthesis（串行播放）
}
```

### 8. TTSAudioService
**文件**: `src/services/ttsAudioService.ts`
```typescript
async speak(..., channel: ChannelType, ..., priority: number): Promise<void> {
  // 生成音频
  const audioBuffer = await this.generateAudio(text, voiceConfig);
  // 添加到队列
  this.addToQueue(item);
}

private addToQueue(item: PlayItem): void {
  // 报牌优先级最高，可以中断其他播放
  if (item.channel === ChannelType.ANNOUNCEMENT && item.priority === 4) {
    this.interruptNonAnnouncement();
    this.playAudio(item);
    return;
  }
  // ...
}
```

## 🐛 发现的问题

### 问题1: useAudioModule 返回 undefined
**位置**: `src/hooks/useAudioModule.ts`

**问题**:
- 如果 `audioModule` 不存在或 `isReady` 为 false，`announcePlay` 会返回 `undefined`
- 这导致 `announcePlayAudio` 回调可能为 undefined 或返回 undefined
- 即使有回调，调用时也可能立即 resolve，但实际没有播放

**修复**:
```typescript
// ✅ 降级到 systemAnnouncementService
if (audioModule && isReady) {
  return audioModule.announcePlay(play, voiceConfig, onStart);
} else {
  const { announcePlay: systemAnnouncePlay } = await import('../services/systemAnnouncementService');
  return systemAnnouncePlay(play, voiceConfig, onStart);
}
```

### 问题2: AudioModule 静默失败
**位置**: `src/services/system/modules/audio/AudioModule.ts`

**问题**:
- 如果 `!this.isEnabled() || !this.config?.announcement.enabled`，直接返回，不执行任何操作
- 没有日志，难以调试

**修复**:
```typescript
// ✅ 即使未启用，也尝试报牌（降级处理）
if (!this.isEnabled() || !this.config?.announcement.enabled) {
  console.warn('[AudioModule] 音频模块未启用或报牌功能被禁用，但仍尝试报牌');
  return systemAnnouncementService.announcePlay(play, voiceConfig, onStart);
}
```

### 问题3: 缺少调试日志
**问题**:
- 整个调用链缺少日志，难以追踪问题

**修复**:
- ✅ 在 `AudioModule.announcePlay` 添加日志
- ✅ 在 `SystemAnnouncementService.announcePlay` 添加日志
- ✅ 在 `VoiceService.speakImmediate` 添加日志

## ✅ 修复内容

1. **useAudioModule 降级处理**
   - 如果音频模块未初始化，直接调用 `systemAnnouncementService`
   - 确保报牌功能始终可用

2. **AudioModule 降级处理**
   - 即使音频模块未启用或报牌功能被禁用，也尝试报牌
   - 添加警告日志

3. **添加详细日志**
   - 在整个调用链添加日志，便于调试
   - 记录关键参数和状态

## 🧪 验证步骤

1. 打开浏览器控制台
2. 出牌时应该看到以下日志：
   ```
   [AudioModule] announcePlay 被调用
   [SystemAnnouncement] announcePlay 被调用
   [VoiceService] speakImmediate 被调用（报牌）
   [MultiChannelVoiceService] 使用多声道播放（TTS API服务）
   [TTSAudioService] 开始生成音频
   [TTSServiceManager] 尝试使用提供者: piper
   [TTSAudioService] ✅ 音频开始播放: 报牌（中央）
   ```

3. 如果看到错误日志，根据错误信息进一步排查

## 📝 注意事项

- 报牌使用 `ChannelType.ANNOUNCEMENT` 声道
- 报牌优先级为 4（最高）
- 报牌可以中断其他播放
- 即使音频模块未初始化，也应该能够报牌（降级处理）


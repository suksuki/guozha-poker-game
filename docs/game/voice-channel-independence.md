# 语音通道独立性设计

## 📋 概述

报牌语音和聊天语音使用完全独立的通道，无论是在通道分配上还是逻辑上都是独立的。这确保了聊天语音不会阻塞游戏流程。

## 🎯 设计原则

1. **通道分离**: 报牌和聊天使用不同的通道
2. **逻辑独立**: 游戏流程只等待报牌，不等待聊天
3. **性能优化**: 避免聊天语音阻塞游戏流程

## 🔧 实现细节

### 通道分配

```typescript
// 报牌语音：使用独立专用通道
ChannelType.ANNOUNCEMENT = 8  // 报牌：中央声道

// 聊天语音：使用玩家通道
ChannelType.PLAYER_0 = 0  // 玩家0：左声道
ChannelType.PLAYER_1 = 1  // 玩家1：右声道
ChannelType.PLAYER_2 = 2  // 玩家2：左中
ChannelType.PLAYER_3 = 3  // 玩家3：右中
// ... 最多支持8个玩家
```

### 报牌语音流程

**文件**: `src/services/systemAnnouncementService.ts`

```typescript
async announcePlay(play: Play, voiceConfig?: VoiceConfig, callbacks?: {...}): Promise<void> {
  const text = playToSpeechText(play);
  await voiceService.speakImmediate(text, voiceConfig, callbacks);
}
```

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

### 聊天语音流程

**文件**: `src/hooks/useChatBubbles.ts`

```typescript
voiceService.speak(
  latestMessage.content,
  voiceConfigForTaunt,
  priority,
  latestMessage.playerId,  // ✅ 使用玩家ID分配通道
  {
    onStart: () => { ... },
    onEnd: () => { ... },
    onError: (error) => { ... }
  }
);
```

**文件**: `src/services/voiceService.ts`

```typescript
speak(text: string, voiceConfig?: VoiceConfig, priority: number = 1, playerId?: number, events?: SpeechPlaybackEvents): Promise<void> {
  if (playerId !== undefined) {
    const channel = getPlayerChannel(playerId);  // ✅ 根据玩家ID分配通道
    return multiChannelVoiceService.speak(text, voiceConfig, channel, {...}, priority);
  }
  // ...
}
```

### 游戏流程等待逻辑

**文件**: `src/utils/Game.ts:669-691`

```typescript
// 检查是否正在播放报牌语音（只检查报牌通道，不检查聊天通道）
// 报牌和聊天使用不同的通道，应该独立检查，聊天不应该阻塞游戏流程
try {
  const isAnnouncementSpeaking = voiceService.isAnnouncementSpeaking();
  if (isAnnouncementSpeaking) {
    const initialPlayerIndex = this.currentPlayerIndex;
    // 添加超时保护，避免无限等待
    await Promise.race([
      new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          // 只检查报牌通道，不检查聊天通道
          if (!voiceService.isAnnouncementSpeaking() || this.currentPlayerIndex !== initialPlayerIndex) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      }),
      new Promise(resolve => setTimeout(resolve, 5000)) // 5秒超时
    ]);
  }
} catch (error) {
  // 忽略错误，继续执行
}
```

### VoiceService 新增方法

**文件**: `src/services/voiceService.ts`

```typescript
/**
 * 是否正在播放（检查所有通道）
 */
isCurrentlySpeaking(): boolean {
  return multiChannelVoiceService.isCurrentlySpeaking();
}

/**
 * 是否正在播放报牌语音（只检查报牌通道，不检查聊天通道）
 * 报牌和聊天使用不同的通道，应该独立检查
 */
isAnnouncementSpeaking(): boolean {
  return multiChannelVoiceService.isCurrentlySpeaking(ChannelType.ANNOUNCEMENT);
}
```

## ✅ 优势

1. **性能提升**: 游戏流程不会被聊天语音阻塞，速度更快
2. **用户体验**: 玩家可以同时听到报牌和聊天，体验更好
3. **逻辑清晰**: 报牌和聊天职责分离，代码更易维护
4. **扩展性**: 未来可以独立优化报牌和聊天的逻辑

## 🐛 问题修复历史

### 问题：游戏速度慢，感觉在等聊天

**症状**: 
- 玩家2报牌时，如果玩家2同时在聊天，会等聊天说完后才出下一手牌
- 感觉游戏流程被聊天语音阻塞

**原因**: 
- `playNextTurn` 中的 `voiceService.isCurrentlySpeaking()` 会检查所有通道（包括聊天）
- 导致游戏流程等待所有语音播放完成

**修复**:
- 添加 `isAnnouncementSpeaking()` 方法，只检查报牌通道
- 修改 `playNextTurn` 中的等待逻辑，只等待报牌语音

**修复日期**: 2024年

## 📝 相关文档

- [出牌流程详解](./play-card-flow.md)
- [Round 等待逻辑优化](./round-wait-optimization.md)
- [报牌问题 Review](../review/announcement-issue-review.md)
- [音频通道调度器设计](../design/audio-channel-scheduler-design.md)


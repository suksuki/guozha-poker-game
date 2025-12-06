# TTS播报功能实现文档

## 概述

本文档描述了移动端TTS（文本转语音）播报功能的实现，包括报牌和聊天消息的语音播报。

## 核心功能

### 1. TTS播报服务 (`ttsPlaybackService.ts`)

**功能特性：**
- ✅ 超时机制：主TTS 5秒，总超时10秒
- ✅ 自动降级：主TTS → 降级TTS → 浏览器TTS → 静默失败
- ✅ 缓存机制：相同文本缓存1小时，避免重复调用
- ✅ 直接播放AudioBuffer：支持已生成的音频直接播放

**关键方法：**
```typescript
async speak(
  text: string,
  options: PlaybackOptions = {}
): Promise<void>
```

**超时配置：**
- 报牌：总超时10秒（主TTS 5秒 + 降级5秒）
- 聊天：总超时5秒

### 2. 报牌流程 (`gameStore.ts`)

**实现方式：**
- 阻塞式：出牌后必须等待TTS完成（最多10秒）才能继续游戏
- 使用`ChannelType.ANNOUNCEMENT`声道
- 优先级最高（priority: 4）
- 超时后静默失败，继续游戏（避免卡死）

**代码位置：**
```typescript
// vue-mobile/src/stores/gameStore.ts
const playCards = async (cards: Card[]) => {
  // ... 出牌逻辑
  if (result.success && lastPlay) {
    await ttsService.speak(text, {
      timeout: 5000,
      fallbackTimeout: 5000,
      priority: 4,
      channel: ChannelType.ANNOUNCEMENT
    });
  }
}
```

### 3. 聊天流程 (`chatStore.ts`)

**实现方式：**
- 非阻塞：不阻塞游戏流程
- 同步显示：等待音频返回后再显示文字和气泡（最多5秒）
- 根据intent确定优先级和声道
- 失败时仍显示文字（无声音）

**代码位置：**
```typescript
// vue-mobile/src/stores/chatStore.ts
// 在initializeAIBrainListener中
if (shouldPlay) {
  await ttsService.speak(event.content, {
    timeout: 5000,
    fallbackTimeout: 5000,
    priority,
    channel
  });
  // 音频返回后显示消息和气泡
  addMessage(newMessage);
  activeBubbles.value.set(event.playerId, newMessage);
}
```

### 4. 工具函数

**`playToSpeechText.ts`：**
- 将出牌（Play）转换为语音文本
- 支持单张、对子、三张、炸弹、墩等所有牌型
- 支持大小王

## 降级策略

```
首选TTS服务器（5秒超时）
  ↓ 失败/超时
降级TTS服务器（5秒超时）
  ↓ 失败/超时
浏览器TTS（2秒超时）
  ↓ 失败/超时
静默失败（仅显示文字，无声音）
```

## 缓存机制

- **缓存键格式：** `tts_{文本}_{声道}`
- **缓存有效期：** 1小时
- **缓存内容：** AudioBuffer、duration、format
- **自动清理：** 支持清除过期缓存

## 测试

### 单元测试

1. **`ttsPlaybackService.test.ts`**
   - 缓存机制测试
   - 超时机制测试
   - 降级机制测试
   - 播放音频测试

2. **`playToSpeechText.test.ts`**
   - 各种牌型转换测试
   - 大小王转换测试
   - 各种点数转换测试

### 集成测试

1. **`ttsPlaybackIntegration.test.ts`**
   - 报牌流程集成测试
   - 聊天流程集成测试
   - 设置集成测试

## 使用示例

### 报牌示例

```typescript
import { getTTSPlaybackService } from '../services/tts/ttsPlaybackService';
import { ChannelType } from '../types/channel';

const ttsService = getTTSPlaybackService();
await ttsService.speak('7个7', {
  timeout: 5000,
  fallbackTimeout: 5000,
  priority: 4,
  channel: ChannelType.ANNOUNCEMENT,
  enableCache: true
});
```

### 聊天示例

```typescript
const ttsService = getTTSPlaybackService();
await ttsService.speak('好牌！', {
  timeout: 5000,
  fallbackTimeout: 5000,
  priority: 1,
  channel: ChannelType.PLAYER_0,
  enableCache: true,
  onEnd: () => {
    // 音频播放完成后显示消息
    showMessage();
  }
});
```

## 注意事项

1. **报牌阻塞游戏：** 报牌必须等待TTS完成才能继续游戏，最多等待10秒
2. **聊天不阻塞：** 聊天消息不阻塞游戏流程，但文字要等音频返回后才显示
3. **超时处理：** 如果TTS超时，会静默失败，继续游戏（避免卡死）
4. **缓存使用：** 相同文本会使用缓存，避免重复调用TTS
5. **降级机制：** 如果主TTS失败，会自动尝试降级TTS和浏览器TTS

## 文件结构

```
vue-mobile/src/
├── services/
│   ├── tts/
│   │   ├── ttsPlaybackService.ts    # TTS播报服务
│   │   ├── ttsService.ts            # TTS服务（已存在）
│   │   └── ...
│   └── multiChannelAudioService.ts  # 多通道音频服务（已增强）
├── stores/
│   ├── gameStore.ts                 # 游戏Store（已修改）
│   └── chatStore.ts                 # 聊天Store（已修改）
└── utils/
    └── playToSpeechText.ts          # 出牌转文本工具
```

## 测试状态

- ✅ 单元测试：`playToSpeechText.test.ts` - 7个测试全部通过
- ⚠️ 单元测试：`ttsPlaybackService.test.ts` - 部分测试需要修复mock
- ⚠️ 集成测试：`ttsPlaybackIntegration.test.ts` - 需要实际游戏环境

## 后续优化

1. 完善单元测试的mock设置
2. 添加性能监控和日志
3. 优化缓存策略（LRU等）
4. 支持预加载常用报牌文本
5. 添加错误重试机制


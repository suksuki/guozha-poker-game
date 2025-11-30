# TTS 多声道实现 Review

## 📋 需求回顾

1. **报牌独占专用声道**：报牌使用 `ANNOUNCEMENT` 声道，优先级最高，可以中断聊天
2. **每个玩家聊天占用独立声道**：每个玩家有自己的声道（PLAYER_0-PLAYER_7）
3. **支持多人同时聊天**：多个玩家可以同时说话，实现真正的多声道

## ✅ 当前实现状态

### 1. 声道定义 ✅

**文件**: `src/types/channel.ts`

```typescript
export enum ChannelType {
  PLAYER_0 = 0,  // 玩家0：左声道
  PLAYER_1 = 1,  // 玩家1：右声道
  PLAYER_2 = 2,  // 玩家2：左中
  PLAYER_3 = 3,  // 玩家3：右中
  PLAYER_4 = 4,  // 玩家4：左环绕
  PLAYER_5 = 5,  // 玩家5：右环绕
  PLAYER_6 = 6,  // 玩家6：左后
  PLAYER_7 = 7,  // 玩家7：右后
  ANNOUNCEMENT = 8  // 报牌：中央声道
}
```

**状态**: ✅ 正确，支持8个玩家 + 1个报牌声道

### 2. 声道配置 ✅

**文件**: `src/services/ttsAudioService.ts`, `src/services/multiChannelVoiceService.ts`

```typescript
const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  [ChannelType.PLAYER_0]: { pan: -0.7, volume: 1.0, name: '玩家0（左）' },
  [ChannelType.PLAYER_1]: { pan: 0.7, volume: 1.0, name: '玩家1（右）' },
  // ... 其他玩家
  [ChannelType.ANNOUNCEMENT]: { pan: 0.0, volume: 1.2, name: '报牌（中央）' }
};
```

**状态**: ✅ 正确，每个声道都有独立的 pan 和 volume 配置

### 3. 报牌使用专用声道 ✅

**文件**: `src/services/voiceService.ts`

```typescript
speakImmediate(text: string, voiceConfig?: VoiceConfig, events?: SpeechPlaybackEvents): Promise<void> {
  return multiChannelVoiceService.speak(
    text, 
    voiceConfig, 
    ChannelType.ANNOUNCEMENT,  // ✅ 使用专用报牌声道
    events,
    4 // ✅ 报牌优先级最高
  );
}
```

**文件**: `src/services/systemAnnouncementService.ts`

```typescript
await voiceService.speakImmediate(text, voiceConfig, { ... });
```

**状态**: ✅ 正确，报牌使用 `ANNOUNCEMENT` 声道，优先级4

### 4. 玩家聊天分配声道 ✅

**文件**: `src/services/voiceService.ts`

```typescript
speak(text: string, voiceConfig?: VoiceConfig, priority: number = 1, playerId?: number, events?: SpeechPlaybackEvents): Promise<void> {
  if (playerId !== undefined) {
    const channel = getPlayerChannel(playerId);  // ✅ 根据玩家ID分配声道
    return multiChannelVoiceService.speak(text, voiceConfig, channel, events, priority);
  }
}
```

**文件**: `src/services/multiChannelVoiceService.ts`

```typescript
export function getPlayerChannel(playerId: number): ChannelType {
  return playerId as ChannelType;  // ✅ 直接映射：玩家0 → PLAYER_0，玩家1 → PLAYER_1
}
```

**状态**: ✅ 正确，每个玩家有自己的声道

### 5. 多声道同时播放 ⚠️

**文件**: `src/services/ttsAudioService.ts`

```typescript
private addToQueue(item: PlayItem): void {
  // 报牌优先级最高，可以中断其他播放
  if (item.channel === ChannelType.ANNOUNCEMENT && item.priority === 4) {
    this.interruptNonAnnouncement();
    this.playAudio(item);
    return;
  }

  // 检查是否可以立即播放
  if (this.currentConcurrentCount < this.config.maxConcurrentSpeakers) {
    this.playAudio(item);
  } else {
    // 加入队列
    this.playQueue.push(item);
    this.playQueue.sort((a, b) => b.priority - a.priority);
  }
}
```

**问题**: ⚠️ 并发控制基于**总并发数**，而不是基于**声道**

**当前行为**:
- `maxConcurrentSpeakers = 2`（默认）
- 如果2个玩家正在聊天，第3个玩家会被加入队列
- 报牌会中断所有非报牌播放，然后立即播放

**期望行为**:
- 每个玩家声道应该可以独立播放（不受其他玩家影响）
- 报牌声道独立，不占用玩家并发数
- 支持最多8个玩家同时聊天（每个玩家一个声道）

## 🔧 问题分析

### 问题1: 并发控制逻辑不完善

**当前实现**:
```typescript
if (this.currentConcurrentCount < this.config.maxConcurrentSpeakers) {
  this.playAudio(item);
}
```

**问题**:
- `currentConcurrentCount` 统计所有声道的播放数
- 如果玩家0和玩家1正在聊天，玩家2会被阻塞
- 但实际上，每个玩家有自己的声道，应该可以同时播放

**建议修复**:
```typescript
// 检查该声道是否正在播放
const isChannelBusy = this.activeSources.has(item.channel);

// 报牌可以中断其他播放
if (item.channel === ChannelType.ANNOUNCEMENT && item.priority === 4) {
  this.interruptNonAnnouncement();
  this.playAudio(item);
  return;
}

// 玩家聊天：如果该声道空闲，立即播放
if (!isChannelBusy) {
  this.playAudio(item);
} else {
  // 该声道正在播放，加入该声道的队列
  this.addToChannelQueue(item);
}
```

### 问题2: 报牌应该独占声道，不占用并发数

**当前实现**: ✅ 报牌已经可以中断其他播放，这是正确的

**建议**: 确保报牌不占用 `maxConcurrentSpeakers` 限制

### 问题3: 每个玩家声道应该独立

**当前实现**: ⚠️ 所有玩家共享 `maxConcurrentSpeakers` 限制

**建议**: 每个玩家声道应该独立，支持最多8个玩家同时聊天

## 📝 改进建议

### 方案1: 基于声道的并发控制（推荐）

**核心思想**: 每个声道独立管理，不共享并发数

```typescript
private addToQueue(item: PlayItem): void {
  // 报牌优先级最高，可以中断其他播放
  if (item.channel === ChannelType.ANNOUNCEMENT && item.priority === 4) {
    this.interruptNonAnnouncement();
    this.playAudio(item);
    return;
  }

  // 检查该声道是否正在播放
  const isChannelBusy = this.activeSources.has(item.channel);
  
  if (!isChannelBusy) {
    // 声道空闲，立即播放
    this.playAudio(item);
  } else {
    // 声道正在播放，加入该声道的队列
    this.addToChannelQueue(item);
  }
}

// 为每个声道维护独立队列
private channelQueues: Map<ChannelType, PlayItem[]> = new Map();

private addToChannelQueue(item: PlayItem): void {
  const queue = this.channelQueues.get(item.channel) || [];
  queue.push(item);
  queue.sort((a, b) => b.priority - a.priority);
  this.channelQueues.set(item.channel, queue);
}
```

### 方案2: 分离报牌和玩家聊天的并发控制

**核心思想**: 报牌和玩家聊天使用不同的并发限制

```typescript
private maxConcurrentPlayers: number = 8;  // 最多8个玩家同时聊天
private maxConcurrentAnnouncements: number = 1;  // 报牌独占

private addToQueue(item: PlayItem): void {
  if (item.channel === ChannelType.ANNOUNCEMENT) {
    // 报牌逻辑
    this.interruptNonAnnouncement();
    this.playAudio(item);
    return;
  }

  // 玩家聊天：检查玩家并发数
  const activePlayers = Array.from(this.activeSources.keys())
    .filter(ch => ch !== ChannelType.ANNOUNCEMENT).length;
  
  if (activePlayers < this.maxConcurrentPlayers) {
    this.playAudio(item);
  } else {
    this.addToChannelQueue(item);
  }
}
```

## ✅ 验证清单

- [x] 报牌使用 `ANNOUNCEMENT` 声道
- [x] 报牌优先级最高（4），可以中断聊天
- [x] 每个玩家有自己的声道（PLAYER_0-PLAYER_7）
- [x] 玩家聊天通过 `playerId` 分配声道
- [x] **每个玩家声道可以独立播放（不受其他玩家影响）** ✅（已修复）
- [x] **支持最多8个玩家同时聊天** ✅（已修复）
- [x] **报牌不占用玩家并发数限制** ✅（已实现）

## 🎯 总结

**当前实现优点**:
1. ✅ 声道定义清晰，支持8个玩家 + 1个报牌
2. ✅ 报牌使用专用声道，优先级最高
3. ✅ 每个玩家有自己的声道配置（pan, volume）
4. ✅ 报牌可以中断其他播放

**已修复**:
1. ✅ 并发控制已改为基于声道，而不是总并发数
2. ✅ 每个玩家声道现在独立，支持多人同时聊天
3. ✅ 每个声道维护独立队列，不共享并发数限制

**实现细节**:
- 采用**方案1**（基于声道的并发控制）✅
- 每个声道独立管理，不共享并发数 ✅
- 支持最多8个玩家同时聊天（每个玩家一个声道）✅
- 报牌独占 `ANNOUNCEMENT` 声道，不占用玩家并发数 ✅

**修改内容**:
1. 将全局 `playQueue` 改为每个声道的独立队列 `channelQueues: Map<ChannelType, PlayItem[]>`
2. `addToQueue()` 现在检查声道是否空闲，而不是总并发数
3. `processQueue()` 改为 `processChannelQueue(channel)`，处理特定声道的队列
4. 每个声道可以独立播放，不受其他声道影响


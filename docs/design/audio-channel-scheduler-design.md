# 声道调度模块设计文档

## 📋 问题分析

### 当前问题

1. **聊天语音串行播放**：当前使用 `isPlayingChat` 标志，一次只播放一个聊天语音，导致：
   - 玩家A说话时，玩家B、C、D的聊天会被加入队列等待
   - 无法实现真正的多声道并发聊天

2. **报牌可能被打断**：虽然报牌使用 `ANNOUNCEMENT` 声道，但实现上可能存在问题：
   - 报牌应该使用独立最高级别的通道
   - 报牌不应该被任何其他内容打断
   - 报牌应该可以中断所有聊天语音

3. **声道分配不清晰**：
   - 没有统一的声道调度策略
   - 玩家聊天和报牌的声道分配逻辑分散在不同地方

## 🎯 设计目标

1. **报牌独立专用通道**：
   - 报牌使用独立的 `ANNOUNCEMENT` 声道
   - **完全独立的播放资源，不与其他任何通道共享**
   - 优先级最高（优先级 10）
   - 可以中断所有其他播放
   - 不能被任何内容打断
   - 报牌通道有自己的队列和状态管理，与玩家通道完全隔离

2. **玩家聊天共享通道**：
   - **玩家聊天共享4个通道（PLAYER_0 到 PLAYER_3）**
   - **4个玩家时，每人一个独立通道，互不打扰**
   - **超过4个玩家时，需要共享通道（按需分配）**
   - 支持真正的多声道并发播放
   - **玩家通道与报牌通道完全隔离，不共享任何资源**

3. **统一的声道调度**：
   - 集中管理所有声道的分配和调度
   - 清晰的优先级策略
   - 统一的播放控制接口
   - **报牌通道和玩家通道完全隔离管理**

## 🏗️ 架构设计

### 1. 声道类型和优先级

```typescript
// 声道类型（已存在）
export enum ChannelType {
  PLAYER_0 = 0,      // 玩家聊天通道0：左声道（共享）
  PLAYER_1 = 1,      // 玩家聊天通道1：右声道（共享）
  PLAYER_2 = 2,      // 玩家聊天通道2：左中（共享）
  PLAYER_3 = 3,      // 玩家聊天通道3：右中（共享）
  // 注意：PLAYER_4 到 PLAYER_7 保留，但聊天时只使用 PLAYER_0 到 PLAYER_3
  PLAYER_4 = 4,      // 保留（未来扩展）
  PLAYER_5 = 5,      // 保留（未来扩展）
  PLAYER_6 = 6,      // 保留（未来扩展）
  PLAYER_7 = 7,      // 保留（未来扩展）
  ANNOUNCEMENT = 8   // 报牌：中央声道（独立专用，最高优先级）
}

// 播放优先级（新增）
export enum PlaybackPriority {
  ANNOUNCEMENT = 10,    // 报牌：最高优先级，可以中断所有其他播放
  QUARREL = 3,          // 对骂：高优先级
  EVENT = 2,            // 事件：中优先级
  CHAT = 1              // 聊天：普通优先级
}
```

### 2. 声道调度器核心接口

```typescript
/**
 * 声道调度器
 * 统一管理所有声道的分配、优先级和播放控制
 */
export class ChannelScheduler {
  /**
   * 请求播放
   * @param request 播放请求
   * @returns Promise<void> 播放完成时resolve
   */
  async requestPlay(request: PlayRequest): Promise<void>;

  /**
   * 中断播放
   * @param channel 要中断的声道（可选，不传则中断所有）
   * @param exceptChannels 排除的声道（不中断这些声道）
   */
  interrupt(channel?: ChannelType, exceptChannels?: ChannelType[]): void;

  /**
   * 检查声道是否正在播放
   * @param channel 声道
   */
  isChannelPlaying(channel: ChannelType): boolean;

  /**
   * 获取声道状态
   * @param channel 声道（可选，不传则返回所有声道状态）
   */
  getChannelStatus(channel?: ChannelType): ChannelStatus | Map<ChannelType, ChannelStatus>;

  /**
   * 获取玩家对应的声道
   * @param playerId 玩家ID
   */
  getPlayerChannel(playerId: number): ChannelType;
}

/**
 * 播放请求
 */
export interface PlayRequest {
  text: string;
  voiceConfig?: VoiceConfig;
  channel: ChannelType;              // 目标声道
  priority: PlaybackPriority;        // 优先级
  type: 'announcement' | 'chat';     // 播放类型
  playerId?: number;                  // 玩家ID（聊天时使用）
  events?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
    estimatedDuration?: number;
  };
}

/**
 * 声道状态
 */
export interface ChannelStatus {
  channel: ChannelType;
  isPlaying: boolean;
  currentText?: string;
  queueLength: number;
  priority: PlaybackPriority;
}
```

### 3. 声道调度策略

#### 3.1 报牌调度策略

```typescript
// 报牌请求处理流程
if (request.type === 'announcement') {
  // 报牌通道完全独立，不与其他通道共享资源
  // 1. 中断所有玩家声道的播放（但不影响报牌通道本身）
  interruptPlayerChannels();
  
  // 2. 处理报牌通道的队列（独立管理）
  if (isAnnouncementChannelPlaying()) {
    // 如果报牌通道正在播放，根据策略处理：
    // 方案A：替换当前播放（后一个替换前一个）
    replaceCurrentAnnouncement(request);
    // 方案B：加入报牌队列
    // addToAnnouncementQueue(request);
  } else {
    // 如果报牌通道空闲，立即播放
    playAnnouncementImmediate(request);
  }
}
```

**特点**：
- 报牌使用 `ANNOUNCEMENT` 声道（ChannelType.ANNOUNCEMENT）
- **完全独立的播放资源，不与其他任何通道共享**
- **报牌通道有自己的队列和状态管理，与玩家通道完全隔离**
- 优先级最高（PlaybackPriority.ANNOUNCEMENT = 10）
- 可以中断所有玩家通道的播放
- 不能被任何内容打断（包括其他报牌，后一个报牌会替换前一个）
- **报牌通道和玩家通道的资源完全隔离，互不影响**

#### 3.2 玩家聊天调度策略

```typescript
// 玩家聊天请求处理流程
if (request.type === 'chat' && request.playerId !== undefined) {
  // 1. 获取玩家对应的声道（4个玩家共享4个通道）
  const channel = getPlayerChannel(request.playerId);
  
  // 2. 检查声道是否正在播放
  if (isChannelPlaying(channel)) {
    // 如果正在播放，检查是否是同一玩家
    const currentPlayer = getCurrentPlayerOnChannel(channel);
    if (currentPlayer === request.playerId) {
      // 同一玩家的多个聊天请求，加入该声道的队列
      addToChannelQueue(channel, request);
    } else {
      // 不同玩家，需要等待或使用其他可用通道
      // 策略：尝试分配其他可用通道，或加入队列等待
      const availableChannel = findAvailableChannel(request.playerId);
      if (availableChannel !== null) {
        playOnChannel(availableChannel, request);
      } else {
        addToChannelQueue(channel, request);
      }
    }
  } else {
    // 如果空闲，立即播放
    playOnChannel(channel, request);
  }
}
```

**特点**：
- **玩家聊天共享4个通道（PLAYER_0 到 PLAYER_3）**
- **4个玩家时，每人一个独立通道，互不打扰**
- **超过4个玩家时，按需分配可用通道**
- 每个通道独立维护自己的队列
- 不同玩家的通道可以同时播放（真正的多声道）
- 同一玩家的多个聊天请求会排队播放
- **玩家通道与报牌通道完全隔离，不共享任何资源**
- 报牌可以中断玩家聊天，但玩家聊天不能中断报牌
- **4个玩家时，每个玩家通道互不干扰，可以同时播放**

#### 3.3 声道分配规则

```typescript
// 玩家聊天通道数量（固定4个）
const CHAT_CHANNEL_COUNT = 4;

// 玩家ID到声道的映射（4个玩家共享4个通道）
function getPlayerChannel(playerId: number): ChannelType {
  // 玩家ID映射到4个聊天通道（0-3对应PLAYER_0到PLAYER_3）
  const channelIndex = playerId % CHAT_CHANNEL_COUNT;
  return channelIndex as ChannelType;
}

// 查找可用通道（用于超过4个玩家时的动态分配）
function findAvailableChannel(playerId: number): ChannelType | null {
  // 优先使用玩家ID对应的通道
  const preferredChannel = getPlayerChannel(playerId);
  if (!isChannelPlaying(preferredChannel)) {
    return preferredChannel;
  }
  
  // 如果首选通道被占用，查找其他可用通道
  for (let i = 0; i < CHAT_CHANNEL_COUNT; i++) {
    const channel = i as ChannelType;
    if (!isChannelPlaying(channel)) {
      return channel;
    }
  }
  
  // 所有通道都被占用，返回null（需要排队）
  return null;
}

// 示例（4个玩家）：
// 玩家0 → PLAYER_0（独立通道）
// 玩家1 → PLAYER_1（独立通道）
// 玩家2 → PLAYER_2（独立通道）
// 玩家3 → PLAYER_3（独立通道）
// 互不打扰，可以同时播放

// 示例（超过4个玩家）：
// 玩家0 → PLAYER_0
// 玩家1 → PLAYER_1
// 玩家2 → PLAYER_2
// 玩家3 → PLAYER_3
// 玩家4 → PLAYER_0（共享，如果PLAYER_0空闲则使用，否则等待或使用其他可用通道）
// 玩家5 → PLAYER_1（共享，如果PLAYER_1空闲则使用，否则等待或使用其他可用通道）
```

### 4. 播放控制流程

```
播放请求
  ↓
检查类型
  ├─ 报牌 → 中断所有非报牌 → 立即播放
  └─ 聊天 → 检查声道状态
      ├─ 声道空闲 → 立即播放
      └─ 声道忙碌 → 加入队列
```

### 5. 中断策略

```typescript
/**
 * 中断策略
 * 注意：报牌通道和玩家通道完全隔离，中断操作不会影响报牌通道
 */
class InterruptStrategy {
  // 报牌中断所有玩家聊天（但不影响报牌通道本身）
  interruptPlayerChannelsForAnnouncement(): void {
    // 只中断玩家聊天通道（PLAYER_0 到 PLAYER_3，共4个通道）
    // 报牌通道（ANNOUNCEMENT）不受影响
    for (let i = 0; i < 4; i++) {
      interruptPlayerChannel(i as ChannelType);
    }
  }

  // 中断指定玩家声道
  interruptPlayerChannel(channel: ChannelType): void {
    // 只处理玩家聊天通道（0-3）
    if (channel >= ChannelType.PLAYER_0 && channel <= ChannelType.PLAYER_3) {
      stopCurrentPlay(channel);
      // 清空队列（可选）
      // clearChannelQueue(channel);
    }
  }

  // 中断报牌通道（仅用于内部管理，外部不应调用）
  private interruptAnnouncementChannel(): void {
    // 报牌通道的独立中断逻辑
    stopCurrentAnnouncement();
  }

  // 中断所有玩家声道（报牌通道不受影响）
  interruptAllPlayerChannels(): void {
    // 只中断玩家聊天通道（0-3，共4个通道）
    for (let i = 0; i < 4; i++) {
      interruptPlayerChannel(i as ChannelType);
    }
  }
}
```

**重要原则**：
- **报牌通道和玩家通道完全隔离**
- 中断玩家通道时，报牌通道不受影响
- 报牌通道有自己的中断逻辑，独立管理

## 📐 模块结构

```
src/services/channelScheduler/
├── index.ts                    # 导出接口
├── ChannelScheduler.ts        # 声道调度器核心类
├── ChannelAllocator.ts        # 声道分配器
├── PlaybackController.ts      # 播放控制器
│   ├── PlayerChannelController.ts    # 玩家通道播放控制器
│   └── AnnouncementChannelController.ts  # 报牌通道播放控制器（独立）
├── InterruptManager.ts         # 中断管理器
└── types.ts                    # 类型定义
```

### 模块职责划分

1. **ChannelScheduler**（声道调度器）：
   - 统一的入口接口
   - 协调各个子模块
   - **分别管理报牌通道和玩家通道的请求队列**

2. **ChannelAllocator**（声道分配器）：
   - 玩家ID到声道的映射（只处理玩家通道）
   - 声道分配策略
   - **报牌通道固定使用 ANNOUNCEMENT，不需要分配**

3. **PlaybackController**（播放控制器）：
   - **PlayerChannelController**：玩家通道的播放控制
   - **AnnouncementChannelController**：报牌通道的播放控制（完全独立）
   - 播放状态跟踪
   - 播放完成回调

4. **InterruptManager**（中断管理器）：
   - 中断策略
   - **报牌通道和玩家通道的中断逻辑完全隔离**
   - 中断优先级处理
   - 中断状态恢复

## 🔄 集成方案

### 1. 与现有服务集成

```typescript
// 在 multiChannelVoiceService 中使用 ChannelScheduler
class MultiChannelVoiceService {
  private channelScheduler: ChannelScheduler;

  async speak(
    text: string,
    voiceConfig?: VoiceConfig,
    channel: ChannelType = ChannelType.PLAYER_0,
    events?: SpeechPlaybackEvents,
    priority: number = 1
  ): Promise<void> {
    // 转换为 PlayRequest
    const request: PlayRequest = {
      text,
      voiceConfig,
      channel,
      priority: mapPriority(priority),
      type: channel === ChannelType.ANNOUNCEMENT ? 'announcement' : 'chat',
      events
    };

    // 使用 ChannelScheduler 调度
    return this.channelScheduler.requestPlay(request);
  }
}
```

### 2. 向后兼容

- 保持现有的 `multiChannelVoiceService.speak()` 接口不变
- 内部使用 `ChannelScheduler` 进行调度
- 逐步迁移现有代码

## 📊 状态管理

### 声道状态

```typescript
interface ChannelState {
  channel: ChannelType;
  isPlaying: boolean;
  currentRequest?: PlayRequest;
  queue: PlayRequest[];
  lastPlayTime: number;
}
```

### 全局状态

```typescript
class ChannelSchedulerState {
  // 玩家聊天声道的状态（PLAYER_0 到 PLAYER_3，共4个通道）
  private playerChannelStates: Map<ChannelType, ChannelState> = new Map();
  
  // 每个通道当前播放的玩家ID（用于判断是否同一玩家）
  private channelCurrentPlayers: Map<ChannelType, number> = new Map();

  // 报牌声道的状态（ANNOUNCEMENT，完全独立）
  private announcementChannelState: ChannelState;

  // 正在播放的玩家声道（0-3）
  private activePlayerChannels: Set<ChannelType> = new Set();

  // 报牌声道是否正在播放（独立管理）
  private isAnnouncementPlaying: boolean = false;

  // 统计信息（分别统计）
  private stats: {
    playerChannelPlays: number;
    announcementPlays: number;
    playerChannelInterrupts: number;
    channelUsage: Map<ChannelType, number>;
  };
}
```

**状态管理原则**：
- **报牌通道和玩家通道的状态完全隔离管理**
- 报牌通道有独立的状态对象，不与其他通道共享
- **玩家聊天通道只有4个（PLAYER_0 到 PLAYER_3）**
- **4个玩家时，每个玩家通道独立，互不干扰**
- **超过4个玩家时，通道共享，需要跟踪每个通道当前播放的玩家**

## 🎛️ 配置选项

```typescript
interface ChannelSchedulerConfig {
  // 是否启用多声道并发播放
  enableConcurrentPlayback: boolean;

  // 每个声道的最大队列长度
  maxQueueLength: number;

  // 报牌是否中断聊天
  announcementInterruptsChat: boolean;

  // 声道配置（pan, volume等）
  channelConfigs: Record<ChannelType, ChannelConfig>;
}
```

## 🧪 测试策略

### 单元测试

1. **声道分配测试**：
   - 测试玩家ID到声道的映射（4个通道）
   - 测试4个玩家时，每人一个独立通道
   - 测试超过4个玩家时的通道共享策略

2. **优先级测试**：
   - 测试报牌中断聊天
   - 测试聊天不能中断报牌

3. **并发播放测试**：
   - 测试4个玩家同时聊天（每人一个独立通道）
   - 测试超过4个玩家时的通道共享
   - 测试报牌和聊天同时播放

### 集成测试

1. **端到端测试**：
   - 4个玩家同时聊天（每人一个独立通道，互不打扰）
   - 超过4个玩家时的通道共享和排队
   - 报牌中断聊天
   - 报牌播放完成后恢复聊天

## 📝 实施计划

### 阶段1：设计确认
- [ ] 评审设计文档
- [ ] 确认接口设计
- [ ] 确认集成方案

### 阶段2：核心实现
- [ ] 实现 ChannelScheduler 核心类
- [ ] 实现 ChannelAllocator
- [ ] 实现 PlaybackController
- [ ] 实现 InterruptManager

### 阶段3：集成测试
- [ ] 与 multiChannelVoiceService 集成
- [ ] 单元测试
- [ ] 集成测试

### 阶段4：迁移和优化
- [ ] 迁移现有代码
- [ ] 性能优化
- [ ] 文档更新

## ❓ 待讨论问题

1. **报牌队列策略**：
   - 如果多个报牌请求同时到达，如何处理？
   - 方案A：后一个替换前一个（当前设计）
   - 方案B：排队播放
   - 方案C：合并相同内容的报牌
   - **注意：报牌通道完全独立，不影响玩家通道**

2. **聊天队列策略**：
   - 同一玩家的多个聊天请求，是否合并？
   - 队列长度限制？
   - **4个玩家时，每个玩家通道独立，互不影响**
   - **超过4个玩家时，通道共享，需要合理的分配策略**

3. **性能考虑**：
   - 报牌通道：独立资源，不占用玩家通道资源
   - 玩家通道：**固定4个通道，最多支持4个玩家同时播放**
   - **4个玩家时，每人一个独立通道，互不打扰**
   - **超过4个玩家时，需要共享通道，可能排队等待**
   - **报牌通道和玩家通道的资源完全隔离，互不影响**

4. **错误处理**：
   - 播放失败时的重试策略？
   - 声道异常时的恢复机制？
   - **报牌通道和玩家通道的错误处理应该独立**

## 🔑 核心设计原则

### 1. 报牌通道完全独立
- **报牌通道（ANNOUNCEMENT）有自己独立的播放资源**
- **不与其他任何通道共享资源**
- **有自己的队列和状态管理**
- **与玩家通道完全隔离**

### 2. 玩家通道共享策略
- **玩家聊天共享4个通道（PLAYER_0 到 PLAYER_3）**
- **4个玩家时，每人一个独立通道，互不打扰**
- **超过4个玩家时，按需分配可用通道**
- **不同玩家通道可以同时播放**
- **玩家通道与报牌通道完全隔离**

### 3. 资源隔离
- **报牌通道和玩家通道的资源完全隔离**
- **报牌通道的播放不影响玩家通道的资源**
- **玩家通道的播放不影响报牌通道的资源**


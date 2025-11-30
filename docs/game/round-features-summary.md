# Round 类功能总结

## 新增功能

### 1. 出牌时间控制 ✅

#### 功能
- **最短间隔**：确保两个玩家出牌之间至少有指定的时间间隔（默认500ms）
- **超时机制**：如果玩家在规定时间内没有出牌，自动触发要不起（默认30秒）

#### 主要方法
- `setTimingConfig(config)` - 设置时间配置
- `canPlayNow(playerIndex)` - 检查是否可以立即出牌
- `waitForMinInterval()` - 等待最短间隔时间
- `startPlayTimer(playerIndex, onTimeout)` - 开始超时计时
- `clearPlayTimer(playerIndex)` - 清除超时计时器
- `getElapsedWaitTime(playerIndex)` - 获取已等待时间

#### 使用示例
```typescript
// 配置时间控制
const round = Round.createNew(1, undefined, {
  minIntervalBetweenPlays: 1000,  // 1秒最短间隔
  playTimeout: 30000,              // 30秒超时
  enabled: true
});

// 检查是否可以出牌
const canPlay = round.canPlayNow(playerIndex);
if (canPlay !== true) {
  await round.waitForMinInterval();  // 等待剩余时间
}

// 开始超时计时
round.startPlayTimer(playerIndex, () => {
  // 超时回调：自动要不起
  handlePlayerPass(playerIndex);
});

// 出牌成功后清除计时器
round.clearPlayTimer(playerIndex);
```

### 2. 异步出牌处理 ✅

#### 功能
确保出牌流程是异步且有序的：
1. 当前玩家出牌
2. 发送到TTS服务器生成语音文件
3. 播放语音
4. 播放完成后，下家才能出牌

#### 主要方法
- `processPlayAsync(playerIndex, processAsync)` - 异步处理出牌
- `hasProcessingPlay()` - 检查是否有正在处理的出牌
- `waitForPlayProcess()` - 等待当前出牌处理完成
- `cancelPlayProcess()` - 取消当前的出牌处理

#### 使用示例
```typescript
// 异步处理出牌
const result = await round.processPlayAsync(playerIndex, async () => {
  // 1. 记录出牌
  round.recordPlay(playRecord, play);
  
  // 2. 生成TTS并播放（等待完成）
  await announcePlay(play, player.voiceConfig);
  // 这里会等待：
  // - TTS服务器生成音频
  // - 音频播放完成
  // - 然后Promise才会resolve
});

if (result.status === 'completed') {
  // 播放完成，可以继续下一家
}
```

## 文件结构

### 核心文件

1. **`src/utils/Round.ts`** - Round 类主文件
   - 包含所有轮次管理逻辑
   - 出牌时间控制
   - 异步出牌处理

2. **`src/utils/roundPlayHandler.ts`** - 便捷处理器
   - 封装完整的出牌处理流程
   - 简化使用

3. **文档**
   - `docs/game/round-component-design.md` - 设计文档
   - `docs/game/round-component-usage.md` - 使用指南
   - `docs/game/round-async-play-usage.md` - 异步出牌使用指南
   - `docs/game/round-features-summary.md` - 功能总结（本文件）

## 完整使用示例

### 示例1：基本使用

```typescript
import { Round } from '../utils/Round';
import { RoundPlayHandler } from '../utils/roundPlayHandler';

// 创建轮次
const round = Round.createNew(1, undefined, {
  minIntervalBetweenPlays: 500,
  playTimeout: 30000,
  enabled: true
});

// 创建处理器
const handler = new RoundPlayHandler(round, players);

// 处理玩家出牌
await handler.processPlay(playerIndex, cards, {
  waitForMinInterval: true,
  enableTimeout: true,
  onTimeout: () => {
    console.log('出牌超时');
    handlePlayerPass(playerIndex);
  },
  onStart: () => {
    console.log('开始处理出牌');
  },
  onComplete: (result) => {
    console.log('出牌处理完成', result);
  }
});
```

### 示例2：集成到游戏逻辑

```typescript
// 在 useMultiPlayerGame 中使用
const playerPlay = async (playerIndex: number, cards: Card[]) => {
  const handler = new RoundPlayHandler(gameState.currentRound, gameState.players);
  
  // 处理出牌
  const result = await handler.processPlay(playerIndex, cards);
  
  if (result.status === 'completed') {
    // 检查是否轮次结束
    const nextPlayerIndex = findNextActivePlayer(playerIndex, players, playerCount);
    if (gameState.currentRound.shouldEnd(nextPlayerIndex)) {
      // 结束轮次
      const { updatedPlayers, nextPlayerIndex: newNext } = gameState.currentRound.end(players, playerCount);
      // 开始新轮次
      const nextRound = Round.createNew(gameState.currentRound.roundNumber + 1);
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        currentRound: nextRound
      }));
    } else {
      // 继续下一家
      setGameState(prev => ({
        ...prev,
        currentPlayerIndex: nextPlayerIndex
      }));
    }
  }
};
```

## 配置选项

### 时间配置

```typescript
interface PlayTimingConfig {
  minIntervalBetweenPlays: number;  // 最短间隔（毫秒）
  playTimeout: number;              // 超时时间（毫秒）
  enabled: boolean;                 // 是否启用
}
```

### 推荐配置

```typescript
// 快速模式（测试）
{ minIntervalBetweenPlays: 200, playTimeout: 10000, enabled: true }

// 正常模式（默认）
{ minIntervalBetweenPlays: 500, playTimeout: 30000, enabled: true }

// 慢速模式（展示）
{ minIntervalBetweenPlays: 2000, playTimeout: 60000, enabled: true }
```

## 工作流程

### 出牌流程

```
1. 玩家出牌
   ↓
2. 检查最短间隔（如果需要，等待）
   ↓
3. 开始超时计时
   ↓
4. 异步处理开始
   ↓
5. 记录出牌到Round
   ↓
6. 发送到TTS服务器生成音频
   ↓
7. 等待音频生成完成
   ↓
8. 播放音频
   ↓
9. 等待播放完成
   ↓
10. 清除超时计时器
   ↓
11. 异步处理完成
   ↓
12. 检查轮次是否结束
   ↓
13. 继续下一家（或结束轮次）
```

## 优势

1. **时间控制**：确保出牌节奏合理，避免过快或过慢
2. **超时保护**：防止玩家长时间不行动导致游戏卡住
3. **异步处理**：确保语音播放完成后再继续，提供更好的游戏体验
4. **可配置**：灵活的时间配置，适应不同场景
5. **可测试**：独立的类，易于单元测试

## 注意事项

1. **异步处理**：所有出牌处理都是异步的，需要正确处理 Promise
2. **超时保护**：建议在等待语音播放时设置超时，避免游戏卡住
3. **错误处理**：异步处理可能失败，需要处理错误情况
4. **资源清理**：轮次结束或游戏结束时，记得清除所有计时器

## 下一步

1. 在实际游戏逻辑中集成 Round 类
2. 测试时间控制和异步处理功能
3. 根据实际使用情况调整配置
4. 添加更多的错误处理和日志


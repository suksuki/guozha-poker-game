# Round 异步出牌和时间控制使用指南

## 概述

Round 类现在支持两个新功能：
1. **出牌时间控制**：两个玩家出牌之间的最短时间间隔和超时机制
2. **异步出牌处理**：出牌 → 生成TTS → 播放语音 → 完成后下家才能出牌

## 1. 出牌时间控制

### 功能说明

- **最短间隔**：确保两个玩家出牌之间至少有指定的时间间隔（默认500ms）
- **超时机制**：如果玩家在规定时间内没有出牌，自动触发要不起（默认30秒）

### 配置时间控制

```typescript
import { Round } from '../utils/Round';

// 创建轮次时配置
const round = Round.createNew(1, undefined, {
  minIntervalBetweenPlays: 1000,  // 最短间隔1秒
  playTimeout: 30000,             // 超时30秒
  enabled: true                   // 启用时间控制
});

// 或修改现有轮次的配置
round.setTimingConfig({
  minIntervalBetweenPlays: 2000,  // 改为2秒
  playTimeout: 60000              // 改为60秒
});
```

### 检查是否可以出牌

```typescript
// 检查是否可以立即出牌
const canPlay = round.canPlayNow(playerIndex);

if (canPlay === true) {
  // 可以立即出牌
  // 处理出牌逻辑
} else {
  // 需要等待，canPlay 返回剩余等待时间（毫秒）
  const waitTime = canPlay;
  console.log(`需要等待 ${waitTime}ms`);
  
  // 等待最短间隔
  await round.waitForMinInterval();
  // 现在可以出牌了
}
```

### 超时检测

```typescript
// 开始出牌计时（在轮到玩家时调用）
round.startPlayTimer(playerIndex, () => {
  // 超时回调：自动要不起
  console.log(`玩家 ${playerIndex} 出牌超时，自动要不起`);
  handlePlayerPass(playerIndex);
});

// 出牌成功后，清除计时器
round.clearPlayTimer(playerIndex);

// 或者记录出牌时自动清除
round.recordPlay(playRecord, play);  // 内部会自动清除计时器
```

### 获取等待时间

```typescript
// 获取玩家已等待的时间（用于显示倒计时）
const elapsedTime = round.getElapsedWaitTime(playerIndex);
const remainingTime = round.getTimingConfig().playTimeout - elapsedTime;

if (remainingTime > 0) {
  console.log(`剩余时间：${remainingTime}ms`);
}
```

## 2. 异步出牌处理

### 功能说明

异步出牌处理确保：
1. 当前玩家出牌
2. 发送到TTS服务器生成语音文件
3. 播放语音
4. 播放完成后，下家才能出牌

这样可以确保语音播放完成后再继续游戏流程。

### 基本使用

```typescript
import { Round } from '../utils/Round';
import { announcePlay } from '../services/systemAnnouncementService';
import { Play } from '../types/card';

// 处理玩家出牌（异步流程）
async function handlePlayerPlay(round: Round, playerIndex: number, play: Play, cards: Card[]) {
  // 检查是否可以出牌（时间控制）
  const canPlay = round.canPlayNow(playerIndex);
  if (canPlay !== true) {
    await round.waitForMinInterval();
  }

  // 创建出牌记录
  const playRecord: RoundPlayRecord = {
    playerId: playerIndex,
    playerName: player.name,
    cards: cards,
    scoreCards: cards.filter(c => isScoreCard(c)),
    score: calculateCardsScore(cards)
  };

  // 异步处理出牌（等待TTS生成和播放完成）
  const result = await round.processPlayAsync(playerIndex, async () => {
    // 1. 记录出牌（更新轮次状态）
    round.recordPlay(playRecord, play);

    // 2. 生成TTS并播放语音（异步等待完成）
    const player = players[playerIndex];
    await announcePlay(play, player.voiceConfig);
    // announcePlay 内部会：
    // - 发送到TTS服务器生成音频
    // - 等待音频生成完成
    // - 播放音频
    // - 等待播放完成
    // - Promise才会resolve
  });

  if (result.status === 'completed') {
    console.log('出牌处理完成，可以继续下一家');
    // 继续游戏流程（下一家出牌）
  } else {
    console.error('出牌处理失败:', result.error);
    // 处理错误
  }
}
```

### 等待正在处理的出牌

```typescript
// 如果当前有正在处理的出牌，等待它完成
if (round.hasProcessingPlay()) {
  console.log('等待上一个出牌处理完成...');
  const result = await round.waitForPlayProcess();
  console.log('上一个出牌处理完成:', result.status);
}

// 现在可以处理新的出牌
await round.processPlayAsync(playerIndex, async () => {
  // 出牌处理逻辑
});
```

### 取消出牌处理

```typescript
// 如果需要取消当前的出牌处理（例如游戏结束）
round.cancelPlayProcess();
```

## 3. 完整示例

### 示例1：在游戏中使用异步出牌处理

```typescript
import { Round } from '../utils/Round';
import { announcePlay, announcePass } from '../services/systemAnnouncementService';
import { voiceService } from '../services/voiceService';

class GameController {
  private round: Round;
  private players: Player[];

  constructor() {
    // 创建轮次，配置时间控制
    this.round = Round.createNew(1, undefined, {
      minIntervalBetweenPlays: 500,   // 最短间隔500ms
      playTimeout: 30000,              // 超时30秒
      enabled: true
    });
  }

  /**
   * 处理玩家出牌
   */
  async handlePlayerPlay(playerIndex: number, cards: Card[]): Promise<void> {
    // 1. 检查是否可以出牌（时间控制）
    const canPlay = this.round.canPlayNow(playerIndex);
    if (canPlay !== true) {
      await this.round.waitForMinInterval();
    }

    // 2. 验证牌型
    const play = canPlayCards(cards);
    if (!play) {
      throw new Error('不合法的牌型');
    }

    // 3. 检查是否能压过上家
    const lastPlay = this.round.getLastPlay();
    if (lastPlay && !canBeat(play, lastPlay)) {
      throw new Error('不能压过上家的牌');
    }

    // 4. 创建出牌记录
    const player = this.players[playerIndex];
    const playRecord: RoundPlayRecord = {
      playerId: playerIndex,
      playerName: player.name,
      cards: cards,
      scoreCards: cards.filter(c => isScoreCard(c)),
      score: calculateCardsScore(cards)
    };

    // 5. 异步处理出牌（等待TTS生成和播放完成）
    const result = await this.round.processPlayAsync(playerIndex, async () => {
      // 5.1 记录出牌
      this.round.recordPlay(playRecord, play);

      // 5.2 生成TTS并播放语音（等待完成）
      await announcePlay(play, player.voiceConfig);
      // 这里会等待：
      // - TTS服务器生成音频
      // - 音频播放完成
      // - 然后Promise才会resolve
    });

    if (result.status === 'completed') {
      console.log(`玩家 ${playerIndex} 出牌完成，耗时 ${result.endTime! - result.startTime}ms`);
      
      // 6. 检查是否轮次结束
      const nextPlayerIndex = this.findNextPlayer(playerIndex);
      if (this.round.shouldEnd(nextPlayerIndex)) {
        this.endRound();
      } else {
        // 7. 继续下一家
        this.waitForNextPlayer(nextPlayerIndex);
      }
    } else {
      console.error('出牌处理失败:', result.error);
      // 处理错误
    }
  }

  /**
   * 处理玩家要不起
   */
  async handlePlayerPass(playerIndex: number): Promise<void> {
    // 1. 记录要不起
    this.round.recordPass(playerIndex);

    // 2. 播放"要不起"语音（等待完成）
    const player = this.players[playerIndex];
    await announcePass(player.voiceConfig);

    // 3. 继续下一家
    const nextPlayerIndex = this.findNextPlayer(playerIndex);
    this.waitForNextPlayer(nextPlayerIndex);
  }

  /**
   * 等待下一个玩家出牌
   */
  waitForNextPlayer(playerIndex: number): void {
    const player = this.players[playerIndex];
    
    // 开始超时计时
    this.round.startPlayTimer(playerIndex, () => {
      // 超时：自动要不起
      console.log(`玩家 ${playerIndex} 出牌超时，自动要不起`);
      this.handlePlayerPass(playerIndex);
    });

    // 如果是AI玩家，自动出牌
    if (player.type === PlayerType.AI) {
      setTimeout(() => {
        this.handleAIPlay(playerIndex);
      }, 1000); // 等待1秒后AI出牌
    }
    // 如果是人类玩家，等待用户操作
  }
}
```

### 示例2：等待语音播放完成

```typescript
// 在 playNextTurn 中使用
const playNextTurn = async () => {
  // 1. 如果当前有正在处理的出牌，等待完成
  if (round.hasProcessingPlay()) {
    console.log('等待上一个出牌处理完成...');
    await round.waitForPlayProcess();
  }

  // 2. 检查是否正在播放语音
  if (voiceService.isCurrentlySpeaking()) {
    console.log('等待语音播放完成...');
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!voiceService.isCurrentlySpeaking()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      
      // 超时保护：5秒后强制继续
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  }

  // 3. 现在可以继续下一个玩家
  const currentPlayer = players[currentPlayerIndex];
  if (currentPlayer.type === PlayerType.AI) {
    // AI自动出牌
    await handleAIPlay(currentPlayerIndex);
  }
  // 人类玩家等待操作
};
```

### 示例3：超时处理

```typescript
// UI组件中显示倒计时
const PlayerTurnDisplay = ({ playerIndex, round }: Props) => {
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = round.getElapsedWaitTime(playerIndex);
      const config = round.getTimingConfig();
      const remaining = config.playTimeout - elapsed;
      setRemainingTime(Math.max(0, remaining));
    }, 100);

    return () => clearInterval(interval);
  }, [playerIndex, round]);

  return (
    <div>
      <div>玩家 {playerIndex} 的回合</div>
      {remainingTime > 0 && (
        <div>
          剩余时间: {(remainingTime / 1000).toFixed(1)} 秒
          <progress value={remainingTime} max={round.getTimingConfig().playTimeout} />
        </div>
      )}
    </div>
  );
};
```

## 4. 集成到现有代码

### 修改 playerPlay 函数

```typescript
// 原来的代码（同步）
const playerPlay = (playerIndex: number, cards: Card[]) => {
  const play = canPlayCards(cards);
  round.recordPlay(playRecord, play);
  announcePlay(play, voiceConfig); // 不等待完成
  // 立即继续下一家
};

// 修改后的代码（异步）
const playerPlay = async (playerIndex: number, cards: Card[]) => {
  // 等待时间控制
  await round.waitForMinInterval();
  
  // 异步处理出牌
  await round.processPlayAsync(playerIndex, async () => {
    const play = canPlayCards(cards);
    round.recordPlay(playRecord, play);
    await announcePlay(play, voiceConfig); // 等待完成
  });
  
  // 播放完成后，继续下一家
};
```

## 5. 注意事项

1. **异步处理不会阻塞UI**：`processPlayAsync` 是异步的，但会等待TTS和播放完成
2. **超时保护**：建议在等待语音播放时设置超时，避免游戏卡住
3. **错误处理**：异步处理可能失败，需要处理错误情况
4. **性能考虑**：TTS生成可能需要一些时间，考虑使用缓存
5. **用户体验**：在等待时可以显示加载状态或倒计时

## 6. 配置建议

### 时间配置建议

```typescript
// 快速模式（测试用）
{
  minIntervalBetweenPlays: 200,
  playTimeout: 10000,  // 10秒
  enabled: true
}

// 正常模式（默认）
{
  minIntervalBetweenPlays: 500,
  playTimeout: 30000,  // 30秒
  enabled: true
}

// 慢速模式（展示用）
{
  minIntervalBetweenPlays: 2000,
  playTimeout: 60000,  // 60秒
  enabled: true
}

// 禁用时间控制（调试用）
{
  enabled: false
}
```

## 7. 流程图

```
玩家出牌
  ↓
检查最短间隔（如果需要等待，等待）
  ↓
开始超时计时
  ↓
异步处理开始
  ↓
记录出牌到Round
  ↓
发送到TTS服务器生成音频
  ↓
等待音频生成完成
  ↓
播放音频
  ↓
等待播放完成
  ↓
清除超时计时器
  ↓
异步处理完成
  ↓
检查轮次是否结束
  ↓
继续下一家（或结束轮次）
```


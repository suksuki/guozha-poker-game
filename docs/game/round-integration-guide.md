# Round 类集成指南

本文档说明如何将 Round 类集成到现有的游戏逻辑中，支持出牌时间控制和异步处理。

## 集成策略

采用渐进式集成，保持向后兼容：

1. **阶段1**：在游戏状态中添加可选的 `currentRound` 字段
2. **阶段2**：在游戏开始时初始化 Round 对象
3. **阶段3**：逐步将出牌逻辑迁移到使用 Round 类
4. **阶段4**：完全迁移后，移除旧的字段

## 步骤1：扩展游戏状态（可选字段）

### 修改 `gameStateUtils.ts`

```typescript
import { Round } from './Round';

export interface MultiPlayerGameState {
  // ... 现有字段 ...
  
  // 新增：Round 对象（可选，保持向后兼容）
  currentRound?: Round;
}
```

### 修改游戏初始化

在 `useMultiPlayerGame.ts` 的 `startGameInternal` 函数中：

```typescript
import { Round } from '../utils/Round';
import { getDefaultTimingConfig } from '../utils/roundIntegration';

const startGameInternal = useCallback((config: GameConfig, hands: Card[][]) => {
  // ... 现有代码 ...
  
  // 创建 Round 对象
  const currentRound = Round.createNew(1, Date.now(), getDefaultTimingConfig());
  
  setGameState({
    status: GameStatus.PLAYING,
    players,
    currentPlayerIndex: firstPlayer,
    lastPlay: null,
    lastPlayPlayerIndex: null,
    winner: null,
    playerCount: config.playerCount,
    totalScore,
    roundScore: 0,
    currentRoundPlays: [],
    roundNumber: 1,
    finishOrder: [],
    initialHands: hands.map(hand => [...hand]),
    allRounds: [],
    // 新增：添加 Round 对象
    currentRound: currentRound,
    gameRecord: {
      // ... 现有代码 ...
    }
  });
}, [playNextTurn]);
```

## 步骤2：创建异步出牌处理函数

### 新增异步 `playerPlay` 函数

在 `useMultiPlayerGame.ts` 中添加：

```typescript
import { RoundPlayHandler } from '../utils/roundPlayHandler';
import { syncRoundToState } from '../utils/roundIntegration';

// 异步出牌处理函数（新版本）
const playerPlayAsync = useCallback(async (
  playerIndex: number, 
  selectedCards: Card[]
): Promise<boolean> => {
  const currentState = gameStateRef.current;
  
  // 如果没有 Round 对象，使用旧逻辑
  if (!currentState.currentRound) {
    console.warn('currentRound 未初始化，使用旧逻辑');
    return playerPlay(playerIndex, selectedCards);
  }

  const round = currentState.currentRound;
  const handler = new RoundPlayHandler(round, currentState.players);

  try {
    // 验证牌型
    const play = canPlayCards(selectedCards);
    if (!play) {
      return false;
    }

    // 检查是否能压过上家
    const lastPlay = round.getLastPlay();
    const isTakingOver = round.isTakingOver(playerIndex);
    
    if (!isTakingOver && lastPlay) {
      if (!canBeat(play, lastPlay)) {
        return false;
      }
    }

    // 创建出牌记录
    const player = currentState.players[playerIndex];
    const playRecord: RoundPlayRecord = {
      playerId: playerIndex,
      playerName: player.name,
      cards: selectedCards,
      scoreCards: selectedCards.filter(c => isScoreCard(c)),
      score: calculateCardsScore(selectedCards)
    };

    // 异步处理出牌
    const result = await handler.processPlay(playerIndex, selectedCards, {
      waitForMinInterval: true,
      enableTimeout: false, // 超时由外部控制
      onStart: () => {
        // 开始处理时的回调
        console.log(`玩家 ${playerIndex} 开始出牌处理`);
      },
      onComplete: async (result) => {
        console.log(`玩家 ${playerIndex} 出牌处理完成`);
        
        // 更新游戏状态（在 onComplete 回调中）
        setGameState(prev => {
          if (!prev.currentRound) return prev;
          
          // 同步 Round 到状态
          const roundUpdate = syncRoundToState(prev.currentRound, prev);
          
          // 更新玩家手牌
          const updatedPlayer = updatePlayerAfterPlay(
            prev.players[playerIndex],
            selectedCards,
            0 // dunScore 由 handleDunScoring 处理
          );
          
          return {
            ...prev,
            ...roundUpdate,
            players: prev.players.map((p, i) => 
              i === playerIndex ? updatedPlayer : p
            )
          };
        });
      },
      onError: (error) => {
        console.error(`玩家 ${playerIndex} 出牌处理失败:`, error);
      }
    });

    if (result.status === 'completed') {
      // 检查是否轮次结束
      const nextPlayerIndex = findNextActivePlayer(
        playerIndex, 
        currentState.players, 
        currentState.playerCount
      );
      
      if (nextPlayerIndex !== null && round.shouldEnd(nextPlayerIndex)) {
        // 结束轮次
        const { updatedPlayers, nextPlayerIndex: newNext } = round.end(
          currentState.players,
          currentState.playerCount
        );
        
        const roundRecord = round.toRecord();
        const nextRound = Round.createNew(round.roundNumber + 1);
        
        setGameState(prev => ({
          ...prev,
          players: updatedPlayers,
          currentRound: nextRound,
          allRounds: [...(prev.allRounds || []), roundRecord]
        }));
      } else {
        // 继续下一家
        setGameState(prev => ({
          ...prev,
          currentPlayerIndex: nextPlayerIndex || prev.currentPlayerIndex
        }));
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('出牌处理失败:', error);
    return false;
  }
}, []);
```

## 步骤3：修改 playNextTurn 以支持异步处理

### 更新 `playNextTurn` 函数

```typescript
const playNextTurn = useCallback(async () => {
  const currentState = gameStateRef.current;
  if (currentState.status !== GameStatus.PLAYING) return;

  // 如果有 Round 对象，等待出牌处理完成
  if (currentState.currentRound?.hasProcessingPlay()) {
    console.log('等待上一个出牌处理完成...');
    await currentState.currentRound.waitForPlayProcess();
  }

  // 等待语音播放完成
  if (voiceService.isCurrentlySpeaking()) {
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!voiceService.isCurrentlySpeaking()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 1000);
    });
  }

  // ... 其余逻辑保持不变 ...
  
  // AI出牌时使用异步处理
  if (currentPlayer.type === PlayerType.AI) {
    // 使用 Round 的时间控制
    if (currentState.currentRound) {
      await currentState.currentRound.waitForMinInterval();
    }
    
    // AI选择出牌
    const aiCards = await aiChoosePlay(/* ... */);
    
    if (aiCards && aiCards.length > 0) {
      // 使用异步出牌
      await playerPlayAsync(currentState.currentPlayerIndex, aiCards);
    } else {
      // 要不起
      await playerPassAsync(currentState.currentPlayerIndex);
    }
  }
}, [playerPlayAsync, playerPassAsync]);
```

## 步骤4：创建异步要不起函数

```typescript
const playerPassAsync = useCallback(async (playerIndex: number): Promise<void> => {
  const currentState = gameStateRef.current;
  
  if (!currentState.currentRound) {
    // 使用旧逻辑
    playerPass(playerIndex);
    return;
  }

  const round = currentState.currentRound;
  const handler = new RoundPlayHandler(round, currentState.players);

  // 异步处理要不起
  await handler.processPass(playerIndex, {
    onStart: () => {
      // 开始处理
    },
    onComplete: () => {
      // 完成后更新状态
      setGameState(prev => {
        if (!prev.currentRound) return prev;
        
        const nextPlayerIndex = findNextActivePlayer(
          playerIndex,
          prev.players,
          prev.playerCount
        );
        
        return {
          ...prev,
          currentPlayerIndex: nextPlayerIndex || prev.currentPlayerIndex
        };
      });
    }
  });
}, []);
```

## 步骤5：导出新的异步函数

在 `useMultiPlayerGame` 的返回值中：

```typescript
return {
  gameState,
  startGame,
  playerPlay,  // 保留旧的同步函数（向后兼容）
  playerPlayAsync,  // 新增异步函数
  playerPass,
  playerPassAsync,  // 新增异步要不起
  playNextTurn,
  // ... 其他返回值 ...
};
```

## 步骤6：在 UI 中使用异步函数

### 修改 `useGameActions.ts`

```typescript
// 处理出牌
const handlePlay = useCallback(async () => {
  if (selectedCards.length === 0 || !humanPlayer) return;

  // 使用异步函数
  if (playerPlayAsync) {
    const success = await playerPlayAsync(humanPlayer.id, selectedCards);
    if (success) {
      clearSelectedCards();
    } else {
      alert('无法出这些牌！请选择合法的牌型。');
    }
  } else {
    // 向后兼容：使用旧的同步函数
    const success = playerPlay(humanPlayer.id, selectedCards);
    if (success) {
      clearSelectedCards();
    }
  }
}, [selectedCards, humanPlayer, playerPlay, playerPlayAsync, clearSelectedCards]);
```

## 配置时间控制

### 在游戏配置中添加

```typescript
export interface GameConfig {
  // ... 现有字段 ...
  
  // 新增：时间控制配置
  timingConfig?: {
    minIntervalBetweenPlays?: number;
    playTimeout?: number;
    enabled?: boolean;
  };
}
```

### 在游戏初始化时使用

```typescript
const timingConfig = config.timingConfig || getDefaultTimingConfig();
const currentRound = Round.createNew(1, Date.now(), timingConfig);
```

## 测试建议

1. **测试时间控制**：验证最短间隔和超时是否正常工作
2. **测试异步处理**：验证TTS生成和播放是否按顺序完成
3. **测试向后兼容**：确保没有 Round 对象时，旧逻辑仍然工作
4. **测试错误处理**：验证各种错误情况的处理

## 迁移检查清单

- [ ] 扩展 `MultiPlayerGameState` 添加 `currentRound?`
- [ ] 在游戏开始时初始化 Round 对象
- [ ] 创建 `playerPlayAsync` 函数
- [ ] 创建 `playerPassAsync` 函数
- [ ] 修改 `playNextTurn` 支持异步处理
- [ ] 在 UI 中使用异步函数
- [ ] 测试时间控制功能
- [ ] 测试异步处理流程
- [ ] 验证向后兼容性

## 注意事项

1. **向后兼容**：保持旧的同步函数可用，确保现有代码不会破坏
2. **错误处理**：异步函数可能失败，需要适当的错误处理
3. **状态同步**：确保 Round 对象和游戏状态保持同步
4. **性能**：异步处理不应该阻塞 UI，但要等待完成后再继续

## 示例：完整的使用流程

```typescript
// 1. 游戏开始，初始化 Round
const round = Round.createNew(1, Date.now(), {
  minIntervalBetweenPlays: 500,
  playTimeout: 30000,
  enabled: true
});

// 2. 玩家出牌（异步）
await playerPlayAsync(playerIndex, cards);

// 3. 内部流程：
// - 等待最短间隔
// - 记录出牌到 Round
// - 生成TTS
// - 播放语音
// - 等待播放完成
// - 更新游戏状态
// - 继续下一家

// 4. 轮次结束
if (round.shouldEnd(nextPlayerIndex)) {
  const { updatedPlayers, nextPlayerIndex } = round.end(players, playerCount);
  const nextRound = Round.createNew(round.roundNumber + 1);
}
```

## 下一步

1. 按照步骤逐步集成
2. 测试每个功能点
3. 根据实际情况调整配置
4. 完全迁移后，移除旧的同步函数


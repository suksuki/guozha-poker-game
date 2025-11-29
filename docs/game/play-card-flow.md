# 每轮出牌流程详解

本文档详细说明游戏中每轮出牌的完整流程。

## 流程概览

```
游戏开始 → 轮次开始 → 玩家出牌 → 检查结果 → 下一个玩家 → 轮次结束/继续
```

## 核心函数

### 1. `playNextTurn()` - 游戏轮次控制器
**位置**: `src/hooks/useMultiPlayerGame.ts:93`

这是游戏的核心循环函数，负责：
- 检查当前游戏状态
- 等待语音播放完成
- 判断当前玩家类型（人类/AI）
- 触发AI出牌逻辑
- 处理托管模式

**关键步骤**:
```typescript
1. 检查游戏状态是否为 PLAYING
2. 等待语音播放完成（如果正在播放）
3. 检查是否只剩一个玩家（游戏结束）
4. 检查当前玩家是否已出完牌（跳过）
5. 如果是人类玩家：
   - 检查是否开启托管
   - 托管模式：自动使用AI建议出牌
   - 非托管：等待玩家手动操作
6. 如果是AI玩家：
   - 准备AI配置（包含所有玩家手牌信息）
   - 调用 aiChoosePlay() 获取AI选择的牌
   - 验证是否有能打过的牌
   - 执行出牌或要不起
```

### 2. `playerPlay()` - 玩家出牌函数
**位置**: `src/hooks/useMultiPlayerGame.ts:1465`

这是处理玩家出牌的核心函数，包含完整的出牌逻辑：

#### 2.1 初始验证
```typescript
- 检查游戏状态是否为 PLAYING
- 检查是否是当前玩家的回合
- 检查玩家是否存在
- 检查玩家是否已出完牌
- 验证选择的牌是否为合法牌型 (canPlayCards)
```

#### 2.2 接风判断
```typescript
// 接风：当前玩家是最后出牌的人，可以自由出牌
const isTakingOver = prev.currentPlayerIndex === prev.lastPlayPlayerIndex;

if (!isTakingOver && prev.lastPlay && !canBeat(play, prev.lastPlay)) {
  // 不能压过上家的牌 → 执行"要不起"逻辑
}
```

#### 2.3 出牌处理流程

**步骤1: 计算分数**
```typescript
const playScore = calculateCardsScore(selectedCards); // 计算这手牌的分值
const scoreCards = selectedCards.filter(card => isScoreCard(card)); // 筛选分牌
```

**步骤2: 计算动画位置**
```typescript
const animationPosition = calculatePlayAnimationPosition(
  playerIndex,
  prev.players,
  prev.players.findIndex(p => p.isHuman),
  prev.playerCount
);
```

**步骤3: 处理墩的计分**
```typescript
const { updatedPlayers: playersAfterDun, dunScore } = handleDunScoring(
  prev.players,
  playerIndex,
  selectedCards,
  prev.playerCount,
  play,
  animationPosition
);
```
- 如果是"墩"（特定牌型），立即给玩家加分数
- 墩的分数不进入轮次分数池

**步骤4: 更新玩家状态**
```typescript
const updatedPlayer = updatePlayerAfterPlay(player, selectedCards, dunScore);
// 更新手牌（移除已出的牌）
// 更新分数（加上墩的分数）
```

**步骤5: 触发反应**
```typescript
// 触发好牌反应（炸弹、墩、有分牌）
triggerGoodPlayReactions(player, play, scoreCards, currentGameState);

// 如果出的是好牌，其他玩家可能对骂
if (play.type === 'bomb' || play.type === 'dun' || scoreCards.length > 0) {
  // 触发对骂反应
  triggerTaunt(otherPlayer, player, currentGameState);
}

// 如果捡到了分，可能触发其他玩家的反应
if (playScore > 0) {
  // 触发被吃分的反应（脏话或抱怨）
  triggerScoreEatenCurseReaction(otherPlayer, lostScore, currentGameState);
}
```

**步骤6: 更新轮次分数**
```typescript
const newRoundScore = prev.roundScore + playScore;
// 分数累加到轮次分数池，不直接给玩家
```

**步骤7: 记录出牌**
```typescript
const playRecord: RoundPlayRecord = createPlayRecord(
  playerIndex,
  player.name,
  selectedCards,
  playScore
);
const updatedCurrentRoundPlays = [...(prev.currentRoundPlays || []), playRecord];
```

**步骤8: 检查是否出完牌**
```typescript
if (updatedPlayer.hand.length === 0) {
  // 玩家出完牌了
  // 1. 记录到完成顺序 (finishOrder)
  // 2. 计算名次
  // 3. 如果只剩一个玩家，立即结束游戏
  // 4. 否则，把轮次分数给获胜者，接风给下一个玩家
}
```

**步骤9: 判断下一个玩家**
```typescript
// 检查是否需要接风（所有剩余玩家都要不起）
let shouldTakeover = true;
for (let i = 0; i < newPlayers.length; i++) {
  // 如果还有人能打过，不清空lastPlay
  if (hasPlayableCards(newPlayers[i].hand, play)) {
    shouldTakeover = false;
    break;
  }
}

if (shouldTakeover) {
  // 接风：清空lastPlay，下一个玩家可以自由出牌
  newLastPlay = null;
  newLastPlayPlayerIndex = null;
} else {
  // 不清空lastPlay，下一个玩家必须压过
  newLastPlay = play;
  newLastPlayPlayerIndex = playerIndex;
}

// 找到下一个还在游戏中的玩家
const nextPlayerIndex = findNextActivePlayer(
  currentState.currentPlayerIndex,
  newPlayers,
  prev.playerCount
);
```

**步骤10: 播放语音**
```typescript
// 播放出牌语音提示
announcePlay(currentPlayerVoice, selectedCards, play).catch(console.error);
```

**步骤11: 更新游戏状态**
```typescript
return {
  ...prev,
  players: newPlayers,
  currentPlayerIndex: nextPlayerIndex,
  lastPlay: newLastPlay,
  lastPlayPlayerIndex: newLastPlayPlayerIndex,
  roundScore: newRoundScore,
  currentRoundPlays: updatedCurrentRoundPlays,
  finishOrder: newFinishOrder
};
```

**步骤12: 继续下一轮**
```typescript
// 如果下一个玩家是AI，自动继续
if (newPlayers[nextPlayerIndex]?.type === PlayerType.AI) {
  setTimeout(() => {
    playNextTurn();
  }, 1500); // 等待1.5秒后继续
}
```

### 3. `playerPass()` - 要不起函数
**位置**: `src/hooks/useMultiPlayerGame.ts:2052`

当玩家选择"要不起"时：

```typescript
1. 检查是否是当前玩家的回合
2. 验证是否真的没有能打过的牌（接风除外）
3. 找到下一个玩家
4. 检查是否所有人都要不起：
   - 如果是 → 结束本轮，分数给最后出牌的人，开始下一轮
   - 如果否 → 继续游戏，下一个玩家必须压过
5. 播放"要不起"语音
6. 如果下一个玩家是AI，自动继续
```

## 轮次结束逻辑

### 什么时候轮次结束？

1. **所有人都要不起最后一手牌**
   - 最后出牌的人获得本轮所有分数
   - 由最后出牌的人（或其下一个还在游戏中的玩家）开始下一轮

2. **有人出完牌，且轮次分数需要结算**
   - 把轮次分数给获胜者
   - 接风给下一个还在游戏中的玩家

### 轮次结束时的操作

```typescript
// 1. 创建轮次记录
const roundRecord: RoundRecord = {
  roundNumber: prev.roundNumber,
  plays: [...prev.currentRoundPlays],
  totalScore: prev.roundScore,
  winnerId: lastPlayPlayerIndex,
  winnerName: lastPlayer.name
};

// 2. 分配分数
newPlayers[lastPlayPlayerIndex] = {
  ...lastPlayer,
  score: (lastPlayer.score || 0) + prev.roundScore
};

// 3. 重置轮次状态
currentPlayerIndex: nextActivePlayerIndex, // 由赢家开始
lastPlay: null, // 清空
lastPlayPlayerIndex: null, // 清空
roundScore: 0, // 重置
currentRoundPlays: [], // 清空
roundNumber: prev.roundNumber + 1, // 递增
```

## 接风逻辑

### 什么是接风？

**接风**：当所有剩余玩家都要不起最后一手牌时，清空 `lastPlay`，下一个玩家可以自由出任意牌型。

### 接风判断

```typescript
// 检查是否所有剩余玩家都要不起
let shouldTakeover = true;
for (let i = 0; i < players.length; i++) {
  if (players[i].hand.length > 0) {
    if (hasPlayableCards(players[i].hand, lastPlay)) {
      shouldTakeover = false; // 还有人能打过，不接风
      break;
    }
  }
}

if (shouldTakeover) {
  // 接风：清空lastPlay
  lastPlay = null;
  lastPlayPlayerIndex = null;
  // 下一个玩家可以自由出牌
}
```

### 接风时的特殊规则

1. **可以要不起**：接风时，即使没有上家出牌，玩家也可以选择"要不起"（相当于跳过）

2. **可以出任意牌型**：不受上家牌型限制

## 游戏结束逻辑

### 什么时候游戏结束？

1. **只剩一个玩家还没出完牌**
   - 最后一名被确定
   - 最后一名未出的分牌分数被扣除
   - 第二名获得最后一名未出的分牌分数
   - 应用最终游戏规则（计算最终排名）

2. **所有玩家都出完牌**
   - 计算最终排名
   - 应用最终游戏规则

### 游戏结束时的操作

```typescript
// 1. 处理最后一名
- 扣除未出的分牌分数
- 加分给第二名

// 2. 应用最终规则
const { players: finalPlayers, rankings: finalRankings } = applyFinalGameRules(
  players,
  finishOrder
);

// 3. 计算最终排名
const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];

// 4. 更新游戏状态
status: GameStatus.FINISHED
winner: winner.player.id
finalRankings: finalRankings
```

## 完整的出牌流程示例

### 示例1: 正常出牌流程

```
1. 玩家A出牌: [5♥, 5♦, 5♣]
   - 验证牌型: 三带二（不合法）→ 失败
   - 重新选择: [5♥, 5♦, 5♣, K♠, K♥]
   - 验证牌型: 三带二（合法）✓
   - 检查是否压过: 无上家 → 直接出
   - 计算分数: 0分（无分牌）
   - 更新手牌: 移除这5张牌
   - 更新状态: lastPlay = 三带二, lastPlayPlayerIndex = A
   - 轮次分数: 0分
   - 下一个玩家: B（必须压过或要不起）

2. 玩家B要不起
   - 验证: 确实没有能压过的牌 ✓
   - 下一个玩家: C

3. 玩家C出牌: [6♥, 6♦, 6♣, A♠, A♥]
   - 验证牌型: 三带二（合法）✓
   - 检查是否压过: 6 > 5 ✓
   - 计算分数: 0分
   - 更新状态: lastPlay = 三带二(6), lastPlayPlayerIndex = C
   - 下一个玩家: A

4. 玩家A要不起
   - 下一个玩家: B

5. 玩家B要不起
   - 检查: 所有人都要不起
   - 接风: 清空lastPlay
   - 分配分数: 本轮0分，无人获得
   - 下一轮: 由C开始（或C的下一个还在游戏中的玩家）
```

### 示例2: 有分牌的出牌流程

```
1. 玩家A出牌: [K♥, K♦]（有分牌）
   - 计算分数: +5分（K是分牌）
   - 轮次分数: 5分（累加到池中）
   - 触发反应: 其他玩家可能抱怨/对骂

2. 玩家B出牌: [A♠, A♥]（压过）
   - 计算分数: +5分（A是分牌）
   - 轮次分数: 10分（累加）
   - 触发反应: A可能抱怨

3. 玩家C要不起

4. 玩家A要不起

5. 玩家B要不起（最后一个）
   - 检查: 所有人都要不起
   - 分配分数: 10分给B（最后出牌的人）
   - 下一轮开始
```

### 示例3: 出完牌的流程

```
1. 玩家A还剩最后2张: [5♥, 5♦]
   - 出牌: [5♥, 5♦]
   - 检查: hand.length === 0 → 出完牌了
   - 记录: finishOrder.push(A)
   - 名次: 第1名（第一个出完）
   - 检查剩余玩家: 还有B和C

2. 分配轮次分数
   - 当前轮次分数: 15分
   - 给A: A.score += 15

3. 接风
   - 下一个玩家: B（可以自由出牌）
   - lastPlay = null

4. 继续游戏
   - B自由出牌
   - 直到只剩C（最后一名）
```

## 关键数据流

### 游戏状态 (GameState)

```typescript
{
  status: GameStatus.PLAYING,
  currentPlayerIndex: number,        // 当前玩家索引
  lastPlay: Play | null,             // 上家出的牌
  lastPlayPlayerIndex: number | null, // 上家玩家索引
  roundScore: number,                 // 当前轮次累计分数
  roundNumber: number,                // 当前轮次编号
  currentRoundPlays: RoundPlayRecord[], // 当前轮次出牌记录
  players: Player[],                  // 所有玩家
  finishOrder: number[],              // 出完牌的顺序
  allRounds: RoundRecord[]            // 所有轮次记录
}
```

### 轮次记录 (RoundRecord)

```typescript
{
  roundNumber: number,
  plays: RoundPlayRecord[],  // 本轮所有出牌记录
  totalScore: number,        // 本轮总分数
  winnerId: number,          // 获胜者ID
  winnerName: string         // 获胜者名称
}
```

### 出牌记录 (RoundPlayRecord)

```typescript
{
  playerIndex: number,
  playerName: string,
  timestamp: number,
  cards: Card[],
  playType: string,
  scoreCards: Card[],
  score: number
}
```

## 重要注意事项

1. **分数结算时机**
   - 分牌分数：出牌时累加到 `roundScore`，不直接给玩家
   - 墩的分数：立即给玩家，不计入 `roundScore`
   - 轮次分数：轮次结束时给最后出牌的人

2. **强制出牌规则**
   - 如果有能打过的牌，必须出牌（不能要不起）
   - 接风时可以自由出牌，也可以要不起

3. **语音播放**
   - 出牌时播放语音提示
   - 要不起时播放"要不起"语音
   - 等待语音播放完成后继续（AI自动出牌时）

4. **游戏状态更新**
   - 所有状态更新都是原子性的（通过 setGameState）
   - 状态更新后自动触发下一轮（AI自动出牌）

5. **错误处理**
   - 如果出牌不合法，返回原状态（prev）
   - 如果玩家已出完，跳过该玩家
   - 如果游戏已结束，不再处理出牌

## 相关文件

- `src/hooks/useMultiPlayerGame.ts` - 主要游戏逻辑
- `src/hooks/useGameActions.ts` - UI操作处理
- `src/utils/cardUtils.ts` - 牌型验证和比较
- `src/utils/playManager.ts` - 出牌记录管理
- `src/utils/gameFinishManager.ts` - 游戏结束处理


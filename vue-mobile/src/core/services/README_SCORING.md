# 计分系统服务 (Scoring Service)

## 概述

`scoringService.ts` 是一个独立的计分系统模块，统一管理所有计分相关的逻辑。该模块将原本分散在多个文件中的计分功能整合在一起，提供清晰的接口和统一的计分规则。

## 功能模块

### 1. 基础计分功能

- `isScoreCard(card: Card): boolean` - 判断是否是分牌（5、10、K）
- `getCardScore(card: Card): number` - 获取单张牌的分值
- `calculateCardsScore(cards: Card[]): number` - 计算一组牌的总分值
- `calculateDunCount(cardCount: number): number` - 计算墩的数量
- `calculateDunScore(dunCount, totalPlayers, dunPlayerIndex): DunScoreResult` - 计算墩的分数

### 2. 出牌时计分

- `handleDunScoring(...): DunScoringResult` - 处理墩的计分逻辑
- `updatePlayerAfterPlay(...): Player` - 更新玩家出牌后的分数和手牌

### 3. 轮次结束计分

- `handleRoundEnd(...): RoundEndResult | null` - 处理一轮结束时的分数分配

### 4. 游戏结束计分

- `handlePlayerFinished(...): PlayerFinishedResult` - 处理玩家出完牌后的分数分配
- `calculateFinalRankings(...): PlayerRanking[]` - 计算游戏结束时的最终排名和分数
- `applyFinalGameRules(...): Player[]` - 在游戏结束时应用最终规则并更新玩家分数
- `getPlayerRanking(...): PlayerRanking | undefined` - 获取玩家的排名信息

## 计分规则

### 初始分数
- 游戏开始时，所有玩家的初始分数都是 **0分**
- 游戏过程中，玩家通过捡分和出墩获得分数
- **游戏结束时，每个玩家扣除基本分100**（在团队模式清算中执行）
- 最终分数 = 捡到的分 + 墩的分 - 100（基本分）

### 分牌规则
- **5** = 5分
- **10** = 10分
- **K** = 10分

### 轮次结束计分
- **每轮牌结束，获胜的玩家捡走这一轮牌所有的分**
- 当所有玩家都要不起，回到最后出牌的人时，分配分数并开始新轮次

### 墩的计分规则
- 7张 = 1墩 (2^0)
- 8张 = 2墩 (2^1)
- 9张 = 4墩 (2^2)
- 10张 = 8墩 (2^3)
- 11张 = 16墩 (2^4)
- ...

**每一墩，可以从别的玩家获得30分**
- 例如：5个玩家，出1墩 = 其他4个玩家每人扣30分，出墩玩家获得120分
- 例如：5个玩家，出2墩 = 其他4个玩家每人扣60分，出墩玩家获得240分
- 例如：5个玩家，出4墩 = 其他4个玩家每人扣120分，出墩玩家获得480分

### 游戏结束计分规则

#### 个人模式
1. 首先按手牌数量排序确定排名（手牌少的在前，手牌数相同时先出完的在前）
2. 基于排名：**第一名+30分，最后一名-30分**
3. **如果最后一名手上有未出的分牌，要给第二名**
   - 例如：一局牌结束，最后一名手上还有一个K，一个10未出，那么这20分属于第二名
4. 最终排名以分数为准（分数高的排名靠前）

#### 团队模式（2v2或3v3）
1. **游戏结束条件**：某个团队的所有队员都出完牌
2. **被关玩家排序**：按手牌数量排序（手牌少的排名更前）
3. **关单/关双判定**：
   - 关单：1个玩家未出完 → 该玩家-30分，第一名+30分
   - 关双：2个玩家未出完 → 每人-15分，第一名+30分
4. **手牌分转移**：
   - 正常：最后一名手牌分 → 第一名
   - 关单/关双：被关玩家手牌分 → 第一名
   - 特例：如果第一名和最后一名是队友，跳过转移
5. **未出分牌**：所有未出完的玩家手中的分牌 → 第二名
6. **最终分数**：手牌分（转移后） + 墩分 - 100（基本分）
7. **团队分数**：所有队员的最终分数之和
8. **团队规则**：获胜团队+30分，失败团队-30分

## 使用示例

```typescript
import {
  isScoreCard,
  calculateCardsScore,
  handleDunScoring,
  handleRoundEnd,
  calculateFinalRankings
} from './services/scoringService';

// 判断是否是分牌
const isScore = isScoreCard(card);

// 计算一组牌的总分值
const totalScore = calculateCardsScore(cards);

// 处理墩的计分
const { updatedPlayers, dunScore } = handleDunScoring(
  players,
  playerIndex,
  cards,
  playerCount,
  play
);

// 计算最终排名
const rankings = calculateFinalRankings(players, finishOrder);
```

## 迁移说明

该模块整合了以下文件中的计分功能：
- `src/utils/cardUtils.ts` - 基础计分功能
- `src/utils/playManager.ts` - 出牌时计分
- `src/utils/roundManager.ts` - 轮次结束计分
- `src/utils/gameFinishManager.ts` - 游戏结束计分
- `src/utils/gameRules.ts` - 最终排名计算

在迁移过程中，需要逐步更新现有代码以使用新的计分服务。


# 数据收集层使用指南

数据收集层用于追踪玩家操作、AI决策和生成训练数据。

## 快速开始

### 1. 追踪游戏会话

```typescript
import { AIControlCenter } from '../AIControlCenter';
import { Player } from '../../../types/card';

const aiControl = AIControlCenter.getInstance();
const dataLayer = aiControl.getDataCollectionLayer();
const tracker = dataLayer.getPlayerActionTracker();

// 开始追踪游戏
tracker.startTrackingGame('game_123', players, {
  deckCount: 1,
  rules: {},
  difficulty: 'medium'
});

// 开始新回合
tracker.startRound('game_123', 1);

// 记录玩家操作
tracker.recordAction({
  roundNumber: 1,
  playerId: 0,
  playerName: '玩家1',
  playerType: 'human',
  actionType: 'playCard',
  actionData: {
    cards: selectedCards,
    playType: 'pair',
    score: 5
  },
  gameState: {
    currentRound: 1,
    playerHand: currentHand,
    playerHandCount: currentHand.length,
    playedCards: [],
    lastPlay: lastPlay,
    lastPlayPlayerId: lastPlayerId,
    roundScore: 10,
    playerScore: 5,
    turnOrder: [0, 1, 2, 3],
    finishedPlayers: []
  }
});

// 结束回合
tracker.endRound('game_123', 1, {
  winnerId: 0,
  winnerName: '玩家1',
  points: { 0: 10 },
  totalScore: 10
});

// 结束游戏
const session = tracker.endGame('game_123', {
  winnerId: 0,
  winnerName: '玩家1',
  finalScores: { 0: 50, 1: 30, 2: 20, 3: 0 },
  finalRankings: [
    { playerId: 0, playerName: '玩家1', score: 50, rank: 1 },
    { playerId: 1, playerName: '玩家2', score: 30, rank: 2 },
    // ...
  ],
  players: finalPlayers
});
```

### 2. 追踪AI决策

```typescript
const aiDecisionTracker = dataLayer.getAIDecisionTracker();

// 生成决策ID
const decisionId = aiDecisionTracker.generateDecisionId();

// 开始追踪
aiDecisionTracker.startTrackingDecision(decisionId, {
  gameState: {
    playerHand: aiHand,
    lastPlay: lastPlay,
    lastPlayPlayerId: lastPlayerId,
    roundScore: 10,
    playerScore: 5,
    currentPlayerIndex: 0,
    playerCount: 4
  },
  availableActions: availableActions
});

// 记录策略评估
aiDecisionTracker.recordStrategyEvaluation(decisionId, {
  strategy: 'aggressive',
  score: 0.8,
  reasoning: '当前分数较高，应该积极抢分'
});

// 记录MCTS数据
aiDecisionTracker.recordMCTSData(decisionId, {
  simulations: 1000,
  treeDepth: 10,
  bestPath: {
    nodes: 50,
    depth: 8,
    score: 0.75
  }
});

// 记录最终决策
aiDecisionTracker.recordFinalDecision(decisionId, {
  action: {
    cards: selectedCards,
    play: play
  },
  confidence: 0.85,
  expectedValue: 0.8,
  alternatives: [
    {
      cards: altCards,
      play: altPlay,
      score: 0.7,
      reason: '备选方案1'
    }
  ]
});

// 记录结果
aiDecisionTracker.recordResult(decisionId, {
  actualValue: 0.75,
  accuracy: 0.9,
  gameStateAfter: newGameState
});

// 完成追踪
const decision = aiDecisionTracker.completeTracking(decisionId);
```

### 3. 生成训练数据

```typescript
const generator = dataLayer.getTrainingDataGenerator();

// 从游戏会话生成训练数据
const session = tracker.getSession('game_123');
const trainingData = generator.generateFromSession(session);

// 从AI决策生成训练数据
const decision = aiDecisionTracker.getDecision(decisionId);
if (decision) {
  const trainingData = generator.generateFromAIDecision(decision);
}

// 导出训练数据
const jsonData = await generator.exportTrainingData(trainingData, 'json');
const csvData = await generator.exportTrainingData(trainingData, 'csv');
const jsonlData = await generator.exportTrainingData(trainingData, 'jsonl');

// 生成教程数据
const sessions = tracker.getAllSessions();
const tutorialData = generator.generateTutorialData(sessions);
```

## 数据结构

### PlayerAction（玩家操作）

包含完整的操作信息：
- 基础信息（ID、时间戳、游戏ID等）
- 玩家信息（ID、名称、类型）
- 操作信息（类型、牌、得分等）
- 上下文信息（游戏状态、手牌等）
- AI决策信息（如果是AI玩家）
- 结果信息（操作后的状态）

### AIDecisionData（AI决策）

包含完整的决策过程：
- 决策上下文（游戏状态、可用操作）
- 决策过程（策略评估、MCTS数据、LLM调用等）
- 最终决策（选择的动作、置信度、备选方案）
- 结果验证（实际值、准确性）

### GameSession（游戏会话）

包含完整的游戏信息：
- 游戏配置
- 玩家信息
- 完整操作序列
- 回合信息
- 游戏结果
- 教学价值评估

## 集成建议

### 在游戏逻辑中集成

```typescript
// 在出牌函数中
async function playCards(playerId: number, cards: Card[]) {
  // ... 游戏逻辑 ...
  
  // 记录操作
  const tracker = aiControl.getDataCollectionLayer().getPlayerActionTracker();
  tracker.recordAction({
    roundNumber: currentRound,
    playerId,
    playerName: player.name,
    playerType: player.type === PlayerType.AI ? 'ai' : 'human',
    actionType: 'playCard',
    actionData: {
      cards,
      playType: play.type,
      score: score
    },
    gameState: {
      // ... 游戏状态 ...
    }
  });
}
```

### 在AI决策中集成

```typescript
// 在AI选择出牌时
async function aiChoosePlay(hand: Card[], lastPlay: Play | null) {
  const aiDecisionTracker = aiControl.getDataCollectionLayer().getAIDecisionTracker();
  const decisionId = aiDecisionTracker.generateDecisionId();
  
  // 开始追踪
  aiDecisionTracker.startTrackingDecision(decisionId, {
    // ... 上下文 ...
  });
  
  // ... AI决策逻辑 ...
  
  // 记录决策过程
  aiDecisionTracker.recordMCTSData(decisionId, mctsData);
  aiDecisionTracker.recordFinalDecision(decisionId, finalDecision);
  
  // 完成追踪
  aiDecisionTracker.completeTracking(decisionId);
  
  return selectedCards;
}
```

## 注意事项

1. **性能影响**：数据收集是异步的，不会阻塞游戏
2. **存储空间**：大量数据会占用存储空间，建议定期清理
3. **隐私保护**：确保不收集敏感信息
4. **数据质量**：确保收集的数据准确完整


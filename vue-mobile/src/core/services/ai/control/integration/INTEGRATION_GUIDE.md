# AI中控系统游戏集成指南

本文档说明如何在游戏逻辑中集成AI中控系统的数据追踪功能。

## 快速开始

### 1. 导入集成服务

```typescript
import { getGameIntegration } from './GameIntegration';
```

### 2. 在游戏开始时追踪

在 `Game.startNewGame()` 或 `Game.createAndStartNewGame()` 中添加：

```typescript
// src/utils/Game.ts

import { getGameIntegration } from '../services/ai/control/integration/GameIntegration';

static createAndStartNewGame(
  config: Game['config'],
  hands: Card[][],
  previousAutoPlayState: boolean = false
): Game {
  const newGame = new Game(config);
  newGame.setAutoPlay(previousAutoPlayState);
  newGame.startNewGame(hands);
  newGame.initializeTracking(hands);
  
  // 集成AI中控系统：开始追踪游戏
  const gameIntegration = getGameIntegration();
  const gameId = `game_${Date.now()}`;
  gameIntegration.startTrackingGame(gameId, newGame.players, {
    deckCount: config.deckCount || 1,
    rules: {},
    difficulty: 'medium'
  });
  // 保存gameId到Game实例，以便后续使用
  (newGame as any).aiControlGameId = gameId;
  
  return newGame;
}
```

### 3. 在出牌时追踪

在 `Game.playCards()` 中添加：

```typescript
// src/utils/Game.ts

async playCards(playerIndex: number, selectedCards: Card[]): Promise<boolean> {
  // ... 现有逻辑 ...
  
  const round = this.getCurrentRound();
  const player = this.players[playerIndex];
  
  // 集成AI中控系统：记录玩家操作
  const gameIntegration = getGameIntegration();
  const gameId = (this as any).aiControlGameId;
  
  if (gameId && round) {
    const lastPlay = round.getLastPlay();
    const lastPlayPlayerId = round.getLastPlayPlayerIndex();
    
    gameIntegration.recordPlayerAction(
      gameId,
      round.roundNumber,
      playerIndex,
      player,
      selectedCards,
      canPlayCards(selectedCards),
      {
        currentRound: round.roundNumber,
        playerHand: [...player.hand], // 操作前的手牌
        lastPlay,
        lastPlayPlayerId,
        roundScore: round.getTotalScore(),
        playerScore: player.score || 0,
        turnOrder: this.players.map((_, i) => i),
        finishedPlayers: this.finishOrder
      },
      (this as any).currentAIDecisionId // 如果有AI决策ID
    );
  }
  
  // ... 继续现有逻辑 ...
}
```

### 4. 在AI决策时追踪

在AI选择出牌的地方（如 `aiChoosePlay` 或 MCTS 调用处）添加：

```typescript
// src/utils/aiPlayer.ts 或相关文件

import { getGameIntegration } from '../services/ai/control/integration/GameIntegration';

export async function aiChoosePlay(
  hand: Card[],
  lastPlay: Play | null,
  config: Partial<AIConfig> = {}
): Promise<Card[] | null> {
  const gameIntegration = getGameIntegration();
  
  // 开始追踪AI决策
  const decisionId = gameIntegration.startTrackingAIDecision(playerId, {
    gameState: {
      playerHand: hand,
      lastPlay,
      lastPlayPlayerId: lastPlayerId,
      roundScore: currentRoundScore,
      playerScore: currentPlayerScore,
      currentPlayerIndex: playerIndex,
      playerCount: playerCount
    },
    availableActions: availableActions
  });
  
  // 保存decisionId，以便在出牌时关联
  (config as any).decisionId = decisionId;
  
  try {
    // 如果使用MCTS
    if (config.algorithm === 'mcts') {
      // 记录MCTS数据
      const mctsResult = await runMCTS(hand, lastPlay, config);
      
      gameIntegration.recordAIMCTSData(decisionId, {
        simulations: mctsResult.simulations,
        treeDepth: mctsResult.treeDepth,
        bestPath: mctsResult.bestPath
      });
    }
    
    // 记录策略评估
    gameIntegration.recordAIStrategyEvaluation(decisionId, {
      strategy: config.strategy || 'balanced',
      score: evaluationScore,
      reasoning: '策略评估理由'
    });
    
    // 选择最佳动作
    const selectedCards = selectBestAction(hand, lastPlay, config);
    
    // 记录最终决策
    gameIntegration.recordAIFinalDecision(decisionId, {
      action: {
        cards: selectedCards,
        play: canPlayCards(selectedCards)!
      },
      confidence: confidenceScore,
      expectedValue: expectedValue,
      alternatives: consideredAlternatives
    });
    
    // 完成追踪
    gameIntegration.completeAIDecisionTracking(decisionId);
    
    return selectedCards;
  } catch (error) {
    // 即使失败也要完成追踪
    gameIntegration.completeAIDecisionTracking(decisionId);
    throw error;
  }
}
```

### 5. 在回合结束时追踪

在回合结束的地方添加：

```typescript
// 在Round结束或Game处理回合结束的地方

const gameIntegration = getGameIntegration();
const gameId = (game as any).aiControlGameId;

if (gameId && round.isEnded()) {
  gameIntegration.endRound(gameId, round.roundNumber, {
    winnerId: round.getWinnerId(),
    winnerName: round.getWinnerName(),
    points: round.getPoints(),
    totalScore: round.getTotalScore()
  });
}
```

### 6. 在游戏结束时追踪

在游戏结束的地方添加：

```typescript
// 在Game.calculateFinalRankings() 或游戏结束处理的地方

const gameIntegration = getGameIntegration();
const gameId = (game as any).aiControlGameId;

if (gameId) {
  gameIntegration.endGame(gameId, {
    winnerId: game.winner || 0,
    winnerName: game.players[game.winner || 0]?.name || '',
    finalScores: game.players.reduce((acc, p, i) => {
      acc[i] = p.score || 0;
      return acc;
    }, {} as Record<number, number>),
    finalRankings: game.finalRankings || [],
    players: game.players
  });
}
```

## 完整集成示例

### 在Game类中集成

```typescript
// src/utils/Game.ts

import { getGameIntegration } from '../services/ai/control/integration/GameIntegration';

export class Game {
  private aiControlGameId: string | null = null;
  
  startNewGame(hands: Card[][]): number {
    // ... 现有逻辑 ...
    
    // 集成AI中控系统
    const gameIntegration = getGameIntegration();
    this.aiControlGameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    gameIntegration.startTrackingGame(this.aiControlGameId, this.players, {
      deckCount: this.config.deckCount || 1,
      rules: {},
      difficulty: 'medium'
    });
    
    // ... 继续现有逻辑 ...
  }
  
  async playCards(playerIndex: number, selectedCards: Card[]): Promise<boolean> {
    // ... 现有逻辑 ...
    
    // 集成AI中控系统：记录操作
    if (this.aiControlGameId) {
      const gameIntegration = getGameIntegration();
      const round = this.getCurrentRound();
      const player = this.players[playerIndex];
      
      if (round && player) {
        gameIntegration.recordPlayerAction(
          this.aiControlGameId,
          round.roundNumber,
          playerIndex,
          player,
          selectedCards,
          canPlayCards(selectedCards),
          {
            currentRound: round.roundNumber,
            playerHand: [...player.hand],
            lastPlay: round.getLastPlay(),
            lastPlayPlayerId: round.getLastPlayPlayerIndex(),
            roundScore: round.getTotalScore(),
            playerScore: player.score || 0,
            turnOrder: this.players.map((_, i) => i),
            finishedPlayers: this.finishOrder
          }
        );
      }
    }
    
    // ... 继续现有逻辑 ...
  }
  
  calculateFinalRankings(): void {
    // ... 现有逻辑 ...
    
    // 集成AI中控系统：结束游戏追踪
    if (this.aiControlGameId) {
      const gameIntegration = getGameIntegration();
      gameIntegration.endGame(this.aiControlGameId, {
        winnerId: this.winner || 0,
        winnerName: this.players[this.winner || 0]?.name || '',
        finalScores: this.players.reduce((acc, p, i) => {
          acc[i] = p.score || 0;
          return acc;
        }, {} as Record<number, number>),
        finalRankings: this.finalRankings || [],
        players: this.players
      });
    }
  }
}
```

## 注意事项

1. **性能影响**：所有追踪操作都是异步的，不会阻塞游戏
2. **错误处理**：追踪失败不应该影响游戏进行
3. **可选启用**：可以通过配置控制是否启用追踪
4. **数据量**：大量数据会占用存储空间，建议定期清理

## 配置

可以通过AI中控系统配置控制是否启用数据收集：

```typescript
await aiControl.initialize({
  // ... 其他配置 ...
  // 数据收集默认启用，可以通过配置控制
});
```


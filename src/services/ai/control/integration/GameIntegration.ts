/**
 * 游戏集成服务
 * 在游戏逻辑中集成AI中控系统的数据追踪
 */

import { AIControlCenter } from '../AIControlCenter';
import { PlayerActionTracker } from '../data/PlayerActionTracker';
import { AIDecisionTracker } from '../data/AIDecisionTracker';
import { Card, Player, Play, RoundRecord } from '../../../types/card';
import { GameStatus } from '../../../types/card';

export class GameIntegration {
  private aiControl: AIControlCenter;
  private playerTracker: PlayerActionTracker;
  private aiDecisionTracker: AIDecisionTracker;
  private currentGameId: string | null = null;
  
  constructor() {
    this.aiControl = AIControlCenter.getInstance();
    const dataLayer = this.aiControl.getDataCollectionLayer();
    this.playerTracker = dataLayer.getPlayerActionTracker();
    this.aiDecisionTracker = dataLayer.getAIDecisionTracker();
  }
  
  /**
   * 开始追踪游戏
   */
  startTrackingGame(
    gameId: string,
    players: Player[],
    config: {
      deckCount?: number;
      rules?: any;
      difficulty?: string;
    }
  ): void {
    this.currentGameId = gameId;
    this.playerTracker.startTrackingGame(gameId, players, config);
  }
  
  /**
   * 开始新回合
   */
  startRound(gameId: string, roundNumber: number): void {
    this.playerTracker.startRound(gameId, roundNumber);
  }
  
  /**
   * 记录玩家出牌
   */
  recordPlayerAction(
    gameId: string,
    roundNumber: number,
    playerId: number,
    player: Player,
    cards: Card[],
    play: Play | null,
    gameState: {
      currentRound: number;
      playerHand: Card[];
      lastPlay: Play | null;
      lastPlayPlayerId: number | null;
      roundScore: number;
      playerScore: number;
      turnOrder: number[];
      finishedPlayers: number[];
    },
    aiDecisionId?: string
  ): void {
    if (!this.currentGameId || this.currentGameId !== gameId) {
      return;
    }
    
    // 计算得分
    const scoreCards = cards.filter(c => this.isScoreCard(c));
    const score = this.calculateScore(cards);
    
    // 记录操作
    this.playerTracker.recordAction({
      roundNumber,
      playerId,
      playerName: player.name,
      playerType: player.type === 'ai' ? 'ai' : 'human',
      actionType: cards.length > 0 ? 'playCard' : 'pass',
      actionData: {
        cards: cards.length > 0 ? cards : undefined,
        playType: play?.type,
        playValue: play?.value,
        scoreCards: scoreCards.length > 0 ? scoreCards : undefined,
        score: score > 0 ? score : undefined
      },
      gameState,
      aiDecision: aiDecisionId ? this.getAIDecision(aiDecisionId) : undefined
    });
  }
  
  /**
   * 开始追踪AI决策
   */
  startTrackingAIDecision(
    playerId: number,
    context: {
      gameState: {
        playerHand: Card[];
        lastPlay: Play | null;
        lastPlayPlayerId: number | null;
        roundScore: number;
        playerScore: number;
        currentPlayerIndex: number;
        playerCount: number;
      };
      availableActions: Array<{
        cards: Card[];
        play: Play;
        score: number;
      }>;
    }
  ): string {
    const decisionId = this.aiDecisionTracker.generateDecisionId();
    this.aiDecisionTracker.startTrackingDecision(decisionId, context);
    return decisionId;
  }
  
  /**
   * 记录AI策略评估
   */
  recordAIStrategyEvaluation(
    decisionId: string,
    evaluation: {
      strategy: string;
      score: number;
      reasoning: string;
    }
  ): void {
    this.aiDecisionTracker.recordStrategyEvaluation(decisionId, evaluation);
  }
  
  /**
   * 记录AI MCTS数据
   */
  recordAIMCTSData(
    decisionId: string,
    mctsData: {
      simulations: number;
      treeDepth: number;
      bestPath?: {
        nodes: number;
        depth: number;
        score: number;
      };
    }
  ): void {
    this.aiDecisionTracker.recordMCTSData(decisionId, mctsData);
  }
  
  /**
   * 记录AI最终决策
   */
  recordAIFinalDecision(
    decisionId: string,
    finalDecision: {
      action: {
        cards: Card[];
        play: Play;
      };
      confidence: number;
      expectedValue: number;
      alternatives: Array<{
        cards: Card[];
        play: Play;
        score: number;
        reason: string;
      }>;
    }
  ): void {
    this.aiDecisionTracker.recordFinalDecision(decisionId, finalDecision);
  }
  
  /**
   * 完成AI决策追踪
   */
  completeAIDecisionTracking(decisionId: string): void {
    this.aiDecisionTracker.completeTracking(decisionId);
  }
  
  /**
   * 结束回合
   */
  endRound(
    gameId: string,
    roundNumber: number,
    result: {
      winnerId: number;
      winnerName: string;
      points: Record<number, number>;
      totalScore: number;
    }
  ): void {
    this.playerTracker.endRound(gameId, roundNumber, result);
  }
  
  /**
   * 结束游戏
   */
  endGame(
    gameId: string,
    result: {
      winnerId: number;
      winnerName: string;
      finalScores: Record<number, number>;
      finalRankings: Array<{
        playerId: number;
        playerName: string;
        score: number;
        rank: number;
      }>;
      players: Player[];
    }
  ): void {
    if (!this.currentGameId || this.currentGameId !== gameId) {
      return;
    }
    
    const session = this.playerTracker.endGame(gameId, result);
    this.currentGameId = null;
    
    return session;
  }
  
  /**
   * 获取AI决策数据
   */
  private getAIDecision(decisionId: string): any {
    const decision = this.aiDecisionTracker.getDecision(decisionId);
    if (!decision) {
      return undefined;
    }
    
    return {
      strategy: decision.decisionProcess.strategyEvaluation[0]?.strategy || 'unknown',
      reasoning: decision.finalDecision ? 
        decision.decisionProcess.strategyEvaluation.map(e => e.reasoning).join('; ') : '',
      alternatives: decision.finalDecision?.alternatives || [],
      confidence: decision.finalDecision?.confidence || 0,
      timeSpent: 0 // 可以从决策数据中计算
    };
  }
  
  /**
   * 判断是否是分牌
   */
  private isScoreCard(card: Card): boolean {
    // 5、10、K是分牌
    return card.rank === 5 || card.rank === 10 || card.rank === 13;
  }
  
  /**
   * 计算得分
   */
  private calculateScore(cards: Card[]): number {
    return cards.filter(c => this.isScoreCard(c)).length;
  }
}

// 单例实例
let gameIntegrationInstance: GameIntegration | null = null;

/**
 * 获取游戏集成实例
 */
export function getGameIntegration(): GameIntegration {
  if (!gameIntegrationInstance) {
    gameIntegrationInstance = new GameIntegration();
  }
  return gameIntegrationInstance;
}


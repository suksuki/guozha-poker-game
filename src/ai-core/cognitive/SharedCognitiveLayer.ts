/**
 * 共享认知层
 * 所有AI共享的局面理解和分析
 * 一次分析，多个AI复用，提升效率
 */

import { GameKnowledgeBase } from '../infrastructure/knowledge/GameKnowledgeBase';
import { GameState } from '../types';
import { Card } from '../../types/card';

/**
 * 共享分析结果
 */
export interface SharedAnalysis {
  // 全局分析
  global: {
    phase: string;
    tension: number;
    momentum: string;
    keyMoment: boolean;
    atmosphere: string;
  };
  
  // 每个玩家的分析
  players: Map<number, PlayerAnalysis>;
  
  // 关系分析
  relationships: any;
  
  timestamp: number;
}

/**
 * 单个玩家分析
 */
export interface PlayerAnalysis {
  playerId: number;
  handStrength: number;
  handSize: number;
  estimatedStrength: number;
  strategicIntent: string;
  needsSupport: boolean;
  isLeading: boolean;
  emotionState: string;
}

/**
 * 共享认知层类
 */
export class SharedCognitiveLayer {
  private lastAnalysis: SharedAnalysis | null = null;
  private analysisCache: Map<string, SharedAnalysis> = new Map();
  
  constructor(private knowledgeBase: GameKnowledgeBase) {}
  
  /**
   * 分析当前局面（核心方法）
   */
  async analyze(gameState: GameState): Promise<SharedAnalysis> {
    // 检查缓存
    const cacheKey = this.getCacheKey(gameState);
    if (this.analysisCache.has(cacheKey)) {
      console.log('[SharedCognitive] 使用缓存分析');
      return this.analysisCache.get(cacheKey)!;
    }
    
    console.log(`[SharedCognitive] 分析局面 Round ${gameState.roundNumber}`);
    
    // 全局分析
    const global = await this.analyzeGlobal(gameState);
    
    // 每个玩家的分析
    const players = new Map<number, PlayerAnalysis>();
    
    // 当前玩家
    players.set(gameState.myPosition, {
      playerId: gameState.myPosition,
      handStrength: this.evaluateHandStrength(gameState.myHand),
      handSize: gameState.myHand.length,
      estimatedStrength: this.evaluateHandStrength(gameState.myHand),
      strategicIntent: this.determineIntent(gameState),
      needsSupport: false,
      isLeading: this.isLeading(gameState),
      emotionState: this.determineEmotion(gameState)
    });
    
    // 对手分析
    gameState.opponentHandSizes.forEach((size, idx) => {
      const opponentId = idx + 1;
      players.set(opponentId, {
        playerId: opponentId,
        handStrength: this.estimateOpponentStrength(size),
        handSize: size,
        estimatedStrength: this.estimateOpponentStrength(size),
        strategicIntent: 'unknown',
        needsSupport: size > 12,
        isLeading: size < 5,
        emotionState: 'neutral'
      });
    });
    
    // 关系分析
    const relationships = await this.analyzeRelationships(players, gameState);
    
    const analysis: SharedAnalysis = {
      global,
      players,
      relationships,
      timestamp: Date.now()
    };
    
    // 缓存结果
    this.analysisCache.set(cacheKey, analysis);
    this.lastAnalysis = analysis;
    
    return analysis;
  }
  
  /**
   * 全局分析
   */
  private async analyzeGlobal(gameState: GameState): Promise<any> {
    return {
      phase: this.determinePhase(gameState),
      tension: this.calculateTension(gameState),
      momentum: this.analyzeMomentum(gameState),
      keyMoment: this.isKeyMoment(gameState),
      atmosphere: this.analyzeAtmosphere(gameState)
    };
  }
  
  /**
   * 确定游戏阶段
   */
  private determinePhase(gameState: GameState): string {
    if (gameState.roundNumber <= 3) {
      return 'early';
    }
    
    const minCards = Math.min(
      gameState.myHand.length,
      ...gameState.opponentHandSizes
    );
    
    if (minCards < 5) {
      return 'late';
    }
    
    if (minCards < 3) {
      return 'critical';
    }
    
    return 'middle';
  }
  
  /**
   * 计算紧张度
   */
  private calculateTension(gameState: GameState): number {
    let tension = 0.5; // 基础紧张度
    
    // 有人快赢了
    const minCards = Math.min(...gameState.opponentHandSizes, gameState.myHand.length);
    if (minCards < 5) {
      tension += 0.3;
    }
    
    // 关键回合
    if (gameState.roundNumber > 10) {
      tension += 0.2;
    }
    
    return Math.min(1.0, tension);
  }
  
  /**
   * 分析势头
   */
  private analyzeMomentum(gameState: GameState): string {
    const myCards = gameState.myHand.length;
    const avgOpponentCards = 
      gameState.opponentHandSizes.reduce((a, b) => a + b, 0) / 
      gameState.opponentHandSizes.length;
    
    if (myCards < avgOpponentCards * 0.7) {
      return 'leading';
    } else if (myCards > avgOpponentCards * 1.3) {
      return 'falling_behind';
    }
    
    return 'balanced';
  }
  
  /**
   * 判断是否关键时刻
   */
  private isKeyMoment(gameState: GameState): boolean {
    // 有人只剩3张牌
    return Math.min(...gameState.opponentHandSizes, gameState.myHand.length) <= 3;
  }
  
  /**
   * 分析氛围
   */
  private analyzeAtmosphere(gameState: GameState): string {
    const tension = this.calculateTension(gameState);
    
    if (tension > 0.7) {
      return 'tense';
    } else if (tension < 0.3) {
      return 'relaxed';
    }
    
    return 'normal';
  }
  
  /**
   * 评估手牌强度
   */
  private evaluateHandStrength(hand: Card[]): number {
    if (hand.length === 0) return 1.0;
    if (hand.length <= 3) return 0.9;
    if (hand.length <= 5) return 0.7;
    if (hand.length <= 8) return 0.5;
    if (hand.length <= 12) return 0.3;
    return 0.2;
  }
  
  /**
   * 估计对手强度
   */
  private estimateOpponentStrength(handSize: number): number {
    return this.evaluateHandStrength(Array(handSize).fill(null) as any);
  }
  
  /**
   * 确定战略意图
   */
  private determineIntent(gameState: GameState): string {
    const strength = this.evaluateHandStrength(gameState.myHand);
    
    if (strength > 0.7) {
      return 'aggressive_attack';
    } else if (strength > 0.5) {
      return 'steady_advance';
    } else {
      return 'defensive_preserve';
    }
  }
  
  /**
   * 判断是否领先
   */
  private isLeading(gameState: GameState): boolean {
    const myCards = gameState.myHand.length;
    return gameState.opponentHandSizes.every(size => myCards <= size);
  }
  
  /**
   * 确定情感状态
   */
  private determineEmotion(gameState: GameState): string {
    if (this.isLeading(gameState)) {
      return 'confident';
    }
    
    if (gameState.myHand.length > 12) {
      return 'frustrated';
    }
    
    if (this.isKeyMoment(gameState)) {
      return 'tense';
    }
    
    return 'relaxed';
  }
  
  /**
   * 分析关系
   */
  private async analyzeRelationships(
    players: Map<number, PlayerAnalysis>,
    gameState: GameState
  ): Promise<any> {
    // TODO: 实现更复杂的关系分析
    return {
      alliances: [],
      conflicts: [],
      cooperation: 0.5
    };
  }
  
  /**
   * 获取缓存键
   */
  private getCacheKey(gameState: GameState): string {
    return `${gameState.roundNumber}_${gameState.myHand.length}_${gameState.opponentHandSizes.join('_')}`;
  }
  
  /**
   * 清空缓存
   */
  clearCache(): void {
    this.analysisCache.clear();
  }
}


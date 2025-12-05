/**
 * AI玩家类
 * 代表一个独立的AI玩家实例
 */

import { GameState, Decision, AIPlayerConfig, PersonalityConfig, GameAction } from '../types';
import { mctsChoosePlay } from '../../ai/mcts';
import { Card, CardType } from '../../types/card';

/**
 * AI玩家统计
 */
interface AIPlayerStats {
  totalDecisions: number;
  totalCommunications: number;
  avgConfidence: number;
  successfulPlays: number;
}

/**
 * AI玩家
 */
export class AIPlayer {
  private config: AIPlayerConfig;
  private sharedResources: any;
  private initialized: boolean = false;
  private stats: AIPlayerStats;
  
  constructor(config: AIPlayerConfig, sharedResources: any) {
    this.config = config;
    this.sharedResources = sharedResources;
    
    this.stats = {
      totalDecisions: 0,
      totalCommunications: 0,
      avgConfidence: 0,
      successfulPlays: 0
    };
  }
  
  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log(`[AIPlayer ${this.config.id}] 初始化 (${this.config.personality.preset})`);
    this.initialized = true;
  }
  
  /**
   * 做决策
   */
  async makeDecision(gameState: GameState, cognitive: any): Promise<Decision> {
    if (!this.initialized) {
      throw new Error('AIPlayer not initialized');
    }
    
    this.stats.totalDecisions++;
    
    const startTime = Date.now();
    
    try {
      // 使用MCTS做决策
      const decision = await this.makeMCTSDecision(gameState, cognitive);
      
      // 更新统计
      this.updateStats(decision);
      
      return decision;
    } catch (error) {
      console.error(`[AIPlayer ${this.config.id}] 决策失败:`, error);
      
      // 降级：返回Pass
      return this.createPassDecision('决策失败，默认Pass');
    }
  }
  
  /**
   * 使用MCTS做决策
   */
  private async makeMCTSDecision(gameState: GameState, cognitive: any): Promise<Decision> {
    // 调用MCTS算法
    const mctsResult = await mctsChoosePlay(
      gameState.myHand,
      gameState.lastPlay,
      {
        iterations: this.getMCTSIterations(),
        explorationConstant: 1.414,
        perfectInformation: false,
        playerCount: gameState.playerCount,
        teamMode: gameState.teamMode,
        currentRoundScore: gameState.currentRoundScore
      }
    );
    
    // 转换为Decision格式
    if (mctsResult && mctsResult.length > 0) {
      const action: GameAction = {
        type: 'play',
        cards: mctsResult,
        play: this.cardsToPlay(mctsResult)
      };
      
      return {
        action,
        reasoning: this.generateReasoning(action, cognitive),
        confidence: this.calculateConfidence(cognitive),
        alternatives: [],
        sources: [{ moduleName: 'mcts', weight: 1.0 }],
        timestamp: Date.now(),
        riskLevel: this.assessRisk(action, cognitive)
      };
    } else {
      // MCTS返回null，说明应该Pass
      return this.createPassDecision('MCTS建议Pass');
    }
  }
  
  /**
   * 获取MCTS迭代次数（根据性格调整）
   */
  private getMCTSIterations(): number {
    const personality = this.config.personality.preset;
    
    switch (personality) {
      case 'aggressive':
        return 500;  // 激进型快速决策
      case 'conservative':
        return 1500; // 保守型深思熟虑
      case 'balanced':
        return 1000; // 平衡型
      case 'adaptive':
        return 800;  // 自适应型
      default:
        return 1000;
    }
  }
  
  /**
   * 生成决策推理
   */
  private generateReasoning(action: GameAction, cognitive: any): string {
    const personality = this.config.personality.preset || 'balanced';
    
    if (action.type === 'pass') {
      return `作为${personality}型AI，当前选择Pass`;
    }
    
    const cardsCount = action.cards.length;
    const intent = cognitive?.strategicIntent || 'unknown';
    
    return `${personality}型策略：出${cardsCount}张牌，战略意图：${intent}`;
  }
  
  /**
   * 计算置信度（根据性格和局面）
   */
  private calculateConfidence(cognitive: any): number {
    let confidence = 0.7; // 基础置信度
    
    // 根据手牌强度调整
    if (cognitive?.handStrength > 0.7) {
      confidence += 0.15;
    }
    
    // 根据性格调整
    const personality = this.config.personality;
    if (personality.preset === 'conservative') {
      confidence -= 0.1; // 保守型更谨慎
    } else if (personality.preset === 'aggressive') {
      confidence += 0.1; // 激进型更自信
    }
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }
  
  /**
   * 评估风险
   */
  private assessRisk(action: GameAction, cognitive: any): string {
    if (action.type === 'pass') {
      return 'low';
    }
    
    // 根据手牌强度和局面评估风险
    if (cognitive?.handStrength < 0.3) {
      return 'high';
    }
    
    if (cognitive?.phase === 'critical') {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * 创建Pass决策
   */
  private createPassDecision(reason: string): Decision {
    return {
      action: { type: 'pass' },
      reasoning: reason,
      confidence: 0.6,
      alternatives: [],
      sources: [],
      timestamp: Date.now(),
      riskLevel: 'low'
    };
  }
  
  /**
   * 将卡牌转换为Play对象
   */
  private cardsToPlay(cards: Card[]): any {
    let type: CardType;
    let value: number;
    
    if (cards.length === 1) {
      type = CardType.SINGLE;
      value = cards[0].rank;
    } else if (cards.length === 2) {
      type = CardType.PAIR;
      value = cards[0].rank;
    } else if (cards.length === 3) {
      type = CardType.TRIPLE;
      value = cards[0].rank;
    } else if (cards.length >= 4) {
      const allSameRank = cards.every(c => c.rank === cards[0].rank);
      if (allSameRank) {
        type = cards.length >= 7 ? CardType.DUN : CardType.BOMB;
        value = cards[0].rank;
      } else {
        type = CardType.BOMB;
        value = cards[0].rank;
      }
    } else {
      type = CardType.SINGLE;
      value = 0;
    }
    
    return { cards, type, value };
  }
  
  /**
   * 更新统计
   */
  private updateStats(decision: Decision): void {
    // 更新平均置信度
    const alpha = 0.1;
    this.stats.avgConfidence = 
      alpha * decision.confidence + (1 - alpha) * this.stats.avgConfidence;
    
    if (decision.action.type === 'play') {
      this.stats.successfulPlays++;
    }
  }
  
  /**
   * 获取性格
   */
  getPersonality(): PersonalityConfig {
    return this.config.personality;
  }
  
  /**
   * 获取统计
   */
  getStatistics(): any {
    return {
      id: this.config.id,
      personality: this.config.personality.preset,
      ...this.stats
    };
  }
  
  /**
   * 关闭
   */
  async shutdown(): Promise<void> {
    this.initialized = false;
    console.log(`[AIPlayer ${this.config.id}] 已关闭`);
  }
}


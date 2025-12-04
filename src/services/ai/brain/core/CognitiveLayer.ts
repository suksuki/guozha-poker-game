/**
 * 认知层
 * 负责局面理解、评估和战略判断
 */

import { 
  GameState, 
  SituationAnalysis, 
  StrategicIntent,
  PlayStyle,
  KeyFactor,
  Threat,
  Opportunity,
  TeamContext
} from './types';
import { Card } from '../../../../types/card';

/**
 * 认知层类
 */
export class CognitiveLayer {
  
  /**
   * 分析当前局面
   */
  async analyze(gameState: GameState, context?: any): Promise<SituationAnalysis> {
    // 基础评估
    const handStrength = this.evaluateHandStrength(gameState.myHand);
    const winProbability = this.estimateWinProbability(gameState, handStrength);
    
    // 战略判断
    const strategicIntent = this.determineStrategicIntent(gameState, handStrength);
    const recommendedStyle = this.recommendPlayStyle(gameState, strategicIntent);
    
    // 关键因素
    const keyFactors = this.identifyKeyFactors(gameState);
    
    // 威胁与机会
    const threats = this.identifyThreats(gameState);
    const opportunities = this.identifyOpportunities(gameState);
    
    // 团队上下文（如果是团队模式）
    const teamContext = gameState.teamMode 
      ? this.analyzeTeamContext(gameState)
      : undefined;
    
    return {
      handStrength,
      winProbability,
      strategicIntent,
      recommendedStyle,
      keyFactors,
      threats,
      opportunities,
      teamContext
    };
  }
  
  /**
   * 评估手牌强度
   */
  private evaluateHandStrength(hand: Card[]): number {
    // 简单的手牌强度评估
    if (hand.length === 0) return 1.0;
    if (hand.length <= 3) return 0.9;
    if (hand.length <= 5) return 0.7;
    if (hand.length <= 8) return 0.5;
    if (hand.length <= 12) return 0.3;
    return 0.2;
  }
  
  /**
   * 估计胜率
   */
  private estimateWinProbability(gameState: GameState, handStrength: number): number {
    let probability = handStrength;
    
    // 考虑对手手牌数量
    const minOpponentCards = Math.min(...gameState.opponentHandSizes);
    if (minOpponentCards < 3) {
      probability *= 0.5;  // 对手快赢了
    }
    
    // 考虑游戏阶段
    if (gameState.phase === 'late' || gameState.phase === 'critical') {
      probability *= 1.2;  // 残局手牌少更有利
    }
    
    return Math.min(1.0, Math.max(0.0, probability));
  }
  
  /**
   * 确定战略意图
   */
  private determineStrategicIntent(
    gameState: GameState, 
    handStrength: number
  ): StrategicIntent {
    // 团队模式
    if (gameState.teamMode && gameState.teamConfig) {
      // 队友需要支援
      const teammateNeedsHelp = this.teammateNeedsHelp(gameState);
      if (teammateNeedsHelp) {
        return handStrength > 0.7 ? 'cooperate_support' : 'sacrifice_assist';
      }
    }
    
    // 个人模式或队友不需要帮助
    if (handStrength > 0.7) {
      return 'aggressive_attack';
    } else if (handStrength > 0.5) {
      return 'steady_advance';
    } else {
      return 'defensive_preserve';
    }
  }
  
  /**
   * 推荐打法风格
   */
  private recommendPlayStyle(
    gameState: GameState,
    intent: StrategicIntent
  ): PlayStyle {
    switch (intent) {
      case 'aggressive_attack':
        return 'aggressive';
      case 'steady_advance':
        return 'balanced';
      case 'defensive_preserve':
        return 'conservative';
      case 'cooperate_support':
      case 'sacrifice_assist':
        return 'adaptive';
      default:
        return 'balanced';
    }
  }
  
  /**
   * 识别关键因素
   */
  private identifyKeyFactors(gameState: GameState): KeyFactor[] {
    const factors: KeyFactor[] = [];
    
    // 手牌数量
    factors.push({
      factor: 'hand_size',
      importance: gameState.myHand.length < 5 ? 0.9 : 0.5,
      description: `我有${gameState.myHand.length}张牌`
    });
    
    // 对手状态
    const minOpponentCards = Math.min(...gameState.opponentHandSizes);
    if (minOpponentCards < 5) {
      factors.push({
        factor: 'opponent_near_win',
        importance: 0.9,
        description: `对手只剩${minOpponentCards}张牌`
      });
    }
    
    // 游戏阶段
    if (gameState.phase === 'critical') {
      factors.push({
        factor: 'critical_moment',
        importance: 1.0,
        description: '关键时刻'
      });
    }
    
    // 团队模式
    if (gameState.teamMode) {
      factors.push({
        factor: 'team_mode',
        importance: 0.7,
        description: '团队协作模式'
      });
    }
    
    return factors;
  }
  
  /**
   * 识别威胁
   */
  private identifyThreats(gameState: GameState): Threat[] {
    const threats: Threat[] = [];
    
    // 对手快要赢了
    const minOpponentCards = Math.min(...gameState.opponentHandSizes);
    if (minOpponentCards < 3) {
      threats.push({
        type: 'opponent_near_win',
        severity: 0.9,
        source: '对手',
        mitigation: '必须阻止对手出牌或快速打完自己的牌'
      });
    }
    
    // 手牌太多
    if (gameState.myHand.length > 12) {
      threats.push({
        type: 'too_many_cards',
        severity: 0.6,
        source: '自身',
        mitigation: '需要加快出牌速度'
      });
    }
    
    return threats;
  }
  
  /**
   * 识别机会
   */
  private identifyOpportunities(gameState: GameState): Opportunity[] {
    const opportunities: Opportunity[] = [];
    
    // 手牌少，接近胜利
    if (gameState.myHand.length < 5) {
      opportunities.push({
        type: 'near_victory',
        value: 0.9,
        condition: '手牌少于5张',
        action: '激进出牌，争取快速获胜'
      });
    }
    
    // 没有上家出牌，可以主动
    if (!gameState.lastPlay) {
      opportunities.push({
        type: 'lead_opportunity',
        value: 0.6,
        condition: '轮到我先出牌',
        action: '可以主动控制节奏'
      });
    }
    
    return opportunities;
  }
  
  /**
   * 分析团队上下文
   */
  private analyzeTeamContext(gameState: GameState): TeamContext {
    if (!gameState.teamConfig) {
      throw new Error('Team mode enabled but no team config');
    }
    
    // 分析队友状态
    const teammateStatus = gameState.opponentHandSizes.map((size, idx) => {
      const playerId = idx + 1;  // 假设玩家ID从1开始
      const isTeammate = this.isTeammate(playerId, gameState);
      
      return {
        playerId,
        handSize: size,
        estimatedStrength: size < 5 ? 0.8 : 0.5,
        needsSupport: isTeammate && size > 10
      };
    }).filter(s => this.isTeammate(s.playerId, gameState));
    
    // 团队策略
    const teamStrategy = this.determineTeamStrategy(gameState, teammateStatus);
    
    // 协作机会
    const cooperationOpportunities = this.findCooperationOpportunities(
      gameState,
      teammateStatus
    );
    
    return {
      teammateStatus,
      teamStrategy,
      cooperationOpportunities
    };
  }
  
  /**
   * 判断队友是否需要帮助
   */
  private teammateNeedsHelp(gameState: GameState): boolean {
    if (!gameState.teamMode || !gameState.teamConfig) {
      return false;
    }
    
    // 简单判断：队友手牌多
    // TODO: 更复杂的逻辑
    return false;
  }
  
  /**
   * 判断是否是队友
   */
  private isTeammate(playerId: number, gameState: GameState): boolean {
    if (!gameState.teamMode || !gameState.teamConfig || !gameState.myTeamId) {
      return false;
    }
    
    // TODO: 实际的队友判断逻辑
    return false;
  }
  
  /**
   * 确定团队策略
   */
  private determineTeamStrategy(
    gameState: GameState,
    teammateStatus: any[]
  ): string {
    const hasStrongTeammate = teammateStatus.some(t => t.estimatedStrength > 0.7);
    const hasWeakTeammate = teammateStatus.some(t => t.needsSupport);
    
    if (hasWeakTeammate) {
      return 'support_weak_teammate';
    } else if (hasStrongTeammate) {
      return 'cooperate_with_strong';
    } else {
      return 'balanced_team_play';
    }
  }
  
  /**
   * 寻找协作机会
   */
  private findCooperationOpportunities(
    gameState: GameState,
    teammateStatus: any[]
  ): any[] {
    const opportunities = [];
    
    // TODO: 实现协作机会识别
    
    return opportunities;
  }
}


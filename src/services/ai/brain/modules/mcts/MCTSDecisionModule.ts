// @ts-nocheck
/**
 * MCTS决策模块
 * 将现有的MCTS算法适配到新的模块接口
 */

import { BaseDecisionModule } from '../base/BaseDecisionModule';
import { ModuleAnalysis, ActionSuggestion } from '../base/IDecisionModule';
import { GameState, GameAction, SituationAnalysis } from '../../core/types';
import { mctsChoosePlay } from '../../../../ai/mcts';
import { Card, Play, CardType } from '../../../../../types/card';

/**
 * MCTS决策模块实现
 */
export class MCTSDecisionModule extends BaseDecisionModule {
  readonly name = 'mcts';
  readonly version = '1.0.0';
  readonly description = 'Monte Carlo Tree Search决策模块，提供精确的博弈树搜索';
  
  private iterations: number = 1000;
  private explorationConstant: number = 1.414;
  
  protected async onInitialize(): Promise<void> {
    // 从配置中读取参数
    if (this.config.options) {
      this.iterations = this.config.options.iterations || 1000;
      this.explorationConstant = this.config.options.explorationConstant || 1.414;
    }
    
    this.log('info', `MCTS initialized with ${this.iterations} iterations`);
  }
  
  /**
   * 执行分析
   */
  protected async performAnalysis(state: GameState): Promise<ModuleAnalysis> {
    const startTime = Date.now();
    
    // 转换状态格式
    const hand = state.myHand;
    const lastPlay = state.lastPlay;
    
    // 调用现有的MCTS算法
    const result = await mctsChoosePlay(hand, lastPlay, {
      iterations: this.iterations,
      explorationConstant: this.explorationConstant,
      perfectInformation: false,
      playerCount: state.playerCount,
      teamMode: state.teamMode,
      teamConfig: state.teamConfig
    });
    
    // 转换结果格式
    const suggestions: ActionSuggestion[] = [];
    
    if (result) {
      // 主建议
      suggestions.push({
        action: {
          type: 'play',
          cards: result,
          play: this.cardsToPlay(result)
        },
        score: 0.8,  // MCTS的结果通常质量较高
        confidence: 0.85,
        reasoning: `MCTS经过${this.iterations}次模拟，认为这是最优出牌`
      });
    } else {
      // Pass
      suggestions.push({
        action: { type: 'pass' },
        score: 0.6,
        confidence: 0.7,
        reasoning: 'MCTS建议Pass，当前没有更好的出牌选择'
      });
    }
    
    // 构建分析结果
    const analysis: SituationAnalysis = {
      handStrength: this.evaluateHandStrength(hand),
      winProbability: 0.5,  // TODO: MCTS可以提供更准确的胜率
      strategicIntent: 'steady_advance',
      recommendedStyle: 'balanced',
      keyFactors: [],
      threats: [],
      opportunities: []
    };
    
    const computeTime = Date.now() - startTime;
    
    return {
      analysis,
      suggestions,
      confidence: 0.85,
      reasoning: `MCTS模拟${this.iterations}次，计算耗时${computeTime}ms`,
      computeTime,
      metadata: {
        iterations: this.iterations,
        explorationConstant: this.explorationConstant
      }
    };
  }
  
  /**
   * 解释决策
   */
  protected async performExplanation(
    state: GameState,
    action: GameAction
  ): Promise<string> {
    if (action.type === 'pass') {
      return 'MCTS通过博弈树搜索分析，认为当前Pass是最优策略';
    }
    
    return `MCTS经过${this.iterations}次蒙特卡洛模拟，选择出这些牌可以最大化胜率`;
  }
  
  /**
   * 评估动作
   */
  protected async performEvaluation(
    state: GameState,
    action: GameAction
  ): Promise<number> {
    // MCTS可以模拟这个动作的结果
    // 这里简化处理，返回默认评分
    return 0.7;
  }
  
  /**
   * 判断是否适用
   */
  isApplicable(state: GameState): boolean {
    // MCTS几乎总是适用
    return super.isApplicable(state);
  }
  
  /**
   * 获取推荐权重
   */
  getRecommendedWeight(state: GameState): number {
    const baseWeight = super.getRecommendedWeight(state);
    
    // 简单局面时MCTS权重更高
    if (state.myHand.length < 5) {
      return Math.min(1.0, baseWeight * 1.2);
    }
    
    // 关键时刻MCTS权重更高
    if (state.phase === 'critical') {
      return Math.min(1.0, baseWeight * 1.3);
    }
    
    return baseWeight;
  }
  
  // ==================== 辅助方法 ====================
  
  /**
   * 评估手牌强度
   */
  private evaluateHandStrength(hand: Card[]): number {
    if (hand.length === 0) return 1.0;
    if (hand.length <= 3) return 0.9;
    if (hand.length <= 5) return 0.7;
    if (hand.length <= 8) return 0.5;
    return 0.3;
  }
  
  /**
   * 将卡牌转换为Play对象
   */
  private cardsToPlay(cards: Card[]): Play {
    // 简单的牌型判断
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
      // 检查是否都是同一点数
      const allSameRank = cards.every(c => c.rank === cards[0].rank);
      if (allSameRank) {
        type = cards.length >= 7 ? CardType.DUN : CardType.BOMB;
        value = cards[0].rank;
      } else {
        // 默认为炸弹
        type = CardType.BOMB;
        value = cards[0].rank;
      }
    } else {
      type = CardType.SINGLE;
      value = 0;
    }
    
    return {
      cards,
      type,
      value
    };
  }
}
// @ts-nocheck

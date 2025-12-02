/**
 * 实时策略调整管理器
 * 根据人类玩家的沟通，实时调整AI玩家的出牌策略
 */

import { Player } from '../../types/card';
import { MultiPlayerGameState } from '../../utils/gameStateUtils';
import { NLUUnderstandingResult } from './NLUUnderstandingService';

/**
 * 策略调整
 */
export interface StrategyAdjustment {
  type: 'weight' | 'parameter' | 'preference';
  target: string;              // 调整目标
  value: number;               // 调整值
  duration?: number;           // 持续时间（毫秒），undefined表示永久
  priority: number;            // 优先级
}

/**
 * 动态策略
 */
export interface AIDynamicStrategy {
  playerId: number;
  baseConfig: any;             // 基础MCTS配置
  adjustments: StrategyAdjustment[];
  understoodInfo: any;         // 理解的信息
  lastUpdateTime: number;
}

/**
 * 实时策略调整管理器
 */
export class RealTimeStrategyManager {
  private dynamicStrategies: Map<number, AIDynamicStrategy> = new Map();

  /**
   * 处理人类玩家的消息
   */
  async processHumanMessage(
    understanding: NLUUnderstandingResult,
    aiPlayerId: number,
    gameState: MultiPlayerGameState
  ): Promise<void> {
    // 生成策略调整
    const adjustments = this.generateStrategyAdjustments(
      understanding,
      gameState
    );

    // 更新AI策略
    this.updateAIStrategy(aiPlayerId, adjustments, understanding);  }

  /**
   * 生成策略调整
   */
  private generateStrategyAdjustments(
    understanding: NLUUnderstandingResult,
    gameState: MultiPlayerGameState
  ): StrategyAdjustment[] {
    const adjustments: StrategyAdjustment[] = [];
    const { intent, extractedInfo } = understanding;

    // 根据意图类型生成调整
    switch (intent.type) {
      case 'strategy_request':
        if (intent.parameters.action === 'play') {
          if (intent.parameters.target === 'me') {
            // 人类玩家说"我来出"
            adjustments.push({
              type: 'preference',
              target: 'action_preference',
              value: -50,  // 降低AI出牌的倾向
              priority: 10
            });
          } else if (intent.parameters.target === 'teammate') {
            // 人类玩家说"你来出"
            adjustments.push({
              type: 'preference',
              target: 'action_preference',
              value: +50,  // 提高AI出牌的倾向
              priority: 10
            });
          }
        } else if (intent.parameters.action === 'hold') {
          // 人类玩家说"保留大牌"
          adjustments.push({
            type: 'weight',
            target: 'bigCardPreservationWeight',
            value: +0.3,  // 提高保留大牌的权重
            priority: 8
          });
        } else if (intent.parameters.action === 'pass') {
          // 人类玩家说"要不起"
          adjustments.push({
            type: 'preference',
            target: 'action_preference',
            value: -30,  // 降低AI出牌的倾向
            priority: 8
          });
        }
        break;

      case 'information_reveal':
        // 根据牌信息调整
        if (extractedInfo.cardInfo?.hasBomb) {
          // 人类玩家有炸弹，AI可以更激进
          adjustments.push({
            type: 'weight',
            target: 'aggressiveWeight',
            value: +0.2,
            priority: 7
          });
          adjustments.push({
            type: 'preference',
            target: 'supportHuman',
            value: +30,  // 提高支援人类玩家的倾向
            priority: 9
          });
        }

        if (extractedInfo.cardInfo?.hasBigCards === false) {
          // 人类玩家没有大牌，AI应该更主动
          adjustments.push({
            type: 'preference',
            target: 'action_preference',
            value: +40,  // 提高AI出牌的倾向
            priority: 9
          });
        }

        if (extractedInfo.cardInfo?.handCount !== undefined) {
          // 根据手牌数量调整
          if (extractedInfo.cardInfo.handCount < 8) {
            // 人类玩家手牌少，AI应该支援
            adjustments.push({
              type: 'weight',
              target: 'supportWeight',
              value: +0.3,
              priority: 8
            });
          }
        }
        break;

      case 'cooperation_request':
        // 根据配合请求调整
        if (extractedInfo.cooperationInfo?.requestType === 'support') {
          // 人类玩家请求支援
          adjustments.push({
            type: 'weight',
            target: 'supportWeight',
            value: +0.4,  // 大幅提高支援权重
            priority: 10
          });
          adjustments.push({
            type: 'preference',
            target: 'action_preference',
            value: +50,  // 提高AI出牌的倾向
            priority: 10
          });
        } else if (extractedInfo.cooperationInfo?.requestType === 'attack') {
          // 人类玩家请求攻击
          adjustments.push({
            type: 'weight',
            target: 'aggressiveWeight',
            value: +0.3,
            priority: 9
          });
        }
        break;
    }

    return adjustments;
  }

  /**
   * 更新AI策略
   */
  private updateAIStrategy(
    aiPlayerId: number,
    adjustments: StrategyAdjustment[],
    understanding: NLUUnderstandingResult
  ): void {
    const currentStrategy = this.dynamicStrategies.get(aiPlayerId) || {
      playerId: aiPlayerId,
      baseConfig: {},
      adjustments: [],
      understoodInfo: {},
      lastUpdateTime: Date.now()
    };

    // 合并调整
    currentStrategy.adjustments = [
      ...currentStrategy.adjustments.filter(
        adj => adj.priority >= 10 || (Date.now() - currentStrategy.lastUpdateTime) < (adj.duration || Infinity)
      ),
      ...adjustments
    ];

    // 更新理解的信息
    currentStrategy.understoodInfo = {
      ...currentStrategy.understoodInfo,
      ...understanding.extractedInfo
    };

    currentStrategy.lastUpdateTime = Date.now();

    // 保存
    this.dynamicStrategies.set(aiPlayerId, currentStrategy);
  }

  /**
   * 获取AI的动态策略
   */
  getDynamicStrategy(aiPlayerId: number): AIDynamicStrategy | null {
    return this.dynamicStrategies.get(aiPlayerId) || null;
  }

  /**
   * 清空所有策略（新游戏开始时）
   */
  clearAllStrategies(): void {
    this.dynamicStrategies.clear();
  }
}


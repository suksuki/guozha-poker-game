import type { Card, Play } from '../types/card';
import type { AIConfig } from '../ai/types';
import { getAIStrategy } from '../ai/strategy';
import { mergeAIConfig, DEFAULT_AI_CONFIG } from '../config/aiConfig';
import { communicationHandlerService } from '../services/communication/CommunicationHandlerService';

// 重新导出AIConfig以保持向后兼容
export type { AIConfig };

/**
 * 使用AI策略选择出牌
 * 通过策略接口实现，支持灵活替换不同的AI算法
 * 
 * @param hand 当前手牌
 * @param lastPlay 上家出牌（如果为null，表示可以自由出牌）
 * @param config AI配置（会与默认配置合并）
 * @param playerId AI玩家ID（可选，用于获取动态策略调整）
 * @returns 选择的牌，如果返回null表示要不起
 */
export async function aiChoosePlay(
  hand: Card[],
  lastPlay: Play | null,
  config: Partial<AIConfig> = {},
  playerId?: number
): Promise<Card[] | null> {
  // 合并用户配置和默认配置
  const mergedConfig = mergeAIConfig(config);
  
  // 如果有playerId，获取动态策略调整
  if (playerId !== undefined) {
    const strategyManager = communicationHandlerService.getStrategyManager();
    const dynamicStrategy = strategyManager.getDynamicStrategy(playerId);
    
    if (dynamicStrategy && dynamicStrategy.adjustments.length > 0) {
      // 将策略调整添加到配置中
      (mergedConfig as any).strategyAdjustments = dynamicStrategy.adjustments;
    }
  }
  
  // 获取对应的策略实例
  const algorithm = mergedConfig.algorithm || DEFAULT_AI_CONFIG.algorithm || 'mcts';
  const strategy = getAIStrategy(algorithm);
  
  // 调用策略选择出牌
  const result = strategy.choosePlay(hand, lastPlay, mergedConfig);
  
  // 处理异步和同步返回值
  if (result instanceof Promise) {
    return await result;
  }
  
  return result;
}

// 这些函数已迁移到 ai/simpleStrategy.ts

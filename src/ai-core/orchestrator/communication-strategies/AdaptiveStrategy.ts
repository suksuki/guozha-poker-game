/**
 * 自适应策略
 * 根据模型性能和当前情况自动选择最佳策略
 * 适合：需要灵活切换的场景
 */

import { CommunicationStrategy } from './CommunicationStrategy';
import { CommunicationMessage, CommunicationContext } from '../../types';
import { UnifiedLLMService } from '../../infrastructure/llm/UnifiedLLMService';

export interface StrategySelector {
  selectStrategy(
    model: string,
    playerCount: number,
    context: CommunicationContext
  ): CommunicationStrategy;
}

export class AdaptiveStrategy implements CommunicationStrategy {
  name = 'adaptive';
  description = '自适应模式：根据模型和情况自动选择最佳策略';
  supportsBatch = true;
  
  constructor(
    private singleStrategy: CommunicationStrategy,
    private batchStrategy: CommunicationStrategy,
    private llmService: UnifiedLLMService | null,
    private selector: StrategySelector
  ) {}
  
  async generateSingle(
    playerId: number,
    context: CommunicationContext,
    personality: any
  ): Promise<CommunicationMessage | null> {
    const model = this.llmService?.config.model || '';
    const strategy = this.selector.selectStrategy(model, 1, context);
    return strategy.generateSingle(playerId, context, personality);
  }
  
  async generateBatch(
    playerIds: number[],
    context: CommunicationContext,
    players: Map<number, any>
  ): Promise<Map<number, CommunicationMessage>> {
    const model = this.llmService?.config.model || '';
    const strategy = this.selector.selectStrategy(model, playerIds.length, context);
    
    if (strategy.supportsBatch && strategy.generateBatch) {
      return strategy.generateBatch(playerIds, context, players);
    } else {
      // 不支持批量，逐个生成
      const results = new Map<number, CommunicationMessage>();
      for (const playerId of playerIds) {
        const player = players.get(playerId);
        if (!player) continue;
        const message = await strategy.generateSingle(playerId, context, player.personality);
        if (message) {
          results.set(playerId, message);
        }
      }
      return results;
    }
  }
  
  getPriority(): number {
    return 3; // 最高优先级，智能选择
  }
}

/**
 * 默认策略选择器
 * 根据模型名称和玩家数量选择策略
 */
export class DefaultStrategySelector implements StrategySelector {
  // 小模型列表（适合单聊）
  private smallModels = ['qwen2:0.5b', 'qwen2:1.5b', 'chat4b'];
  
  // 大模型列表（适合批量）
  private largeModels = ['qwen2.5:3b', 'qwen2:7b', 'llama3:8b', 'qwen2.5:7b'];
  
  selectStrategy(
    model: string,
    playerCount: number,
    context: CommunicationContext
  ): CommunicationStrategy {
    const isSmallModel = this.smallModels.some(m => model.includes(m));
    const isLargeModel = this.largeModels.some(m => model.includes(m));
    
    // 如果明确是大模型，使用批量策略
    if (isLargeModel && playerCount > 1) {
      return (this as any).batchStrategy;
    }
    
    // 如果明确是小模型，使用单聊策略
    if (isSmallModel) {
      return (this as any).singleStrategy;
    }
    
    // 默认：玩家多时用批量，玩家少时用单聊
    if (playerCount > 2) {
      return (this as any).batchStrategy;
    }
    
    return (this as any).singleStrategy;
  }
}


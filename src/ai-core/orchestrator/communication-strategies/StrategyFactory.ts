/**
 * 通信策略工厂
 * 根据配置创建合适的通信策略
 */

import { CommunicationStrategy } from './CommunicationStrategy';
import { SinglePlayerStrategy } from './SinglePlayerStrategy';
import { BatchStrategy } from './BatchStrategy';
import { AdaptiveStrategy, DefaultStrategySelector } from './AdaptiveStrategy';
import { UnifiedLLMService } from '../../infrastructure/llm/UnifiedLLMService';
import { CommunicationContext } from '../CommunicationScheduler';

export interface StrategyFactoryDependencies {
  llmService: UnifiedLLMService | null;
  buildPrompt: (playerId: number, context: CommunicationContext, personality: any) => string;
  parseResponse: (response: string) => string;
  generateRuleBased: (playerId: number, context: CommunicationContext, personality: any) => any;
  getPriority: (context: CommunicationContext) => number;
  determineIntent: (context: CommunicationContext, personality: any) => string;
  determineEmotion: (context: CommunicationContext, personality: any) => string;
  buildBatchPrompt: (players: Array<{ id: number; personality: any }>, context: CommunicationContext) => string;
  parseBatchResponse: (response: string, players: Array<{ id: number; personality: any }>, context: CommunicationContext) => Map<number, any>;
}

/**
 * 创建通信策略
 */
export function createCommunicationStrategy(
  strategyType: 'single' | 'batch' | 'adaptive',
  deps: StrategyFactoryDependencies
): CommunicationStrategy {
  const singleStrategy = new SinglePlayerStrategy(
    deps.llmService,
    deps.buildPrompt,
    deps.parseResponse,
    deps.generateRuleBased,
    deps.getPriority,
    deps.determineIntent,
    deps.determineEmotion
  );
  
  const batchStrategy = new BatchStrategy(
    deps.llmService,
    deps.buildBatchPrompt,
    deps.parseBatchResponse,
    deps.generateRuleBased,
    deps.getPriority,
    deps.determineIntent,
    deps.determineEmotion
  );
  
  switch (strategyType) {
    case 'single':
      return singleStrategy;
    case 'batch':
      return batchStrategy;
    case 'adaptive':
    default:
      const selector = new DefaultStrategySelector();
      // 注入策略到选择器
      (selector as any).singleStrategy = singleStrategy;
      (selector as any).batchStrategy = batchStrategy;
      return new AdaptiveStrategy(singleStrategy, batchStrategy, deps.llmService, selector);
  }
}


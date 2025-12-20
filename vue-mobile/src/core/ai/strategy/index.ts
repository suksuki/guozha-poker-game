/**
 * AI策略模块入口
 */

export type { IAIStrategy } from './IAIStrategy';
export { MCTSStrategy } from './MCTSStrategy';
export { SimpleStrategy } from './SimpleStrategy';
export { LLMStrategy } from './LLMStrategy';

// 策略工厂：根据算法名称创建对应的策略实例
import type { IAIStrategy } from './IAIStrategy';
import { MCTSStrategy } from './MCTSStrategy';
import { SimpleStrategy } from './SimpleStrategy';
import { LLMStrategy } from './LLMStrategy';

const strategyInstances = new Map<string, IAIStrategy>();

/**
 * 获取AI策略实例
 */
export function getAIStrategy(algorithm: string): IAIStrategy {
  if (strategyInstances.has(algorithm)) {
    return strategyInstances.get(algorithm)!;
  }
  
  let strategy: IAIStrategy;
  
  switch (algorithm) {
    case 'mcts':
      strategy = new MCTSStrategy();
      break;
    case 'simple':
      strategy = new SimpleStrategy();
      break;
    case 'llm':
      strategy = new LLMStrategy();
      break;
    default:
      // 默认使用MCTS
      strategy = new MCTSStrategy();
  }
  
  strategyInstances.set(algorithm, strategy);
  return strategy;
}

/**
 * 注册自定义策略
 */
export function registerStrategy(algorithm: string, strategy: IAIStrategy): void {
  strategyInstances.set(algorithm, strategy);
}

/**
 * 获取所有可用的策略
 */
export function getAvailableStrategies(): IAIStrategy[] {
  return [
    new MCTSStrategy(),
    new SimpleStrategy(),
    new LLMStrategy()
  ];
}


/**
 * 聊天策略模块入口
 */

export type { IChatStrategy, ChatContext } from './IChatStrategy';
export { RuleBasedStrategy } from './RuleBasedStrategy';
export { LLMChatStrategy } from './LLMChatStrategy';

// 策略工厂：根据策略名称创建对应的策略实例
import type { IChatStrategy } from './IChatStrategy';
import { RuleBasedStrategy } from './RuleBasedStrategy';
import { LLMChatStrategy } from './LLMChatStrategy';
import {
  ChatServiceConfig,
  BigDunConfig,
  TauntConfig,
  LLMChatConfig,
  DEFAULT_CHAT_SERVICE_CONFIG,
  DEFAULT_BIG_DUN_CONFIG,
  DEFAULT_TAUNT_CONFIG,
  DEFAULT_LLM_CHAT_CONFIG
} from '../../config/chatConfig';

const strategyInstances = new Map<string, IChatStrategy>();

/**
 * 获取聊天策略实例
 */
export function getChatStrategy(
  strategy: 'rule-based' | 'llm' = 'rule-based',
  chatConfig?: ChatServiceConfig,
  bigDunConfig?: BigDunConfig,
  tauntConfig?: TauntConfig,
  llmConfig?: LLMChatConfig
): IChatStrategy {
  const key = `${strategy}-${JSON.stringify({ chatConfig, bigDunConfig, tauntConfig, llmConfig })}`;
  
  if (strategyInstances.has(key)) {
    return strategyInstances.get(key)!;
  }
  
  let chatStrategy: IChatStrategy;
  
  switch (strategy) {
    case 'llm':
      // 🔥 新增：创建 fallback 策略（规则策略）
      const fallbackStrategy = new RuleBasedStrategy(
        chatConfig || DEFAULT_CHAT_SERVICE_CONFIG,
        bigDunConfig || DEFAULT_BIG_DUN_CONFIG,
        tauntConfig || DEFAULT_TAUNT_CONFIG
      );
      chatStrategy = new LLMChatStrategy(
        llmConfig || DEFAULT_LLM_CHAT_CONFIG,
        fallbackStrategy  // 传入 fallback 策略
      );
      break;
    case 'rule-based':
    default:
      chatStrategy = new RuleBasedStrategy(
        chatConfig || DEFAULT_CHAT_SERVICE_CONFIG,
        bigDunConfig || DEFAULT_BIG_DUN_CONFIG,
        tauntConfig || DEFAULT_TAUNT_CONFIG
      );
  }
  
  strategyInstances.set(key, chatStrategy);
  return chatStrategy;
}

/**
 * 注册自定义策略
 */
export function registerChatStrategy(strategy: string, chatStrategy: IChatStrategy): void {
  strategyInstances.set(strategy, chatStrategy);
}

/**
 * 获取所有可用的策略
 */
export function getAvailableChatStrategies(): IChatStrategy[] {
  return [
    new RuleBasedStrategy(
      DEFAULT_CHAT_SERVICE_CONFIG,
      DEFAULT_BIG_DUN_CONFIG,
      DEFAULT_TAUNT_CONFIG
    ),
    new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG)
  ];
}

/**
 * 清除策略缓存（强制重新创建）
 */
export function clearStrategyCache(): void {
  strategyInstances.clear();
}

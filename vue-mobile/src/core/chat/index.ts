/**
 * 聊天模块主入口
 * 统一导出所有聊天相关功能
 */

// 导出策略接口和实现
export type { IChatStrategy, ChatContext } from './strategy';
export { 
  RuleBasedStrategy, 
  LLMChatStrategy,
  getChatStrategy,
  registerChatStrategy,
  getAvailableChatStrategies
} from './strategy';

// 导出配置
export {
  ChatServiceConfig,
  BigDunConfig,
  TauntConfig,
  LLMChatConfig,
  DEFAULT_CHAT_SERVICE_CONFIG,
  DEFAULT_BIG_DUN_CONFIG,
  DEFAULT_TAUNT_CONFIG,
  DEFAULT_LLM_CHAT_CONFIG,
  getChatConfigByMode
} from '../config/chatConfig';

// 导出类型
export type { ChatMessage, ChatEventType } from '../types/chat';


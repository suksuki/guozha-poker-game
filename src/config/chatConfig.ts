/**
 * 聊天配置文件
 * 管理所有聊天相关的配置
 */

import { ChatEventType } from '../types/chat';

// 聊天服务配置
export interface ChatServiceConfig {
  maxMessages: number; // 最大消息数量
  randomChatInterval: number; // 随机闲聊间隔（毫秒）
  randomChatProbability: number; // 随机闲聊概率
  eventChatProbability: Record<ChatEventType, number>; // 各事件触发概率
  enableVoice: boolean; // 是否启用语音
}

// 默认聊天服务配置
export const DEFAULT_CHAT_SERVICE_CONFIG: ChatServiceConfig = {
  maxMessages: 50,
  randomChatInterval: 8000, // 8秒
  randomChatProbability: 0.3, // 30%
  eventChatProbability: {
    [ChatEventType.RANDOM]: 0.3,
    [ChatEventType.BIG_DUN]: 0.6, // 大墩出现，提高概率
    [ChatEventType.SCORE_STOLEN]: 0.6,
    [ChatEventType.SCORE_EATEN_CURSE]: 0.8, // 分牌被吃，更大概率触发脏话
    [ChatEventType.GOOD_PLAY]: 0.3,
    [ChatEventType.BAD_LUCK]: 0.4,
    [ChatEventType.WINNING]: 0.2,
    [ChatEventType.LOSING]: 0.3,
    [ChatEventType.FINISH_FIRST]: 0.9, // 头名出完，高概率
    [ChatEventType.FINISH_MIDDLE]: 0.7, // 中间名次出完，较高概率
    [ChatEventType.FINISH_LAST]: 0.5,
    [ChatEventType.URGE_PLAY]: 0.7, // 催促出牌，较高概率
    [ChatEventType.DUN_PLAYED]: 0.8, // 出墩时的得意话，高概率
    [ChatEventType.DEALING]: 0.2, // 发牌时的反应
    [ChatEventType.DEALING_GOOD_CARD]: 0.5, // 发到好牌
    [ChatEventType.DEALING_BAD_CARD]: 0.3, // 发到差牌
    [ChatEventType.DEALING_BOMB_FORMED]: 0.7, // 理牌时形成炸弹
    [ChatEventType.DEALING_DUN_FORMED]: 0.9, // 理牌时形成墩
    [ChatEventType.DEALING_HUGE_CARD]: 0.6, // 理牌时抓到超大牌
    [ChatEventType.DEALING_POOR_HAND]: 0.4 // 理牌时手牌质量差
  },
  enableVoice: true
};

// 大墩触发配置
export interface BigDunConfig {
  minSize: number; // 触发大墩反应的最小张数
  reactionProbability: number; // 其他玩家反应的概率
}

export const DEFAULT_BIG_DUN_CONFIG: BigDunConfig = {
  minSize: 8,
  reactionProbability: 0.5
};

// 对骂配置
export interface TauntConfig {
  probability: number; // 对骂概率
}

export const DEFAULT_TAUNT_CONFIG: TauntConfig = {
  probability: 0.2 // 20%
};

// 大模型聊天配置（预留，未来使用）
export interface LLMChatConfig {
  provider: 'openai' | 'claude' | 'custom'; // 模型提供商
  model?: string; // 模型名称
  apiKey?: string; // API密钥
  temperature?: number; // 温度参数
  maxTokens?: number; // 最大token数
  systemPrompt?: string; // 系统提示词
  enableContext?: boolean; // 是否使用游戏上下文
  enableHistory?: boolean; // 是否使用聊天历史
  maxHistoryLength?: number; // 最大历史长度
}

export const DEFAULT_LLM_CHAT_CONFIG: LLMChatConfig = {
  provider: 'openai',
  model: 'gpt-4',
  temperature: 0.8, // 更高的温度，让聊天更生动
  maxTokens: 100,
  enableContext: true,
  enableHistory: true,
  maxHistoryLength: 10,
  systemPrompt: `你是一个过炸牌游戏的AI玩家，需要根据游戏情况生成自然、有趣的聊天内容。
规则：
1. 内容要符合游戏场景，简短有力
2. 可以适当使用方言特色（如果玩家设置了方言）
3. 要有个性，不同玩家有不同的说话风格
4. 对骂要适度，不能过于激烈
5. 根据游戏状态（领先、落后、出好牌等）调整语气`
};

/**
 * 根据模式获取聊天配置
 */
export function getChatConfigByMode(mode: 'rule-based' | 'llm'): {
  strategy: 'rule-based' | 'llm';
  chatConfig: ChatServiceConfig;
  bigDunConfig: BigDunConfig;
  tauntConfig: TauntConfig;
  llmConfig?: LLMChatConfig;
} {
  switch (mode) {
    case 'llm':
      return {
        strategy: 'llm',
        chatConfig: DEFAULT_CHAT_SERVICE_CONFIG,
        bigDunConfig: DEFAULT_BIG_DUN_CONFIG,
        tauntConfig: DEFAULT_TAUNT_CONFIG,
        llmConfig: DEFAULT_LLM_CHAT_CONFIG
      };
    case 'rule-based':
    default:
      return {
        strategy: 'rule-based',
        chatConfig: DEFAULT_CHAT_SERVICE_CONFIG,
        bigDunConfig: DEFAULT_BIG_DUN_CONFIG,
        tauntConfig: DEFAULT_TAUNT_CONFIG
      };
  }
}


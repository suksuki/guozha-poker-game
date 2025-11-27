/**
 * 聊天配置文件
 * 管理所有聊天相关的配置
 */

import { ChatEventType, ChatScene } from '../types/chat';

// 聊天服务配置
export interface ChatServiceConfig {
  maxMessages: number; // 最大消息数量
  randomChatInterval: number; // 随机闲聊间隔（毫秒）
  randomChatProbability: number; // 随机闲聊概率
  eventChatProbability: Record<ChatEventType, number>; // 各事件触发概率
  enableVoice: boolean; // 是否启用语音
  enableHistory?: boolean; // 是否使用聊天历史（用于大模型）
  maxHistoryLength?: number; // 最大历史长度
}

// 默认聊天服务配置
export const DEFAULT_CHAT_SERVICE_CONFIG: ChatServiceConfig = {
  maxMessages: 50,
  randomChatInterval: 8000, // 8秒
  randomChatProbability: 0.3, // 30%
  enableHistory: true, // 默认启用历史
  maxHistoryLength: 10, // 默认历史长度
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

// 大模型聊天配置
export interface LLMChatConfig {
  provider: 'openai' | 'claude' | 'custom'; // 模型提供商
  apiUrl?: string; // API地址（自定义大模型时使用，如 http://localhost:8000/v1/chat/completions）
  model?: string; // 模型名称
  apiKey?: string; // API密钥（可选，如果大模型不需要认证）
  temperature?: number; // 温度参数
  maxTokens?: number; // 最大token数
  systemPrompt?: string; // 系统提示词
  enableContext?: boolean; // 是否使用游戏上下文
  enableHistory?: boolean; // 是否使用聊天历史
  maxHistoryLength?: number; // 最大历史长度
  timeout?: number; // 请求超时时间（毫秒）
  enableMultilingual?: boolean; // 是否启用LLM多语言生成（默认true，如果false则LLM只生成中文，然后翻译）
}

export const DEFAULT_LLM_CHAT_CONFIG: LLMChatConfig = {
  provider: 'custom',
  apiUrl: 'http://localhost:11434/api/chat', // Ollama原生API地址
  model: 'qwen2:0.5b', // Ollama模型名称
  temperature: 0.8, // 更高的温度，让聊天更生动
  maxTokens: 50, // 减少token数，鼓励简短输出（15个字约30-40 tokens）
  enableContext: true,
  enableHistory: true,
  maxHistoryLength: 10,
  timeout: 60000, // 60秒超时（LLM生成可能需要较长时间）
  enableMultilingual: true, // 启用LLM多语言生成（LLM直接生成目标语言，而不是生成中文再翻译）
  systemPrompt: `你是一个过炸牌游戏的AI玩家，需要根据游戏情况生成自然、有趣的聊天内容。

语言要求：
- 根据"语言要求"部分的指示，使用对应的语言回复
- 如果要求使用中文，使用中文回复
- 如果要求使用其他语言（如英语、日语、韩语等），使用对应语言回复
- 保持语言地道自然，符合该语言的表达习惯

重要要求：
1. 只返回一句话（不要多句）
2. 最多15个字（必须严格遵守）
3. 简洁自然，不要"好的，"、"我觉得，"等冗余开头
4. 符合游戏场景，口语化表达

规则：
1. 内容要符合游戏场景，简短有力（1-2句话，不超过20字）
2. 可以适当使用方言特色（如果玩家设置了方言且使用中文）
3. 要有个性，不同玩家有不同的说话风格
4. 对骂必须使用脏话和粗口，要激烈一些，符合打牌时的对骂场景
5. 根据游戏状态（领先、落后、出好牌等）调整语气
6. 只返回要说的话，不要添加任何解释或标记
7. 必须严格遵守"语言要求"部分指定的语言

示例（中文）：
- 好牌！
- 这手不错
- 要不起
- 等等我
- 出得好

示例（英文）：
- Good cards!
- Nice play
- Can't beat
- Wait for me
- Well played`
};

// 场景配置接口
export interface ChatSceneConfig {
  maxLength: number; // 最大长度（字符数）
  removeFormal: boolean; // 是否移除正式表达
  includeFullGameState: boolean; // 是否包含完整游戏状态
  includeDetailedEventInfo: boolean; // 是否包含详细事件信息
  historyLength: number; // 聊天历史长度
  promptTemplate?: string; // 自定义提示词模板（可选）
}

// 场景配置映射
export interface ChatSceneConfigMap {
  [ChatScene.SPONTANEOUS]: ChatSceneConfig;
  [ChatScene.EVENT_DRIVEN]: ChatSceneConfig;
  [ChatScene.TAUNT]: ChatSceneConfig;
}

// 默认场景配置
export const DEFAULT_CHAT_SCENE_CONFIG: ChatSceneConfigMap = {
  [ChatScene.SPONTANEOUS]: {
    maxLength: 20, // 自发聊天可以稍长
    removeFormal: true,
    includeFullGameState: false, // 不需要完整游戏状态
    includeDetailedEventInfo: false,
    historyLength: 5, // 只需要最近5条历史
  },
  [ChatScene.EVENT_DRIVEN]: {
    maxLength: 15, // 事件触发更精准，更短
    removeFormal: true,
    includeFullGameState: true, // 需要完整游戏状态
    includeDetailedEventInfo: true, // 需要详细事件信息
    historyLength: 3, // 只需要最近3条历史
  },
  [ChatScene.TAUNT]: {
    maxLength: 20, // 对骂保留原始性，允许稍长以保留完整表达（APP主打对骂）
    removeFormal: false, // 不严格处理，保留对骂的原始性和完整性
    includeFullGameState: false, // 对骂不需要完整状态
    includeDetailedEventInfo: false,
    historyLength: 2, // 只需要最近2条历史
  },
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


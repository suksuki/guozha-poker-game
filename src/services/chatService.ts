/**
 * 聊天服务
 * 独立的聊天服务模块，管理聊天消息和触发逻辑
 * 使用策略模式，支持灵活替换不同的聊天生成策略
 */

import { ChatMessage, ChatEventType } from '../types/chat';
import { Player } from '../types/card';
import { 
  ChatServiceConfig, 
  DEFAULT_CHAT_SERVICE_CONFIG, 
  BigDunConfig, 
  DEFAULT_BIG_DUN_CONFIG, 
  TauntConfig, 
  DEFAULT_TAUNT_CONFIG
} from '../config/chatConfig';
import { speakText } from './voiceService';
import type { IChatStrategy, ChatContext } from '../chat/strategy';
import { getChatStrategy } from '../chat/strategy';

// 聊天服务类
class ChatService {
  private messages: ChatMessage[] = [];
  private config: ChatServiceConfig;
  private bigDunConfig: BigDunConfig;
  private tauntConfig: TauntConfig;
  private strategy: IChatStrategy;

  constructor(
    strategy: 'rule-based' | 'llm' = 'rule-based',
    config: ChatServiceConfig = DEFAULT_CHAT_SERVICE_CONFIG,
    bigDunConfig: BigDunConfig = DEFAULT_BIG_DUN_CONFIG,
    tauntConfig: TauntConfig = DEFAULT_TAUNT_CONFIG
  ) {
    this.config = config;
    this.bigDunConfig = bigDunConfig;
    this.tauntConfig = tauntConfig;
    this.strategy = getChatStrategy(strategy, config, bigDunConfig, tauntConfig);
  }

  // 更新配置
  updateConfig(config: Partial<ChatServiceConfig>): void {
    this.config = { ...this.config, ...config };
    // 如果使用rule-based策略，需要更新策略实例
    if (this.strategy.name === 'rule-based') {
      this.strategy = getChatStrategy('rule-based', this.config, this.bigDunConfig, this.tauntConfig);
    }
  }

  updateBigDunConfig(config: Partial<BigDunConfig>): void {
    this.bigDunConfig = { ...this.bigDunConfig, ...config };
    // 如果使用rule-based策略，需要更新策略实例
    if (this.strategy.name === 'rule-based') {
      this.strategy = getChatStrategy('rule-based', this.config, this.bigDunConfig, this.tauntConfig);
    }
  }

  updateTauntConfig(config: Partial<TauntConfig>): void {
    this.tauntConfig = { ...this.tauntConfig, ...config };
    // 如果使用rule-based策略，需要更新策略实例
    if (this.strategy.name === 'rule-based') {
      this.strategy = getChatStrategy('rule-based', this.config, this.bigDunConfig, this.tauntConfig);
    }
  }

  // 切换策略
  setStrategy(strategy: 'rule-based' | 'llm'): void {
    this.strategy = getChatStrategy(strategy, this.config, this.bigDunConfig, this.tauntConfig);
  }

  // 添加聊天消息
  addMessage(message: ChatMessage): void {
    this.messages.push(message);
    // 保持消息数量在限制内
    if (this.messages.length > this.config.maxMessages) {
      this.messages.shift();
    }
  }

  // 获取所有聊天消息
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  // 获取最新消息
  getLatestMessage(): ChatMessage | null {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  // 清空聊天消息
  clearMessages(): void {
    this.messages = [];
  }

  // 获取消息数量
  getMessageCount(): number {
    return this.messages.length;
  }

  // 创建聊天消息
  createMessage(
    player: Player,
    content: string,
    type: 'random' | 'event' | 'taunt' = 'random'
  ): ChatMessage {
    return {
      playerId: player.id,
      playerName: player.name,
      content,
      timestamp: Date.now(),
      type
    };
  }

  // 播放聊天语音（如果启用）
  private async playChatVoice(content: string, player: Player): Promise<void> {
    if (this.config.enableVoice && player.voiceConfig) {
      try {
        await speakText(content, player.voiceConfig);
      } catch (err) {
        console.warn('播放聊天语音失败:', err);
      }
    }
  }

  // 触发随机闲聊
  async triggerRandomChat(player: Player, probability?: number, context?: ChatContext): Promise<ChatMessage | null> {
    // 先检查概率
    const prob = probability ?? this.config.eventChatProbability[ChatEventType.RANDOM];
    if (Math.random() > prob) {
      return null;
    }

    // 使用策略生成聊天内容
    const message = await this.strategy.generateRandomChat(player, context);
    if (message) {
      this.addMessage(message);
      // 播放语音
      this.playChatVoice(message.content, player);
    }
    
    return message;
  }

  // 触发事件聊天
  async triggerEventChat(
    player: Player,
    eventType: ChatEventType,
    context?: ChatContext
  ): Promise<ChatMessage | null> {
    // 先检查概率
    const prob = this.config.eventChatProbability[eventType] ?? 0.5;
    if (Math.random() > prob) {
      return null;
    }

    // 使用策略生成聊天内容
    const message = await this.strategy.generateEventChat(player, eventType, context);
    if (message) {
      this.addMessage(message);
      // 播放语音
      this.playChatVoice(message.content, player);
    }
    
    return message;
  }

  // 触发大墩反应
  async triggerBigDunReaction(players: Player[], dunPlayerId: number, dunSize: number): Promise<void> {
    if (dunSize >= this.bigDunConfig.minSize) {
      const context: ChatContext = {
        eventData: { dunSize }
      };
      
      for (const player of players) {
        if (player.id !== dunPlayerId && Math.random() < this.bigDunConfig.reactionProbability) {
          await this.triggerEventChat(player, ChatEventType.BIG_DUN, context);
        }
      }
    }
  }

  // 触发分牌被捡走反应（普通抱怨）
  async triggerScoreStolenReaction(player: Player, stolenScore: number): Promise<void> {
    if (stolenScore > 0) {
      const context: ChatContext = {
        eventData: { stolenScore }
      };
      await this.triggerEventChat(player, ChatEventType.SCORE_STOLEN, context);
    }
  }

  // 触发分牌被吃反应（脏话，更激烈）
  async triggerScoreEatenCurseReaction(player: Player, stolenScore: number): Promise<void> {
    if (stolenScore > 0) {
      const context: ChatContext = {
        eventData: { stolenScore }
      };
      await this.triggerEventChat(player, ChatEventType.SCORE_EATEN_CURSE, context);
    }
  }

  // 触发催促出牌反应（对方一直不出牌）
  async triggerUrgePlayReaction(player: Player, targetPlayer?: Player): Promise<void> {
    const context: ChatContext = {
      eventData: {},
      playerState: targetPlayer ? {
        handCount: targetPlayer.hand.length
      } : undefined
    };
    await this.triggerEventChat(player, ChatEventType.URGE_PLAY, context);
  }

  // 触发好牌反应
  async triggerGoodPlayReaction(player: Player, context?: ChatContext): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.GOOD_PLAY, context);
  }

  // 触发对骂
  async triggerTaunt(player: Player, targetPlayer?: Player, context?: ChatContext): Promise<void> {
    // 使用策略生成对骂内容
    const message = await this.strategy.generateTaunt(player, targetPlayer, context);
    if (message) {
      this.addMessage(message);
      // 播放语音
      this.playChatVoice(message.content, player);
    }
  }

  // 触发其他事件
  async triggerBadLuckReaction(player: Player, context?: ChatContext): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.BAD_LUCK, context);
  }

  async triggerWinningReaction(player: Player, context?: ChatContext): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.WINNING, context);
  }

  async triggerLosingReaction(player: Player, context?: ChatContext): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.LOSING, context);
  }

  async triggerFinishFirstReaction(player: Player, context?: ChatContext): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.FINISH_FIRST, context);
  }

  async triggerFinishLastReaction(player: Player, context?: ChatContext): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.FINISH_LAST, context);
  }

  async triggerFinishMiddleReaction(player: Player, context?: ChatContext): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.FINISH_MIDDLE, context);
  }

  async triggerDunPlayedReaction(player: Player, context?: ChatContext): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.DUN_PLAYED, context);
  }
}

// 创建全局聊天服务实例（默认使用rule-based策略）
export const chatService = new ChatService('rule-based');

// 导出便捷函数（保持向后兼容）
export function addChatMessage(message: ChatMessage): void {
  chatService.addMessage(message);
}

export function getChatMessages(): ChatMessage[] {
  return chatService.getMessages();
}

export function clearChatMessages(): void {
  chatService.clearMessages();
}

export function createChatMessage(
  player: Player,
  content: string,
  type: 'random' | 'event' | 'taunt' = 'random'
): ChatMessage {
  return chatService.createMessage(player, content, type);
}

// 异步函数，保持向后兼容（返回Promise）
export async function triggerRandomChat(player: Player, probability?: number): Promise<ChatMessage | null> {
  return await chatService.triggerRandomChat(player, probability);
}

export async function triggerEventChat(
  player: Player,
  eventType: ChatEventType
): Promise<ChatMessage | null> {
  return await chatService.triggerEventChat(player, eventType);
}

export async function triggerBigDunReaction(players: Player[], dunPlayerId: number, dunSize: number): Promise<void> {
  await chatService.triggerBigDunReaction(players, dunPlayerId, dunSize);
}

export async function triggerScoreStolenReaction(player: Player, stolenScore: number): Promise<void> {
  await chatService.triggerScoreStolenReaction(player, stolenScore);
}

export async function triggerScoreEatenCurseReaction(player: Player, stolenScore: number): Promise<void> {
  await chatService.triggerScoreEatenCurseReaction(player, stolenScore);
}

export async function triggerUrgePlayReaction(player: Player, targetPlayer?: Player): Promise<void> {
  await chatService.triggerUrgePlayReaction(player, targetPlayer);
}

export async function triggerGoodPlayReaction(player: Player): Promise<void> {
  await chatService.triggerGoodPlayReaction(player);
}

export async function triggerTaunt(player: Player, targetPlayer?: Player): Promise<void> {
  await chatService.triggerTaunt(player, targetPlayer);
}

export async function triggerBadLuckReaction(player: Player): Promise<void> {
  await chatService.triggerBadLuckReaction(player);
}

export async function triggerWinningReaction(player: Player): Promise<void> {
  await chatService.triggerWinningReaction(player);
}

export async function triggerLosingReaction(player: Player): Promise<void> {
  await chatService.triggerLosingReaction(player);
}

export async function triggerFinishFirstReaction(player: Player): Promise<void> {
  await chatService.triggerFinishFirstReaction(player);
}

export async function triggerFinishLastReaction(player: Player): Promise<void> {
  await chatService.triggerFinishLastReaction(player);
}

export async function triggerFinishMiddleReaction(player: Player): Promise<void> {
  await chatService.triggerFinishMiddleReaction(player);
}

export async function triggerDunPlayedReaction(player: Player): Promise<void> {
  await chatService.triggerDunPlayedReaction(player);
}


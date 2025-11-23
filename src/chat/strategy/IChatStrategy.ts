/**
 * 聊天策略接口
 * 所有聊天生成策略都需要实现这个接口，以便可以灵活替换
 */

import { ChatMessage, ChatEventType } from '../../types/chat';
import { Player } from '../../types/card';

/**
 * 聊天策略接口
 * 定义了聊天内容生成的标准方法
 */
export interface IChatStrategy {
  /**
   * 生成随机闲聊内容
   * @param player 玩家
   * @param context 上下文信息（可选）
   * @returns 聊天消息，如果返回null表示不触发
   */
  generateRandomChat(
    player: Player,
    context?: ChatContext
  ): Promise<ChatMessage | null> | ChatMessage | null;

  /**
   * 生成事件聊天内容
   * @param player 玩家
   * @param eventType 事件类型
   * @param context 上下文信息（可选）
   * @returns 聊天消息，如果返回null表示不触发
   */
  generateEventChat(
    player: Player,
    eventType: ChatEventType,
    context?: ChatContext
  ): Promise<ChatMessage | null> | ChatMessage | null;

  /**
   * 生成对骂内容
   * @param player 玩家
   * @param targetPlayer 目标玩家（可选）
   * @param context 上下文信息（可选）
   * @returns 聊天消息，如果返回null表示不触发
   */
  generateTaunt(
    player: Player,
    targetPlayer?: Player,
    context?: ChatContext
  ): Promise<ChatMessage | null> | ChatMessage | null;

  /**
   * 策略名称
   */
  readonly name: string;

  /**
   * 策略描述
   */
  readonly description: string;
}

/**
 * 聊天上下文信息
 * 用于提供更多上下文给策略生成更合适的聊天内容
 */
export interface ChatContext {
  gameState?: {
    roundNumber?: number;
    roundScore?: number;
    playerCount?: number;
    currentPlayerIndex?: number;
  };
  eventData?: {
    dunSize?: number;
    stolenScore?: number;
    cardType?: string;
    playValue?: number;
    card?: any; // 卡牌对象
    progress?: number; // 发牌进度
    rank?: number; // 牌的点数
    count?: number; // 牌的数量
    hand?: any[]; // 手牌
    handValue?: number; // 手牌价值
    handLength?: number; // 手牌长度
  };
  playerState?: {
    handCount?: number;
    score?: number;
    rank?: number;
  };
  history?: ChatMessage[]; // 最近的聊天历史
}


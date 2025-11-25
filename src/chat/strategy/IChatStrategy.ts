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
   * 生成回复内容
   * @param player 回复的玩家
   * @param originalMessage 原始消息（被回复的消息）
   * @param context 上下文信息（可选）
   * @returns 聊天消息，如果返回null表示不触发
   */
  generateReply?(
    player: Player,
    originalMessage: ChatMessage,
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

import { Player, Card, Play, GameStatus } from '../../types/card';
import { MultiPlayerGameState } from '../../utils/gameStateUtils';

/**
 * 聊天上下文信息
 * 用于提供更多上下文给策略生成更合适的聊天内容
 */
export interface ChatContext {
  // 完整游戏状态（用于大模型）
  fullGameState?: MultiPlayerGameState;
  
  // 当前玩家信息
  currentPlayer?: Player;
  
  // 所有玩家信息
  allPlayers?: Player[];
  
  // 目标玩家（用于对骂等场景）
  targetPlayer?: Player;
  
  // 游戏状态摘要
  gameState?: {
    roundNumber?: number;
    roundScore?: number;
    totalScore?: number;
    playerCount?: number;
    currentPlayerIndex?: number;
    status?: GameStatus;
    lastPlay?: Play | null;
    lastPlayPlayerIndex?: number | null;
  };
  
  // 事件数据
  eventData?: {
    dunSize?: number;
    stolenScore?: number;
    cardType?: string;
    playValue?: number;
    card?: Card;
    progress?: number; // 发牌进度
    rank?: number; // 牌的点数
    count?: number; // 牌的数量
    hand?: Card[]; // 手牌
    handValue?: number; // 手牌价值
    handLength?: number; // 手牌长度
  };
  
  // 玩家状态
  playerState?: {
    handCount?: number;
    score?: number;
    rank?: number;
  };
  
  // 聊天历史
  history?: ChatMessage[]; // 最近的聊天历史
}


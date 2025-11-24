/**
 * 聊天服务
 * 独立的聊天服务模块，管理聊天消息和触发逻辑
 * 使用策略模式，支持灵活替换不同的聊天生成策略
 */

import { ChatMessage, ChatEventType } from '../types/chat';
import { Player, Card, Suit, Rank } from '../types/card';
import { 
  ChatServiceConfig, 
  DEFAULT_CHAT_SERVICE_CONFIG, 
  BigDunConfig, 
  DEFAULT_BIG_DUN_CONFIG, 
  TauntConfig, 
  DEFAULT_TAUNT_CONFIG
} from '../config/chatConfig';
import type { IChatStrategy, ChatContext } from '../chat/strategy';
import { getChatStrategy } from '../chat/strategy';
import { getCardType } from '../utils/cardUtils';
import { groupCardsByRank } from '../utils/cardSorting';
import { evaluateHandValue } from '../ai/simpleStrategy';
import { MultiPlayerGameState } from '../utils/gameStateUtils';

// 聊天服务类
class ChatService {
  private messages: ChatMessage[] = [];
  private config: ChatServiceConfig;
  private bigDunConfig: BigDunConfig;
  private tauntConfig: TauntConfig;
  private strategy: IChatStrategy;
  private fallbackStrategy: IChatStrategy | null = null; // 回退策略（规则策略）

  constructor(
    strategy: 'rule-based' | 'llm' = 'llm', // 默认使用llm策略，因为大模型已启动
    config: ChatServiceConfig = DEFAULT_CHAT_SERVICE_CONFIG,
    bigDunConfig: BigDunConfig = DEFAULT_BIG_DUN_CONFIG,
    tauntConfig: TauntConfig = DEFAULT_TAUNT_CONFIG,
    llmConfig?: any // LLMChatConfig
  ) {
    this.config = config;
    this.bigDunConfig = bigDunConfig;
    this.tauntConfig = tauntConfig;
    this.strategy = getChatStrategy(strategy, config, bigDunConfig, tauntConfig, llmConfig);
    // 如果使用LLM策略，创建规则策略作为回退
    if (strategy === 'llm') {
      this.fallbackStrategy = getChatStrategy('rule-based', config, bigDunConfig, tauntConfig);
    }
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

  // 获取当前策略信息
  getCurrentStrategy(): { name: string; description: string; isLLM: boolean } {
    return {
      name: this.strategy.name,
      description: this.strategy.description,
      isLLM: this.strategy.name === 'llm'
    };
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

  // 触发随机闲聊
  async triggerRandomChat(
    player: Player, 
    probability?: number, 
    context?: ChatContext,
    fullGameState?: any // MultiPlayerGameState
  ): Promise<ChatMessage | null> {
    // 先检查概率
    const prob = probability ?? this.config.eventChatProbability[ChatEventType.RANDOM];
    if (Math.random() > prob) {
      return null;
    }

    // 构建完整上下文
    const fullContext: ChatContext = {
      ...context,
      fullGameState,
      currentPlayer: player,
      allPlayers: fullGameState?.players || context?.allPlayers,
      gameState: fullGameState ? {
        roundNumber: fullGameState.roundNumber,
        roundScore: fullGameState.roundScore,
        totalScore: fullGameState.totalScore,
        playerCount: fullGameState.playerCount,
        currentPlayerIndex: fullGameState.currentPlayerIndex,
        status: fullGameState.status,
        lastPlay: fullGameState.lastPlay,
        lastPlayPlayerIndex: fullGameState.lastPlayPlayerIndex
      } : context?.gameState,
      history: this.config.enableHistory ? this.messages.slice(-this.config.maxHistoryLength || 10) : undefined
    };

    // 使用策略生成聊天内容
    console.log('[ChatService] 调用策略生成随机闲聊，策略:', this.strategy.name);
    let message = await this.strategy.generateRandomChat(player, fullContext);
    
    // 如果LLM策略失败，使用规则策略作为回退
    if (!message && this.fallbackStrategy && this.strategy.name === 'llm') {
      console.warn('[ChatService] ⚠️ LLM策略返回null，切换到规则策略回退');
      message = await this.fallbackStrategy.generateRandomChat(player, fullContext);
    }
    
    if (message) {
      console.log('[ChatService] ✅ 收到聊天消息:', message.content);
      this.addMessage(message);
      // 不再自动播放语音，由组件决定是否播放
    } else {
      console.warn('[ChatService] ⚠️ 所有策略都返回null，未生成聊天消息');
    }
    
    return message;
  }

  // 触发事件聊天
  async triggerEventChat(
    player: Player,
    eventType: ChatEventType,
    context?: ChatContext,
    fullGameState?: any // MultiPlayerGameState
  ): Promise<ChatMessage | null> {
    // 先检查概率
    const prob = this.config.eventChatProbability[eventType] ?? 0.5;
    if (Math.random() > prob) {
      return null;
    }

    // 构建完整上下文
    const fullContext: ChatContext = {
      ...context,
      fullGameState,
      currentPlayer: player,
      allPlayers: fullGameState?.players || context?.allPlayers,
      gameState: fullGameState ? {
        roundNumber: fullGameState.roundNumber,
        roundScore: fullGameState.roundScore,
        totalScore: fullGameState.totalScore,
        playerCount: fullGameState.playerCount,
        currentPlayerIndex: fullGameState.currentPlayerIndex,
        status: fullGameState.status,
        lastPlay: fullGameState.lastPlay,
        lastPlayPlayerIndex: fullGameState.lastPlayPlayerIndex
      } : context?.gameState,
      history: this.config.enableHistory ? this.messages.slice(-this.config.maxHistoryLength || 10) : undefined
    };

    // 使用策略生成聊天内容
    console.log('[ChatService] 调用策略生成事件聊天，策略:', this.strategy.name);
    let message = await this.strategy.generateEventChat(player, eventType, fullContext);
    
    // 如果LLM策略失败，使用规则策略作为回退
    if (!message && this.fallbackStrategy && this.strategy.name === 'llm') {
      console.warn('[ChatService] ⚠️ LLM策略返回null，切换到规则策略回退');
      message = await this.fallbackStrategy.generateEventChat(player, eventType, fullContext);
    }
    
    if (message) {
      console.log('[ChatService] ✅ 收到聊天消息:', message.content);
      this.addMessage(message);
      // 不再自动播放语音，由组件决定是否播放
    } else {
      console.warn('[ChatService] ⚠️ 所有策略都返回null，未生成聊天消息');
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
  async triggerScoreStolenReaction(
    player: Player, 
    stolenScore: number,
    fullGameState?: MultiPlayerGameState
  ): Promise<void> {
    if (stolenScore > 0) {
      const context: ChatContext = {
        eventData: { stolenScore }
      };
      await this.triggerEventChat(player, ChatEventType.SCORE_STOLEN, context, fullGameState);
    }
  }

  // 触发分牌被吃反应（脏话，更激烈）
  async triggerScoreEatenCurseReaction(
    player: Player, 
    stolenScore: number,
    fullGameState?: MultiPlayerGameState
  ): Promise<void> {
    if (stolenScore > 0) {
      const context: ChatContext = {
        eventData: { stolenScore }
      };
      await this.triggerEventChat(player, ChatEventType.SCORE_EATEN_CURSE, context, fullGameState);
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
  async triggerGoodPlayReaction(
    player: Player, 
    context?: ChatContext,
    fullGameState?: MultiPlayerGameState
  ): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.GOOD_PLAY, context, fullGameState);
  }

  // 触发对骂
  async triggerTaunt(
    player: Player, 
    targetPlayer?: Player, 
    context?: ChatContext,
    fullGameState?: any // MultiPlayerGameState
  ): Promise<void> {
    // 构建完整上下文
    const fullContext: ChatContext = {
      ...context,
      fullGameState,
      currentPlayer: player,
      allPlayers: fullGameState?.players || context?.allPlayers,
      gameState: fullGameState ? {
        roundNumber: fullGameState.roundNumber,
        roundScore: fullGameState.roundScore,
        totalScore: fullGameState.totalScore,
        playerCount: fullGameState.playerCount,
        currentPlayerIndex: fullGameState.currentPlayerIndex,
        status: fullGameState.status,
        lastPlay: fullGameState.lastPlay,
        lastPlayPlayerIndex: fullGameState.lastPlayPlayerIndex
      } : context?.gameState,
      history: this.config.enableHistory ? this.messages.slice(-this.config.maxHistoryLength || 10) : undefined
    };

    // 使用策略生成对骂内容
    let message = await this.strategy.generateTaunt(player, targetPlayer, fullContext);
    
    // 如果LLM策略失败，使用规则策略作为回退
    if (!message && this.fallbackStrategy && this.strategy.name === 'llm') {
      console.warn('[ChatService] ⚠️ LLM策略返回null，切换到规则策略回退（对骂）');
      message = await this.fallbackStrategy.generateTaunt(player, targetPlayer, fullContext);
    }
    
    if (message) {
      this.addMessage(message);
      // 不再自动播放语音，由组件决定是否播放
    } else {
      console.warn('[ChatService] ⚠️ 所有策略都返回null，未生成对骂消息');
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

  async triggerFinishFirstReaction(
    player: Player, 
    context?: ChatContext,
    fullGameState?: MultiPlayerGameState
  ): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.FINISH_FIRST, context, fullGameState);
  }

  async triggerFinishLastReaction(
    player: Player, 
    context?: ChatContext,
    fullGameState?: MultiPlayerGameState
  ): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.FINISH_LAST, context, fullGameState);
  }

  async triggerFinishMiddleReaction(
    player: Player, 
    context?: ChatContext,
    fullGameState?: MultiPlayerGameState
  ): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.FINISH_MIDDLE, context, fullGameState);
  }

  async triggerDunPlayedReaction(player: Player, context?: ChatContext): Promise<void> {
    await this.triggerEventChat(player, ChatEventType.DUN_PLAYED, context);
  }

  // 触发发牌反应
  async triggerDealingReaction(player: Player, card: Card, currentIndex: number, totalCards: number, context?: ChatContext): Promise<void> {
    // 根据发牌进度和牌的质量触发不同反应
    const progress = currentIndex / totalCards;
    const isGoodCard = card.suit === Suit.JOKER || card.rank === Rank.TWO || card.rank === Rank.ACE; // 大小王、2、A
    
    if (isGoodCard) {
      await this.triggerEventChat(player, ChatEventType.DEALING_GOOD_CARD, {
        ...context,
        eventData: { card, progress }
      });
    } else if (progress > 0.8 && Math.random() < 0.3) {
      // 发牌快结束时，偶尔抱怨
      await this.triggerEventChat(player, ChatEventType.DEALING_BAD_CARD, {
        ...context,
        eventData: { card, progress }
      });
    } else if (progress < 0.2 && Math.random() < 0.2) {
      // 发牌开始时，偶尔闲聊
      await this.triggerEventChat(player, ChatEventType.DEALING, {
        ...context,
        eventData: { card, progress }
      });
    }
  }

  // 触发理牌过程中的聊天反应
  async triggerSortingReaction(
    player: Player,
    hand: Card[],
    newlyDealtCard: Card,
    context?: ChatContext
  ): Promise<void> {
    // 控制触发频率，避免过于频繁（30%概率）
    if (Math.random() > 0.3) {
      return;
    }

    // 1. 检测炸弹/墩（优先检测，因为最兴奋）
    const rankGroups = groupCardsByRank(hand);
    for (const [rank, cards] of Array.from(rankGroups.entries())) {
      if (cards.length >= 7) {
        // 形成墩了！
        await this.triggerEventChat(player, ChatEventType.DEALING_DUN_FORMED, {
          ...context,
          eventData: { rank, count: cards.length, hand }
        });
        return; // 优先触发，触发后不再检测其他
      } else if (cards.length >= 4) {
        // 形成炸弹了！
        await this.triggerEventChat(player, ChatEventType.DEALING_BOMB_FORMED, {
          ...context,
          eventData: { rank, count: cards.length, hand }
        });
        return; // 优先触发，触发后不再检测其他
      }
    }

    // 2. 检测超大牌（刚抓到的牌）
    if (newlyDealtCard.suit === Suit.JOKER || 
        newlyDealtCard.rank === Rank.TWO || 
        newlyDealtCard.rank === Rank.ACE) {
      await this.triggerEventChat(player, ChatEventType.DEALING_HUGE_CARD, {
        ...context,
        eventData: { card: newlyDealtCard, hand }
      });
      return;
    }

    // 3. 评估手牌质量（如果手牌已经发了一半以上，且手牌质量差）
    if (hand.length >= 20) {
      const handValue = evaluateHandValue(hand);
      // 手牌质量阈值：如果手牌价值很低（负数或很小的正数），说明手牌质量差
      // 根据手牌数量调整阈值
      const threshold = -hand.length * 5; // 动态阈值
      
      if (handValue < threshold) {
        await this.triggerEventChat(player, ChatEventType.DEALING_POOR_HAND, {
          ...context,
          eventData: { handValue, handLength: hand.length, hand }
        });
        return;
      }
    }
  }
}

// 创建全局聊天服务实例（默认使用llm策略，因为大模型已启动）
export const chatService = new ChatService('llm');

// 输出当前使用的策略信息
console.log('📢 聊天服务初始化:', {
  策略: chatService['strategy'].name,
  描述: chatService['strategy'].description,
  是否使用LLM: chatService['strategy'].name === 'llm'
});

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

// 导出检查函数
export function checkChatStrategy(): { name: string; description: string; isLLM: boolean } {
  return chatService.getCurrentStrategy();
}

export function createChatMessage(
  player: Player,
  content: string,
  type: 'random' | 'event' | 'taunt' = 'random'
): ChatMessage {
  return chatService.createMessage(player, content, type);
}

// 异步函数，保持向后兼容（返回Promise）
export async function triggerRandomChat(
  player: Player, 
  probability?: number,
  context?: any,
  fullGameState?: any
): Promise<ChatMessage | null> {
  return await chatService.triggerRandomChat(player, probability, context, fullGameState);
}

export async function triggerEventChat(
  player: Player,
  eventType: ChatEventType,
  context?: any,
  fullGameState?: any
): Promise<ChatMessage | null> {
  return await chatService.triggerEventChat(player, eventType, context, fullGameState);
}

export async function triggerBigDunReaction(players: Player[], dunPlayerId: number, dunSize: number): Promise<void> {
  await chatService.triggerBigDunReaction(players, dunPlayerId, dunSize);
}

export async function triggerScoreStolenReaction(
  player: Player, 
  stolenScore: number,
  fullGameState?: any
): Promise<void> {
  await chatService.triggerScoreStolenReaction(player, stolenScore, fullGameState);
}

export async function triggerScoreEatenCurseReaction(
  player: Player, 
  stolenScore: number,
  fullGameState?: any
): Promise<void> {
  await chatService.triggerScoreEatenCurseReaction(player, stolenScore, fullGameState);
}

export async function triggerUrgePlayReaction(player: Player, targetPlayer?: Player): Promise<void> {
  await chatService.triggerUrgePlayReaction(player, targetPlayer);
}

export async function triggerGoodPlayReaction(
  player: Player,
  context?: any,
  fullGameState?: any
): Promise<void> {
  await chatService.triggerGoodPlayReaction(player, context, fullGameState);
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

export async function triggerFinishFirstReaction(
  player: Player,
  context?: any,
  fullGameState?: any
): Promise<void> {
  await chatService.triggerFinishFirstReaction(player, context, fullGameState);
}

export async function triggerFinishLastReaction(
  player: Player,
  context?: any,
  fullGameState?: any
): Promise<void> {
  await chatService.triggerFinishLastReaction(player, context, fullGameState);
}

export async function triggerFinishMiddleReaction(
  player: Player,
  context?: any,
  fullGameState?: any
): Promise<void> {
  await chatService.triggerFinishMiddleReaction(player, context, fullGameState);
}

export async function triggerDunPlayedReaction(player: Player): Promise<void> {
  await chatService.triggerDunPlayedReaction(player);
}

export async function triggerDealingReaction(
  player: Player, 
  card: Card, 
  currentIndex: number, 
  totalCards: number
): Promise<void> {
  await chatService.triggerDealingReaction(player, card, currentIndex, totalCards);
}


/**
 * 基于规则的聊天策略实现
 * 使用预定义的规则和内容库生成聊天内容
 */

import { ChatMessage, ChatEventType } from '../../types/chat';
import { Player } from '../../types/card';
import { IChatStrategy, ChatContext } from './IChatStrategy';
import { getChatContent, getRandomChat, getTaunt } from '../../utils/chatContent';
import { ChatServiceConfig, BigDunConfig, TauntConfig } from '../../config/chatConfig';

export class RuleBasedStrategy implements IChatStrategy {
  readonly name = 'rule-based';
  readonly description = '基于预定义规则的聊天策略';

  constructor(
    private config: ChatServiceConfig,
    private bigDunConfig: BigDunConfig,
    private tauntConfig: TauntConfig
  ) {}

  generateRandomChat(
    player: Player,
    context?: ChatContext
  ): ChatMessage | null {
    const prob = this.config.eventChatProbability[ChatEventType.RANDOM] ?? 0.3;
    if (Math.random() > prob) {
      return null;
    }

    const dialect = player.voiceConfig?.dialect === 'cantonese' ? 'cantonese' : 'mandarin';
    const content = getRandomChat(dialect);
    
    return {
      playerId: player.id,
      playerName: player.name,
      content,
      timestamp: Date.now(),
      type: 'random'
    };
  }

  generateEventChat(
    player: Player,
    eventType: ChatEventType,
    context?: ChatContext
  ): ChatMessage | null {
    const prob = this.config.eventChatProbability[eventType] ?? 0.5;
    if (Math.random() > prob) {
      return null;
    }

    const dialect = player.voiceConfig?.dialect === 'cantonese' ? 'cantonese' : 'mandarin';
    const isTaunt = eventType === ChatEventType.SCORE_STOLEN;
    const content = getChatContent(eventType, dialect, isTaunt);
    
    return {
      playerId: player.id,
      playerName: player.name,
      content,
      timestamp: Date.now(),
      type: isTaunt ? 'taunt' : 'event'
    };
  }

  generateTaunt(
    player: Player,
    targetPlayer?: Player,
    context?: ChatContext
  ): ChatMessage | null {
    if (Math.random() < this.tauntConfig.probability) {
      const dialect = player.voiceConfig?.dialect === 'cantonese' ? 'cantonese' : 'mandarin';
      const content = getTaunt(dialect);
      
      return {
        playerId: player.id,
        playerName: player.name,
        content,
        timestamp: Date.now(),
        type: 'taunt'
      };
    }
    
    return null;
  }
}


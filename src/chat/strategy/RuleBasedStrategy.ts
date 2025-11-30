/**
 * 基于规则的聊天策略实现
 * 使用预定义的规则和内容库生成聊天内容
 * 支持多语言（通过 i18n）
 */

import { ChatMessage, ChatEventType, ChatScene } from '../../types/chat';
import { ChatSceneProcessorFactory } from '../scene/ChatSceneProcessorFactory';
import { Player } from '../../types/card';
import { IChatStrategy, ChatContext } from './IChatStrategy';
import { getChatContent, getRandomChat, getTaunt } from '../../utils/chatContent';
import { ChatServiceConfig, BigDunConfig, TauntConfig } from '../../config/chatConfig';
import { i18n } from '../../i18n';

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

    // 根据当前 i18n 语言和玩家的 dialect 选择内容
    // 如果当前语言是中文，支持 mandarin 和 cantonese 的区别
    // 如果当前语言是其他语言，使用当前 i18n 语言
    const currentLang = i18n.language || 'zh-CN';
    const dialect = player.voiceConfig?.dialect === 'cantonese' ? 'cantonese' : 'mandarin';
    
    // 如果当前语言是中文，使用 dialect；否则使用当前语言的内容
    const content = getRandomChat(dialect);
    
    return {
      playerId: player.id,
      playerName: player.name,
      content,
      timestamp: Date.now(),
      type: 'random',
      scene: ChatScene.SPONTANEOUS // 标记场景类型
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

    // 根据当前 i18n 语言和玩家的 dialect 选择内容
    const currentLang = i18n.language || 'zh-CN';
    const dialect = player.voiceConfig?.dialect === 'cantonese' ? 'cantonese' : 'mandarin';
    const isTaunt = eventType === ChatEventType.SCORE_STOLEN;
    const content = getChatContent(eventType, dialect, isTaunt);
    
    // 根据事件类型确定场景
    const scene = ChatSceneProcessorFactory.getSceneByEventType(eventType);
    
    return {
      playerId: player.id,
      playerName: player.name,
      content,
      timestamp: Date.now(),
      type: isTaunt ? 'taunt' : 'event',
      scene: scene, // 标记场景类型
      eventType: eventType // 记录事件类型
    };
  }

  generateTaunt(
    player: Player,
    targetPlayer?: Player,
    context?: ChatContext
  ): ChatMessage | null {
    if (Math.random() < this.tauntConfig.probability) {
      // 根据当前 i18n 语言和玩家的 dialect 选择内容
      const currentLang = i18n.language || 'zh-CN';
      const dialect = player.voiceConfig?.dialect === 'cantonese' ? 'cantonese' : 'mandarin';
      const content = getTaunt(dialect);
      
      return {
        playerId: player.id,
        playerName: player.name,
        content,
        timestamp: Date.now(),
        type: 'taunt',
        scene: ChatScene.TAUNT // 标记场景类型
      };
    }
    
    return null;
  }

  generateReply(
    player: Player,
    originalMessage: ChatMessage,
    context?: ChatContext
  ): ChatMessage | null {
    // 规则策略的简单回复逻辑：根据原消息类型生成简单回复
    const dialect = player.voiceConfig?.dialect === 'cantonese' ? 'cantonese' : 'mandarin';
    
    // 简单的回复内容库（可以根据原消息类型选择不同的回复）
    const replyTemplates: Record<string, string[]> = {
      'zh-CN': {
        'mandarin': [
          '确实',
          '还行',
          '我也这么觉得',
          '嗯嗯',
          '好的',
          '知道了',
          '明白',
          '对',
          '没错',
          '是的'
        ],
        'cantonese': [
          '系啊',
          '系咁',
          '我都系咁谂',
          '嗯嗯',
          '好',
          '知道',
          '明白',
          '对',
          '冇错',
          '系'
        ]
      }
    };

    const currentLang = i18n.language || 'zh-CN';
    const langKey = currentLang.startsWith('zh') ? 'zh-CN' : currentLang;
    const templates = replyTemplates[langKey]?.[dialect] || replyTemplates['zh-CN']?.['mandarin'] || ['好的', '知道了'];
    
    const content = templates[Math.floor(Math.random() * templates.length)];
    
    return {
      playerId: player.id,
      playerName: player.name,
      content,
      timestamp: Date.now(),
      type: 'random',
      scene: ChatScene.SPONTANEOUS,
      replyTo: {
        playerId: originalMessage.playerId,
        playerName: originalMessage.playerName,
        content: originalMessage.content,
        timestamp: originalMessage.timestamp
      }
    };
  }
}


// @ts-nocheck
/**
 * NLU理解服务
 * 理解人类玩家的对话意图，提取策略和牌信息
 */

import { Card, Play, Player } from '../../types/card';
import { ChatMessage } from '../../types/chat';
import { MultiPlayerGameState } from '../../utils/gameStateUtils';

/**
 * 沟通意图类型
 */
export type IntentType = 
  | 'strategy_request'      // 策略请求（"我来出"、"你来出"）
  | 'information_reveal'    // 信息透露（"我有炸弹"、"我没有大牌"）
  | 'cooperation_request'   // 配合请求（"我来拿分"、"你保护"）
  | 'tactical_suggestion'   // 战术建议（"保留大牌"、"拆牌出"）
  | 'warning'               // 警告（"小心"、"有危险"）
  | 'general';              // 一般对话

/**
 * 意图参数
 */
export interface IntentParameters {
  action?: 'play' | 'pass' | 'hold' | 'break';
  target?: 'me' | 'teammate' | 'opponent';
  cardInfo?: {
    hasBomb?: boolean;
    hasBigCards?: boolean;
    handCount?: number;
    hasScoreCards?: boolean;
  };
  strategy?: {
    suggestion?: string;
  };
}

/**
 * 沟通意图
 */
export interface CommunicationIntent {
  type: IntentType;
  parameters: IntentParameters;
  confidence: number;
}

/**
 * 提取的信息
 */
export interface ExtractedInfo {
  // 牌信息
  cardInfo?: {
    hasBomb?: boolean;
    hasBigCards?: boolean;
    handCount?: number;
    hasScoreCards?: boolean;
  };
  
  // 策略信息
  strategyInfo?: {
    preferredAction?: 'play' | 'pass' | 'hold';
    suggestion?: string;
    priority?: 'high' | 'medium' | 'low';
  };
  
  // 配合信息
  cooperationInfo?: {
    requestType?: 'support' | 'attack' | 'defend';
    target?: 'me' | 'teammate';
    urgency?: 'high' | 'medium' | 'low';
  };
  
  // 置信度
  confidence: number;
}

/**
 * NLU理解结果
 */
export interface NLUUnderstandingResult {
  intent: CommunicationIntent;
  extractedInfo: ExtractedInfo;
  rawText: string;
  timestamp: number;
}

/**
 * NLU理解服务类
 */
export class NLUUnderstandingService {
  /**
   * 理解人类玩家的消息
   */
  async understandMessage(
    message: ChatMessage,
    gameState: MultiPlayerGameState
  ): Promise<NLUUnderstandingResult> {
    const text = message.content.toLowerCase();
    
    // 1. 识别意图（使用规则引擎）
    const intent = this.recognizeIntentWithRules(text, gameState);
    
    // 2. 提取信息
    const extractedInfo = this.extractInfo(text, intent, gameState);
    
    return {
      intent,
      extractedInfo,
      rawText: message.content,
      timestamp: message.timestamp
    };
  }

  /**
   * 使用规则引擎识别意图
   */
  private recognizeIntentWithRules(
    text: string,
    gameState: MultiPlayerGameState
  ): CommunicationIntent {
    const lowerText = text.toLowerCase();
    
    // 策略请求模式
    if (/我来|让我来|我出/.test(lowerText)) {
      return {
        type: 'strategy_request',
        parameters: {
          action: 'play',
          target: 'me'
        },
        confidence: 0.9
      };
    }
    
    if (/你来|你出/.test(lowerText)) {
      return {
        type: 'strategy_request',
        parameters: {
          action: 'play',
          target: 'teammate'
        },
        confidence: 0.9
      };
    }
    
    if (/要不起|不要/.test(lowerText)) {
      return {
        type: 'strategy_request',
        parameters: {
          action: 'pass'
        },
        confidence: 0.85
      };
    }
    
    if (/保留|留着/.test(lowerText)) {
      return {
        type: 'strategy_request',
        parameters: {
          action: 'hold'
        },
        confidence: 0.8
      };
    }
    
    // 信息透露模式
    if (/我有炸弹|炸弹/.test(lowerText)) {
      return {
        type: 'information_reveal',
        parameters: {
          cardInfo: {
            hasBomb: true
          }
        },
        confidence: 0.85
      };
    }
    
    if (/没有大牌|没大牌/.test(lowerText)) {
      return {
        type: 'information_reveal',
        parameters: {
          cardInfo: {
            hasBigCards: false
          }
        },
        confidence: 0.8
      };
    }
    
    // 提取手牌数量
    const handCountMatch = lowerText.match(/(\d+)张/);
    if (handCountMatch) {
      const count = parseInt(handCountMatch[1]);
      return {
        type: 'information_reveal',
        parameters: {
          cardInfo: {
            handCount: count
          }
        },
        confidence: 0.75
      };
    }
    
    // 配合请求模式
    if (/我来拿分|我拿分/.test(lowerText)) {
      return {
        type: 'cooperation_request',
        parameters: {
          action: 'play',
          strategy: {
            suggestion: 'get_score'
          }
        },
        confidence: 0.85
      };
    }
    
    if (/你保护|你防守/.test(lowerText)) {
      return {
        type: 'cooperation_request',
        parameters: {
          action: 'play',
          target: 'teammate',
          strategy: {
            suggestion: 'protect'
          }
        },
        confidence: 0.8
      };
    }
    
    // 战术建议
    if (/保留大牌/.test(lowerText)) {
      return {
        type: 'tactical_suggestion',
        parameters: {
          strategy: {
            suggestion: '保留大牌'
          }
        },
        confidence: 0.9
      };
    }
    
    // 默认：一般对话
    return {
      type: 'general',
      parameters: {},
      confidence: 0.5
    };
  }

  /**
   * 提取信息
   */
  private extractInfo(
    text: string,
    intent: CommunicationIntent,
    gameState: MultiPlayerGameState
  ): ExtractedInfo {
    const lowerText = text.toLowerCase();
    const extracted: ExtractedInfo = {
      confidence: intent.confidence
    };
    
    // 根据意图类型提取信息
    switch (intent.type) {
      case 'information_reveal':
        extracted.cardInfo = intent.parameters.cardInfo || {};
        // 额外提取
        if (/炸弹/.test(lowerText)) {
          extracted.cardInfo.hasBomb = true;
        }
        if (/大牌/.test(lowerText)) {
          if (/没有|没/.test(lowerText)) {
            extracted.cardInfo.hasBigCards = false;
          } else {
            extracted.cardInfo.hasBigCards = true;
          }
        }
        break;
        
      case 'strategy_request':
        extracted.strategyInfo = {
          preferredAction: intent.parameters.action,
          priority: 'high'
        };
        break;
        
      case 'cooperation_request':
        extracted.cooperationInfo = {
          requestType: intent.parameters.strategy?.suggestion === 'get_score' ? 'attack' : 'defend',
          target: intent.parameters.target || 'teammate',
          urgency: 'high'
        };
        break;
    }
    
    // 额外的信息提取（无论意图类型）
    if (!extracted.cardInfo) {
      extracted.cardInfo = {};
    }
    
    // 检测炸弹
    if (/炸弹/.test(lowerText)) {
      extracted.cardInfo.hasBomb = true;
      extracted.confidence = Math.max(extracted.confidence, 0.8);
    }
    
    // 检测大牌
    if (/大牌/.test(lowerText)) {
      if (/没有|没/.test(lowerText)) {
        extracted.cardInfo.hasBigCards = false;
      } else {
        extracted.cardInfo.hasBigCards = true;
      }
    }
    
    // 检测手牌数量
    const countMatch = lowerText.match(/(\d+)张/);
    if (countMatch) {
      extracted.cardInfo.handCount = parseInt(countMatch[1]);
    }
    
    // 检测分牌
    if (/分牌|有分/.test(lowerText)) {
      extracted.cardInfo.hasScoreCards = true;
    }
    
    return extracted;
  }
}

// 导出单例实例
export const nluUnderstandingService = new NLUUnderstandingService();
// @ts-nocheck

/**
 * 通信调度器
 * 统一管理所有AI的聊天，避免冲突，确保自然流畅
 */

import { EventBus } from '../integration/EventBus';
import { CommunicationMessage, CommunicationIntent } from '../types';

/**
 * 通信触发器
 */
export interface CommunicationTrigger {
  trigger: string;
  gameState: any;
  decision?: any;
  cognitive?: any;
}

/**
 * 通信规则
 */
interface CommunicationRule {
  intent: CommunicationIntent;
  probability: number;
  minInterval: number;
  priority: number;
}

/**
 * 通信调度器
 */
export class CommunicationScheduler {
  private lastSpeakTime: Map<number, number> = new Map();
  private globalLastSpeak: number = 0;
  private messageHistory: CommunicationMessage[] = [];
  
  // 通信规则
  private rules: Map<string, CommunicationRule> = new Map();
  
  constructor(private eventBus: EventBus) {
    this.initializeRules();
  }
  
  /**
   * 初始化通信规则
   */
  private initializeRules(): void {
    // 出牌后的反应
    this.rules.set('after_decision', {
      intent: 'emotional_express',
      probability: 0.3,
      minInterval: 5000,
      priority: 5
    });
    
    // 好牌炫耀
    this.rules.set('good_play', {
      intent: 'celebrate',
      probability: 0.6,
      minInterval: 3000,
      priority: 7
    });
    
    // 队友鼓励
    this.rules.set('encourage_teammate', {
      intent: 'encourage',
      probability: 0.5,
      minInterval: 8000,
      priority: 6
    });
    
    // 对手嘲讽
    this.rules.set('taunt_opponent', {
      intent: 'taunt',
      probability: 0.2,
      minInterval: 10000,
      priority: 4
    });
    
    // 战术信号
    this.rules.set('tactical_signal', {
      intent: 'tactical_signal',
      probability: 0.7,
      minInterval: 5000,
      priority: 8
    });
  }
  
  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    console.log('[CommunicationScheduler] 初始化完成');
  }
  
  /**
   * 可能生成消息
   */
  async maybeGenerateMessage(
    playerId: number,
    trigger: CommunicationTrigger
  ): Promise<CommunicationMessage | null> {
    // 1. 检查是否应该说话
    if (!this.shouldSpeak(playerId, trigger)) {
      return null;
    }
    
    // 2. 确定通信意图
    const intent = this.determineIntent(trigger);
    
    // 3. 生成消息内容
    const message = await this.generateMessage(playerId, intent, trigger);
    
    // 4. 更新历史
    if (message) {
      this.updateHistory(playerId, message);
    }
    
    return message;
  }
  
  /**
   * 判断是否应该说话
   */
  private shouldSpeak(playerId: number, trigger: CommunicationTrigger): boolean {
    // 规则1: 防止说话过于频繁
    const lastTime = this.lastSpeakTime.get(playerId) || 0;
    const elapsed = Date.now() - lastTime;
    const minInterval = this.getMinInterval(trigger.trigger);
    
    if (elapsed < minInterval) {
      return false;
    }
    
    // 规则2: 防止全局说话过于密集
    const globalElapsed = Date.now() - this.globalLastSpeak;
    if (globalElapsed < 2000) {  // 全局最小间隔2秒
      return false;
    }
    
    // 规则3: 根据概率决定
    const rule = this.rules.get(trigger.trigger);
    const probability = rule?.probability || 0.3;
    
    return Math.random() < probability;
  }
  
  /**
   * 确定通信意图
   */
  private determineIntent(trigger: CommunicationTrigger): CommunicationIntent {
    const rule = this.rules.get(trigger.trigger);
    if (rule) {
      return rule.intent;
    }
    
    // 根据触发类型默认意图
    switch (trigger.trigger) {
      case 'after_decision':
        return 'emotional_express';
      case 'good_play':
        return 'celebrate';
      case 'bad_play':
        return 'emotional_express';
      default:
        return 'social_chat';
    }
  }
  
  /**
   * 生成消息
   */
  private async generateMessage(
    playerId: number,
    intent: CommunicationIntent,
    trigger: CommunicationTrigger
  ): Promise<CommunicationMessage> {
    // 简单实现：基于规则生成
    const templates = this.getTemplates(intent);
    const content = templates[Math.floor(Math.random() * templates.length)];
    
    return {
      content,
      intent,
      emotion: this.determineEmotion(trigger),
      timestamp: Date.now()
    };
  }
  
  /**
   * 获取消息模板
   */
  private getTemplates(intent: CommunicationIntent): string[] {
    switch (intent) {
      case 'celebrate':
        return [
          '哈哈，这把打得不错！',
          '漂亮！就是要这么打',
          '看我的厉害吧',
          '这牌打得可以啊'
        ];
      
      case 'encourage':
        return [
          '兄弟加油！',
          '稳住，我们能赢',
          '别慌，还有机会',
          '相信自己'
        ];
      
      case 'taunt':
        return [
          '就这？',
          '不行啊兄弟',
          '你这牌打得不太行啊',
          '让你见识见识'
        ];
      
      case 'tactical_signal':
        return [
          '我保你',
          '我有大牌',
          '你先来',
          '我掩护'
        ];
      
      case 'emotional_express':
        return [
          '唉，手气一般',
          '这局有点难',
          '看情况吧',
          '试试运气'
        ];
      
      default:
        return ['...'];
    }
  }
  
  /**
   * 确定情感
   */
  private determineEmotion(trigger: CommunicationTrigger): any {
    if (trigger.cognitive?.emotionState) {
      return trigger.cognitive.emotionState;
    }
    
    return 'relaxed';
  }
  
  /**
   * 更新历史
   */
  private updateHistory(playerId: number, message: CommunicationMessage): void {
    this.lastSpeakTime.set(playerId, Date.now());
    this.globalLastSpeak = Date.now();
    this.messageHistory.push(message);
    
    // 限制历史长度
    if (this.messageHistory.length > 50) {
      this.messageHistory.shift();
    }
  }
  
  /**
   * 获取最小间隔
   */
  private getMinInterval(trigger: string): number {
    const rule = this.rules.get(trigger);
    return rule?.minInterval || 5000;
  }
  
  /**
   * 获取消息历史
   */
  getHistory(): CommunicationMessage[] {
    return [...this.messageHistory];
  }
  
  /**
   * 清空历史
   */
  clearHistory(): void {
    this.messageHistory = [];
    this.lastSpeakTime.clear();
  }
}


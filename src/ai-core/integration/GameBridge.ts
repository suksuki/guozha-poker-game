/**
 * 游戏桥接
 * AI Core与游戏引擎之间的唯一接口
 * 通过事件总线通信，完全解耦
 */

import { MasterAIBrain, MasterBrainConfig } from '../master-brain/MasterAIBrain';
import { EventBus } from './EventBus';
import { GameState } from '../types';

/**
 * 游戏桥接API
 */
export interface GameBridgeAPI {
  // 初始化
  initialize(config: MasterBrainConfig): Promise<void>;
  
  // AI回合
  triggerAITurn(playerId: number, gameState: GameState): void;
  
  // 状态更新
  notifyStateChange(gameState: GameState, changeType?: 'play' | 'pass' | 'event'): Promise<void>;
  
  // 触发批量聊天
  triggerBatchChat(gameState: GameState, trigger: 'after_play' | 'after_pass' | 'game_event', eventType?: string): Promise<Map<number, any>>;
  
  // 导出数据
  exportTrainingData(): string;
  
  // 获取统计
  getStatistics(): any;
  
  // 关闭
  shutdown(): Promise<void>;
}

/**
 * 游戏桥接类
 */
export class GameBridge {
  private masterBrain: MasterAIBrain | null = null;
  private eventBus: EventBus | null = null;
  
  constructor() {
    // EventBus将在initialize时从MasterAIBrain获取
    this.setupEventHandlers();
  }
  
  /**
   * 设置事件处理
   */
  private setupEventHandlers(): void {
    // 注意：eventBus可能在initialize之前为null，所以延迟绑定
    // 实际的事件监听在initialize后通过setupEventListeners设置
  }
  
  /**
   * 设置事件监听（在MasterAIBrain初始化后调用）
   */
  private setupEventListeners(): void {
    if (!this.eventBus) return;
    
    // 游戏 → AI
    this.eventBus.on('game:ai-turn', this.handleAITurn.bind(this));
    this.eventBus.on('game:state-change', this.handleStateChange.bind(this));
    
    // AI → 游戏：监听通信消息生成事件
    this.eventBus.on('communication:generated', this.handleCommunicationGenerated.bind(this));
  }
  
  /**
   * 处理AI回合
   */
  private async handleAITurn(event: any): Promise<void> {
    if (!this.masterBrain || !this.eventBus) {
      console.error('[GameBridge] Master brain or EventBus not initialized');
      return;
    }
    
    const { playerId, gameState } = event;
    
    try {
      const result = await this.masterBrain.handleTurn(playerId, gameState);
      
      // 发送回游戏
      this.eventBus.emit('ai:turn-complete', {
        playerId,
        decision: result.decision,
        message: result.message
      });
    } catch (error) {
      console.error('[GameBridge] AI turn failed:', error);
      if (this.eventBus) {
        this.eventBus.emit('ai:turn-error', { playerId, error });
      }
    }
  }
  
  /**
   * 处理状态变化
   */
  private handleStateChange(event: any): void {
    // TODO: 处理游戏状态变化
  }
  
  /**
   * 处理通信消息生成
   * 将AI Brain的CommunicationMessage转换为游戏可用的格式
   */
  private handleCommunicationGenerated(event: any): void {
    const { playerId, message } = event;
    
    // 发送到游戏，让游戏UI显示
    this.eventBus?.emit('ai:communication', {
      playerId,
      content: message.content,
      intent: message.intent,
      emotion: message.emotion,
      timestamp: message.timestamp
    });
  }
  
  /**
   * 订阅通信消息
   */
  onCommunication(callback: (message: {
    playerId: number;
    content: string;
    intent: string;
    emotion?: string;
    timestamp: number;
  }) => void): () => void {
    if (!this.eventBus) {
      console.warn('[GameBridge] EventBus未初始化，无法订阅通信消息');
      return () => {}; // 返回空函数
    }
    
    const listener = (event: any) => {
      callback(event);
    };
    
    this.eventBus.on('ai:communication', listener);
    
    // 返回取消订阅的函数
    return () => {
      if (this.eventBus) {
        this.eventBus.off('ai:communication', listener);
      }
    };
  }
  
  /**
   * 获取事件总线（供外部使用）
   */
  getEventBus(): EventBus | null {
    return this.eventBus;
  }

  /**
   * 获取API接口
   */
  getAPI(): GameBridgeAPI {
    return {
      initialize: async (config: MasterBrainConfig) => {
        this.masterBrain = new MasterAIBrain(config);
        await this.masterBrain.initialize();
        
        // 获取MasterAIBrain的EventBus实例
        this.eventBus = this.masterBrain.getEventBus();
        
        // 现在设置事件监听
        this.setupEventListeners();
      },
      
      triggerAITurn: (playerId: number, gameState: GameState) => {
        if (!this.eventBus) {
          console.error('[GameBridge] EventBus not initialized');
          return;
        }
        this.eventBus.emit('game:ai-turn', { playerId, gameState });
      },
      
      notifyStateChange: async (gameState: GameState, changeType?: 'play' | 'pass' | 'event') => {
        if (this.masterBrain) {
          await this.masterBrain.notifyStateChange(gameState, changeType);
        }
      },
      
      triggerBatchChat: async (gameState: GameState, trigger: 'after_play' | 'after_pass' | 'game_event', eventType?: string) => {
        if (!this.masterBrain) {
          return new Map();
        }
        return await this.masterBrain.triggerBatchChat(gameState, trigger, eventType);
      },
      
      exportTrainingData: () => {
        return this.masterBrain?.exportTrainingData() || '';
      },
      
      getStatistics: () => {
        return this.masterBrain?.getStatistics() || {};
      },
      
      shutdown: async () => {
        await this.masterBrain?.shutdown();
        this.masterBrain = null;
      }
    };
  }
}


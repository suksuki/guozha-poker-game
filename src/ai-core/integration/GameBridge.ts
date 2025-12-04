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
  notifyStateChange(gameState: GameState): void;
  
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
  private eventBus: EventBus;
  
  constructor() {
    this.eventBus = new EventBus();
    this.setupEventHandlers();
  }
  
  /**
   * 设置事件处理
   */
  private setupEventHandlers(): void {
    // 游戏 → AI
    this.eventBus.on('game:ai-turn', this.handleAITurn.bind(this));
    this.eventBus.on('game:state-change', this.handleStateChange.bind(this));
  }
  
  /**
   * 处理AI回合
   */
  private async handleAITurn(event: any): Promise<void> {
    if (!this.masterBrain) {
      console.error('[GameBridge] Master brain not initialized');
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
      this.eventBus.emit('ai:turn-error', { playerId, error });
    }
  }
  
  /**
   * 处理状态变化
   */
  private handleStateChange(event: any): void {
    // TODO: 处理游戏状态变化
  }
  
  /**
   * 获取API接口
   */
  getAPI(): GameBridgeAPI {
    return {
      initialize: async (config: MasterBrainConfig) => {
        this.masterBrain = new MasterAIBrain(config);
        await this.masterBrain.initialize();
      },
      
      triggerAITurn: (playerId: number, gameState: GameState) => {
        this.eventBus.emit('game:ai-turn', { playerId, gameState });
      },
      
      notifyStateChange: (gameState: GameState) => {
        this.eventBus.emit('game:state-change', { gameState });
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


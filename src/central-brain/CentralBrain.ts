/**
 * CentralBrain - 中央大脑
 * 
 * 职责：
 * - 统筹游戏调度
 * - 管理AI决策
 * - 协调异步服务
 * - 收集训练数据
 * 
 * 设计原则：
 * - 不持有游戏状态
 * - 只通过StateManager交互
 * - 事件驱动架构
 */

import { EventEmitter } from 'events';
import { StateManager } from '../game-engine/state/StateManager';
import { ScheduleManager } from './scheduler/ScheduleManager';
import { AsyncTaskManager } from './infrastructure/async/AsyncTaskManager';
import { ServiceHealthChecker } from './infrastructure/async/ServiceHealthChecker';

export interface CentralBrainConfig {
  enableAI?: boolean;
  enableLLM?: boolean;
  enableTTS?: boolean;
  enableDataCollection?: boolean;
}

/**
 * CentralBrain - 中央控制器
 */
export class CentralBrain extends EventEmitter {
  private stateManager: StateManager;
  private scheduleManager: ScheduleManager;
  private asyncManager: AsyncTaskManager;
  private healthChecker: ServiceHealthChecker;
  private config: CentralBrainConfig;

  constructor(
    stateManager: StateManager,
    config: CentralBrainConfig = {}
  ) {
    super();
    
    this.stateManager = stateManager;
    this.config = {
      enableAI: true,
      enableLLM: false,
      enableTTS: false,
      enableDataCollection: false,
      ...config
    };

    // 初始化组件
    this.asyncManager = new AsyncTaskManager({ enableMetrics: true });
    this.healthChecker = new ServiceHealthChecker();
    this.scheduleManager = new ScheduleManager();

    // 设置事件监听
    this.setupEventListeners();
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 监听状态变化
    this.stateManager.on('stateChanged', ({ newState, action }) => {
      console.log('[CentralBrain] State changed:', action.type);
      
      // 触发调度
      if (action.type === 'PLAY_CARDS' || action.type === 'PASS') {
        this.scheduleNextTurn();
      }
    });

    // 监听调度事件
    this.scheduleManager.on('turnScheduled', ({ playerIndex }) => {
      console.log('[CentralBrain] Turn scheduled for player:', playerIndex);
      this.emit('turnScheduled', { playerIndex });
    });
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    console.log('[CentralBrain] Initializing...');

    // 注册服务健康检查
    if (this.config.enableLLM) {
      this.healthChecker.registerService(
        'llm-service',
        async () => {
          // 实际的健康检查逻辑
          return true;
        },
        30000
      );
    }

    if (this.config.enableTTS) {
      this.healthChecker.registerService(
        'tts-service',
        async () => {
          // 实际的健康检查逻辑
          return true;
        },
        30000
      );
    }

    console.log('[CentralBrain] Initialized');
  }

  /**
   * 调度下一回合
   */
  private scheduleNextTurn(): void {
    const state = this.stateManager.getState();
    
    // 使用ScheduleManager调度
    this.scheduleManager.schedulePlayerTurn(
      state,
      async (playerIndex) => {
        console.log('[CentralBrain] Executing turn for player:', playerIndex);
        
        // 如果是AI玩家，使用AI决策
        if (this.config.enableAI && !state.players[playerIndex].isHuman) {
          await this.executeAITurn(playerIndex);
        }
      }
    );
  }

  /**
   * 执行AI回合
   */
  private async executeAITurn(playerIndex: number): Promise<void> {
    console.log('[CentralBrain] AI turn for player:', playerIndex);
    
    // AI决策逻辑（简化版）
    // 实际实现会调用MCTS或LLM
    
    this.emit('aiTurnComplete', { playerIndex });
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(): Record<string, string> {
    const services = ['llm-service', 'tts-service'];
    const status: Record<string, string> = {};

    for (const service of services) {
      status[service] = this.healthChecker.getServiceStatus(service);
    }

    return status;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    console.log('[CentralBrain] Cleaning up...');
    this.healthChecker.cleanup();
    this.removeAllListeners();
  }
}


/**
 * StateManager - 状态管理器
 * 
 * 职责：
 * - 持有当前游戏状态（唯一数据源）
 * - 提供只读访问
 * - 通过Module处理业务逻辑
 * - 维护状态历史（支持撤销）
 * - 发出状态变化事件
 * 
 * @example
 * ```typescript
 * const manager = new StateManager(config);
 * 
 * // 执行动作
 * await manager.executeAction({
 *   type: 'PLAY_CARDS',
 *   playerIndex: 0,
 *   cards: [...]
 * });
 * 
 * // 监听状态变化
 * manager.on('stateChanged', ({ newState }) => {
 *   console.log('State updated:', newState);
 * });
 * ```
 */

import { EventEmitter } from 'events';
import { GameState, type GameConfig } from './GameState';

/**
 * 游戏动作类型
 */
export type GameActionType = 
  | 'INIT_GAME'
  | 'PLAY_CARDS'
  | 'PASS'
  | 'START_ROUND'
  | 'END_ROUND'
  | 'UPDATE_SCORE';

/**
 * 游戏动作
 */
export interface GameAction {
  type: GameActionType;
  payload?: any;
  timestamp?: number;
}

/**
 * 状态变化事件
 */
export interface StateChangedEvent {
  oldState: GameState;
  newState: GameState;
  action: GameAction;
  timestamp: number;
}

/**
 * 动作处理器
 */
export type ActionHandler = (state: GameState, action: GameAction) => GameState | Promise<GameState>;

/**
 * StateManager - 状态管理器
 */
export class StateManager extends EventEmitter {
  // ========== 当前状态（私有）==========
  private currentState: GameState;
  
  // ========== 状态历史 ==========
  private stateHistory: GameState[] = [];
  private maxHistorySize: number = 50; // 最多保存50个历史状态
  
  // ========== 动作处理器映射 ==========
  private actionHandlers: Map<GameActionType, ActionHandler> = new Map();
  
  // ========== 统计信息 ==========
  private actionCount: number = 0;
  private errorCount: number = 0;
  
  constructor(config: GameConfig) {
    super();
    this.currentState = new GameState(config);
    
    // 初始化默认处理器
    this.registerDefaultHandlers();
  }
  
  /**
   * 注册默认处理器
   */
  private registerDefaultHandlers(): void {
    // 初始化游戏
    this.registerHandler('INIT_GAME', (state, action) => {
      const { players } = action.payload;
      return state.initializePlayers(players);
    });
  }
  
  /**
   * 获取当前状态（只读）
   */
  getState(): GameState {
    return this.currentState;
  }
  
  /**
   * 执行动作
   */
  async executeAction(action: GameAction): Promise<void> {
    const oldState = this.currentState;
    
    // 添加时间戳
    const fullAction: GameAction = {
      ...action,
      timestamp: action.timestamp || Date.now()
    };
    
    // 统计（无论成功失败都计入）
    this.actionCount++;
    
    try {
      // 获取处理器
      const handler = this.actionHandlers.get(action.type);
      
      if (!handler) {
        throw new Error(`No handler registered for action type: ${action.type}`);
      }
      
      // 执行处理器
      const newState = await handler(oldState, fullAction);
      
      // 保存历史
      this.addToHistory(oldState);
      
      // 更新当前状态
      this.currentState = newState;
      
      // 发出事件
      this.emit('stateChanged', {
        oldState,
        newState,
        action: fullAction,
        timestamp: Date.now()
      } as StateChangedEvent);
      
      console.log(`[StateManager] Action executed: ${action.type}`);
      
    } catch (error) {
      // 错误处理（只在catch中计数一次）
      this.errorCount++;
      
      console.error(`[StateManager] Action failed: ${action.type}`, error);
      
      this.emit('actionError', {
        action: fullAction,
        error,
        state: oldState
      });
      
      throw error;
    }
  }
  
  /**
   * 批量执行动作
   */
  async executeActions(actions: GameAction[]): Promise<void> {
    for (const action of actions) {
      await this.executeAction(action);
    }
  }
  
  /**
   * 注册动作处理器
   */
  registerHandler(actionType: GameActionType, handler: ActionHandler): void {
    this.actionHandlers.set(actionType, handler);
    console.log(`[StateManager] Handler registered: ${actionType}`);
  }
  
  /**
   * 注销动作处理器
   */
  unregisterHandler(actionType: GameActionType): void {
    this.actionHandlers.delete(actionType);
    console.log(`[StateManager] Handler unregistered: ${actionType}`);
  }
  
  /**
   * 添加到历史
   */
  private addToHistory(state: GameState): void {
    this.stateHistory.push(state);
    
    // 限制历史大小
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }
  
  /**
   * 撤销（返回上一个状态）
   */
  undo(): boolean {
    if (this.stateHistory.length === 0) {
      console.warn('[StateManager] No history to undo');
      return false;
    }
    
    const previousState = this.stateHistory.pop()!;
    const oldState = this.currentState;
    
    this.currentState = previousState;
    
    this.emit('stateChanged', {
      oldState,
      newState: previousState,
      action: { type: 'UNDO' as GameActionType },
      timestamp: Date.now()
    } as StateChangedEvent);
    
    console.log('[StateManager] Undo successful');
    return true;
  }
  
  /**
   * 获取历史大小
   */
  getHistorySize(): number {
    return this.stateHistory.length;
  }
  
  /**
   * 清空历史
   */
  clearHistory(): void {
    this.stateHistory = [];
    console.log('[StateManager] History cleared');
  }
  
  /**
   * 重置状态
   */
  reset(config?: GameConfig): void {
    const newConfig = config || this.currentState.config;
    const oldState = this.currentState;
    
    this.currentState = new GameState(newConfig);
    this.stateHistory = [];
    this.actionCount = 0;
    this.errorCount = 0;
    
    this.emit('stateReset', { oldState, newState: this.currentState });
    
    console.log('[StateManager] State reset');
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      actionCount: this.actionCount,
      errorCount: this.errorCount,
      historySize: this.stateHistory.length,
      successRate: this.actionCount > 0 
        ? (this.actionCount - this.errorCount) / this.actionCount 
        : 0
    };
  }
  
  /**
   * 设置最大历史大小
   */
  setMaxHistorySize(size: number): void {
    if (size < 0) {
      throw new Error('Max history size must be >= 0');
    }
    
    this.maxHistorySize = size;
    
    // 如果当前历史超过新限制，截断
    if (this.stateHistory.length > size) {
      this.stateHistory = this.stateHistory.slice(-size);
    }
  }
  
  /**
   * 获取最大历史大小
   */
  getMaxHistorySize(): number {
    return this.maxHistorySize;
  }
  
  /**
   * 检查是否有历史可撤销
   */
  canUndo(): boolean {
    return this.stateHistory.length > 0;
  }
}


/**
 * ScheduleManager - 调度管理器（纯函数 + 简单状态）
 * 
 * 职责：
 * - 管理玩家出牌调度
 * - 使用TaskQueue处理任务
 * - 不持有GameState（只读取）
 * - 发出事件通知
 * 
 * 设计原则：
 * 1. 不持有游戏状态
 * 2. 通过事件通信
 * 3. 使用TaskQueue
 * 4. 无循环依赖
 */

import { EventEmitter } from 'events';
import { TaskQueue, type Task } from './TaskQueue';
import { GameState } from '../../game-engine/state/GameState';

/**
 * 调度事件类型
 */
export interface ScheduleEvent {
  type: 'player_turn' | 'round_end' | 'game_end';
  playerIndex?: number;
  timestamp: number;
}

/**
 * ScheduleManager - 调度管理器
 */
export class ScheduleManager extends EventEmitter {
  private taskQueue: TaskQueue;
  
  constructor() {
    super();
    this.taskQueue = new TaskQueue();
    
    // 设置任务执行器
    this.taskQueue.setExecutor(async (task) => {
      await this.executeTask(task);
    });
  }
  
  /**
   * 调度下一个玩家出牌
   * 
   * @param state 当前游戏状态（只读）
   */
  scheduleNextPlayer(state: GameState): void {
    const currentPlayerIndex = state.currentPlayerIndex;
    
    if (currentPlayerIndex === null) {
      console.warn('[ScheduleManager] No current player');
      return;
    }
    
    // 创建任务
    const task: Task = {
      id: `turn-${Date.now()}`,
      type: 'player_turn',
      payload: { playerIndex: currentPlayerIndex },
      priority: 0,
      timestamp: Date.now(),
      roundNumber: state.rounds.length
    };
    
    this.taskQueue.enqueue(task);
  }
  
  /**
   * 执行任务
   */
  private async executeTask(task: Task): Promise<void> {
    console.log(`[ScheduleManager] Executing: ${task.type}`);
    
    // 发出事件
    this.emit('scheduleEvent', {
      type: task.type,
      playerIndex: task.payload.playerIndex,
      timestamp: Date.now()
    } as ScheduleEvent);
  }
  
  /**
   * 清除当前轮次的任务
   */
  clearCurrentRound(roundNumber: number): void {
    this.taskQueue.clearRound(roundNumber);
  }
  
  /**
   * 清空所有任务
   */
  clearAll(): void {
    this.taskQueue.clear();
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return this.taskQueue.getStats();
  }
  
  /**
   * 等待队列空闲（用于测试）
   */
  async waitUntilIdle(): Promise<void> {
    await this.taskQueue.waitUntilIdle();
  }
}


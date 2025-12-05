/**
 * 上下文管理器
 * 管理游戏历史、决策历史和学习数据
 */

import { GameState, Decision, GameAction } from './types';

/**
 * 历史记录
 */
interface HistoryRecord {
  timestamp: number;
  gameState: GameState;
  decision?: Decision;
  executionResult?: any;
}

/**
 * 上下文信息
 */
export interface Context {
  recentStates: GameState[];
  recentDecisions: Decision[];
  gameHistory: HistoryRecord[];
  statistics: {
    totalDecisions: number;
    passCount: number;
    playCount: number;
  };
}

/**
 * 上下文管理器类
 */
export class ContextManager {
  private context: Context;
  private maxHistorySize: number = 100;
  
  constructor() {
    this.context = {
      recentStates: [],
      recentDecisions: [],
      gameHistory: [],
      statistics: {
        totalDecisions: 0,
        passCount: 0,
        playCount: 0
      }
    };
  }
  
  /**
   * 更新上下文
   */
  updateContext(gameState: GameState): void {
    // 添加到最近状态
    this.context.recentStates.push(gameState);
    
    // 保持固定大小
    if (this.context.recentStates.length > 10) {
      this.context.recentStates.shift();
    }
    
    // 添加到历史
    this.context.gameHistory.push({
      timestamp: Date.now(),
      gameState
    });
    
    // 限制历史大小
    if (this.context.gameHistory.length > this.maxHistorySize) {
      this.context.gameHistory.shift();
    }
  }
  
  /**
   * 记录决策
   */
  recordDecision(gameState: GameState, decision: Decision): void {
    // 添加到最近决策
    this.context.recentDecisions.push(decision);
    
    if (this.context.recentDecisions.length > 10) {
      this.context.recentDecisions.shift();
    }
    
    // 更新统计
    this.context.statistics.totalDecisions++;
    
    if (decision.action.type === 'pass') {
      this.context.statistics.passCount++;
    } else {
      this.context.statistics.playCount++;
    }
    
    // 更新最后的历史记录
    const lastRecord = this.context.gameHistory[this.context.gameHistory.length - 1];
    if (lastRecord) {
      lastRecord.decision = decision;
    }
  }
  
  /**
   * 记录动作执行结果
   */
  recordActionExecution(decision: Decision, resultState: GameState): void {
    const lastRecord = this.context.gameHistory[this.context.gameHistory.length - 1];
    if (lastRecord) {
      lastRecord.executionResult = {
        action: decision.action,
        resultState,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * 获取上下文
   */
  getContext(): Context {
    return { ...this.context };
  }
  
  /**
   * 获取最近的游戏状态
   */
  getRecentStates(count: number = 5): GameState[] {
    return this.context.recentStates.slice(-count);
  }
  
  /**
   * 获取最近的决策
   */
  getRecentDecisions(count: number = 5): Decision[] {
    return this.context.recentDecisions.slice(-count);
  }
  
  /**
   * 获取完整历史
   */
  getHistory(): HistoryRecord[] {
    return [...this.context.gameHistory];
  }
  
  /**
   * 获取训练数据
   * 返回可用于训练的样本
   */
  getTrainingData(): Array<{
    state: GameState;
    action: GameAction;
    decision: Decision;
  }> {
    return this.context.gameHistory
      .filter(record => record.decision)
      .map(record => ({
        state: record.gameState,
        action: record.decision!.action,
        decision: record.decision!
      }));
  }
  
  /**
   * 清空上下文
   */
  clear(): void {
    this.context = {
      recentStates: [],
      recentDecisions: [],
      gameHistory: [],
      statistics: {
        totalDecisions: 0,
        passCount: 0,
        playCount: 0
      }
    };
  }
  
  /**
   * 获取统计信息
   */
  getStatistics() {
    return { ...this.context.statistics };
  }
  
  /**
   * 导出历史数据（用于保存）
   */
  exportHistory(): string {
    return JSON.stringify(this.context.gameHistory);
  }
  
  /**
   * 导入历史数据
   */
  importHistory(data: string): void {
    try {
      const history = JSON.parse(data);
      this.context.gameHistory = history;
    } catch (error) {
      console.error('Failed to import history:', error);
    }
  }
}


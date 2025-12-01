/**
 * 轮次调度器
 * 统一管理每一轮牌内的玩家出牌调度，解决并发和混乱问题
 * 
 * 职责：
 * - 管理轮次内的玩家出牌顺序
 * - 防止并发调用 playNextTurn
 * - 处理轮次切换
 * - 处理托管模式下的自动出牌
 * - 统一处理异步出牌完成后的调度逻辑
 */

import { Player, PlayerType } from '../types/card';
import { Round } from './Round';
import { findNextActivePlayer } from './gameStateUtils';

export interface RoundSchedulerConfig {
  /** 是否启用托管模式 */
  isAutoPlay: boolean;
  /** 人类玩家索引 */
  humanPlayerIndex: number;
  /** 游戏状态获取函数 */
  getGameState: () => {
    status: string;
    currentPlayerIndex: number;
    rounds: Round[];
    currentRoundIndex: number;
    players: Player[];
    [key: string]: any; // 允许其他属性
  };
}

export interface ScheduleTask {
  /** 任务类型 */
  type: 'next_turn';
  /** 目标玩家索引 */
  targetPlayerIndex?: number;
  /** 轮次号（用于验证） */
  roundNumber: number;
  /** 任务优先级（数字越大优先级越高） */
  priority: number;
  /** 任务创建时间 */
  timestamp: number;
}

/**
 * 轮次调度器类
 * 使用队列机制确保同一时间只有一个调度任务在执行
 */
export class RoundScheduler {
  private config: RoundSchedulerConfig;
  private taskQueue: ScheduleTask[] = [];
  private isProcessing: boolean = false;
  private currentRoundNumber: number = 0;
  private lastProcessedPlayerIndex: number | null = null;

  constructor(config: RoundSchedulerConfig) {
    this.config = config;
  }

  /**
   * 获取当前轮次对象（辅助方法）
   */
  private getCurrentRound(state: { rounds: Round[]; currentRoundIndex: number }): Round | undefined {
    return state.rounds[state.currentRoundIndex];
  }

  /**
   * 获取当前轮次号（辅助方法）
   */
  private getCurrentRoundNumber(state: { rounds: Round[]; currentRoundIndex: number }): number {
    const round = this.getCurrentRound(state);
    return round ? round.roundNumber : 0;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RoundSchedulerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 更新当前轮次号（轮次切换时调用）
   */
  updateRoundNumber(roundNumber: number): void {
    // 清除旧轮次的任务
    this.taskQueue = this.taskQueue.filter(task => task.roundNumber === roundNumber);
    this.currentRoundNumber = roundNumber;
    this.lastProcessedPlayerIndex = null;
  }

  /**
   * 调度下一个玩家出牌
   * @param playerIndex 目标玩家索引（可选，如果不提供则使用当前玩家）
   * @param priority 任务优先级（默认0）
   */
  scheduleNextTurn(playerIndex?: number, priority: number = 0): void {
    const state = this.config.getGameState();
    
    // 快速验证
    if (state.status !== 'playing' || state.roundNumber !== this.currentRoundNumber) {
      return;
    }

    const targetPlayerIndex = playerIndex ?? state.currentPlayerIndex;
    
    // 防止重复调度同一玩家
    if (targetPlayerIndex === this.lastProcessedPlayerIndex && this.isProcessing) {
      return;
    }

    const task: ScheduleTask = {
      type: 'next_turn',
      targetPlayerIndex,
      roundNumber: state.roundNumber,
      priority,
      timestamp: Date.now()
    };

    this.insertTaskByPriority(task);
    this.processQueue();
  }


  /**
   * 按优先级插入任务
   */
  private insertTaskByPriority(task: ScheduleTask): void {
    // 检查是否已有相同类型的任务（避免重复）
    const existingIndex = this.taskQueue.findIndex(
      t => t.type === task.type && 
           t.roundNumber === task.roundNumber &&
           (task.type !== 'next_turn' || t.targetPlayerIndex === task.targetPlayerIndex)
    );

    if (existingIndex >= 0) {
      // 如果新任务优先级更高，替换旧任务；否则忽略
      if (task.priority > this.taskQueue[existingIndex].priority) {
        this.taskQueue[existingIndex] = task;
      }
      return;
    }

    // 按优先级插入
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (task.priority > this.taskQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    this.taskQueue.splice(insertIndex, 0, task);
  }

  /**
   * 处理任务队列
   */
  private async processQueue(): Promise<void> {
    // 如果正在处理，跳过
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        const state = this.config.getGameState();
        const currentRoundNumber = this.getCurrentRoundNumber(state);

        // 验证任务是否仍然有效
        if (task.roundNumber !== currentRoundNumber) {
          continue; // 跳过过期任务
        }

        try {
          if (task.type === 'next_turn') {
            await this.handleNextTurn(task, state);
          }
        } catch (error) {
          // 忽略错误，继续处理下一个任务
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 处理下一个玩家出牌
   */
  private async handleNextTurn(task: ScheduleTask, state: any): Promise<void> {
    const playerIndex = task.targetPlayerIndex ?? state.currentPlayerIndex;
    const player = state.players[playerIndex];

    if (!player) {
      return;
    }

    // 等待正在处理的出牌完成（在更新 lastProcessedPlayerIndex 之前）
    const currentRound = this.getCurrentRound(state);
    if (currentRound?.hasProcessingPlay()) {
      try {
        await currentRound.waitForPlayProcess(15000);
      } catch (error) {
        // 超时或错误，继续执行
      }
    }

    // 再次检查状态，确保轮次号仍然匹配（防止在等待期间轮次已切换）
    const latestState = this.config.getGameState();
    const latestRound = this.getCurrentRound(latestState);
    if (latestState.status !== 'playing' || 
        latestState.roundNumber !== task.roundNumber ||
        latestRound?.roundNumber !== task.roundNumber) {
      console.log(`[RoundScheduler] 任务已过期，跳过处理 (轮次号: ${task.roundNumber} -> ${latestState.roundNumber})`);
      return;
    }

    // 检查该玩家是否已经出过牌（防止重复出牌）
    if (latestRound && latestRound.getPlays().length > 0) {
      const lastPlay = latestRound.getPlays()[latestRound.getPlays().length - 1];
      if (lastPlay.playerId === playerIndex) {
        console.log(`[RoundScheduler] 玩家 ${playerIndex} 刚刚出过牌，跳过重复调度`);
        return;
      }
    }

    // 更新最后处理的玩家索引（在验证通过后）
    this.lastProcessedPlayerIndex = playerIndex;

    // 触发回调
    if (this.onNextTurnCallback) {
      await this.onNextTurnCallback(playerIndex, latestState);
    }
  }


  /**
   * 清除所有任务（轮次切换时调用）
   */
  clearQueue(): void {
    this.taskQueue = [];
    this.isProcessing = false;
    this.lastProcessedPlayerIndex = null;
  }

  /**
   * 获取当前队列状态（用于调试）
   */
  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentRoundNumber: number;
    lastProcessedPlayerIndex: number | null;
    tasks: ScheduleTask[];
  } {
    return {
      queueLength: this.taskQueue.length,
      isProcessing: this.isProcessing,
      currentRoundNumber: this.currentRoundNumber,
      lastProcessedPlayerIndex: this.lastProcessedPlayerIndex,
      tasks: [...this.taskQueue]
    };
  }

  /**
   * 处理出牌完成后的调度逻辑
   * 在异步出牌完成后调用，处理接风判定、轮次结束、下一个玩家等逻辑
   * 
   * @param playerIndex 刚出牌的玩家索引
   * @param round Round 对象
   * @param players 所有玩家
   * @param playerCount 玩家数量
   * @param onStateUpdate 状态更新回调
   * @param onRoundEnd 轮次结束回调
   */
  // 防止重复调用的标志
  private isProcessingPlayCompleted = false;
  private lastProcessedPlayCompleted: { playerIndex: number; roundNumber: number; timestamp: number } | null = null;

  public async onPlayCompleted(
    playerIndex: number,
    round: Round,
    players: Player[],
    playerCount: number,
    onStateUpdate: (updater: (prev: any) => any) => void,
    onRoundEnd?: (round: Round, players: Player[], nextPlayerIndex: number | null, savedWinnerIndex?: number | null) => Promise<void>
  ): Promise<void> {
    // 防止重复调用
    const now = Date.now();
    if (this.isProcessingPlayCompleted) {
      return;
    }
    
    // 检查是否是相同的调用（在短时间内）
    if (this.lastProcessedPlayCompleted && 
        this.lastProcessedPlayCompleted.playerIndex === playerIndex &&
        this.lastProcessedPlayCompleted.roundNumber === round.roundNumber &&
        now - this.lastProcessedPlayCompleted.timestamp < 100) {
      return;
    }
    
    this.isProcessingPlayCompleted = true;
    this.lastProcessedPlayCompleted = { playerIndex, roundNumber: round.roundNumber, timestamp: now };
    
    try {
      const state = this.config.getGameState();
      
      // 检查游戏是否已经结束
      if (state.status !== 'playing') {
        return;
      }
      
      const currentRoundNumber = this.getCurrentRoundNumber(state);
      
      // 验证轮次号
      if (currentRoundNumber !== round.roundNumber || currentRoundNumber !== this.currentRoundNumber) {
        return;
      }
      
      // 确保使用最新的 Round 对象（从 state 中获取，而不是传入的 round）
      // 因为传入的 round 可能不是最新的
      const latestRound = this.getCurrentRound(state) || round;
    
    // ========== 检查是否在接风轮询中 ==========
    // 如果在接风轮询中，玩家出牌后应该结束接风轮询，继续正常流程
    if (latestRound.isTakeoverRoundActive()) {
      // 玩家出牌了，结束接风轮询
      latestRound.endTakeoverRound();
      
      // 更新状态（结束接风轮）
      onStateUpdate(prev => {
        if (prev.currentRoundIndex < 0 || prev.currentRoundIndex >= prev.rounds.length) {
          return prev;
        }
        const updatedRounds = [...prev.rounds];
        updatedRounds[prev.currentRoundIndex] = latestRound;
        return {
          ...prev,
          rounds: updatedRounds
        };
      });
    }
    
    // 1. 计算下一个玩家（使用最新的玩家状态，从state中获取）
    const latestPlayers = state.players || players;
    const nextPlayerIndex = findNextActivePlayer(playerIndex, latestPlayers, playerCount);
    
    // 2. 正常轮流程：直接继续到下一个玩家
    
    // 4. 更新状态（只更新rounds，currentPlayerIndex由playNextTurn统一处理）
    onStateUpdate(prev => {
      if (prev.currentRoundIndex < 0 || prev.currentRoundIndex >= prev.rounds.length) {
        return prev;
      }
      
      const updatedRounds = [...prev.rounds];
      updatedRounds[prev.currentRoundIndex] = latestRound;
      
      return {
        ...prev,
        rounds: updatedRounds
        // 注意：不在这里更新currentPlayerIndex，由playNextTurn统一处理
      };
    });
    
    // 5. 不在 onPlayCompleted 中检查轮次结束！
    // 原因：玩家刚出完牌时，其他玩家还没有机会要不起，此时不应该判断轮次结束
    // 轮次结束判断应该在 onPassCompleted 中进行，确保所有玩家都被轮询过
    // 如果在这里检查，可能会因为状态不一致而错误地提前结束轮次
    
    // 6. 继续下一家：无论下一个玩家是什么类型，都通知Game处理
    // 注意：playNextTurn不依赖传入的state，它直接从game对象获取最新状态
    // 但为了确保状态一致，在调用前重新获取最新状态
    if (nextPlayerIndex !== null && this.onNextTurnCallback) {
      // 重新获取最新状态，确保状态已更新
      const latestState = this.config.getGameState();
      await this.onNextTurnCallback(nextPlayerIndex, latestState);
    }
    } finally {
      this.isProcessingPlayCompleted = false;
    }
  }
  
  
  /**
   * 处理玩家要不起完成后的调度逻辑
   */
  public async onPassCompleted(
    playerIndex: number,
    round: Round,
    players: Player[],
    playerCount: number,
    onStateUpdate: (updater: (prev: any) => any) => void,
    onRoundEnd?: (round: Round, players: Player[], nextPlayerIndex: number | null, savedWinnerIndex?: number | null) => Promise<void>
  ): Promise<void> {
    const state = this.config.getGameState();
    const currentRoundNumber = this.getCurrentRoundNumber(state);
    
    // 验证轮次号
    if (currentRoundNumber !== round.roundNumber || currentRoundNumber !== this.currentRoundNumber) {
      return;
    }
    
    // 使用最新的 Round 对象
    const latestRound = this.getCurrentRound(state) || round;
    
    // 使用最新的玩家状态
    const latestPlayers = state.players || players;
    const lastPlayPlayerIndex = latestRound.getLastPlayPlayerIndex();
    
    // ========== 接风轮询逻辑 ==========
    // 玩家要不起后，立即开始接风轮询
    
    // 检查是否已经在接风轮询中
    if (latestRound.isTakeoverRoundActive()) {
      // 已经在接风轮询中，检查接风轮询是否完成
      // 重要：接风轮询完成的条件是：当前要不起的玩家是出牌玩家（轮询回到了出牌玩家）
      const takeoverEndPlayerIndex = latestRound.getTakeoverEndPlayerIndex();
      const isPollingComplete = takeoverEndPlayerIndex !== null && playerIndex === takeoverEndPlayerIndex;
      
      if (isPollingComplete) {
        // 接风轮询完成：回到出牌玩家，判断接风
        // 重要：此时不应该调用 onNextTurnCallback，而是直接调用 onRoundEnd 结束本轮并开始新轮次
        
        // 接风玩家 = 出牌玩家（lastPlayPlayerIndex）
        let takeoverPlayerIndex: number | null = null;
        const lastPlayPlayer = lastPlayPlayerIndex !== null ? latestPlayers[lastPlayPlayerIndex] : null;
        
        if (lastPlayPlayerIndex === null) {
          // 不应该发生
          takeoverPlayerIndex = null;
        } else if (lastPlayPlayer && lastPlayPlayer.hand.length > 0) {
          // 接风玩家还有手牌
          takeoverPlayerIndex = lastPlayPlayerIndex;
        } else {
          // 接风玩家已出完牌，接风给下一个玩家
          takeoverPlayerIndex = findNextActivePlayer(lastPlayPlayerIndex, latestPlayers, playerCount);
        }
        
        // 结束接风轮
        latestRound.endTakeoverRound();
        
        // 结束本轮，开始新轮次
        if (takeoverPlayerIndex !== null && lastPlayPlayerIndex !== null) {
          const savedWinnerIndex = lastPlayPlayerIndex;
          
          // 更新状态（只更新 rounds，不更新 currentPlayerIndex）
          // currentPlayerIndex 应该在 onRoundEnd 创建新轮次后，由 playNextTurn 更新
          onStateUpdate(prev => {
            if (prev.currentRoundIndex < 0 || prev.currentRoundIndex >= prev.rounds.length) {
              return prev;
            }
            const updatedRounds = [...prev.rounds];
            updatedRounds[prev.currentRoundIndex] = latestRound;
            return {
              ...prev,
              rounds: updatedRounds
              // 注意：不在这里更新 currentPlayerIndex，由 onRoundEnd -> playNextTurn 统一处理
            };
          });
          
          // 等待正在处理的出牌完成
          if (latestRound.hasProcessingPlay()) {
            try {
              await latestRound.waitForPlayProcess(10000);
            } catch (error) {
              // 继续执行
            }
          }
          
          // 重要：直接调用 onRoundEnd，不调用 onNextTurnCallback
          // onRoundEnd 会创建新轮次，并调用 playNextTurn(takeoverPlayerIndex)
          // playNextTurn 会更新 currentPlayerIndex 并触发 UI 更新
          if (onRoundEnd) {
            await onRoundEnd(latestRound, latestPlayers, takeoverPlayerIndex, savedWinnerIndex);
          }
        }
        return;
      } else {
        // 接风轮询还未完成，继续下一个玩家
        const nextPlayerIndex = findNextActivePlayer(playerIndex, latestPlayers, playerCount);
        
        // 更新状态
        onStateUpdate(prev => {
          if (prev.currentRoundIndex < 0 || prev.currentRoundIndex >= prev.rounds.length) {
            return prev;
          }
          const updatedRounds = [...prev.rounds];
          updatedRounds[prev.currentRoundIndex] = latestRound;
          return {
            ...prev,
            rounds: updatedRounds
          };
        });
        
        // 继续接风轮询下一个玩家
        if (nextPlayerIndex !== null && this.onNextTurnCallback) {
          const latestState = this.config.getGameState();
          await this.onNextTurnCallback(nextPlayerIndex, latestState);
        }
        return;
      }
    } else {
      // 开始接风轮询：玩家要不起后，立即开始接风轮询
      if (lastPlayPlayerIndex === null) {
        // 如果没有上家出牌，不需要接风轮询
        // 直接继续下一个玩家（正常轮）
        const nextPlayerIndex = findNextActivePlayer(playerIndex, latestPlayers, playerCount);
        
        onStateUpdate(prev => {
          if (prev.currentRoundIndex < 0 || prev.currentRoundIndex >= prev.rounds.length) {
            return prev;
          }
          const updatedRounds = [...prev.rounds];
          updatedRounds[prev.currentRoundIndex] = latestRound;
          return {
            ...prev,
            rounds: updatedRounds
          };
        });
        
        if (nextPlayerIndex !== null && this.onNextTurnCallback) {
          const latestState = this.config.getGameState();
          await this.onNextTurnCallback(nextPlayerIndex, latestState);
        }
        return;
      }
      
      // 标记为接风轮，开始接风轮询
      latestRound.startTakeoverRound(playerIndex, lastPlayPlayerIndex);
      
      // 计算下一个玩家
      const nextPlayerIndex = findNextActivePlayer(playerIndex, latestPlayers, playerCount);
      
      // 更新状态（标记接风轮）
      onStateUpdate(prev => {
        if (prev.currentRoundIndex < 0 || prev.currentRoundIndex >= prev.rounds.length) {
          return prev;
        }
        const updatedRounds = [...prev.rounds];
        updatedRounds[prev.currentRoundIndex] = latestRound;
        return {
          ...prev,
          rounds: updatedRounds
        };
      });
      
      // 继续接风轮询下一个玩家
      if (nextPlayerIndex !== null && this.onNextTurnCallback) {
        const latestState = this.config.getGameState();
        await this.onNextTurnCallback(nextPlayerIndex, latestState);
      }
      return;
    }
  }
  
  // ========== 回调函数 ==========
  
  /** 下一个玩家出牌回调 */
  onNextTurnCallback?: (playerIndex: number, state: any) => Promise<void>;
}


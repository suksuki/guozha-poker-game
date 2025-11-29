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

    // 更新最后处理的玩家索引
    this.lastProcessedPlayerIndex = playerIndex;

    // 等待正在处理的出牌完成
    const currentRound = this.getCurrentRound(state);
    if (currentRound?.hasProcessingPlay()) {
      try {
        await currentRound.waitForPlayProcess(15000);
      } catch (error) {
        // 超时或错误，继续执行
      }
    }

    // 触发回调
    if (this.onNextTurnCallback) {
      await this.onNextTurnCallback(playerIndex, state);
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
    
    // 1. 计算下一个玩家
    const nextPlayerIndex = findNextActivePlayer(playerIndex, players, playerCount);
    
    // 2. 不在这里检查接风！
    // 接风应该在所有玩家都轮询过之后才检查（在 onPassCompleted 中检查）
    // 因为玩家刚出完牌时，其他玩家还没有机会要不起
    // 所以这里不检查接风，直接继续到下一个玩家
    let didTakeover = false;
    
    // 4. 更新状态（包括接风后的状态）
    onStateUpdate(prev => {
      if (prev.currentRoundIndex < 0 || prev.currentRoundIndex >= prev.rounds.length) {
        return prev;
      }
      
      const updatedRounds = [...prev.rounds];
      updatedRounds[prev.currentRoundIndex] = latestRound;
      
      const newCurrentPlayerIndex = nextPlayerIndex !== null ? nextPlayerIndex : prev.currentPlayerIndex;
      
      return {
        ...prev,
        rounds: updatedRounds,
        currentPlayerIndex: newCurrentPlayerIndex
      };
    });
    
    // 5. 检查是否轮次结束（在接风检查之后）
    // 注意：如果接风了，不应该检查轮次结束，因为接风后应该继续游戏
    if (!didTakeover && nextPlayerIndex !== null && latestRound.getPlayCount() > 0) {
      const shouldEndRound = latestRound.shouldEnd(nextPlayerIndex);
      
      if (shouldEndRound) {
        // 等待正在处理的出牌完成
        if (latestRound.hasProcessingPlay()) {
          try {
            await latestRound.waitForPlayProcess(10000);
          } catch (error) {
            // 超时或错误，继续执行
          }
        }
        
        // 调用轮次结束回调
        if (onRoundEnd) {
          await onRoundEnd(latestRound, players, nextPlayerIndex);
        }
        return;
      }
    }
    
    // 5. 继续下一家：如果下一个玩家是AI或托管模式下的真实玩家，自动继续
    const nextPlayer = nextPlayerIndex !== null ? players[nextPlayerIndex] : null;
    const shouldAutoContinue = nextPlayer && (
      nextPlayer.type === PlayerType.AI || 
      (nextPlayer.isHuman && this.config.isAutoPlay)
    );
    
    if (shouldAutoContinue && nextPlayerIndex !== null) {
      // 延迟调度，确保状态已更新
      setTimeout(() => {
        this.scheduleNextTurn(nextPlayerIndex, 0);
      }, 100);
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
    
    // 1. 计算下一个玩家
    const nextPlayerIndex = findNextActivePlayer(playerIndex, players, playerCount);
    const lastPlayPlayerIndex = latestRound.getLastPlayPlayerIndex();
    
    // 2. 关键逻辑：判断是否应该接风
    // 接风条件：所有剩余玩家都要不起最后一手牌
    // 每次玩家要不起后，都应该检查是否所有剩余玩家都要不起
    let didTakeover = false;
    let takeoverPlayerIndex: number | null = null; // 接风后应该轮到出牌的玩家
    
    // ========== 接风判断：检查是否所有剩余玩家都要不起 ==========
    // 重要：每次玩家要不起后，都应该检查是否所有剩余玩家都要不起
    // 如果所有剩余玩家都要不起，立即接风，不需要等到轮完一圈
    const lastPlayPlayer = lastPlayPlayerIndex !== null ? players[lastPlayPlayerIndex] : null;
    const lastPlayPlayerFinished = lastPlayPlayer && lastPlayPlayer.hand.length === 0;
    
    // 检查是否所有剩余玩家都要不起
    // 传入 nextPlayerIndex 作为 currentPlayerIndex，因为下一个玩家是当前要判断的玩家
    const shouldTakeover = latestRound.shouldTakeover(players, nextPlayerIndex !== null ? nextPlayerIndex : playerIndex);
    
    // 接风判断：如果所有剩余玩家都要不起，立即接风
    // 情况1：正常接风 - 轮完一圈（nextPlayerIndex === lastPlayPlayerIndex）
    // 情况2：特殊接风 - 最后出牌玩家已出完，且所有剩余玩家都要不起
    // 情况3：所有剩余玩家都要不起（无论是否轮完一圈）
    const isNormalTakeover = nextPlayerIndex !== null && lastPlayPlayerIndex !== null && nextPlayerIndex === lastPlayPlayerIndex;
    const isSpecialTakeover = lastPlayPlayerFinished && lastPlayPlayerIndex !== null && shouldTakeover;
    const shouldTakeoverNow = shouldTakeover; // 所有剩余玩家都要不起，立即接风
    
    // 如果所有剩余玩家都要不起，立即接风
    if (shouldTakeoverNow || isNormalTakeover || isSpecialTakeover) {
      
      // ========== 确定接风玩家 ==========
      // 接风玩家 = 出牌玩家（lastPlayPlayerIndex）
      // 根据文档：如果接风玩家已出完，需要接风给下一个玩家
      if (lastPlayPlayerIndex === null) {
        // 不应该发生，但为了安全起见
        takeoverPlayerIndex = nextPlayerIndex;
      } else if (lastPlayPlayer && lastPlayPlayer.hand.length > 0) {
        // 情况1：接风玩家还有手牌
        // 接风玩家就是出牌玩家
        takeoverPlayerIndex = lastPlayPlayerIndex;
      } else {
        // 情况2：接风玩家已经出完牌
        // 注意：玩家结束逻辑（finishOrder、finishedRank）已在出完牌时处理，不需要再次处理
        // 接风给下一个还在游戏中的玩家
        takeoverPlayerIndex = findNextActivePlayer(lastPlayPlayerIndex, players, playerCount);
      }
      
      if (takeoverPlayerIndex !== null) {
        // 接风确定
        // 注意：不需要调用 takeover() 清空 lastPlay，因为接风后会立即结束本轮，
        // 新轮次开始时，lastPlay 和 lastPlayPlayerIndex 自动就是 null
        didTakeover = true;
      }
      
        // ========== 接风后，立即结束本轮，开始新的一轮 ==========
        // 根据文档：接风后应该立即结束本轮，开启新轮次
        // 轮次分数将在Round.end()中分配给接风玩家（即使已出完）
        if (didTakeover && takeoverPlayerIndex !== null) {
          // 保存接风玩家索引（接风玩家 = 最后出牌的人）
          // 注意：不需要调用 takeover() 清空 lastPlay，因为接风后会立即结束本轮并创建新轮次
          // 新轮次开始时，lastPlay 和 lastPlayPlayerIndex 自动就是 null
          const savedWinnerIndex = lastPlayPlayerIndex; // 接风玩家 = 最后出牌的人
        
        // 更新状态（确保 Round 对象已更新）
        onStateUpdate(prev => {
          if (prev.currentRoundIndex < 0 || prev.currentRoundIndex >= prev.rounds.length) {
            return prev;
          }
          const updatedRounds = [...prev.rounds];
          updatedRounds[prev.currentRoundIndex] = latestRound;
          return {
            ...prev,
            rounds: updatedRounds,
            currentPlayerIndex: takeoverPlayerIndex!
          };
        });
        
        // 等待正在处理的出牌完成
        if (latestRound.hasProcessingPlay()) {
          try {
            await latestRound.waitForPlayProcess(10000);
          } catch (error) {
            // 超时或错误，继续执行
          }
        }
        
        // ========== 结束本轮，开始新的一轮 ==========
        // 根据文档：
        // 1. 结束本轮：分配轮次分数给接风玩家（在Round.end()中处理）
        // 2. 开启新轮次：新轮次第一个玩家 = 接风玩家（takeoverPlayerIndex）
        // 3. 接风玩家可以自由出任意牌型（新轮次开始时 lastPlay 和 lastPlayPlayerIndex 自动为 null）
        // 
        // 重要说明：
        // - 如果接风玩家已出完（lastPlayPlayerIndex），轮次分数仍会分配给他（savedWinnerIndex），
        //   但下一轮由下一个玩家开始（takeoverPlayerIndex = findNextActivePlayer(...)）
        // - 如果接风玩家还有手牌，下一轮由接风玩家开始（takeoverPlayerIndex = lastPlayPlayerIndex）
        // - 新轮次创建时，Round.createNew() 会创建一个全新的 Round 对象，
        //   lastPlay 和 lastPlayPlayerIndex 初始为 null，确保接风判断正确
        // - 在新轮次中，当接风玩家出牌后，lastPlayPlayerIndex 会被设置为接风玩家的索引，
        //   这样当其他玩家都要不起时，接风判断会正确识别接风玩家（而不是已出完的玩家）
        
        if (onRoundEnd) {
          await onRoundEnd(latestRound, players, takeoverPlayerIndex, savedWinnerIndex);
        }
        return;
      }
    }
    
    // 3. 更新状态（接风的情况已经在前面处理并return了）
    onStateUpdate(prev => {
      if (prev.currentRoundIndex < 0 || prev.currentRoundIndex >= prev.rounds.length) {
        return prev;
      }
      
      // 更新 rounds 数组中当前轮次的 Round 对象
      const updatedRounds = [...prev.rounds];
      updatedRounds[prev.currentRoundIndex] = latestRound;
      
      // 轮到下一个玩家（接风的情况已经在前面处理并return了）
      const newCurrentPlayerIndex = nextPlayerIndex !== null ? nextPlayerIndex : prev.currentPlayerIndex;
      
      return {
        ...prev,
        rounds: updatedRounds,
        currentPlayerIndex: newCurrentPlayerIndex
      };
    });
    
    // 4. 检查是否轮次结束（接风的情况已经在前面处理并return了）
    if (nextPlayerIndex !== null && latestRound.getPlayCount() > 0) {
      const shouldEndRound = latestRound.shouldEnd(nextPlayerIndex);
      
      if (shouldEndRound) {
        if (latestRound.hasProcessingPlay()) {
          try {
            await latestRound.waitForPlayProcess(10000);
          } catch (error) {
            // 超时或错误，继续执行
          }
        }
        
        if (onRoundEnd) {
          await onRoundEnd(latestRound, players, nextPlayerIndex);
        }
        return;
      }
    }
    
    // 5. 继续下一家（接风的情况已经在前面处理并return了）
    // RoundScheduler 的职责就是自动调度下一个玩家
    const targetPlayerIndex = nextPlayerIndex;
    
    const targetPlayer = targetPlayerIndex !== null ? players[targetPlayerIndex] : null;
    const shouldAutoContinue = targetPlayer && (
      targetPlayer.type === PlayerType.AI || 
      (targetPlayer.isHuman && this.config.isAutoPlay)
    );
    
    if (shouldAutoContinue && targetPlayerIndex !== null) {
      setTimeout(() => {
        this.scheduleNextTurn(targetPlayerIndex, 0);
      }, 100);
    }
  }
  
  // ========== 回调函数 ==========
  
  /** 下一个玩家出牌回调 */
  onNextTurnCallback?: (playerIndex: number, state: any) => Promise<void>;
}


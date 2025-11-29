/**
 * 牌轮（Round）类
 * 封装一轮牌的所有状态和逻辑
 * 
 * 职责：
 * - 管理轮次状态（编号、出牌记录、分数等）
 * - 处理出牌和要不起操作
 * - 判断轮次状态（接风、轮次结束）
 * - 结束轮次并生成记录
 * - 管理出牌时间控制（最短间隔、超时）
 * - 管理异步出牌处理流程
 */

import { Card, Play, RoundPlayRecord, RoundRecord, Player } from '../types/card';
import { hasPlayableCards } from './cardUtils';
import { findNextActivePlayer } from './gameStateUtils';

/**
 * 出牌时间配置
 */
export interface PlayTimingConfig {
  /** 两个玩家出牌之间的最短时间间隔（毫秒） */
  minIntervalBetweenPlays: number;
  /** 玩家出牌超时时间（毫秒），超时后自动要不起 */
  playTimeout: number;
  /** 是否启用时间控制 */
  enabled: boolean;
}

/**
 * 出牌处理状态
 */
export enum PlayProcessStatus {
  /** 未开始 */
  IDLE = 'idle',
  /** 正在处理（生成TTS、播放等） */
  PROCESSING = 'processing',
  /** 处理完成，可以继续 */
  COMPLETED = 'completed',
  /** 处理失败 */
  FAILED = 'failed'
}

/**
 * 异步出牌处理结果
 */
export interface PlayProcessResult {
  /** 处理状态 */
  status: PlayProcessStatus;
  /** 处理开始时间 */
  startTime: number;
  /** 处理完成时间 */
  endTime?: number;
  /** 错误信息 */
  error?: Error;
}

export class Round {
  readonly roundNumber: number;
  readonly startTime: number;
  
  private plays: RoundPlayRecord[] = [];
  private totalScore: number = 0;
  private lastPlay: Play | null = null;
  private lastPlayPlayerIndex: number | null = null;
  private isFinished: boolean = false;
  private endTime?: number;
  private winnerId?: number;
  private winnerName?: string;

  // ========== 出牌时间控制 ==========
  private timingConfig: PlayTimingConfig = {
    minIntervalBetweenPlays: 500,  // 默认500ms最短间隔
    playTimeout: 30000,  // 默认30秒超时
    enabled: true
  };
  private lastPlayTime: number = 0;  // 最后一次出牌的时间
  private playStartTime: Map<number, number> = new Map();  // 每个玩家开始出牌的时间
  private playTimeouts: Map<number, NodeJS.Timeout> = new Map();  // 每个玩家的超时定时器

  // ========== 异步出牌处理 ==========
  private currentPlayProcess: {
    playerIndex: number;
    status: PlayProcessStatus;
    promise: Promise<PlayProcessResult>;
    resolve?: (result: PlayProcessResult) => void;
    reject?: (error: Error) => void;
    startTime: number; // 处理开始时间
  } | null = null;

  constructor(roundNumber: number, startTime?: number, timingConfig?: Partial<PlayTimingConfig>) {
    this.roundNumber = roundNumber;
    this.startTime = startTime ?? Date.now();
    if (timingConfig) {
      this.timingConfig = { ...this.timingConfig, ...timingConfig };
    }
  }

  // ========== 出牌时间控制方法 ==========

  /**
   * 设置时间配置
   */
  setTimingConfig(config: Partial<PlayTimingConfig>): void {
    this.timingConfig = { ...this.timingConfig, ...config };
  }

  /**
   * 获取时间配置
   */
  getTimingConfig(): Readonly<PlayTimingConfig> {
    return { ...this.timingConfig };
  }

  /**
   * 检查是否可以出牌（检查最短间隔）
   * @returns 如果可以出牌，返回 true；否则返回剩余的等待时间（毫秒）
   */
  canPlayNow(playerIndex: number): true | number {
    if (!this.timingConfig.enabled) {
      return true;
    }

    const now = Date.now();
    const timeSinceLastPlay = now - this.lastPlayTime;

    // 如果距离上次出牌的时间小于最短间隔，需要等待
    if (timeSinceLastPlay < this.timingConfig.minIntervalBetweenPlays) {
      return this.timingConfig.minIntervalBetweenPlays - timeSinceLastPlay;
    }

    return true;
  }

  /**
   * 等待最短间隔时间
   */
  async waitForMinInterval(): Promise<void> {
    if (!this.timingConfig.enabled) {
      return;
    }

    const canPlay = this.canPlayNow(0);
    if (canPlay !== true) {
      await new Promise(resolve => setTimeout(resolve, canPlay));
    }
  }

  /**
   * 开始出牌计时（用于超时检测）
   */
  startPlayTimer(playerIndex: number, onTimeout: () => void): void {
    if (!this.timingConfig.enabled) {
      return;
    }

    // 清除之前的超时定时器
    this.clearPlayTimer(playerIndex);

    // 记录开始时间
    this.playStartTime.set(playerIndex, Date.now());

    // 设置超时定时器
    const timeout = setTimeout(() => {
      this.clearPlayTimer(playerIndex);
      onTimeout();
    }, this.timingConfig.playTimeout);

    this.playTimeouts.set(playerIndex, timeout);
  }

  /**
   * 清除出牌计时器
   */
  clearPlayTimer(playerIndex: number): void {
    const timeout = this.playTimeouts.get(playerIndex);
    if (timeout) {
      clearTimeout(timeout);
      this.playTimeouts.delete(playerIndex);
    }
    this.playStartTime.delete(playerIndex);
  }

  /**
   * 清除所有出牌计时器
   */
  clearAllPlayTimers(): void {
    this.playTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.playTimeouts.clear();
    this.playStartTime.clear();
  }

  /**
   * 获取玩家已等待的时间（用于超时提示）
   */
  getElapsedWaitTime(playerIndex: number): number {
    const startTime = this.playStartTime.get(playerIndex);
    if (!startTime) {
      return 0;
    }
    return Date.now() - startTime;
  }

  // ========== 异步出牌处理方法 ==========

  /**
   * 检查是否有正在处理的出牌
   */
  hasProcessingPlay(): boolean {
    return this.currentPlayProcess !== null && 
           this.currentPlayProcess.status === PlayProcessStatus.PROCESSING;
  }

  /**
   * 等待当前出牌处理完成
   * @param timeoutMs 超时时间（毫秒），默认30秒
   */
  async waitForPlayProcess(timeoutMs: number = 30000): Promise<PlayProcessResult> {
    if (!this.currentPlayProcess) {
      return {
        status: PlayProcessStatus.IDLE,
        startTime: Date.now()
      };
    }

    // 如果轮次已结束，立即返回
    if (this.isFinished) {
      return {
        status: PlayProcessStatus.FAILED,
        startTime: this.currentPlayProcess.startTime || Date.now(),
        endTime: Date.now(),
        error: new Error(`轮次 ${this.roundNumber} 已结束，无法等待出牌处理`)
      };
    }

    // 添加超时保护和轮次状态检查
    let checkInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    };

    try {
      const result = await Promise.race([
        this.currentPlayProcess.promise.finally(() => {
          // 出牌处理完成时清理定时器
          cleanup();
        }),
        // 超时保护
        new Promise<PlayProcessResult>((resolve) => {
          timeoutId = setTimeout(() => {
            cleanup();
            resolve({
              status: PlayProcessStatus.FAILED,
              startTime: this.currentPlayProcess?.startTime || Date.now(),
              endTime: Date.now(),
              error: new Error(`等待出牌处理超时（${timeoutMs}ms）`)
            });
          }, timeoutMs);
        }),
        // 轮次状态检查（每100ms检查一次）
        new Promise<PlayProcessResult>((resolve) => {
          checkInterval = setInterval(() => {
            if (this.isFinished) {
              cleanup();
              resolve({
                status: PlayProcessStatus.FAILED,
                startTime: this.currentPlayProcess?.startTime || Date.now(),
                endTime: Date.now(),
                error: new Error(`轮次 ${this.roundNumber} 已结束，无法等待出牌处理`)
              });
            }
          }, 100); // 每100ms检查一次轮次状态
        })
      ]);

      // 确保清理（防止竞态条件）
      cleanup();
      return result;
    } catch (error) {
      // 确保清理
      cleanup();
      throw error;
    }
  }

  /**
   * 开始异步出牌处理
   * 流程：出牌 → 生成TTS → 播放语音 → 完成后允许下家出牌
   * 
   * @param playerIndex 玩家索引
   * @param processAsync 异步处理函数，返回 Promise
   * @returns Promise<PlayProcessResult>
   */
  async processPlayAsync(
    playerIndex: number,
    processAsync: () => Promise<void>
  ): Promise<PlayProcessResult> {
    // 获取调用栈信息（用于调试）
    const stackTrace = new Error().stack?.split('\n').slice(2, 8).join('\n') || 'unknown';
    
    // 检查轮次是否已结束
    if (this.isFinished) {
      return {
        status: PlayProcessStatus.FAILED,
        startTime: Date.now(),
        endTime: Date.now(),
        error: new Error(`轮次 ${this.roundNumber} 已结束，无法处理出牌`)
      };
    }

    // 如果已经有正在处理的出牌，等待它完成
    if (this.hasProcessingPlay()) {
      const processingPlayerIndex = this.currentPlayProcess?.playerIndex;
      const waitResult = await this.waitForPlayProcess(15000); // 使用15秒超时
      // 等待完成后，再次检查轮次是否已结束
      if (this.isFinished) {
        return {
          status: PlayProcessStatus.FAILED,
          startTime: Date.now(),
          endTime: Date.now(),
          error: new Error(`轮次 ${this.roundNumber} 已结束，无法处理出牌`)
        };
      }
    }

    const startTime = Date.now();
    let resolve: ((result: PlayProcessResult) => void) | undefined;
    let reject: ((error: Error) => void) | undefined;

    const promise = new Promise<PlayProcessResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    // 创建出牌处理对象
    const processStartTime = startTime;
    this.currentPlayProcess = {
      playerIndex,
      status: PlayProcessStatus.PROCESSING,
      promise,
      resolve,
      reject,
      startTime: processStartTime
    };

    try {
      // 在执行异步处理前，再次检查轮次是否已结束
      if (this.isFinished) {
        const endTime = Date.now();
        const result: PlayProcessResult = {
          status: PlayProcessStatus.FAILED,
          startTime,
          endTime,
          error: new Error(`轮次 ${this.roundNumber} 已结束，无法处理出牌`)
        };
        this.currentPlayProcess = null;
        reject?.(result.error);
        return result;
      }
      
      // 执行异步处理（生成TTS、播放等），添加超时保护
      // 超时时间：使用配置的 playTimeout，默认30秒
      const timeoutMs = this.timingConfig.playTimeout || 30000;
      let processTimeout: NodeJS.Timeout | null = null;
      
      try {
        // 包装 processAsync，在执行过程中检查轮次状态
        const wrappedProcessAsync = async () => {
          // 在执行前检查
          if (this.isFinished) {
            throw new Error(`轮次 ${this.roundNumber} 已结束，无法处理出牌`);
          }
          
          await processAsync();
          
          // 在执行后检查
          if (this.isFinished) {
          }
        };

        await Promise.race([
          wrappedProcessAsync(),
          new Promise<void>((_, reject) => {
            processTimeout = setTimeout(() => {
              reject(new Error(`出牌处理超时（${timeoutMs}ms）`));
            }, timeoutMs);
          })
        ]);
        
        // 如果成功完成，清除超时定时器
        if (processTimeout) {
          clearTimeout(processTimeout);
        }
      } catch (error) {
        // 清除超时定时器
        if (processTimeout) {
          clearTimeout(processTimeout);
        }
        
        // 如果是因为轮次已结束导致的错误，记录警告但不抛出
        if (this.isFinished && error instanceof Error && error.message.includes('已结束')) {
          // 返回失败结果，但不抛出错误
          const endTime = Date.now();
          const result: PlayProcessResult = {
            status: PlayProcessStatus.FAILED,
            startTime,
            endTime,
            error: error as Error
          };
          this.currentPlayProcess = null;
          reject?.(error as Error);
          return result;
        }
        
        // 重新抛出其他错误，让外层的 catch 处理
        throw error;
      }
      
      const endTime = Date.now();
      const result: PlayProcessResult = {
        status: PlayProcessStatus.COMPLETED,
        startTime,
        endTime
      };

      const duration = endTime - startTime;

      // 更新最后出牌时间
      this.lastPlayTime = endTime;

      // 完成处理
      this.currentPlayProcess = null;
      resolve?.(result);

      return result;
    } catch (error) {
      const endTime = Date.now();
      const result: PlayProcessResult = {
        status: PlayProcessStatus.FAILED,
        startTime,
        endTime,
        error: error as Error
      };

      // 完成处理（失败）
      this.currentPlayProcess = null;
      reject?.(error as Error);

      return result;
    }
  }

  /**
   * 取消当前的出牌处理（如果正在处理）
   * 返回是否取消了处理
   */
  cancelPlayProcess(): boolean {
    if (this.currentPlayProcess && 
        this.currentPlayProcess.status === PlayProcessStatus.PROCESSING) {
      const process = this.currentPlayProcess;
      this.currentPlayProcess = null; // 先清除引用
      process.status = PlayProcessStatus.FAILED;
      // 使用 setTimeout 延迟拒绝，避免在同步上下文中抛出未捕获的错误
      // 这样可以给调用者机会捕获错误
      setTimeout(() => {
        try {
          process.reject?.(new Error('出牌处理被取消'));
        } catch (error) {
          // 忽略 reject 时的错误（可能已经被其他地方处理）
        }
      }, 0);
      return true;
    }
    return false;
  }

  // ========== 状态查询方法 ==========

  /**
   * 获取当前轮次的所有出牌记录
   */
  getPlays(): ReadonlyArray<RoundPlayRecord> {
    return [...this.plays];
  }

  /**
   * 获取当前轮次的累计分数
   */
  getTotalScore(): number {
    return this.totalScore;
  }

  /**
   * 获取最后出的牌
   */
  getLastPlay(): Play | null {
    return this.lastPlay;
  }

  /**
   * 获取最后出牌的玩家索引
   */
  getLastPlayPlayerIndex(): number | null {
    return this.lastPlayPlayerIndex;
  }

  /**
   * 检查轮次是否正在进行中
   */
  isInProgress(): boolean {
    return !this.isFinished;
  }

  /**
   * 检查轮次是否已结束
   */
  isEnded(): boolean {
    return this.isFinished;
  }

  /**
   * 获取轮次出牌次数
   */
  getPlayCount(): number {
    return this.plays.length;
  }

  /**
   * 获取获胜者信息
   */
  getWinner(): { id: number; name: string } | null {
    if (!this.isFinished || this.winnerId === undefined) {
      return null;
    }
    return {
      id: this.winnerId,
      name: this.winnerName || '未知'
    };
  }

  // ========== 出牌操作方法 ==========

  /**
   * 记录一次出牌
   * @param playRecord 出牌记录
   * @param play 牌型信息
   */
  recordPlay(playRecord: RoundPlayRecord, play: Play): void {
    if (this.isFinished) {
      // 如果轮次已结束，记录警告但不抛出错误（因为可能是异步处理中的竞态条件）
      // 不抛出错误，而是静默返回，避免中断异步流程
      return;
    }

    // 记录出牌
    this.plays.push(playRecord);
    
    // 累加分数（分牌分数累加到轮次分数池）
    this.totalScore += playRecord.score;
    
    // 更新最后出牌信息
    this.lastPlay = play;
    this.lastPlayPlayerIndex = playRecord.playerId;

    // 清除出牌计时器
    this.clearPlayTimer(playRecord.playerId);
  }

  /**
   * 记录要不起（不出牌）
   * @param playerIndex 玩家索引
   */
  recordPass(playerIndex: number): void {
    if (this.isFinished) {
      throw new Error(`轮次 ${this.roundNumber} 已结束，无法记录要不起`);
    }
    
    // 清除出牌计时器
    this.clearPlayTimer(playerIndex);
  }

  // ========== 接风判断 ==========

  /**
   * 判断是否需要接风（所有剩余玩家都要不起）
   * @param players 所有玩家
   * @param currentPlayerIndex 当前玩家索引
   */
  shouldTakeover(players: Player[], currentPlayerIndex: number): boolean {
    // 如果没有上家出牌，不需要接风判断
    if (!this.lastPlay || this.lastPlayPlayerIndex === null) {
      return false;
    }

    // 检查所有剩余玩家是否都要不起
    // 需要排除：1. 已出完牌的玩家 2. 当前玩家（下一个要出牌的） 3. 刚出牌的玩家
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      
      // 跳过已出完牌的玩家
      if (player.hand.length === 0) {
        continue;
      }
      
      // 跳过当前玩家（下一个要出牌或要不起的玩家）
      if (i === currentPlayerIndex) {
        continue;
      }
      
      // 跳过刚出牌的玩家（刚出牌的玩家肯定能打过自己的牌，不需要检查）
      if (i === this.lastPlayPlayerIndex) {
        continue;
      }
      
      // 如果还有玩家能打过，不需要接风
      if (hasPlayableCards(player.hand, this.lastPlay)) {
        return false;
      }
    }
    
    // 所有人都要不起（除了刚出牌的玩家和下一个要出牌的玩家），需要接风
    return true;
  }


  // ========== 轮次结束判断 ==========

  /**
   * 判断轮次是否应该结束
   * 条件：当轮到最后一个出牌的人时（所有人都要不起）
   * @param nextPlayerIndex 下一个玩家索引
   */
  shouldEnd(nextPlayerIndex: number): boolean {
    // 获取调用栈信息（用于调试）
    const stackTrace = new Error().stack?.split('\n').slice(2, 6).join('\n') || 'unknown';
    
      if (this.isFinished) {
        return false;
    }
    
    // 如果没有最后出牌的人，轮次不应该结束
    if (this.lastPlayPlayerIndex === null) {
      return false;
    }
    
    // 如果有正在处理的出牌，不应该立即结束轮次
    // 因为正在处理的出牌可能会改变轮次状态
    // 但是，如果正在处理的出牌状态是 'failed' 或已经超时，应该允许结束轮次
    if (this.hasProcessingPlay()) {
      const processingPlayerIndex = this.currentPlayProcess?.playerIndex;
      const processingStatus = this.currentPlayProcess?.status;
      
      // 如果正在处理的出牌已经失败或超时，允许结束轮次
      if (processingStatus === PlayProcessStatus.FAILED) {
        // 清除失败的出牌处理状态
        this.currentPlayProcess = null;
      } else {
        return false;
      }
    }
    
    // 如果下一个玩家是最后出牌的人，说明所有人都要不起，轮次应该结束
    // 但是需要确保至少有一轮完整的出牌循环，避免新轮次刚开始就结束
    // 检查：如果出牌记录数小于玩家数量，且下一个玩家就是出牌的人，可能是新轮次刚开始
    // 但是，如果已经有多次出牌（>= 2），说明已经完成了一轮循环，应该允许结束
    // 另外，如果出牌记录数 >= 玩家数量，说明已经完成了一轮完整的循环，应该允许结束
    
    // 如果下一个玩家是最后出牌的人，说明所有人都要不起，轮次应该结束
    const shouldEnd = nextPlayerIndex === this.lastPlayPlayerIndex;
    
    // 只有在出牌记录数很少（<= 1）且下一个玩家就是出牌的人时，才阻止结束
    // 这是为了防止新轮次刚开始时立即结束
    // 但是，如果出牌记录数 >= 2，说明已经完成了一轮循环，应该允许结束
    if (shouldEnd && this.plays.length <= 1) {
      // 只有一次或没有出牌记录，且下一个玩家就是出牌的人，说明可能是新轮次刚开始
      // 不应该立即结束，应该等待至少一轮完整的循环
      return false;
    }
    
    return shouldEnd;
  }


  // ========== 结束轮次 ==========

  /**
   * 结束轮次（不分配分数，分数由 GameController 统一管理）
   * @param players 所有玩家
   * @param playerCount 玩家总数
   * @param takeoverWinnerIndex 接风玩家索引（可选，用于接风场景）
   *                            在新的机制中，接风后立即结束本轮，接风玩家就是最后出牌的人（lastPlayPlayerIndex）
   *                            但在轮次结束时需要明确传入接风玩家索引，用于确定下一轮开始玩家
   * @returns 轮次结束信息（不包含分数更新的玩家列表，分数由 GameController 分配）
   */
  end(players: Player[], playerCount: number, takeoverWinnerIndex?: number | null): {
    updatedPlayers: Player[]; // 不包含分数更新的玩家列表（分数由 GameController 分配）
    nextPlayerIndex: number | null;
    roundScore: number; // 轮次分数（用于 GameController 分配）
    winnerIndex: number | null; // 接风玩家索引（用于 GameController 分配分数）
  } {
    if (this.isFinished) {
      throw new Error(`轮次 ${this.roundNumber} 已经结束`);
    }

    this.isFinished = true;
    this.endTime = Date.now();

    // 清除所有计时器
    this.clearAllPlayTimers();

    // 取消当前的出牌处理（如果正在处理）
    // 注意：通常在调用 end() 之前应该等待正在处理的出牌完成
    // 这里只是一个安全措施，不应该有正在处理的出牌
    // 如果确实有，说明调用者没有正确等待，但我们仍然需要清理
    if (this.hasProcessingPlay()) {
      // 静默取消，不会抛出未捕获的错误
      this.cancelPlayProcess();
    }

    const updatedPlayers = [...players];
    
    // ========== 确定接风玩家（最后出牌的人）==========
    // 注意：分数分配已移到 GameController，这里只确定接风玩家索引
    // 优先使用传入的 takeoverWinnerIndex（接风场景），否则使用 lastPlayPlayerIndex
    const winnerIndex = takeoverWinnerIndex !== undefined ? takeoverWinnerIndex : this.lastPlayPlayerIndex;
    
    if (winnerIndex !== null) {
      const winner = updatedPlayers[winnerIndex];
      if (winner) {
        this.winnerId = winner.id;
        this.winnerName = winner.name;
      }
    }

    // ========== 确定下一轮开始的玩家 ==========
    // 根据文档：接风后，新轮次第一个玩家 = 接风玩家
    // 但如果接风玩家已出完，由下一个还在游戏中的玩家开始
    // 优先使用传入的 takeoverWinnerIndex（接风场景），否则使用 lastPlayPlayerIndex
    let nextPlayerIndex: number | null = null;
    
    const finalWinnerIndex = winnerIndex; // 接风玩家（最后出牌的人）
    if (finalWinnerIndex !== null) {
      const winner = updatedPlayers[finalWinnerIndex];
      
      // 如果接风玩家还没出完牌，由接风玩家开始下一轮
      if (winner && winner.hand.length > 0) {
        nextPlayerIndex = finalWinnerIndex;
      } else {
        // 如果接风玩家已出完，由下一个还在游戏中的玩家开始
        nextPlayerIndex = findNextActivePlayer(finalWinnerIndex, updatedPlayers, playerCount);
      }
    }

    return {
      updatedPlayers, // 不包含分数更新的玩家列表（分数由 GameController 分配）
      nextPlayerIndex,
      roundScore: this.totalScore, // 轮次分数
      winnerIndex // 接风玩家索引（用于分数分配）
    };
  }

  // ========== 转换为记录 ==========

  /**
   * 转换为轮次记录（用于保存）
   */
  toRecord(): RoundRecord {
    return {
      roundNumber: this.roundNumber,
      plays: [...this.plays],
      totalScore: this.totalScore,
      winnerId: this.winnerId ?? this.lastPlayPlayerIndex ?? 0,
      winnerName: this.winnerName || '未知'
    };
  }

  /**
   * 转换为详细信息记录（包含时间等）
   */
  toDetailedRecord(): RoundRecord & {
    startTime: number;
    endTime?: number;
  } {
    return {
      ...this.toRecord(),
      startTime: this.startTime,
      endTime: this.endTime
    };
  }

  // ========== 静态工厂方法 ==========

  /**
   * 创建新轮次
   */
  static createNew(roundNumber: number, startTime?: number, timingConfig?: Partial<PlayTimingConfig>): Round {
    return new Round(roundNumber, startTime, timingConfig);
  }

  /**
   * 从记录恢复轮次（用于加载历史游戏）
   */
  static fromRecord(record: RoundRecord, startTime?: number): Round {
    const round = new Round(record.roundNumber, startTime);
    round.plays = [...record.plays];
    round.totalScore = record.totalScore;
    round.winnerId = record.winnerId;
    round.winnerName = record.winnerName;
    round.isFinished = true;
    
    // 尝试恢复最后出牌信息（从最后一个出牌记录）
    if (record.plays.length > 0) {
      const lastPlay = record.plays[record.plays.length - 1];
      round.lastPlayPlayerIndex = lastPlay.playerId;
      // 注意：lastPlay 无法完全恢复（需要 Play 对象），这里只恢复 playerIndex
    }
    
    return round;
  }

  // ========== 辅助方法 ==========

  /**
   * 克隆轮次（用于状态快照）
   */
  clone(): Round {
    const cloned = new Round(this.roundNumber, this.startTime, this.timingConfig);
    cloned.plays = [...this.plays];
    cloned.totalScore = this.totalScore;
    cloned.lastPlay = this.lastPlay;
    cloned.lastPlayPlayerIndex = this.lastPlayPlayerIndex;
    cloned.isFinished = this.isFinished;
    cloned.endTime = this.endTime;
    cloned.winnerId = this.winnerId;
    cloned.winnerName = this.winnerName;
    cloned.lastPlayTime = this.lastPlayTime;
    return cloned;
  }

  /**
   * 获取轮次统计信息
   */
  getStatistics(): {
    playCount: number;
    totalScore: number;
    scoreCardCount: number;
    duration?: number;
  } {
    const scoreCardCount = this.plays.reduce((sum, play) => sum + play.scoreCards.length, 0);
    
    return {
      playCount: this.plays.length,
      totalScore: this.totalScore,
      scoreCardCount,
      duration: this.endTime ? this.endTime - this.startTime : undefined
    };
  }
}


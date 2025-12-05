/**
 * RoundData - 轮次数据（纯数据容器，不可变）
 * 
 * 职责：
 * - 存储轮次的所有数据
 * - 完全不可变（readonly + Object.freeze）
 * - 无任何业务逻辑
 * - 支持快照和恢复
 * 
 * 设计原则：
 * 1. 纯数据，无副作用
 * 2. 完全不可变
 * 3. 易于测试
 * 4. 易于序列化
 */

import { Play, RoundPlayRecord, RoundRecord, Card } from '../../types/card';

/**
 * 轮次数据接口
 */
export interface RoundDataSnapshot {
  roundNumber: number;
  startTime: number;
  plays: RoundPlayRecord[];
  totalScore: number;
  lastPlay: Card[] | null; // 最后出的牌
  lastPlayPlayerIndex: number | null;
  isFinished: boolean;
  endTime?: number;
  winnerId?: number;
  winnerName?: string;
  
  // 接风轮标记
  isTakeoverRound: boolean;
  takeoverStartPlayerIndex: number | null;
  takeoverEndPlayerIndex: number | null;
}

/**
 * RoundData - 不可变的轮次数据容器
 */
export class RoundData {
  // ========== 基本信息 ==========
  readonly roundNumber: number;
  readonly startTime: number;
  
  // ========== 出牌记录 ==========
  readonly plays: readonly RoundPlayRecord[];
  readonly totalScore: number;
  readonly lastPlay: Card[] | null; // 最后出的牌（卡牌数组）
  readonly lastPlayPlayerIndex: number | null;
  
  // ========== 结束状态 ==========
  readonly isFinished: boolean;
  readonly endTime?: number;
  readonly winnerId?: number;
  readonly winnerName?: string;
  
  // ========== 接风轮标记 ==========
  readonly isTakeoverRound: boolean;
  readonly takeoverStartPlayerIndex: number | null;
  readonly takeoverEndPlayerIndex: number | null;
  
  constructor(params: {
    roundNumber: number;
    startTime?: number;
    plays?: readonly RoundPlayRecord[];
    totalScore?: number;
    lastPlay?: Card[] | null;
    lastPlayPlayerIndex?: number | null;
    isFinished?: boolean;
    endTime?: number;
    winnerId?: number;
    winnerName?: string;
    isTakeoverRound?: boolean;
    takeoverStartPlayerIndex?: number | null;
    takeoverEndPlayerIndex?: number | null;
  }) {
    this.roundNumber = params.roundNumber;
    this.startTime = params.startTime ?? Date.now();
    this.plays = Object.freeze([...(params.plays || [])]);
    this.totalScore = params.totalScore ?? 0;
    this.lastPlay = params.lastPlay ?? null;
    this.lastPlayPlayerIndex = params.lastPlayPlayerIndex ?? null;
    this.isFinished = params.isFinished ?? false;
    this.endTime = params.endTime;
    this.winnerId = params.winnerId;
    this.winnerName = params.winnerName;
    this.isTakeoverRound = params.isTakeoverRound ?? false;
    this.takeoverStartPlayerIndex = params.takeoverStartPlayerIndex ?? null;
    this.takeoverEndPlayerIndex = params.takeoverEndPlayerIndex ?? null;
    
    // 冻结对象，确保完全不可变
    Object.freeze(this);
  }
  
  // ========== 更新方法（返回新实例）==========
  
  /**
   * 添加出牌记录（返回新的RoundData）
   */
  addPlay(play: RoundPlayRecord): RoundData {
    return new RoundData({
      ...this,
      plays: [...this.plays, play],
      totalScore: this.totalScore + play.score,
      lastPlay: play.cards,
      lastPlayPlayerIndex: play.playerId
    });
  }
  
  /**
   * 更新接风轮状态（返回新的RoundData）
   */
  updateTakeover(params: {
    isTakeoverRound: boolean;
    takeoverStartPlayerIndex?: number | null;
    takeoverEndPlayerIndex?: number | null;
  }): RoundData {
    return new RoundData({
      ...this,
      isTakeoverRound: params.isTakeoverRound,
      takeoverStartPlayerIndex: params.takeoverStartPlayerIndex ?? this.takeoverStartPlayerIndex,
      takeoverEndPlayerIndex: params.takeoverEndPlayerIndex ?? this.takeoverEndPlayerIndex
    });
  }
  
  /**
   * 标记轮次结束（返回新的RoundData）
   */
  finish(params: {
    winnerId: number;
    winnerName: string;
    endTime?: number;
  }): RoundData {
    return new RoundData({
      ...this,
      isFinished: true,
      winnerId: params.winnerId,
      winnerName: params.winnerName,
      endTime: params.endTime ?? Date.now()
    });
  }
  
  /**
   * 更新最后出牌（返回新的RoundData）
   */
  updateLastPlay(cards: Card[], playerIndex: number): RoundData {
    return new RoundData({
      ...this,
      lastPlay: cards,
      lastPlayPlayerIndex: playerIndex
    });
  }
  
  // ========== 查询方法 ==========
  
  /**
   * 获取轮次持续时间（毫秒）
   */
  getDuration(): number {
    const endTime = this.endTime ?? Date.now();
    return endTime - this.startTime;
  }
  
  /**
   * 获取出牌数量
   */
  getPlayCount(): number {
    return this.plays.length;
  }
  
  /**
   * 获取最后N次出牌
   */
  getLastPlays(count: number): readonly RoundPlayRecord[] {
    return this.plays.slice(-count);
  }
  
  /**
   * 获取指定玩家的所有出牌
   */
  getPlayerPlays(playerIndex: number): readonly RoundPlayRecord[] {
    return this.plays.filter(play => play.playerId === playerIndex);
  }
  
  /**
   * 检查玩家是否出过牌
   */
  hasPlayerPlayed(playerIndex: number): boolean {
    return this.plays.some(play => play.playerId === playerIndex);
  }
  
  // ========== 快照功能 ==========
  
  /**
   * 导出快照
   */
  toSnapshot(): RoundDataSnapshot {
    return {
      roundNumber: this.roundNumber,
      startTime: this.startTime,
      plays: Array.from(this.plays),
      totalScore: this.totalScore,
      lastPlay: this.lastPlay,
      lastPlayPlayerIndex: this.lastPlayPlayerIndex,
      isFinished: this.isFinished,
      endTime: this.endTime,
      winnerId: this.winnerId,
      winnerName: this.winnerName,
      isTakeoverRound: this.isTakeoverRound,
      takeoverStartPlayerIndex: this.takeoverStartPlayerIndex,
      takeoverEndPlayerIndex: this.takeoverEndPlayerIndex
    };
  }
  
  /**
   * 从快照恢复
   */
  static fromSnapshot(snapshot: RoundDataSnapshot): RoundData {
    return new RoundData({
      roundNumber: snapshot.roundNumber,
      startTime: snapshot.startTime,
      plays: snapshot.plays,
      totalScore: snapshot.totalScore,
      lastPlay: snapshot.lastPlay,
      lastPlayPlayerIndex: snapshot.lastPlayPlayerIndex,
      isFinished: snapshot.isFinished,
      endTime: snapshot.endTime,
      winnerId: snapshot.winnerId,
      winnerName: snapshot.winnerName,
      isTakeoverRound: snapshot.isTakeoverRound,
      takeoverStartPlayerIndex: snapshot.takeoverStartPlayerIndex,
      takeoverEndPlayerIndex: snapshot.takeoverEndPlayerIndex
    });
  }
  
  /**
   * 转换为RoundRecord（用于保存到GameState）
   */
  toRoundRecord(): RoundRecord {
    if (!this.isFinished) {
      throw new Error('轮次未结束，无法转换为RoundRecord');
    }
    
    return {
      roundNumber: this.roundNumber,
      plays: Array.from(this.plays),
      totalScore: this.totalScore,
      startTime: this.startTime,
      endTime: this.endTime!,
      winnerId: this.winnerId!,
      winnerName: this.winnerName!
    };
  }
}


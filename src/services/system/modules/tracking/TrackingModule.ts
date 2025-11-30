/**
 * 追踪模块
 * 包装现有的 cardTrackerService
 */

import { SystemModule, SystemContext, ModuleStatus } from '../../types/SystemModule';
import { TrackingConfig } from '../../types/SystemConfig';
import { cardTracker } from '../../../cardTrackerService';
import type { Player, Card, RoundPlayRecord } from '../../../../types/card';
import type { DetailedRoundRecord, PlayerHandSnapshot } from '../../../cardTrackerService';

export class TrackingModule implements SystemModule {
  name = 'tracking';
  dependencies = []; // 无依赖
  
  private config: TrackingConfig | null = null;
  private context: SystemContext | null = null;
  private initialized = false;
  private enabled = true;
  
  async initialize(config: TrackingConfig, context: SystemContext): Promise<void> {
    this.config = config;
    this.context = context;
    this.enabled = config.enabled;
    this.initialized = true;
    
    console.log('[TrackingModule] 追踪模块初始化完成', {
      enabled: this.enabled,
      cardTrackerEnabled: config.cardTracker.enabled
    });
  }
  
  configure(config: Partial<TrackingConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...config };
      this.enabled = this.config.enabled;
    }
  }
  
  async shutdown(): Promise<void> {
    this.initialized = false;
    this.config = null;
    this.context = null;
  }
  
  getStatus(): ModuleStatus {
    return {
      initialized: this.initialized,
      enabled: this.enabled,
    };
  }
  
  isEnabled(): boolean {
    return this.enabled && this.initialized;
  }
  
  /**
   * 初始化追踪器
   */
  initializeTracker(initialHands: Card[][], gameStartTime: number = Date.now()): void {
    if (!this.isEnabled() || !this.config?.cardTracker.enabled) {
      return;
    }
    cardTracker.initialize(initialHands, gameStartTime);
  }
  
  /**
   * 开始新轮次
   */
  startRound(roundNumber: number, players: Player[]): void {
    if (!this.isEnabled() || !this.config?.cardTracker.enabled) {
      return;
    }
    cardTracker.startRound(roundNumber, players);
  }
  
  /**
   * 记录出牌
   */
  recordPlay(roundNumber: number, playRecord: RoundPlayRecord): void {
    if (!this.isEnabled() || !this.config?.cardTracker.enabled) {
      return;
    }
    cardTracker.recordPlay(roundNumber, playRecord);
  }
  
  /**
   * 结束轮次
   */
  endRound(
    roundNumber: number,
    winnerId: number,
    winnerName: string,
    totalScore: number,
    players: Player[]
  ): void {
    if (!this.isEnabled() || !this.config?.cardTracker.enabled) {
      return;
    }
    cardTracker.endRound(roundNumber, winnerId, winnerName, totalScore, players);
  }
  
  /**
   * 获取轮次记录
   */
  getRound(roundNumber: number): DetailedRoundRecord | null {
    if (!this.isEnabled() || !this.config?.cardTracker.enabled) {
      return null;
    }
    return cardTracker.getRound(roundNumber);
  }
  
  /**
   * 获取所有轮次记录
   */
  getAllRounds(): DetailedRoundRecord[] {
    if (!this.isEnabled() || !this.config?.cardTracker.enabled) {
      return [];
    }
    return cardTracker.getAllRounds();
  }
  
  /**
   * 获取游戏统计信息
   */
  getGameStatistics(): any {
    if (!this.isEnabled() || !this.config?.cardTracker.enabled) {
      return null;
    }
    return cardTracker.getGameStatistics();
  }
  
  /**
   * 记录玩家手牌快照
   */
  recordPlayerHandSnapshot(snapshot: PlayerHandSnapshot): void {
    if (!this.isEnabled() || !this.config?.cardTracker.enabled || !this.config?.cardTracker.recordSnapshots) {
      return;
    }
    cardTracker.recordPlayerHandSnapshot(snapshot);
  }
  
  /**
   * 获取追踪器实例（用于需要直接访问的情况）
   */
  getTracker() {
    return cardTracker;
  }
}


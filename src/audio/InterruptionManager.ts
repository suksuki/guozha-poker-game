/**
 * 插嘴管理器
 * 优化 QUICK_JAB 在长吵架中的插入机制
 */

import { Utter, Priority } from './DialogueScheduler';
import { SegmentedPlayback } from './SegmentedPlayback';

export interface InterruptionConfig {
  maxInterruptionsPerQuarrel?: number;  // 每个长吵架最多允许的插嘴次数，默认 2
  interruptionCooldown?: number;  // 插嘴冷却时间（毫秒），默认 1000
  minSegmentGap?: number;  // 最小段间隔（毫秒），允许插嘴的窗口，默认 500
}

/**
 * 插嘴管理器
 * 管理在长吵架播放过程中的插嘴逻辑
 */
export class InterruptionManager {
  private config: Required<InterruptionConfig>;
  private interruptionHistory: Map<string, {
    count: number;
    lastInterruption: number;
  }> = new Map();

  constructor(config: InterruptionConfig = {}) {
    this.config = {
      maxInterruptionsPerQuarrel: config.maxInterruptionsPerQuarrel ?? 2,
      interruptionCooldown: config.interruptionCooldown ?? 1000,
      minSegmentGap: config.minSegmentGap ?? 500,
    };
  }

  /**
   * 检查是否允许插嘴
   * @param targetRoleId 目标角色（正在播放长吵架的角色）
   * @param interrupterRoleId 插嘴角色
   * @param segmentedPlayback 分段播放管理器（用于检查播放状态）
   */
  canInterrupt(
    targetRoleId: string,
    interrupterRoleId: string,
    segmentedPlayback: SegmentedPlayback
  ): boolean {
    // 检查目标角色是否正在播放分段
    if (!segmentedPlayback.isPlaying(targetRoleId)) {
      return false;  // 目标没有在播放，不需要插嘴
    }

    // 检查插嘴历史
    const historyKey = `${targetRoleId}_${interrupterRoleId}`;
    const history = this.interruptionHistory.get(historyKey) || {
      count: 0,
      lastInterruption: 0,
    };

    // 检查冷却时间
    const now = Date.now();
    if (now - history.lastInterruption < this.config.interruptionCooldown) {
      return false;  // 还在冷却中
    }

    // 检查插嘴次数
    if (history.count >= this.config.maxInterruptionsPerQuarrel) {
      return false;  // 已达到最大插嘴次数
    }

    // 检查是否在段间隔中（允许插嘴的窗口）
    const progress = segmentedPlayback.getProgress(targetRoleId);
    if (progress) {
      // 如果刚完成一段，在间隔窗口中，允许插嘴
      // 这里简化处理，实际应该监听段完成事件
      return true;
    }

    return true;
  }

  /**
   * 记录插嘴
   */
  recordInterruption(targetRoleId: string, interrupterRoleId: string): void {
    const historyKey = `${targetRoleId}_${interrupterRoleId}`;
    const history = this.interruptionHistory.get(historyKey) || {
      count: 0,
      lastInterruption: 0,
    };

    history.count++;
    history.lastInterruption = Date.now();

    this.interruptionHistory.set(historyKey, history);
  }

  /**
   * 重置插嘴历史（当长吵架结束时）
   */
  resetInterruptionHistory(targetRoleId: string): void {
    // 清除所有与该角色相关的插嘴历史
    const keysToDelete: string[] = [];
    for (const key of this.interruptionHistory.keys()) {
      if (key.startsWith(`${targetRoleId}_`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.interruptionHistory.delete(key));
  }

  /**
   * 创建插嘴话语
   * @param interrupterRoleId 插嘴角色ID
   * @param text 插嘴文本
   * @param lang 语言
   * @param civility 文明等级
   */
  createInterruptionUtter(
    interrupterRoleId: string,
    text: string,
    lang: string = 'zh',
    civility: number = 1
  ): Utter {
    return {
      roleId: interrupterRoleId,
      text,
      priority: 'QUICK_JAB',  // 插嘴使用 QUICK_JAB 优先级
      civility,
      lang: lang as any,
      // audioBuffer 需要由调用者生成
    };
  }
}

// 单例实例
let interruptionManagerInstance: InterruptionManager | null = null;

/**
 * 获取插嘴管理器单例
 */
export function getInterruptionManager(config?: InterruptionConfig): InterruptionManager {
  if (!interruptionManagerInstance) {
    interruptionManagerInstance = new InterruptionManager(config);
  }
  return interruptionManagerInstance;
}


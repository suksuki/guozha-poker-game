/**
 * 指标收集器
 * 收集和分析AI性能指标
 */

import { Decision } from '../core/types';

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  decisionTime: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  confidence: {
    avg: number;
    distribution: Record<string, number>;
  };
  actionTypes: {
    pass: number;
    play: number;
  };
  moduleUsage: Record<string, number>;
}

/**
 * 指标收集器类
 */
export class MetricsCollector {
  private decisionTimes: number[] = [];
  private confidences: number[] = [];
  private actionCounts = { pass: 0, play: 0 };
  private moduleUsage: Map<string, number> = new Map();
  
  /**
   * 记录决策
   */
  recordDecision(decision: Decision): void {
    // 记录决策时间
    this.decisionTimes.push(decision.computeTime);
    
    // 记录置信度
    this.confidences.push(decision.confidence);
    
    // 记录动作类型
    if (decision.action.type === 'pass') {
      this.actionCounts.pass++;
    } else {
      this.actionCounts.play++;
    }
    
    // 记录模块使用情况
    for (const source of decision.sources) {
      const count = this.moduleUsage.get(source.moduleName) || 0;
      this.moduleUsage.set(source.moduleName, count + 1);
    }
  }
  
  /**
   * 获取指标
   */
  getMetrics(): PerformanceMetrics {
    return {
      decisionTime: this.calculateDecisionTimeMetrics(),
      confidence: this.calculateConfidenceMetrics(),
      actionTypes: { ...this.actionCounts },
      moduleUsage: Object.fromEntries(this.moduleUsage)
    };
  }
  
  /**
   * 重置指标
   */
  reset(): void {
    this.decisionTimes = [];
    this.confidences = [];
    this.actionCounts = { pass: 0, play: 0 };
    this.moduleUsage.clear();
  }
  
  /**
   * 计算决策时间指标
   */
  private calculateDecisionTimeMetrics() {
    if (this.decisionTimes.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    }
    
    const sorted = [...this.decisionTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99)
    };
  }
  
  /**
   * 计算置信度指标
   */
  private calculateConfidenceMetrics() {
    if (this.confidences.length === 0) {
      return {
        avg: 0,
        distribution: {}
      };
    }
    
    const sum = this.confidences.reduce((a, b) => a + b, 0);
    const avg = sum / this.confidences.length;
    
    // 分布统计
    const distribution: Record<string, number> = {
      'low (0-0.3)': 0,
      'medium (0.3-0.7)': 0,
      'high (0.7-1.0)': 0
    };
    
    for (const conf of this.confidences) {
      if (conf < 0.3) {
        distribution['low (0-0.3)']++;
      } else if (conf < 0.7) {
        distribution['medium (0.3-0.7)']++;
      } else {
        distribution['high (0.7-1.0)']++;
      }
    }
    
    return { avg, distribution };
  }
  
  /**
   * 计算百分位数
   */
  private percentile(sortedArray: number[], p: number): number {
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, index)];
  }
}


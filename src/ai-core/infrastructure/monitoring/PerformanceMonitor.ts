/**
 * 性能监控器
 * 专注于AI决策和通信的性能监控
 * 从AIControlCenter的MonitorLayer提取并简化
 */

export interface PerformanceMetric {
  timestamp: number;
  category: 'decision' | 'communication' | 'analysis';
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  avgDecisionTime: number;
  avgCommunicationTime: number;
  successRate: number;
  totalOperations: number;
  recentMetrics: PerformanceMetric[];
}

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;
  
  /**
   * 记录性能指标
   */
  record(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now()
    });
    
    // 限制大小
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }
  
  /**
   * 开始计时
   */
  startTimer(category: string, operation: string): (success?: boolean, metadata?: Record<string, any>) => void {
    const startTime = Date.now();
    
    return (success: boolean = true, metadata?: Record<string, any>) => {
      this.record({
        category: category as any,
        operation,
        duration: Date.now() - startTime,
        success,
        metadata
      });
    };
  }
  
  /**
   * 获取统计信息
   */
  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        avgDecisionTime: 0,
        avgCommunicationTime: 0,
        successRate: 0,
        totalOperations: 0,
        recentMetrics: []
      };
    }
    
    const decisionMetrics = this.metrics.filter(m => m.category === 'decision');
    const commMetrics = this.metrics.filter(m => m.category === 'communication');
    
    const avgDecisionTime = decisionMetrics.length > 0
      ? decisionMetrics.reduce((sum, m) => sum + m.duration, 0) / decisionMetrics.length
      : 0;
    
    const avgCommunicationTime = commMetrics.length > 0
      ? commMetrics.reduce((sum, m) => sum + m.duration, 0) / commMetrics.length
      : 0;
    
    const successCount = this.metrics.filter(m => m.success).length;
    const successRate = successCount / this.metrics.length;
    
    return {
      avgDecisionTime,
      avgCommunicationTime,
      successRate,
      totalOperations: this.metrics.length,
      recentMetrics: this.metrics.slice(-20)
    };
  }
  
  /**
   * 清空指标
   */
  clear(): void {
    this.metrics = [];
  }
  
  /**
   * 导出数据
   */
  export(): string {
    return JSON.stringify(this.metrics);
  }
}

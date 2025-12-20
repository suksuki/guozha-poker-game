/**
 * 监控相关类型
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


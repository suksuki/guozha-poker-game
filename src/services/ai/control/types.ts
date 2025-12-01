/**
 * AI中控系统类型定义
 */

/**
 * AI中控系统配置
 */
export interface AIControlConfig {
  monitor: {
    enabled: boolean;
    samplingRate: number; // 0-1，采样率
    keyPaths: string[]; // 关键路径，100%采样
    maxMemoryUsage: number; // 最大内存使用(MB)
    maxCPUUsage: number; // 最大CPU使用率(0-1)
  };
  analysis: {
    enabled: boolean;
    interval: number; // 分析间隔(ms)
    batchSize: number; // 批量处理大小
    depth: 'shallow' | 'medium' | 'deep'; // 分析深度
  };
  execute: {
    enabled: boolean;
    autoFix: boolean; // 是否自动修复
    requireConfirmation: boolean; // 是否需要确认
    maxRiskLevel: 'low' | 'medium' | 'high'; // 最大风险等级
  };
  evolution: {
    enabled: boolean;
    llmEnabled: boolean; // 是否启用LLM
    algorithmEnabled: boolean; // 是否启用算法
    evolutionInterval: number; // 演化间隔(ms)
  };
}

/**
 * 监控数据
 */
export interface MonitoringData {
  id: string;
  timestamp: number;
  type: 'function' | 'error' | 'performance' | 'userAction' | 'gameState';
  path?: string; // 函数路径或事件路径
  data: any;
  context?: {
    gameState?: any;
    userAction?: string;
    performance?: PerformanceMetrics;
  };
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  duration?: number; // 执行时间(ms)
  memory?: {
    used: number;
    total: number;
    limit: number;
  };
  cpu?: number; // CPU使用率(0-1)
}

/**
 * 分析结果
 */
export interface AnalysisResult {
  id: string;
  type: 'issue' | 'optimization' | 'suggestion' | 'pattern';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  autoFixable: boolean;
  risk: 'low' | 'medium' | 'high';
  data?: any;
  timestamp: number;
}

/**
 * 优化建议
 */
export interface OptimizationSuggestion {
  id: string;
  type: string;
  component?: string;
  description: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  code?: string; // 优化后的代码
  params?: any; // 优化参数
}

/**
 * 问题
 */
export interface Issue {
  id: string;
  type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  data: any;
  timestamp: number;
}

/**
 * 优先级
 */
export interface Priority {
  severity: 'critical' | 'high' | 'medium' | 'low';
  urgency: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  score: number; // 0-100
}

/**
 * 行动
 */
export interface Action {
  type: 'autoFix' | 'suggest' | 'report';
  issue: Issue;
  risk: 'low' | 'medium' | 'high';
  solution?: any;
}

/**
 * 资源状态
 */
export interface ResourceStatus {
  memory: {
    used: number;
    limit: number;
    usage: number; // 0-1
  };
  cpu: {
    used: number;
    limit: number;
    usage: number; // 0-1
  };
}

/**
 * 资源分配
 */
export interface ResourceAllocation {
  monitorFrequency: 'low' | 'medium' | 'high';
  analysisDepth: 'shallow' | 'medium' | 'deep';
  executionEnabled: boolean;
}


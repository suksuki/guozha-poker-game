/**
 * 分析层
 * 负责分析监控数据，识别问题和优化机会
 */

import { AIControlConfig, MonitoringData, AnalysisResult } from '../types';
import { KnowledgeBase } from '../knowledge/KnowledgeBase';
import { EventBus } from '../events/EventBus';
import { LLMAnalyzer } from '../llm/LLMAnalyzer';
import { LLMService } from '../llm/LLMService';

export class AnalyzeLayer {
  private results: Map<string, AnalysisResult> = new Map();
  private dataQueue: MonitoringData[] = [];
  private llmAnalyzer: LLMAnalyzer | null = null;
  
  constructor(
    private config: AIControlConfig,
    private knowledgeBase: KnowledgeBase,
    private eventBus: EventBus,
    llmService?: LLMService | null
  ) {
    // 如果提供了LLM服务且启用，创建LLM分析器
    if (llmService && this.config.evolution.llmEnabled) {
      this.llmAnalyzer = new LLMAnalyzer(llmService);
    }
  }
  
  /**
   * 添加监控数据
   */
  addData(data: MonitoringData): void {
    this.dataQueue.push(data);
    
    // 如果队列达到批量大小，触发分析
    if (this.dataQueue.length >= this.config.analysis.batchSize) {
      requestIdleCallback(() => {
        this.analyze();
      });
    }
  }
  
  /**
   * 执行分析
   */
  async analyze(): Promise<void> {
    if (this.dataQueue.length === 0) {
      return;
    }
    
    // 取出数据
    const data = this.dataQueue.splice(0, this.config.analysis.batchSize);
    
    // 分析数据
    const results = await this.analyzeData(data);
    
    // 存储结果
    results.forEach(result => {
      this.results.set(result.id, result);
    });
    
    // 发送事件
    if (results.length > 0) {
      this.eventBus.emit('analysis:complete', results);
    }
  }
  
  /**
   * 分析数据
   */
  private async analyzeData(data: MonitoringData[]): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    
    // 按类型分组
    const grouped = this.groupByType(data);
    
    // 分析错误
    if (grouped.error) {
      const errorResults = await this.analyzeErrors(grouped.error);
      results.push(...errorResults);
    }
    
    // 分析性能
    if (grouped.performance) {
      const performanceResults = this.analyzePerformance(grouped.performance);
      results.push(...performanceResults);
    }
    
    // 分析函数调用
    if (grouped.function) {
      const functionResults = this.analyzeFunctions(grouped.function);
      results.push(...functionResults);
    }
    
    return results;
  }
  
  /**
   * 按类型分组
   */
  private groupByType(data: MonitoringData[]): Record<string, MonitoringData[]> {
    const grouped: Record<string, MonitoringData[]> = {};
    
    data.forEach(item => {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type].push(item);
    });
    
    return grouped;
  }
  
  /**
   * 分析错误
   */
  private async analyzeErrors(errors: MonitoringData[]): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    
    // 统计错误频率
    const errorCounts = new Map<string, number>();
    errors.forEach(error => {
      const key = error.data?.message || 'unknown';
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });
    
    // 识别重复错误
    for (const [message, count] of errorCounts.entries()) {
      if (count >= 3) { // 出现3次以上
        let recommendation = '检查错误原因并修复';
        
        // 如果启用LLM，使用LLM分析
        if (this.llmAnalyzer && count >= 5) {
          try {
            const analysis = await this.llmAnalyzer.analyzeProblem({
              id: this.generateId(),
              type: 'error',
              description: `重复错误: ${message} (出现${count}次)`,
              severity: count >= 10 ? 'high' : 'medium',
              data: { message, count },
              timestamp: Date.now()
            });
            recommendation = analysis.suggestions.join('; ') || recommendation;
          } catch (error) {
            console.warn('[AnalyzeLayer] LLM分析错误失败:', error);
          }
        }
        
        results.push({
          id: this.generateId(),
          type: 'issue',
          severity: count >= 10 ? 'high' : 'medium',
          description: `重复错误: ${message} (出现${count}次)`,
          recommendation,
          autoFixable: false,
          risk: 'medium',
          data: { message, count },
          timestamp: Date.now()
        });
      }
    }
    
    return results;
  }
  
  /**
   * 分析性能
   */
  private analyzePerformance(performance: MonitoringData[]): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    
    // 找出慢函数
    const slowFunctions = performance
      .filter(p => p.data?.duration && p.data.duration > 100) // 超过100ms
      .sort((a, b) => (b.data.duration || 0) - (a.data.duration || 0))
      .slice(0, 10); // 前10个最慢的
    
    slowFunctions.forEach(func => {
      results.push({
        id: this.generateId(),
        type: 'optimization',
        severity: func.data.duration > 1000 ? 'high' : 'medium',
        description: `慢函数: ${func.path} (${func.data.duration}ms)`,
        recommendation: '优化函数性能，考虑使用缓存或算法优化',
        autoFixable: false,
        risk: 'low',
        data: func.data,
        timestamp: Date.now()
      });
    });
    
    return results;
  }
  
  /**
   * 分析函数调用
   */
  private analyzeFunctions(functions: MonitoringData[]): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    
    // 统计调用频率
    const callCounts = new Map<string, number>();
    functions.forEach(func => {
      const key = func.path || 'unknown';
      callCounts.set(key, (callCounts.get(key) || 0) + 1);
    });
    
    // 识别热点函数
    callCounts.forEach((count, name) => {
      if (count >= 100) { // 调用100次以上
        results.push({
          id: this.generateId(),
          type: 'pattern',
          severity: 'low',
          description: `热点函数: ${name} (调用${count}次)`,
          recommendation: '考虑优化或缓存',
          autoFixable: false,
          risk: 'low',
          data: { name, count },
          timestamp: Date.now()
        });
      }
    });
    
    return results;
  }
  
  /**
   * 获取所有结果
   */
  getResults(): AnalysisResult[] {
    return Array.from(this.results.values());
  }
  
  /**
   * 获取单个结果
   */
  getResult(id: string): AnalysisResult | undefined {
    return this.results.get(id);
  }
  
  /**
   * 生成ID
   */
  private generateId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}


/**
 * 执行层
 * 负责执行优化方案
 */

import { AIControlConfig, AnalysisResult, OptimizationSuggestion } from '../types';
import { DecisionEngine } from '../decision/DecisionEngine';
import { EventBus } from '../events/EventBus';

export class ExecuteLayer {
  constructor(
    private config: AIControlConfig,
    private decisionEngine: DecisionEngine,
    private eventBus: EventBus
  ) {}
  
  /**
   * 执行分析结果
   */
  async execute(result: AnalysisResult): Promise<void> {
    if (!this.config.execute.enabled) {
      return;
    }
    
    // 检查风险等级
    if (this.getRiskLevel(result.risk) > this.getRiskLevel(this.config.execute.maxRiskLevel)) {
      return;
    }
    
    // 检查是否需要确认
    if (this.config.execute.requireConfirmation && result.risk !== 'low') {
      // 这里应该触发UI确认，暂时跳过
      return;
    }
    
    try {
      // 执行优化
      if (result.type === 'optimization' && result.autoFixable) {
        await this.executeOptimization(result);
      } else {
        // 生成建议
        const suggestion = this.generateSuggestion(result);
        this.eventBus.emit('execute:suggestion', suggestion);
      }
      
      // 发送完成事件
      this.eventBus.emit('execute:complete', {
        result,
        success: true,
        timestamp: Date.now()
      });
    } catch (error) {
      this.eventBus.emit('execute:complete', {
        result,
        success: false,
        error,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * 执行优化
   */
  private async executeOptimization(result: AnalysisResult): Promise<void> {
    // 这里应该实现具体的优化逻辑
    // 目前只是占位
  }
  
  /**
   * 生成建议
   */
  private generateSuggestion(result: AnalysisResult): OptimizationSuggestion {
    return {
      id: `suggestion_${Date.now()}`,
      type: result.type,
      description: result.description,
      estimatedImpact: this.mapSeverityToImpact(result.severity),
      risk: result.risk,
      data: result.data
    };
  }
  
  /**
   * 获取风险等级数值
   */
  private getRiskLevel(risk: string): number {
    const levels: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3
    };
    return levels[risk] || 0;
  }
  
  /**
   * 映射严重性到影响
   */
  private mapSeverityToImpact(severity: string): 'low' | 'medium' | 'high' {
    const mapping: Record<string, 'low' | 'medium' | 'high'> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'high'
    };
    return mapping[severity] || 'low';
  }
}


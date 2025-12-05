/**
 * 数据收集器
 * 收集游戏数据用于训练和分析
 */

import { GameState, Decision, TrainingSample, GameOutcome } from '../core/types';
import { ContextManager } from '../core/ContextManager';

/**
 * 数据收集器配置
 */
export interface DataCollectorConfig {
  enabled: boolean;
  autoSave: boolean;
  saveInterval: number;  // ms
  maxSamples: number;
  qualityThreshold?: number;
}

/**
 * 数据收集器类
 */
export class DataCollector {
  private samples: TrainingSample[] = [];
  private config: DataCollectorConfig;
  private contextManager: ContextManager;
  private saveTimer?: NodeJS.Timeout;
  
  constructor(
    contextManager: ContextManager,
    config: Partial<DataCollectorConfig> = {}
  ) {
    this.contextManager = contextManager;
    this.config = {
      enabled: true,
      autoSave: false,
      saveInterval: 60000,  // 1分钟
      maxSamples: 10000,
      ...config
    };
  }
  
  /**
   * 开始收集
   */
  start(): void {
    if (!this.config.enabled) {
      console.warn('DataCollector is disabled');
      return;
    }
    
    if (this.config.autoSave) {
      this.saveTimer = setInterval(() => {
        this.saveSamples();
      }, this.config.saveInterval);
    }
    
    console.log('DataCollector started');
  }
  
  /**
   * 停止收集
   */
  stop(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = undefined;
    }
    
    // 最后保存一次
    if (this.config.autoSave) {
      this.saveSamples();
    }
    
    console.log('DataCollector stopped');
  }
  
  /**
   * 收集单个样本
   */
  collectSample(
    gameState: GameState,
    decision: Decision,
    outcome?: GameOutcome
  ): void {
    if (!this.config.enabled) return;
    
    const sample: TrainingSample = {
      gameState,
      situationAnalysis: {
        handStrength: 0,
        winProbability: 0,
        strategicIntent: 'steady_advance',
        recommendedStyle: 'balanced',
        keyFactors: [],
        threats: [],
        opportunities: []
      },  // TODO: 从决策中提取
      action: decision.action,
      label: 'neutral',  // 默认中性，等游戏结束后更新
      quality: decision.confidence,
      outcome,
      timestamp: Date.now(),
      source: 'real_player',
      weight: 1.0
    };
    
    // 质量过滤
    if (this.config.qualityThreshold && sample.quality < this.config.qualityThreshold) {
      return;
    }
    
    this.samples.push(sample);
    
    // 限制样本数量
    if (this.samples.length > this.config.maxSamples) {
      // 移除最旧的样本
      this.samples.shift();
    }
  }
  
  /**
   * 从上下文收集数据
   */
  collectFromContext(): void {
    const history = this.contextManager.getHistory();
    
    for (const record of history) {
      if (record.decision) {
        this.collectSample(
          record.gameState,
          record.decision
        );
      }
    }
  }
  
  /**
   * 标注游戏结果
   */
  labelGameOutcome(outcome: GameOutcome): void {
    // 根据游戏结果标注最近的样本
    const recentSamples = this.samples.slice(-20);  // 最近20个样本
    
    for (const sample of recentSamples) {
      sample.outcome = outcome;
      
      // 更新标签
      if (outcome.winner === sample.gameState.myPosition) {
        sample.label = 'positive';
        sample.weight = 1.5;  // 获胜的样本权重更高
      } else {
        sample.label = 'negative';
        sample.weight = 0.5;
      }
    }
  }
  
  /**
   * 获取所有样本
   */
  getSamples(): TrainingSample[] {
    return [...this.samples];
  }
  
  /**
   * 获取高质量样本
   */
  getHighQualitySamples(minQuality: number = 0.7): TrainingSample[] {
    return this.samples.filter(s => s.quality >= minQuality);
  }
  
  /**
   * 获取正样本
   */
  getPositiveSamples(): TrainingSample[] {
    return this.samples.filter(s => s.label === 'positive');
  }
  
  /**
   * 获取负样本
   */
  getNegativeSamples(): TrainingSample[] {
    return this.samples.filter(s => s.label === 'negative');
  }
  
  /**
   * 清空样本
   */
  clear(): void {
    this.samples = [];
    console.log('DataCollector cleared');
  }
  
  /**
   * 导出样本
   */
  exportSamples(): string {
    return JSON.stringify(this.samples);
  }
  
  /**
   * 导入样本
   */
  importSamples(data: string): void {
    try {
      const samples = JSON.parse(data);
      this.samples = samples;
      console.log(`Imported ${samples.length} samples`);
    } catch (error) {
      console.error('Failed to import samples:', error);
    }
  }
  
  /**
   * 保存样本到存储
   */
  private async saveSamples(): Promise<void> {
    // TODO: 实现实际的存储逻辑
    // 可以保存到本地文件、数据库或云端
    console.log(`Saving ${this.samples.length} samples...`);
    
    // 示例：保存到localStorage (如果在浏览器环境)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = this.exportSamples();
        window.localStorage.setItem('ai_brain_samples', data);
        console.log('Samples saved to localStorage');
      } catch (error) {
        console.error('Failed to save samples:', error);
      }
    }
  }
  
  /**
   * 从存储加载样本
   */
  async loadSamples(): Promise<void> {
    // TODO: 实现实际的加载逻辑
    console.log('Loading samples...');
    
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = window.localStorage.getItem('ai_brain_samples');
        if (data) {
          this.importSamples(data);
          console.log('Samples loaded from localStorage');
        }
      } catch (error) {
        console.error('Failed to load samples:', error);
      }
    }
  }
  
  /**
   * 获取统计信息
   */
  getStatistics() {
    const total = this.samples.length;
    const positive = this.samples.filter(s => s.label === 'positive').length;
    const negative = this.samples.filter(s => s.label === 'negative').length;
    const neutral = this.samples.filter(s => s.label === 'neutral').length;
    
    const avgQuality = this.samples.length > 0
      ? this.samples.reduce((sum, s) => sum + s.quality, 0) / this.samples.length
      : 0;
    
    return {
      total,
      positive,
      negative,
      neutral,
      avgQuality,
      bySource: this.groupBySource()
    };
  }
  
  /**
   * 按来源分组
   */
  private groupBySource(): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const sample of this.samples) {
      groups[sample.source] = (groups[sample.source] || 0) + 1;
    }
    
    return groups;
  }
}


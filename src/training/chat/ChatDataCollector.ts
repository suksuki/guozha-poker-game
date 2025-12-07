/**
 * 聊天数据收集器
 */

import { ChatTrainingSample } from '../../types/training';

export class ChatDataCollector {
  private samples: ChatTrainingSample[] = [];
  private maxSamples: number = 10000;
  
  /**
   * 收集样本
   */
  async collect(sample: ChatTrainingSample): Promise<void> {
    this.samples.push(sample);
    
    // 限制样本数量
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }
  
  /**
   * 获取所有样本
   */
  getSamples(): ChatTrainingSample[] {
    return [...this.samples];
  }
  
  /**
   * 获取指标
   */
  getMetrics(): {
    avgQuality: number;
    avgRelevance: number;
    avgDiversity: number;
    avgEngagement: number;
  } | null {
    if (this.samples.length === 0) {
      return null;
    }
    
    const total = this.samples.length;
    let totalQuality = 0;
    let totalRelevance = 0;
    let totalDiversity = 0;
    let totalEngagement = 0;
    
    for (const sample of this.samples) {
      totalQuality += sample.labels.quality;
      totalRelevance += sample.labels.relevance;
      totalDiversity += sample.labels.diversity;
      totalEngagement += sample.labels.engagement;
    }
    
    return {
      avgQuality: totalQuality / total,
      avgRelevance: totalRelevance / total,
      avgDiversity: totalDiversity / total,
      avgEngagement: totalEngagement / total
    };
  }
  
  /**
   * 获取最佳Prompt
   */
  getBestPrompt(): string {
    // TODO: 分析样本，找到最佳Prompt
    return '';
  }
  
  /**
   * 清空样本
   */
  clear(): void {
    this.samples = [];
  }
}


/**
 * 决策数据收集器
 */

import { DecisionTrainingSample } from '../../types/training';

export class DecisionDataCollector {
  private samples: DecisionTrainingSample[] = [];
  private maxSamples: number = 10000;
  
  /**
   * 收集样本
   */
  async collect(sample: DecisionTrainingSample): Promise<void> {
    this.samples.push(sample);
    
    // 限制样本数量
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }
  
  /**
   * 获取所有样本
   */
  getSamples(): DecisionTrainingSample[] {
    return [...this.samples];
  }
  
  /**
   * 获取指标
   */
  getMetrics(): {
    avgQuality: number;
    avgConfidence: number;
    winRate: number;
    avgScore: number;
  } | null {
    if (this.samples.length === 0) {
      return null;
    }
    
    const total = this.samples.length;
    let totalQuality = 0;
    let totalConfidence = 0;
    let wins = 0;
    let totalScore = 0;
    
    for (const sample of this.samples) {
      if (sample.llmEvaluation) {
        totalQuality += sample.llmEvaluation.quality;
      }
      totalConfidence += sample.decision.confidence;
      if (sample.outcome.gameWon) {
        wins++;
      }
      totalScore += sample.outcome.roundScore;
    }
    
    return {
      avgQuality: totalQuality / total,
      avgConfidence: totalConfidence / total,
      winRate: wins / total,
      avgScore: totalScore / total
    };
  }
  
  /**
   * 获取最佳参数
   */
  getBestParams(): any {
    // TODO: 分析样本，找到最佳MCTS参数
    return {
      iterations: 100,
      explorationConstant: 1.414,
      simulationDepth: 20
    };
  }
  
  /**
   * 清空样本
   */
  clear(): void {
    this.samples = [];
  }
}


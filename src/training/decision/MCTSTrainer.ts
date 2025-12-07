/**
 * MCTS训练器
 * 通过分析训练样本优化MCTS参数
 */

import { DecisionTrainingSample, MCTSTrainingParams } from '../../types/training';
import { LLMDecisionEvaluator } from './LLMDecisionEvaluator';

export interface MCTSTrainerConfig {
  llmEvaluator?: LLMDecisionEvaluator;
  learningRate?: number;  // 学习率，用于参数调整
}

export class MCTSTrainer {
  private config: MCTSTrainerConfig;
  private currentParams: MCTSTrainingParams;
  private trainingHistory: {
    params: MCTSTrainingParams;
    performance: number;
    timestamp: number;
  }[] = [];
  
  constructor(config: MCTSTrainerConfig = {}) {
    this.config = {
      learningRate: 0.1,
      ...config
    };
    
    // 初始化默认参数
    this.currentParams = {
      iterations: 100,
      explorationConstant: 1.414,
      simulationDepth: 20,
      perfectInformation: false
    };
  }
  
  /**
   * 训练MCTS
   */
  async train(samples: DecisionTrainingSample[]): Promise<void> {
    if (samples.length === 0) {
      return;
    }
    
    console.log(`[MCTSTrainer] 开始训练，样本数: ${samples.length}`);
    
    // 1. 分析样本性能
    const performance = await this.analyzePerformance(samples);
    
    // 2. 如果有LLM评估器，使用LLM评估决策质量
    if (this.config.llmEvaluator) {
      await this.evaluateWithLLM(samples);
    }
    
    // 3. 优化参数
    const optimizedParams = this.optimizeParams(samples, performance);
    
    // 4. 更新参数
    this.currentParams = optimizedParams;
    
    // 5. 记录训练历史
    this.trainingHistory.push({
      params: optimizedParams,
      performance,
      timestamp: Date.now()
    });
    
    // 限制历史记录数量
    if (this.trainingHistory.length > 100) {
      this.trainingHistory.shift();
    }
    
    console.log(`[MCTSTrainer] 训练完成，新参数:`, optimizedParams);
  }
  
  /**
   * 分析样本性能
   */
  private async analyzePerformance(samples: DecisionTrainingSample[]): Promise<number> {
    // 计算平均胜率
    const wins = samples.filter(s => s.outcome.gameWon).length;
    const winRate = wins / samples.length;
    
    // 计算平均得分
    const avgScore = samples.reduce((sum, s) => sum + s.outcome.roundScore, 0) / samples.length;
    
    // 计算平均决策质量（如果有LLM评估）
    let avgQuality = 0.5;
    const qualitySamples = samples.filter(s => s.llmEvaluation);
    if (qualitySamples.length > 0) {
      avgQuality = qualitySamples.reduce((sum, s) => 
        sum + (s.llmEvaluation?.quality || 0.5), 0) / qualitySamples.length;
    }
    
    // 综合性能分数
    const performance = winRate * 0.5 + (avgScore / 100) * 0.3 + avgQuality * 0.2;
    
    return Math.max(0, Math.min(1, performance));
  }
  
  /**
   * 使用LLM评估决策
   */
  private async evaluateWithLLM(samples: DecisionTrainingSample[]): Promise<void> {
    if (!this.config.llmEvaluator) {
      return;
    }
    
    // 批量评估（只评估没有LLM评估的样本）
    const unevaluatedSamples = samples.filter(s => !s.llmEvaluation);
    
    if (unevaluatedSamples.length === 0) {
      return;
    }
    
    console.log(`[MCTSTrainer] 使用LLM评估${unevaluatedSamples.length}个样本`);
    
    // 批量评估
    const evaluations = await this.config.llmEvaluator.evaluateBatch(unevaluatedSamples);
    
    // 更新样本
    for (let i = 0; i < unevaluatedSamples.length; i++) {
      unevaluatedSamples[i].llmEvaluation = evaluations[i];
    }
  }
  
  /**
   * 优化参数
   */
  private optimizeParams(
    samples: DecisionTrainingSample[],
    performance: number
  ): MCTSTrainingParams {
    const params = { ...this.currentParams };
    const learningRate = this.config.learningRate || 0.1;
    
    // 分析参数对性能的影响
    const paramAnalysis = this.analyzeParams(samples);
    
    // 根据分析结果调整参数
    if (paramAnalysis.iterationsImpact > 0) {
      // 如果迭代次数对性能有正面影响，增加迭代次数
      params.iterations = Math.min(1000, Math.max(50, 
        params.iterations + Math.round(paramAnalysis.iterationsImpact * learningRate * 100)
      ));
    }
    
    if (paramAnalysis.explorationImpact !== 0) {
      // 调整探索常数
      params.explorationConstant = Math.max(0.5, Math.min(2.0,
        params.explorationConstant + paramAnalysis.explorationImpact * learningRate
      ));
    }
    
    if (paramAnalysis.depthImpact > 0) {
      // 调整模拟深度
      params.simulationDepth = Math.min(50, Math.max(10,
        params.simulationDepth + Math.round(paramAnalysis.depthImpact * learningRate * 10)
      ));
    }
    
    return params;
  }
  
  /**
   * 分析参数对性能的影响
   */
  private analyzeParams(samples: DecisionTrainingSample[]): {
    iterationsImpact: number;
    explorationImpact: number;
    depthImpact: number;
  } {
    // 按参数分组分析
    const paramGroups = new Map<string, DecisionTrainingSample[]>();
    
    for (const sample of samples) {
      const key = `${sample.mctsParams.iterations}-${sample.mctsParams.explorationConstant}-${sample.mctsParams.simulationDepth}`;
      if (!paramGroups.has(key)) {
        paramGroups.set(key, []);
      }
      paramGroups.get(key)!.push(sample);
    }
    
    // 计算每组平均性能
    const groupPerformance: Array<{
      params: MCTSTrainingParams;
      performance: number;
    }> = [];
    
    for (const [key, groupSamples] of paramGroups) {
      const wins = groupSamples.filter(s => s.outcome.gameWon).length;
      const winRate = wins / groupSamples.length;
      const avgQuality = groupSamples
        .filter(s => s.llmEvaluation)
        .reduce((sum, s) => sum + (s.llmEvaluation?.quality || 0.5), 0) / 
        Math.max(1, groupSamples.filter(s => s.llmEvaluation).length);
      
      const performance = winRate * 0.7 + avgQuality * 0.3;
      
      groupPerformance.push({
        params: groupSamples[0].mctsParams,
        performance
      });
    }
    
    // 找到最佳参数组合
    groupPerformance.sort((a, b) => b.performance - a.performance);
    const best = groupPerformance[0];
    const current = groupPerformance.find(g => 
      g.params.iterations === this.currentParams.iterations &&
      g.params.explorationConstant === this.currentParams.explorationConstant &&
      g.params.simulationDepth === this.currentParams.simulationDepth
    );
    
    // 计算参数调整方向
    const iterationsImpact = best.params.iterations > (current?.params.iterations || 100) ? 1 : -1;
    const explorationImpact = best.params.explorationConstant - (current?.params.explorationConstant || 1.414);
    const depthImpact = best.params.simulationDepth > (current?.params.simulationDepth || 20) ? 1 : -1;
    
    return {
      iterationsImpact,
      explorationImpact,
      depthImpact
    };
  }
  
  /**
   * 获取优化后的参数
   */
  getOptimizedParams(): MCTSTrainingParams {
    return { ...this.currentParams };
  }
  
  /**
   * 设置参数
   */
  setParams(params: MCTSTrainingParams): void {
    this.currentParams = params;
  }
  
  /**
   * 获取训练历史
   */
  getTrainingHistory(): typeof this.trainingHistory {
    return [...this.trainingHistory];
  }
}


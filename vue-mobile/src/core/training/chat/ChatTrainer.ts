/**
 * 聊天训练器
 * 通过分析训练样本优化聊天Prompt和参数
 */

import { ChatTrainingSample } from '../../types/training';
import { ChatQualityEvaluator } from './ChatQualityEvaluator';
import { PromptOptimizer } from './PromptOptimizer';

export interface ChatTrainerConfig {
  qualityEvaluator: ChatQualityEvaluator;
  promptOptimizer?: PromptOptimizer;
}

export class ChatTrainer {
  private config: ChatTrainerConfig;
  private currentPrompt: string = '';
  private trainingHistory: {
    prompt: string;
    quality: number;
    timestamp: number;
  }[] = [];

  constructor(config: ChatTrainerConfig) {
    this.config = config;
  }

  /**
   * 训练聊天
   */
  async train(samples: ChatTrainingSample[]): Promise<void> {
    if (samples.length === 0) {
      return;
    }


    // 1. 评估样本质量
    const qualityMetrics = await this.config.qualityEvaluator.evaluateBatch(samples);
    const avgQuality = qualityMetrics.reduce((sum, m) => sum + m.overall, 0) / qualityMetrics.length;


    // 2. 如果有Prompt优化器，优化Prompt
    if (this.config.promptOptimizer) {
      await this.optimizePrompt(samples);
    }

    // 3. 分析高质量样本的特征
    const highQualitySamples = this.identifyHighQualitySamples(samples, qualityMetrics);
    this.analyzeHighQualityPatterns(highQualitySamples);

    // 4. 记录训练历史
    this.trainingHistory.push({
      prompt: this.currentPrompt,
      quality: avgQuality,
      timestamp: Date.now()
    });

    // 限制历史记录数量
    if (this.trainingHistory.length > 100) {
      this.trainingHistory.shift();
    }

  }

  /**
   * 优化Prompt
   */
  private async optimizePrompt(samples: ChatTrainingSample[]): Promise<void> {
    if (!this.config.promptOptimizer) {
      return;
    }

    // 测试不同的Prompt变体
    const results = await this.config.promptOptimizer.testVariants(samples);

    // 选择最优Prompt
    const bestPrompt = this.config.promptOptimizer.selectBestPrompt();
    this.currentPrompt = bestPrompt;

  }

  /**
   * 识别高质量样本
   */
  private identifyHighQualitySamples(
    samples: ChatTrainingSample[],
    metrics: any[]
  ): ChatTrainingSample[] {
    const threshold = 0.7; // 质量阈值
    const highQuality: ChatTrainingSample[] = [];

    for (let i = 0; i < samples.length; i++) {
      if (metrics[i] && metrics[i].overall >= threshold) {
        highQuality.push(samples[i]);
      }
    }

    return highQuality;
  }

  /**
   * 分析高质量样本的模式
   */
  private analyzeHighQualityPatterns(samples: ChatTrainingSample[]): void {
    if (samples.length === 0) {
      return;
    }

    // 分析触发类型分布
    const triggerCounts = new Map<string, number>();
    for (const sample of samples) {
      triggerCounts.set(sample.trigger, (triggerCounts.get(sample.trigger) || 0) + 1);
    }

    // 分析消息长度分布
    const lengths = samples.map(s => s.llmResponse.processed.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    // 分析常用词汇
    const words = new Map<string, number>();
    for (const sample of samples) {
      const content = sample.llmResponse.processed;
      const tokens = content.split('');
      for (const token of tokens) {
        words.set(token, (words.get(token) || 0) + 1);
      }
    }
  }

  /**
   * 获取优化后的Prompt
   */
  getOptimizedPrompt(): string {
    return this.currentPrompt;
  }

  /**
   * 设置Prompt
   */
  setPrompt(prompt: string): void {
    this.currentPrompt = prompt;
  }

  /**
   * 获取训练历史
   */
  getTrainingHistory(): typeof this.trainingHistory {
    return [...this.trainingHistory];
  }
}


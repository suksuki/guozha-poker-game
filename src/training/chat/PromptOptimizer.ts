/**
 * Prompt优化器
 * 通过A/B测试找到最优的Prompt模板
 */

import { ChatTrainingSample, PromptTestResult, ChatQualityMetrics } from '../../types/training';
import { ChatQualityEvaluator } from './ChatQualityEvaluator';

export interface PromptVariant {
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

export interface PromptOptimizerConfig {
  variants: PromptVariant[];
  testSamples: number;  // 每个变体测试的样本数
  evaluator: ChatQualityEvaluator;
}

export class PromptOptimizer {
  private config: PromptOptimizerConfig;
  private testResults: PromptTestResult[] = [];
  
  constructor(config: PromptOptimizerConfig) {
    this.config = config;
  }
  
  /**
   * 测试Prompt变体
   */
  async testVariants(samples: ChatTrainingSample[]): Promise<PromptTestResult[]> {
    const results: PromptTestResult[] = [];
    
    for (const variant of this.config.variants) {
      console.log(`[PromptOptimizer] 测试变体: ${variant.name}`);
      
      const result = await this.testVariant(variant, samples);
      results.push(result);
    }
    
    this.testResults = results;
    return results;
  }
  
  /**
   * 测试单个Prompt变体
   */
  private async testVariant(
    variant: PromptVariant,
    samples: ChatTrainingSample[]
  ): Promise<PromptTestResult> {
    // 选择测试样本
    const testSamples = this.selectTestSamples(samples, this.config.testSamples);
    
    // 为每个样本生成聊天（使用该Prompt变体）
    const generatedSamples: ChatTrainingSample[] = [];
    const latencies: number[] = [];
    
    for (const sample of testSamples) {
      const startTime = Date.now();
      
      // 生成聊天（这里需要调用实际的LLM生成逻辑）
      // TODO: 集成实际的LLM生成
      const generatedSample = await this.generateWithPrompt(sample, variant);
      
      const latency = Date.now() - startTime;
      latencies.push(latency);
      
      generatedSamples.push(generatedSample);
    }
    
    // 评估质量
    const metrics = await this.evaluateSamples(generatedSamples);
    
    return {
      prompt: variant.systemPrompt + '\n' + variant.userPromptTemplate,
      metrics,
      samples: generatedSamples,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length
    };
  }
  
  /**
   * 选择测试样本
   */
  private selectTestSamples(samples: ChatTrainingSample[], count: number): ChatTrainingSample[] {
    if (samples.length <= count) {
      return samples;
    }
    
    // 随机选择
    const selected: ChatTrainingSample[] = [];
    const indices = new Set<number>();
    
    while (selected.length < count && indices.size < samples.length) {
      const index = Math.floor(Math.random() * samples.length);
      if (!indices.has(index)) {
        indices.add(index);
        selected.push(samples[index]);
      }
    }
    
    return selected;
  }
  
  /**
   * 使用Prompt生成聊天
   */
  private async generateWithPrompt(
    sample: ChatTrainingSample,
    variant: PromptVariant
  ): Promise<ChatTrainingSample> {
    // TODO: 集成实际的LLM生成逻辑
    // 这里返回一个模拟的样本
    return {
      ...sample,
      prompt: {
        systemPrompt: variant.systemPrompt,
        userPrompt: this.buildUserPrompt(sample, variant.userPromptTemplate),
        fullPrompt: variant.systemPrompt + '\n' + this.buildUserPrompt(sample, variant.userPromptTemplate)
      },
      llmResponse: {
        raw: '模拟响应',
        processed: '模拟聊天内容',
        tokens: 10,
        latency: 100
      }
    };
  }
  
  /**
   * 构建用户Prompt
   */
  private buildUserPrompt(sample: ChatTrainingSample, template: string): string {
    const { gameState, trigger, player } = sample;
    
    return template
      .replace('{{gameState}}', JSON.stringify(gameState))
      .replace('{{trigger}}', trigger)
      .replace('{{player}}', JSON.stringify(player));
  }
  
  /**
   * 评估样本质量
   */
  private async evaluateSamples(samples: ChatTrainingSample[]): Promise<ChatQualityMetrics> {
    const metrics: ChatQualityMetrics = {
      relevance: 0,
      diversity: 0,
      engagement: 0,
      appropriateness: 0,
      overall: 0
    };
    
    // 批量评估
    const results = await this.config.evaluator.evaluateBatch(samples);
    
    // 计算平均值
    if (results.length > 0) {
      metrics.relevance = results.reduce((sum, r) => sum + r.relevance, 0) / results.length;
      metrics.diversity = results.reduce((sum, r) => sum + r.diversity, 0) / results.length;
      metrics.engagement = results.reduce((sum, r) => sum + r.engagement, 0) / results.length;
      metrics.appropriateness = results.reduce((sum, r) => sum + r.appropriateness, 0) / results.length;
      metrics.overall = results.reduce((sum, r) => sum + r.overall, 0) / results.length;
    }
    
    return metrics;
  }
  
  /**
   * 选择最优Prompt
   */
  selectBestPrompt(): string {
    if (this.testResults.length === 0) {
      throw new Error('没有测试结果，请先运行testVariants');
    }
    
    // 按综合分数排序
    this.testResults.sort((a, b) => b.metrics.overall - a.metrics.overall);
    
    return this.testResults[0].prompt;
  }
  
  /**
   * 获取测试结果
   */
  getTestResults(): PromptTestResult[] {
    return [...this.testResults];
  }
  
  /**
   * 获取最优Prompt的详细信息
   */
  getBestPromptDetails(): PromptTestResult | null {
    if (this.testResults.length === 0) {
      return null;
    }
    
    this.testResults.sort((a, b) => b.metrics.overall - a.metrics.overall);
    return this.testResults[0];
  }
}


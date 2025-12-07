/**
 * 聊天质量评估器
 * 自动评估和LLM辅助评估聊天消息质量
 */

import { ChatTrainingSample, ChatQualityMetrics } from '../../types/training';

export interface ChatQualityEvaluatorConfig {
  autoEvaluation: boolean;
  llmEvaluation?: {
    enabled: boolean;
    endpoint?: string;
    model?: string;
    timeout?: number;
  };
}

export class ChatQualityEvaluator {
  private config: ChatQualityEvaluatorConfig;
  private history: string[] = []; // 历史消息，用于计算多样性
  private maxHistory: number = 100;
  
  constructor(config: ChatQualityEvaluatorConfig) {
    this.config = {
      autoEvaluation: true,
      ...config
    };
  }
  
  /**
   * 评估聊天质量
   */
  async evaluate(sample: ChatTrainingSample): Promise<ChatQualityMetrics> {
    const metrics: ChatQualityMetrics = {
      relevance: 0,
      diversity: 0,
      engagement: 0,
      appropriateness: 0,
      overall: 0
    };
    
    // 自动评估
    if (this.config.autoEvaluation) {
      const autoMetrics = this.autoEvaluate(sample);
      Object.assign(metrics, autoMetrics);
    }
    
    // LLM辅助评估（如果启用）
    if (this.config.llmEvaluation?.enabled) {
      try {
        const llmMetrics = await this.llmEvaluate(sample);
        // 综合自动评估和LLM评估
        metrics.relevance = (metrics.relevance + llmMetrics.relevance) / 2;
        metrics.engagement = (metrics.engagement + llmMetrics.engagement) / 2;
        metrics.appropriateness = (metrics.appropriateness + llmMetrics.appropriateness) / 2;
      } catch (error) {
        console.warn('[ChatQualityEvaluator] LLM评估失败，使用自动评估:', error);
      }
    }
    
    // 计算综合分数
    metrics.overall = (
      metrics.relevance * 0.3 +
      metrics.diversity * 0.2 +
      metrics.engagement * 0.3 +
      metrics.appropriateness * 0.2
    );
    
    // 更新历史
    this.history.push(sample.llmResponse.processed);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    return metrics;
  }
  
  /**
   * 批量评估
   */
  async evaluateBatch(samples: ChatTrainingSample[]): Promise<ChatQualityMetrics[]> {
    const results: ChatQualityMetrics[] = [];
    
    for (const sample of samples) {
      const metrics = await this.evaluate(sample);
      results.push(metrics);
    }
    
    return results;
  }
  
  /**
   * 自动评估（基于规则）
   */
  private autoEvaluate(sample: ChatTrainingSample): ChatQualityMetrics {
    const content = sample.llmResponse.processed;
    
    // 相关性：检查是否包含游戏关键词
    const relevance = this.calculateRelevance(sample);
    
    // 多样性：检查与历史消息的相似度
    const diversity = this.calculateDiversity(content);
    
    // 趣味性：检查是否有趣（长度、语气词等）
    const engagement = this.calculateEngagement(content);
    
    // 合适性：检查长度、时机等
    const appropriateness = this.calculateAppropriateness(sample);
    
    return {
      relevance,
      diversity,
      engagement,
      appropriateness,
      overall: 0 // 由evaluate方法计算
    };
  }
  
  /**
   * 计算相关性
   */
  private calculateRelevance(sample: ChatTrainingSample): number {
    const content = sample.llmResponse.processed.toLowerCase();
    const gameKeywords = [
      '牌', '出', '要', '炸', '墩', '分', '赢', '输', '好', '差',
      'pass', 'play', 'card', 'bomb', 'win', 'lose'
    ];
    
    // 检查是否包含游戏关键词
    const keywordCount = gameKeywords.filter(kw => content.includes(kw)).length;
    const keywordScore = Math.min(1, keywordCount / 3);
    
    // 检查是否与游戏状态相关
    const stateRelevance = this.checkStateRelevance(sample);
    
    return (keywordScore * 0.6 + stateRelevance * 0.4);
  }
  
  /**
   * 检查与游戏状态的相关性
   */
  private checkStateRelevance(sample: ChatTrainingSample): number {
    const { gameState, trigger } = sample;
    const content = sample.llmResponse.processed.toLowerCase();
    
    // 根据触发类型检查相关性
    if (trigger === 'after_play') {
      // 出牌后应该提到牌或游戏
      if (content.includes('牌') || content.includes('出') || content.includes('好')) {
        return 0.8;
      }
    } else if (trigger === 'after_pass') {
      // 要不起后应该提到要不起或等待
      if (content.includes('要') || content.includes('不') || content.includes('等')) {
        return 0.8;
      }
    } else if (trigger === 'game_event') {
      // 游戏事件应该与事件相关
      return 0.7;
    }
    
    return 0.5;
  }
  
  /**
   * 计算多样性
   */
  private calculateDiversity(content: string): number {
    if (this.history.length === 0) {
      return 1.0; // 第一条消息，多样性最高
    }
    
    // 计算与历史消息的相似度
    const similarities = this.history.map(hist => this.calculateSimilarity(content, hist));
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    
    // 多样性 = 1 - 平均相似度
    return Math.max(0, 1 - avgSimilarity);
  }
  
  /**
   * 计算两个字符串的相似度（简单版）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split('');
    const words2 = str2.split('');
    
    // 计算共同字符数
    const common = words1.filter(w => words2.includes(w)).length;
    const total = Math.max(words1.length, words2.length);
    
    return total > 0 ? common / total : 0;
  }
  
  /**
   * 计算趣味性
   */
  private calculateEngagement(content: string): number {
    let score = 0.5;
    
    // 长度合适（5-20字）
    const length = content.length;
    if (length >= 5 && length <= 20) {
      score += 0.2;
    }
    
    // 包含语气词
    const emotionWords = ['哈', '啊', '哦', '哇', '嘿', '哈', '！', '?', '!'];
    if (emotionWords.some(w => content.includes(w))) {
      score += 0.2;
    }
    
    // 包含感叹号
    if (content.includes('！') || content.includes('!')) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }
  
  /**
   * 计算合适性
   */
  private calculateAppropriateness(sample: ChatTrainingSample): number {
    let score = 0.5;
    const content = sample.llmResponse.processed;
    
    // 长度合适
    const length = content.length;
    if (length >= 3 && length <= 25) {
      score += 0.3;
    } else if (length > 25) {
      score -= 0.2; // 太长不合适
    }
    
    // 无冗余表达
    const redundantPhrases = ['好的，', '我觉得', '其实', '对吧', '是吧'];
    if (!redundantPhrases.some(phrase => content.includes(phrase))) {
      score += 0.2;
    }
    
    return Math.min(1, Math.max(0, score));
  }
  
  /**
   * LLM辅助评估
   */
  private async llmEvaluate(sample: ChatTrainingSample): Promise<Partial<ChatQualityMetrics>> {
    if (!this.config.llmEvaluation?.endpoint) {
      throw new Error('LLM endpoint未配置');
    }
    
    const prompt = this.buildEvaluationPrompt(sample);
    
    const response = await fetch(this.config.llmEvaluation.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.llmEvaluation.model || 'qwen2.5:3b',
        messages: [
          {
            role: 'system',
            content: '你是一个聊天质量评估专家。请用JSON格式返回评估结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        stream: false
      }),
      signal: AbortSignal.timeout(this.config.llmEvaluation.timeout || 30000)
    });
    
    if (!response.ok) {
      throw new Error(`LLM请求失败: ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.message?.content || data.content || JSON.stringify(data);
    
    return this.parseLLMResponse(content);
  }
  
  /**
   * 构建评估Prompt
   */
  private buildEvaluationPrompt(sample: ChatTrainingSample): string {
    const { gameState, trigger, llmResponse } = sample;
    
    return `评估以下聊天消息的质量：

## 游戏场景
- 当前轮次：${gameState.round}
- 游戏阶段：${gameState.phase}
- 触发类型：${trigger}

## 聊天消息
"${llmResponse.processed}"

## 任务
请从以下维度评估（0-1分）：
1. 相关性：是否贴合游戏场景
2. 趣味性：是否有趣、生动
3. 合适性：时机和内容是否合适

请用JSON格式返回：
{
  "relevance": 0.9,
  "engagement": 0.8,
  "appropriateness": 0.85,
  "reasoning": "这个聊天..."
}`;
  }
  
  /**
   * 解析LLM响应
   */
  private parseLLMResponse(response: string): Partial<ChatQualityMetrics> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          relevance: Math.max(0, Math.min(1, parsed.relevance || 0.5)),
          engagement: Math.max(0, Math.min(1, parsed.engagement || 0.5)),
          appropriateness: Math.max(0, Math.min(1, parsed.appropriateness || 0.5))
        };
      }
    } catch (error) {
      console.warn('[ChatQualityEvaluator] 解析LLM响应失败:', error);
    }
    
    return {
      relevance: 0.5,
      engagement: 0.5,
      appropriateness: 0.5
    };
  }
  
  /**
   * 清空历史
   */
  clearHistory(): void {
    this.history = [];
  }
}


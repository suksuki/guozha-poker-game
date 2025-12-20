/**
 * LLM决策评估器
 * 使用LLM评估MCTS决策的质量
 */

import { DecisionTrainingSample } from '../../types/training';
import { Card, Play } from '@/core/types/card';

export interface LLMEvaluationResult {
  quality: number;          // 0-1分
  reasoning: string;
  risks: string[];
  opportunities: string[];
  suggestions: string[];
}

export interface LLMDecisionEvaluatorConfig {
  enabled: boolean;
  endpoint?: string;
  model?: string;
  timeout?: number;
  temperature?: number;
}

export class LLMDecisionEvaluator {
  private config: LLMDecisionEvaluatorConfig;
  private cache: Map<string, LLMEvaluationResult> = new Map();

  constructor(config: LLMDecisionEvaluatorConfig) {
    this.config = {
      endpoint: 'http://localhost:11434/api/generate',
      model: 'qwen2.5:3b',
      timeout: 30000,
      temperature: 0.3,
      ...config
    };
  }

  /**
   * 评估决策质量
   */
  async evaluateDecision(sample: DecisionTrainingSample): Promise<LLMEvaluationResult> {
    if (!this.config.enabled) {
      return this.createDefaultEvaluation();
    }

    // 检查缓存
    const cacheKey = this.generateCacheKey(sample);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // 构建Prompt
      const prompt = this.buildEvaluationPrompt(sample);

      // 调用LLM
      const response = await this.callLLM(prompt);

      // 解析响应
      const evaluation = this.parseResponse(response);

      // 缓存结果
      this.cache.set(cacheKey, evaluation);

      return evaluation;
    } catch (error) {
      return this.createDefaultEvaluation();
    }
  }

  /**
   * 批量评估决策
   */
  async evaluateBatch(samples: DecisionTrainingSample[]): Promise<LLMEvaluationResult[]> {
    const results: LLMEvaluationResult[] = [];

    for (const sample of samples) {
      const result = await this.evaluateDecision(sample);
      results.push(result);
    }

    return results;
  }

  /**
   * 构建评估Prompt
   */
  private buildEvaluationPrompt(sample: DecisionTrainingSample): string {
    const { gameState, decision, mctsParams } = sample;

    return `你是一个过炸牌游戏专家，需要评估AI玩家的决策质量。

## 游戏状态
- 当前手牌：${this.formatCards(gameState.hand)}
- 上家出牌：${gameState.lastPlay ? this.formatPlay(gameState.lastPlay) : '无'}
- 当前轮次：${gameState.round}
- 当前得分：${gameState.scores.join(', ')}
- 玩家数量：${gameState.playerCount}
- 游戏阶段：${gameState.phase}

## AI决策
- 出牌：${this.formatCards(decision.action)}
- 决策理由：${decision.reasoning}
- MCTS评分：${decision.mctsScore}
- 置信度：${decision.confidence}

## MCTS参数
- 迭代次数：${mctsParams.iterations}
- 探索常数：${mctsParams.explorationConstant}
- 模拟深度：${mctsParams.simulationDepth}

## 任务
请评估这个决策的质量，并给出：
1. 质量评分（0-1分，1分最好）
2. 决策合理性分析
3. 潜在风险/机会
4. 改进建议（如果有）

请用JSON格式返回：
{
  "quality": 0.85,
  "reasoning": "这个决策...",
  "risks": ["风险1", "风险2"],
  "opportunities": ["机会1"],
  "suggestions": ["建议1", "建议2"]
}`;
  }

  /**
   * 调用LLM
   */
  private async callLLM(prompt: string): Promise<string> {
    if (!this.config.endpoint) {
      throw new Error('LLM endpoint未配置');
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'qwen2.5:3b',
        messages: [
          {
            role: 'system',
            content: '你是一个过炸牌游戏专家，擅长评估游戏决策质量。请用JSON格式返回评估结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature || 0.3,
        stream: false
      }),
      signal: AbortSignal.timeout(this.config.timeout || 30000)
    });

    if (!response.ok) {
      throw new Error(`LLM请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || data.content || JSON.stringify(data);
  }

  /**
   * 解析LLM响应
   */
  private parseResponse(response: string): LLMEvaluationResult {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          quality: Math.max(0, Math.min(1, parsed.quality || 0.5)),
          reasoning: parsed.reasoning || '无分析',
          risks: Array.isArray(parsed.risks) ? parsed.risks : [],
          opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
        };
      }
    } catch (error) {
    }

    // 如果解析失败，尝试从文本中提取质量分数
    const qualityMatch = response.match(/质量[：:]\s*([0-9.]+)/);
    const quality = qualityMatch ? parseFloat(qualityMatch[1]) : 0.5;

    return {
      quality: Math.max(0, Math.min(1, quality)),
      reasoning: response.substring(0, 200),
      risks: [],
      opportunities: [],
      suggestions: []
    };
  }

  /**
   * 创建默认评估
   */
  private createDefaultEvaluation(): LLMEvaluationResult {
    return {
      quality: 0.5,
      reasoning: 'LLM评估未启用',
      risks: [],
      opportunities: [],
      suggestions: []
    };
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(sample: DecisionTrainingSample): string {
    const handStr = sample.gameState.hand.map(c => `${c.rank}-${c.suit}`).join(',');
    const actionStr = sample.decision.action.map(c => `${c.rank}-${c.suit}`).join(',');
    return `${handStr}|${actionStr}|${sample.gameState.round}`;
  }

  /**
   * 格式化牌
   */
  private formatCards(cards: Card[]): string {
    return cards.map(c => {
      const rankNum = c.rank as number;
      if (rankNum === 16) return '小王';
      if (rankNum === 17) return '大王';
      const rankNames: Record<number, string> = { 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2' };
      const suitNames: Record<string, string> = { 'spades': '♠', 'hearts': '♥', 'clubs': '♣', 'diamonds': '♦' };
      return `${suitNames[c.suit] ?? '?'}${rankNames[rankNum] ?? rankNum}`;
    }).join(' ');
  }

  /**
   * 格式化出牌
   */
  private formatPlay(play: Play | null): string {
    if (!play) return '无';
    return `${play.type} - ${this.formatCards(play.cards)}`;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 检查LLM是否可用
   */
  async checkAvailability(): Promise<boolean> {
    if (!this.config.enabled || !this.config.endpoint) {
      return false;
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model || 'qwen2.5:3b',
          messages: [{ role: 'user', content: 'test' }],
          stream: false
        }),
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}


/**
 * 混合训练器
 * MCTS + LLM 协同训练
 */

import { HybridTrainingData, DecisionTrainingSample, ChatTrainingSample } from '../../types/training';
import { MCTSTrainer } from '../decision/MCTSTrainer';
import { ChatTrainer } from '../chat/ChatTrainer';
import { LLMDecisionEvaluator } from '../decision/LLMDecisionEvaluator';
import { ChatQualityEvaluator } from '../chat/ChatQualityEvaluator';
import { PromptOptimizer } from '../chat/PromptOptimizer';

export interface HybridTrainerConfig {
  mctsTrainer: MCTSTrainer;
  chatTrainer: ChatTrainer;
  llmEvaluator?: LLMDecisionEvaluator;
  chatEvaluator: ChatQualityEvaluator;
  correlationWeight?: number;  // 相关性权重
}

export interface CorrelationAnalysis {
  decisionChatCorrelation: number;  // 决策质量与聊天质量的相关性
  chatDecisionAlignment: number;    // 聊天是否准确反映了决策意图
  bestCombinations: Array<{
    decisionQuality: number;
    chatQuality: number;
    combinedScore: number;
  }>;
}

export class HybridTrainer {
  private config: HybridTrainerConfig;
  private trainingData: HybridTrainingData[] = [];
  
  constructor(config: HybridTrainerConfig) {
    this.config = {
      correlationWeight: 0.3,
      ...config
    };
  }
  
  /**
   * 混合训练
   */
  async train(
    decisionSamples: DecisionTrainingSample[],
    chatSamples: ChatTrainingSample[]
  ): Promise<void> {
    console.log(`[HybridTrainer] 开始混合训练，决策样本: ${decisionSamples.length}, 聊天样本: ${chatSamples.length}`);
    
    // 1. 分别训练MCTS和聊天
    await Promise.all([
      this.config.mctsTrainer.train(decisionSamples),
      this.config.chatTrainer.train(chatSamples)
    ]);
    
    // 2. 构建混合训练数据
    const hybridData = this.buildHybridData(decisionSamples, chatSamples);
    this.trainingData.push(...hybridData);
    
    // 3. 分析相关性
    const correlation = await this.analyzeCorrelation(hybridData);
    
    // 4. 优化协同策略
    await this.optimizeCollaboration(hybridData, correlation);
    
    console.log(`[HybridTrainer] 混合训练完成，相关性: ${correlation.decisionChatCorrelation.toFixed(3)}`);
  }
  
  /**
   * 构建混合训练数据
   */
  private buildHybridData(
    decisionSamples: DecisionTrainingSample[],
    chatSamples: ChatTrainingSample[]
  ): HybridTrainingData[] {
    const hybridData: HybridTrainingData[] = [];
    
    // 按时间戳匹配决策和聊天
    const decisionMap = new Map<number, DecisionTrainingSample>();
    for (const sample of decisionSamples) {
      const key = Math.floor(sample.metadata.timestamp / 1000); // 按秒分组
      if (!decisionMap.has(key)) {
        decisionMap.set(key, sample);
      }
    }
    
    for (const chatSample of chatSamples) {
      const key = Math.floor(chatSample.metadata.timestamp / 1000);
      const decisionSample = decisionMap.get(key);
      
      if (decisionSample) {
        // 评估聊天质量
        const chatQuality = this.estimateChatQuality(chatSample);
        
        // 评估决策质量
        const decisionQuality = decisionSample.llmEvaluation?.quality || 
                               decisionSample.decision.confidence;
        
        hybridData.push({
          decision: {
            gameState: this.convertGameState(decisionSample.gameState),
            mctsDecision: decisionSample.decision.action,
            llmEvaluation: decisionSample.llmEvaluation ? {
              quality: decisionSample.llmEvaluation.quality,
              reasoning: decisionSample.llmEvaluation.reasoning
            } : undefined,
            gameOutcome: {
              won: decisionSample.outcome.gameWon,
              score: decisionSample.outcome.roundScore,
              rank: decisionSample.outcome.finalRank
            }
          },
          chat: {
            gameState: this.convertGameState(chatSample.gameState),
            decision: decisionSample.decision.action,
            chatMessage: chatSample.llmResponse.processed,
            chatQuality
          },
          correlation: {
            decisionChatCorrelation: 0, // 稍后计算
            chatDecisionAlignment: 0   // 稍后计算
          }
        });
      }
    }
    
    return hybridData;
  }
  
  /**
   * 估算聊天质量
   */
  private estimateChatQuality(sample: ChatTrainingSample): any {
    // 使用已有的标签，如果没有则使用默认值
    return {
      relevance: sample.labels.relevance,
      diversity: sample.labels.diversity,
      engagement: sample.labels.engagement,
      appropriateness: sample.labels.appropriateness,
      overall: sample.labels.quality
    };
  }
  
  /**
   * 转换游戏状态
   */
  private convertGameState(state: any): any {
    // 转换为统一的游戏状态格式
    return {
      hand: state.hand,
      lastPlay: state.lastPlay,
      scores: state.scores,
      round: state.round,
      phase: state.phase,
      playerCount: state.playerCount
    };
  }
  
  /**
   * 分析相关性
   */
  private async analyzeCorrelation(
    hybridData: HybridTrainingData[]
  ): Promise<CorrelationAnalysis> {
    if (hybridData.length === 0) {
      return {
        decisionChatCorrelation: 0,
        chatDecisionAlignment: 0,
        bestCombinations: []
      };
    }
    
    // 计算决策质量与聊天质量的相关性
    const decisionQualities: number[] = [];
    const chatQualities: number[] = [];
    
    for (const data of hybridData) {
      const dq = data.decision.llmEvaluation?.quality || 
                 (data.decision.gameOutcome.won ? 0.8 : 0.3);
      const cq = data.chat.chatQuality.overall;
      
      decisionQualities.push(dq);
      chatQualities.push(cq);
    }
    
    const decisionChatCorrelation = this.calculateCorrelation(
      decisionQualities,
      chatQualities
    );
    
    // 计算聊天与决策的对齐度
    const alignments: number[] = [];
    for (const data of hybridData) {
      const alignment = this.calculateAlignment(data);
      alignments.push(alignment);
    }
    const chatDecisionAlignment = alignments.reduce((a, b) => a + b, 0) / alignments.length;
    
    // 找出最佳组合
    const bestCombinations = hybridData
      .map(data => ({
        decisionQuality: data.decision.llmEvaluation?.quality || 0.5,
        chatQuality: data.chat.chatQuality.overall,
        combinedScore: (data.decision.llmEvaluation?.quality || 0.5) * 0.6 + 
                       data.chat.chatQuality.overall * 0.4
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 10);
    
    return {
      decisionChatCorrelation,
      chatDecisionAlignment,
      bestCombinations
    };
  }
  
  /**
   * 计算相关性（皮尔逊相关系数）
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) {
      return 0;
    }
    
    return numerator / denominator;
  }
  
  /**
   * 计算对齐度
   */
  private calculateAlignment(data: HybridTrainingData): number {
    const decisionQuality = data.decision.llmEvaluation?.quality || 0.5;
    const chatQuality = data.chat.chatQuality.overall;
    
    // 对齐度：如果决策好，聊天应该反映积极情绪；如果决策差，聊天应该反映消极情绪
    const decisionSentiment = decisionQuality > 0.7 ? 1 : decisionQuality < 0.4 ? -1 : 0;
    
    // 分析聊天消息的情感（简单版）
    const chatMessage = data.chat.chatMessage.toLowerCase();
    const positiveWords = ['好', '棒', '强', '厉害', '不错', '漂亮', '完美'];
    const negativeWords = ['差', '糟', '弱', '不行', '不好', '糟糕', '完蛋'];
    
    let chatSentiment = 0;
    if (positiveWords.some(w => chatMessage.includes(w))) {
      chatSentiment = 1;
    } else if (negativeWords.some(w => chatMessage.includes(w))) {
      chatSentiment = -1;
    }
    
    // 对齐度：情感是否一致
    if (decisionSentiment === 0 || chatSentiment === 0) {
      return 0.5; // 中性，部分对齐
    }
    
    return decisionSentiment === chatSentiment ? 1.0 : 0.0;
  }
  
  /**
   * 优化协同策略
   */
  private async optimizeCollaboration(
    hybridData: HybridTrainingData[],
    correlation: CorrelationAnalysis
  ): Promise<void> {
    // 如果相关性高，说明决策和聊天配合良好
    if (correlation.decisionChatCorrelation > 0.5) {
      console.log('[HybridTrainer] 决策和聊天相关性高，保持当前策略');
      return;
    }
    
    // 如果相关性低，需要调整策略
    console.log('[HybridTrainer] 决策和聊天相关性低，需要优化协同策略');
    
    // 分析最佳组合的特征
    const bestCombinations = correlation.bestCombinations;
    if (bestCombinations.length > 0) {
      const avgDecisionQuality = bestCombinations.reduce((sum, c) => sum + c.decisionQuality, 0) / bestCombinations.length;
      const avgChatQuality = bestCombinations.reduce((sum, c) => sum + c.chatQuality, 0) / bestCombinations.length;
      
      console.log(`[HybridTrainer] 最佳组合特征: 决策质量=${avgDecisionQuality.toFixed(3)}, 聊天质量=${avgChatQuality.toFixed(3)}`);
      
      // 可以在这里调整训练策略
      // 例如：如果决策质量高但聊天质量低，可以优化聊天生成
      // 如果聊天质量高但决策质量低，可以优化决策算法
    }
  }
  
  /**
   * 获取训练数据
   */
  getTrainingData(): HybridTrainingData[] {
    return [...this.trainingData];
  }
  
  /**
   * 获取相关性分析
   */
  async getCorrelationAnalysis(): Promise<CorrelationAnalysis> {
    return await this.analyzeCorrelation(this.trainingData);
  }
  
  /**
   * 清空训练数据
   */
  clear(): void {
    this.trainingData = [];
  }
}


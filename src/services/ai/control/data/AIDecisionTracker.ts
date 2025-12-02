/**
 * AI决策追踪器
 * 追踪AI玩家的决策过程
 */

import { Card, Play } from '../../../types/card';
import { AIControlCenter } from '../AIControlCenter';

/**
 * AI决策数据
 */
export interface AIDecisionData {
  // 决策上下文
  context: {
    gameState: {
      playerHand: Card[];
      lastPlay: Play | null;
      lastPlayPlayerId: number | null;
      roundScore: number;
      playerScore: number;
      currentPlayerIndex: number;
      playerCount: number;
    };
    availableActions: Array<{
      cards: Card[];
      play: Play;
      score: number;
    }>;
  };
  
  // 决策过程
  decisionProcess: {
    // 策略评估
    strategyEvaluation: Array<{
      strategy: string;
      score: number;
      reasoning: string;
    }>;
    
    // MCTS过程（如果使用）
    mctsData?: {
      simulations: number;
      treeDepth: number;
      bestPath?: {
        nodes: number;
        depth: number;
        score: number;
      };
      rootNode?: {
        visits: number;
        wins: number;
        children: number;
      };
    };
    
    // LLM调用（如果使用）
    llmCall?: {
      prompt: string;
      response: string;
      tokens: number;
      latency: number;
    };
    
    // 简单策略评估
    simpleStrategy?: {
      evaluatedActions: number;
      evaluationTime: number;
    };
  };
  
  // 最终决策
  finalDecision: {
    action: {
      cards: Card[];
      play: Play;
    };
    confidence: number; // 0-1
    expectedValue: number;
    alternatives: Array<{
      cards: Card[];
      play: Play;
      score: number;
      reason: string;
    }>;
  };
  
  // 结果验证（决策后更新）
  result?: {
    actualValue: number;
    accuracy: number; // 预测准确性
    gameStateAfter: any;
  };
}

export class AIDecisionTracker {
  private decisions: Map<string, AIDecisionData> = new Map();
  private aiControl: AIControlCenter;
  
  constructor() {
    this.aiControl = AIControlCenter.getInstance();
  }
  
  /**
   * 开始追踪AI决策
   */
  startTrackingDecision(
    decisionId: string,
    context: AIDecisionData['context']
  ): void {
    const decision: AIDecisionData = {
      context,
      decisionProcess: {
        strategyEvaluation: []
      },
      finalDecision: null as any
    };
    
    this.decisions.set(decisionId, decision);
  }
  
  /**
   * 记录策略评估
   */
  recordStrategyEvaluation(
    decisionId: string,
    evaluation: {
      strategy: string;
      score: number;
      reasoning: string;
    }
  ): void {
    const decision = this.decisions.get(decisionId);
    if (decision) {
      decision.decisionProcess.strategyEvaluation.push(evaluation);
    }
  }
  
  /**
   * 记录MCTS数据
   */
  recordMCTSData(
    decisionId: string,
    mctsData: AIDecisionData['decisionProcess']['mctsData']
  ): void {
    const decision = this.decisions.get(decisionId);
    if (decision) {
      decision.decisionProcess.mctsData = mctsData;
    }
  }
  
  /**
   * 记录LLM调用
   */
  recordLLMCall(
    decisionId: string,
    llmCall: AIDecisionData['decisionProcess']['llmCall']
  ): void {
    const decision = this.decisions.get(decisionId);
    if (decision) {
      decision.decisionProcess.llmCall = llmCall;
    }
  }
  
  /**
   * 记录简单策略评估
   */
  recordSimpleStrategy(
    decisionId: string,
    simpleStrategy: AIDecisionData['decisionProcess']['simpleStrategy']
  ): void {
    const decision = this.decisions.get(decisionId);
    if (decision) {
      decision.decisionProcess.simpleStrategy = simpleStrategy;
    }
  }
  
  /**
   * 记录最终决策
   */
  recordFinalDecision(
    decisionId: string,
    finalDecision: AIDecisionData['finalDecision']
  ): void {
    const decision = this.decisions.get(decisionId);
    if (decision) {
      decision.finalDecision = finalDecision;
    }
  }
  
  /**
   * 记录结果验证
   */
  recordResult(
    decisionId: string,
    result: AIDecisionData['result']
  ): void {
    const decision = this.decisions.get(decisionId);
    if (decision) {
      decision.result = result;
      
      // 计算预测准确性
      if (decision.finalDecision.expectedValue !== undefined && result.actualValue !== undefined) {
        const diff = Math.abs(decision.finalDecision.expectedValue - result.actualValue);
        const maxValue = Math.max(Math.abs(decision.finalDecision.expectedValue), Math.abs(result.actualValue), 1);
        decision.result.accuracy = 1 - (diff / maxValue); // 0-1，1表示完全准确
      }
    }
  }
  
  /**
   * 完成追踪
   */
  completeTracking(decisionId: string): AIDecisionData | undefined {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      return undefined;
    }
    
    this.decisions.delete(decisionId);
    
    // 保存到知识库
    requestIdleCallback(async () => {
      await this.aiControl.getKnowledgeBase().recordExecution({
        type: 'aiDecision',
        data: decision
      });
    });
    
    return decision;
  }
  
  /**
   * 获取决策
   */
  getDecision(decisionId: string): AIDecisionData | undefined {
    return this.decisions.get(decisionId);
  }
  
  /**
   * 生成决策ID
   */
  generateDecisionId(): string {
    return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}


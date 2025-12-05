// @ts-nocheck
/**
 * 训练数据生成器
 * 从游戏会话生成LLM训练数据
 */

import { GameSession, PlayerAction } from './PlayerActionTracker';
import { AIDecisionData } from './AIDecisionTracker';
import { Card, Play } from '../../../../types/card';

/**
 * 训练数据
 */
export interface TrainingData {
  // 输入数据
  input: {
    gameState: {
      playerHand: Card[];
      lastPlay: Play | null;
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
    history: Array<{
      playerId: number;
      action: string;
      cards: Card[];
      timestamp: number;
    }>;
  };
  
  // 输出数据（监督学习）
  output: {
    action: {
      cards: Card[];
      play: Play;
    };
    reasoning: string;
    expectedValue: number;
  };
  
  // 元数据
  metadata: {
    source: 'human' | 'ai';
    quality: 'high' | 'medium' | 'low';
    tags: string[];
    timestamp: number;
    gameId: string;
    playerId: number;
  };
}

/**
 * 教程数据
 */
export interface TutorialData {
  id: string;
  title: string;
  description: string;
  session: GameSession;
  highlights: Array<{
    timestamp: number;
    description: string;
    action: PlayerAction;
  }>;
  teachingPoints: Array<{
    point: string;
    explanation: string;
    examples: PlayerAction[];
  }>;
}

export class TrainingDataGenerator {
  /**
   * 从游戏会话生成训练数据
   */
  generateFromSession(session: GameSession): TrainingData[] {
    const trainingData: TrainingData[] = [];
    
    // 遍历每个操作
    for (let i = 0; i < session.actions.length; i++) {
      const action = session.actions[i];
      const previousActions = session.actions.slice(0, i);
      
      // 构建输入
      const input: TrainingData['input'] = {
        gameState: {
          playerHand: action.gameState.playerHand,
          lastPlay: action.gameState.lastPlay || null,
          roundScore: action.gameState.roundScore,
          playerScore: action.gameState.playerScore,
          currentPlayerIndex: action.playerId,
          playerCount: session.config.playerCount
        },
        availableActions: this.getAvailableActions(action),
        history: previousActions.map(a => ({
          playerId: a.playerId,
          action: a.actionType,
          cards: a.actionData.cards || [],
          timestamp: a.timestamp
        }))
      };
      
      // 构建输出
      const output: TrainingData['output'] = {
        action: {
          cards: action.actionData.cards || [],
          play: this.cardsToPlay(action.actionData.cards || [])
        },
        reasoning: action.aiDecision?.reasoning || '',
        expectedValue: action.aiDecision?.alternatives?.[0]?.score || 0
      };
      
      // 构建元数据
      const metadata: TrainingData['metadata'] = {
        source: action.playerType,
        quality: this.assessQuality(action),
        tags: this.generateTags(action, session),
        timestamp: action.timestamp,
        gameId: session.id,
        playerId: action.playerId
      };
      
      trainingData.push({ input, output, metadata });
    }
    
    return trainingData;
  }
  
  /**
   * 从AI决策生成训练数据
   */
  generateFromAIDecision(decision: AIDecisionData): TrainingData {
    const input: TrainingData['input'] = {
      gameState: decision.context.gameState,
      availableActions: decision.context.availableActions.map(a => ({
        cards: a.cards,
        play: a.play,
        score: a.score
      })),
      history: [] // 可以从其他地方获取历史
    };
    
    const output: TrainingData['output'] = {
      action: decision.finalDecision.action,
      reasoning: decision.decisionProcess.strategyEvaluation
        .map(e => `${e.strategy}: ${e.reasoning}`)
        .join('; '),
      expectedValue: decision.finalDecision.expectedValue
    };
    
    const metadata: TrainingData['metadata'] = {
      source: 'ai',
      quality: this.assessDecisionQuality(decision),
      tags: ['ai', 'decision'],
      timestamp: Date.now(),
      gameId: '',
      playerId: 0
    };
    
    return { input, output, metadata };
  }
  
  /**
   * 生成教程数据
   */
  generateTutorialData(sessions: GameSession[]): TutorialData[] {
    return sessions
      .filter(s => s.tutorialValue && s.tutorialValue.score >= 60)
      .map(session => ({
        id: session.id,
        title: this.generateTitle(session),
        description: this.generateDescription(session),
        session,
        highlights: this.extractHighlights(session),
        teachingPoints: this.extractTeachingPoints(session)
      }));
  }
  
  /**
   * 导出训练数据
   */
  async exportTrainingData(
    trainingData: TrainingData[],
    format: 'json' | 'csv' | 'jsonl'
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(trainingData, null, 2);
      case 'csv':
        return this.convertToCSV(trainingData);
      case 'jsonl':
        return trainingData.map(d => JSON.stringify(d)).join('\n');
      default:
        throw new Error(`不支持的格式: ${format}`);
    }
  }
  
  /**
   * 获取可用操作
   */
  private getAvailableActions(action: PlayerAction): Array<{
    cards: Card[];
    play: Play;
    score: number;
  }> {
    // 这里应该从游戏状态计算可用操作
    // 简化处理，返回空数组
    return [];
  }
  
  /**
   * 将牌转换为Play
   */
  private cardsToPlay(cards: Card[]): Play {
    // 简化处理，实际应该使用canPlayCards
    return {
      cards,
      type: 'single' as any,
      value: 0
    };
  }
  
  /**
   * 评估质量
   */
  private assessQuality(action: PlayerAction): 'high' | 'medium' | 'low' {
    // 根据操作类型和结果评估质量
    if (action.result?.success && action.aiDecision?.confidence > 0.8) {
      return 'high';
    } else if (action.result?.success) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  /**
   * 评估决策质量
   */
  private assessDecisionQuality(decision: AIDecisionData): 'high' | 'medium' | 'low' {
    if (decision.result && decision.result.accuracy > 0.8) {
      return 'high';
    } else if (decision.finalDecision.confidence > 0.6) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  /**
   * 生成标签
   */
  private generateTags(action: PlayerAction, session: GameSession): string[] {
    const tags: string[] = [];
    
    tags.push(action.playerType);
    tags.push(action.actionType);
    
    if (action.aiDecision) {
      tags.push('ai');
      if (action.aiDecision.strategy) {
        tags.push(action.aiDecision.strategy);
      }
    }
    
    if (action.actionData.score && action.actionData.score > 0) {
      tags.push('score');
    }
    
    return tags;
  }
  
  /**
   * 生成标题
   */
  private generateTitle(session: GameSession): string {
    const winner = session.result.winnerName;
    const rounds = session.rounds.length;
    return `${winner}获胜 - ${rounds}回合对局`;
  }
  
  /**
   * 生成描述
   */
  private generateDescription(session: GameSession): string {
    const tags = session.tutorialValue?.tags || [];
    const reasons = session.tutorialValue?.reasons || [];
    
    return `这是一场${tags.join('、')}的对局。${reasons.join('。')}`;
  }
  
  /**
   * 提取亮点
   */
  private extractHighlights(session: GameSession): TutorialData['highlights'] {
    const highlights: TutorialData['highlights'] = [];
    
    // 找出关键操作（得分、炸弹、墩等）
    session.actions.forEach(action => {
      if (action.actionData.score && action.actionData.score > 10) {
        highlights.push({
          timestamp: action.timestamp,
          description: `得分${action.actionData.score}分`,
          action
        });
      }
    });
    
    return highlights.slice(0, 10); // 最多10个亮点
  }
  
  /**
   * 提取教学点
   */
  private extractTeachingPoints(session: GameSession): TutorialData['teachingPoints'] {
    const points: TutorialData['teachingPoints'] = [];
    
    // 提取教学点（简化处理）
    // 例如：如何使用炸弹、如何抢分等
    
    return points;
  }
  
  /**
   * 转换为CSV
   */
  private convertToCSV(data: TrainingData[]): string {
    // 简化CSV转换
    const headers = ['input', 'output', 'metadata'];
    const rows = data.map(d => [
      JSON.stringify(d.input),
      JSON.stringify(d.output),
      JSON.stringify(d.metadata)
    ]);
    
    return [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
  }
}
// @ts-nocheck

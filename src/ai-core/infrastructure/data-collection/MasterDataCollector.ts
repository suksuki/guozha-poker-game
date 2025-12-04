/**
 * 主数据收集器
 * 统一收集所有AI的游戏数据、决策数据、通信数据
 * 专门用于生成LLM训练素材
 */

import { GameState, Decision } from '../../types';

export interface TrainingDataPoint {
  // 唯一标识
  id: string;
  sessionId: string;
  timestamp: number;
  
  // AI角色
  playerId: number;
  personality: string;
  
  // 输入：游戏状态
  input: {
    gameState: GameState;
    cognitive: any;  // 认知分析结果
    context: any;    // 上下文信息
  };
  
  // 输出：AI行为
  output: {
    decision?: {
      action: any;
      reasoning: string;
      confidence: number;
    };
    communication?: {
      message: string;
      intent: string;
      emotion: string;
    };
  };
  
  // 结果反馈
  feedback?: {
    immediate: {
      success?: boolean;
      playerReaction?: string;
    };
    delayed: {
      roundWin?: boolean;
      gameWin?: boolean;
      scoreChange?: number;
    };
  };
  
  // 自动标注
  annotation: {
    quality: 'excellent' | 'good' | 'average' | 'poor';
    category: string[];
    tags: string[];
    notes: string;
  };
}

export interface TrainingSession {
  id: string;
  startTime: number;
  endTime?: number;
  metadata: {
    gameMode: string;
    playerCount: number;
    aiCount: number;
  };
  dataPoints: TrainingDataPoint[];
  statistics: SessionStatistics;
}

export interface SessionStatistics {
  totalDataPoints: number;
  byQuality: Record<string, number>;
  byCategory: Record<string, number>;
  avgConfidence: number;
}

/**
 * 主数据收集器
 */
export class MasterDataCollector {
  private currentSession: TrainingSession | null = null;
  private sessions: TrainingSession[] = [];
  private dataPoints: TrainingDataPoint[] = [];
  
  /**
   * 开始新会话
   */
  startSession(metadata: any): string {
    const sessionId = this.generateSessionId();
    
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      metadata,
      dataPoints: [],
      statistics: {
        totalDataPoints: 0,
        byQuality: {},
        byCategory: {},
        avgConfidence: 0
      }
    };
    
    console.log(`[MasterDataCollector] 开始新会话: ${sessionId}`);
    return sessionId;
  }
  
  /**
   * 结束当前会话
   */
  endSession(): void {
    if (!this.currentSession) return;
    
    this.currentSession.endTime = Date.now();
    this.sessions.push(this.currentSession);
    
    console.log(`[MasterDataCollector] 会话结束: ${this.currentSession.id}`);
    console.log(`  收集数据点: ${this.currentSession.dataPoints.length}`);
    
    this.currentSession = null;
  }
  
  /**
   * 记录决策
   */
  recordDecision(data: {
    playerId: number;
    personality: string;
    gameState: GameState;
    cognitive: any;
    decision: Decision;
  }): string {
    const id = this.generateId();
    
    const dataPoint: TrainingDataPoint = {
      id,
      sessionId: this.currentSession?.id || 'no-session',
      timestamp: Date.now(),
      playerId: data.playerId,
      personality: data.personality,
      
      input: {
        gameState: data.gameState,
        cognitive: data.cognitive,
        context: {}
      },
      
      output: {
        decision: {
          action: data.decision.action,
          reasoning: data.decision.reasoning,
          confidence: data.decision.confidence
        }
      },
      
      annotation: this.autoAnnotateDecision(data)
    };
    
    this.addDataPoint(dataPoint);
    return id;
  }
  
  /**
   * 记录通信
   */
  recordCommunication(data: {
    playerId: number;
    personality: string;
    gameState: GameState;
    cognitive: any;
    message: any;
  }): string {
    const id = this.generateId();
    
    const dataPoint: TrainingDataPoint = {
      id,
      sessionId: this.currentSession?.id || 'no-session',
      timestamp: Date.now(),
      playerId: data.playerId,
      personality: data.personality,
      
      input: {
        gameState: data.gameState,
        cognitive: data.cognitive,
        context: {}
      },
      
      output: {
        communication: {
          message: data.message.content || data.message.text || '',
          intent: data.message.intent || 'unknown',
          emotion: data.message.emotion || 'neutral'
        }
      },
      
      annotation: this.autoAnnotateCommunication(data)
    };
    
    this.addDataPoint(dataPoint);
    return id;
  }
  
  /**
   * 更新反馈
   */
  updateFeedback(dataPointId: string, feedback: any): void {
    const dataPoint = this.dataPoints.find(dp => dp.id === dataPointId);
    if (!dataPoint) return;
    
    dataPoint.feedback = {
      ...dataPoint.feedback,
      ...feedback
    };
    
    // 基于反馈重新标注
    dataPoint.annotation = this.reAnnotate(dataPoint);
  }
  
  /**
   * 导出训练数据（JSONL格式，适合LLM训练）
   */
  exportForLLMTraining(): string {
    return this.dataPoints
      .filter(dp => dp.annotation.quality === 'excellent' || dp.annotation.quality === 'good')
      .map(dp => this.formatForLLM(dp))
      .map(ex => JSON.stringify(ex))
      .join('\n');
  }
  
  /**
   * 格式化为LLM训练格式
   */
  private formatForLLM(dataPoint: TrainingDataPoint): any {
    // 构建prompt
    const prompt = this.buildPrompt(dataPoint);
    
    // 提取输出
    const output = dataPoint.output.decision 
      ? this.formatDecisionOutput(dataPoint.output.decision)
      : this.formatCommunicationOutput(dataPoint.output.communication!);
    
    return {
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(dataPoint.personality)
        },
        {
          role: 'user',
          content: prompt
        },
        {
          role: 'assistant',
          content: output
        }
      ],
      metadata: {
        id: dataPoint.id,
        quality: dataPoint.annotation.quality,
        tags: dataPoint.annotation.tags,
        timestamp: dataPoint.timestamp
      }
    };
  }
  
  /**
   * 构建输入prompt
   */
  private buildPrompt(dataPoint: TrainingDataPoint): string {
    const { gameState, cognitive } = dataPoint.input;
    
    return `
游戏状态：
- 回合：${gameState.roundNumber || 0}
- 阶段：${gameState.phase || 'unknown'}
- 我的手牌：${gameState.myHand?.length || 0}张
- 对手手牌：${gameState.opponentHandSizes?.join(', ') || 'unknown'}

认知分析：
- 手牌强度：${cognitive?.handStrength || 0}
- 战略意图：${cognitive?.strategicIntent || 'unknown'}

${dataPoint.output.decision ? '请决定如何出牌' : '请生成聊天消息'}
`.trim();
  }
  
  /**
   * 格式化决策输出
   */
  private formatDecisionOutput(decision: any): string {
    return `
动作：${decision.action.type}
推理：${decision.reasoning}
`.trim();
  }
  
  /**
   * 格式化通信输出
   */
  private formatCommunicationOutput(comm: any): string {
    return comm.message;
  }
  
  /**
   * 获取系统提示词
   */
  private getSystemPrompt(personality: string): string {
    return `你是一个${personality}型的扑克牌AI玩家。`;
  }
  
  /**
   * 自动标注决策
   */
  private autoAnnotateDecision(data: any): any {
    const quality = data.decision.confidence > 0.8 ? 'excellent' :
                    data.decision.confidence > 0.6 ? 'good' :
                    data.decision.confidence > 0.4 ? 'average' : 'poor';
    
    return {
      quality,
      category: ['decision', data.cognitive?.strategicIntent || 'unknown'],
      tags: [`confidence_${quality}`, `player_${data.playerId}`],
      notes: `自动标注 - 置信度${data.decision.confidence}`
    };
  }
  
  /**
   * 自动标注通信
   */
  private autoAnnotateCommunication(data: any): any {
    const length = data.message.content?.length || 0;
    const quality = length > 5 && length < 50 ? 'good' : 'average';
    
    return {
      quality,
      category: ['communication', data.message.intent || 'unknown'],
      tags: [`intent_${data.message.intent}`, `player_${data.playerId}`],
      notes: `自动标注 - 长度${length}`
    };
  }
  
  /**
   * 重新标注
   */
  private reAnnotate(dataPoint: TrainingDataPoint): any {
    // 基于反馈重新评估质量
    if (dataPoint.feedback?.delayed?.gameWin) {
      return {
        ...dataPoint.annotation,
        quality: 'excellent',
        tags: [...dataPoint.annotation.tags, 'game_win']
      };
    }
    
    return dataPoint.annotation;
  }
  
  /**
   * 添加数据点
   */
  private addDataPoint(dataPoint: TrainingDataPoint): void {
    this.dataPoints.push(dataPoint);
    
    if (this.currentSession) {
      this.currentSession.dataPoints.push(dataPoint);
      this.updateSessionStatistics();
    }
  }
  
  /**
   * 更新会话统计
   */
  private updateSessionStatistics(): void {
    if (!this.currentSession) return;
    
    const points = this.currentSession.dataPoints;
    
    this.currentSession.statistics = {
      totalDataPoints: points.length,
      byQuality: this.groupByQuality(points),
      byCategory: this.groupByCategory(points),
      avgConfidence: this.calculateAvgConfidence(points)
    };
  }
  
  /**
   * 按质量分组
   */
  private groupByQuality(points: TrainingDataPoint[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const p of points) {
      groups[p.annotation.quality] = (groups[p.annotation.quality] || 0) + 1;
    }
    return groups;
  }
  
  /**
   * 按类别分组
   */
  private groupByCategory(points: TrainingDataPoint[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const p of points) {
      for (const cat of p.annotation.category) {
        groups[cat] = (groups[cat] || 0) + 1;
      }
    }
    return groups;
  }
  
  /**
   * 计算平均置信度
   */
  private calculateAvgConfidence(points: TrainingDataPoint[]): number {
    const decisionsWithConfidence = points.filter(p => p.output.decision?.confidence);
    if (decisionsWithConfidence.length === 0) return 0;
    
    const sum = decisionsWithConfidence.reduce(
      (total, p) => total + (p.output.decision?.confidence || 0),
      0
    );
    return sum / decisionsWithConfidence.length;
  }
  
  /**
   * 生成ID
   */
  private generateId(): string {
    return `dp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 获取统计信息
   */
  getStatistics(): any {
    return {
      totalDataPoints: this.dataPoints.length,
      totalSessions: this.sessions.length,
      currentSession: this.currentSession?.statistics,
      byQuality: this.groupByQuality(this.dataPoints),
      byCategory: this.groupByCategory(this.dataPoints)
    };
  }
}


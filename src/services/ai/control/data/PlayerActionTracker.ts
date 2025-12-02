/**
 * 玩家操作追踪器
 * 追踪所有玩家（人类和AI）的操作
 */

import { Card, Player, Play, RoundRecord } from '../../../types/card';
import { AIControlCenter } from '../AIControlCenter';

/**
 * 玩家操作数据
 */
export interface PlayerAction {
  // 基础信息
  id: string;
  timestamp: number;
  gameId: string;
  roundId: string;
  roundNumber: number;
  
  // 玩家信息
  playerId: number;
  playerName: string;
  playerType: 'human' | 'ai';
  
  // 操作信息
  actionType: 'playCard' | 'pass' | 'takeCard' | 'call' | 'fold';
  actionData: {
    cards?: Card[]; // 出的牌
    playType?: string; // 牌型
    playValue?: number; // 牌值
    scoreCards?: Card[]; // 分牌
    score?: number; // 得分
    target?: number; // 目标玩家ID
    reason?: string; // 操作原因（AI）
  };
  
  // 上下文信息
  gameState: {
    currentRound: number;
    playerHand: Card[]; // 玩家手牌（操作前）
    playerHandCount: number; // 手牌数量
    playedCards: Card[]; // 已出的牌
    lastPlay: Play | null; // 上家出的牌
    lastPlayPlayerId: number | null; // 上家玩家ID
    roundScore: number; // 当前轮次累计分数
    playerScore: number; // 玩家当前得分
    turnOrder: number[]; // 出牌顺序
    finishedPlayers: number[]; // 已出完牌的玩家
  };
  
  // AI决策信息（如果是AI玩家）
  aiDecision?: {
    strategy: string; // 使用的策略
    algorithm?: string; // 使用的算法（mcts/simple）
    reasoning: string; // 决策推理过程
    alternatives: Array<{ // 考虑的备选方案
      action: string;
      cards: Card[];
      score: number;
      reason: string;
    }>;
    confidence: number; // 决策置信度
    timeSpent: number; // 思考时间(ms)
    mctsData?: { // MCTS相关数据
      simulations: number;
      treeDepth: number;
      bestPath?: any;
    };
  };
  
  // 结果信息
  result?: {
    success: boolean;
    newGameState?: {
      playerHand: Card[]; // 操作后手牌
      playerHandCount: number;
      roundScore: number;
      gameEnded?: boolean;
    };
    nextPlayerId?: number;
    gameEnded?: boolean;
    winnerId?: number;
  };
}

/**
 * 游戏会话
 */
export interface GameSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  
  // 游戏配置
  config: {
    playerCount: number;
    deckCount: number;
    rules: any;
    difficulty?: string;
  };
  
  // 玩家信息
  players: Array<{
    id: number;
    name: string;
    type: 'human' | 'ai';
    strategy?: string;
    initialHand: Card[];
    finalHand: Card[];
    score: number;
    rank: number;
    finishedRank?: number;
  }>;
  
  // 完整操作序列
  actions: PlayerAction[];
  
  // 回合信息
  rounds: Array<{
    roundNumber: number;
    startTime: number;
    endTime: number;
    actions: PlayerAction[];
    winnerId?: number;
    winnerName?: string;
    points: Record<number, number>;
    totalScore: number;
  }>;
  
  // 游戏结果
  result: {
    winnerId: number;
    winnerName: string;
    finalScores: Record<number, number>;
    finalRankings: Array<{
      playerId: number;
      playerName: string;
      score: number;
      rank: number;
    }>;
    statistics: {
      totalActions: number;
      averageActionTime: number;
      longestRound: number;
      shortestRound: number;
    };
  };
  
  // 教学价值评估
  tutorialValue?: {
    score: number; // 0-100
    reasons: string[];
    tags: string[]; // 典型、错误案例、最佳实践等
  };
}

export class PlayerActionTracker {
  private sessions: Map<string, GameSession> = new Map();
  private currentGameId: string | null = null;
  private aiControl: AIControlCenter;
  
  constructor() {
    this.aiControl = AIControlCenter.getInstance();
  }
  
  /**
   * 开始追踪游戏
   */
  startTrackingGame(
    gameId: string,
    players: Player[],
    config: any
  ): void {
    const session: GameSession = {
      id: gameId,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      config: {
        playerCount: players.length,
        deckCount: config.deckCount || 1,
        rules: config.rules || {},
        difficulty: config.difficulty
      },
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type === 'ai' ? 'ai' : 'human',
        strategy: p.aiConfig?.strategy,
        initialHand: [...p.hand],
        finalHand: [],
        score: p.score || 0,
        rank: 0
      })),
      actions: [],
      rounds: [],
      result: null as any
    };
    
    this.sessions.set(gameId, session);
    this.currentGameId = gameId;
    
  }
  
  /**
   * 记录玩家操作
   */
  recordAction(action: Omit<PlayerAction, 'id' | 'timestamp' | 'gameId' | 'roundId'>): void {
    if (!this.currentGameId) {
      return;
    }
    
    const session = this.sessions.get(this.currentGameId);
    if (!session) {
      return;
    }
    
    // 获取当前回合
    const currentRound = session.rounds[session.rounds.length - 1];
    const roundId = currentRound ? `round_${currentRound.roundNumber}` : 'round_0';
    
    // 构建完整操作数据
    const fullAction: PlayerAction = {
      id: this.generateId(),
      timestamp: Date.now(),
      gameId: this.currentGameId,
      roundId,
      roundNumber: action.roundNumber,
      ...action
    };
    
    // 添加到会话
    session.actions.push(fullAction);
    
    // 添加到当前回合
    if (currentRound) {
      currentRound.actions.push(fullAction);
    }
    
    // 异步保存，不阻塞游戏
    requestIdleCallback(() => {
      this.saveAction(fullAction);
    });
  }
  
  /**
   * 开始新回合
   */
  startRound(gameId: string, roundNumber: number): void {
    const session = this.sessions.get(gameId);
    if (!session) {
      return;
    }
    
    session.rounds.push({
      roundNumber,
      startTime: Date.now(),
      endTime: 0,
      actions: [],
      points: {},
      totalScore: 0
    });
  }
  
  /**
   * 结束回合
   */
  endRound(
    gameId: string,
    roundNumber: number,
    result: {
      winnerId: number;
      winnerName: string;
      points: Record<number, number>;
      totalScore: number;
    }
  ): void {
    const session = this.sessions.get(gameId);
    if (!session) {
      return;
    }
    
    const round = session.rounds[roundNumber - 1];
    if (round) {
      round.endTime = Date.now();
      round.winnerId = result.winnerId;
      round.winnerName = result.winnerName;
      round.points = result.points;
      round.totalScore = result.totalScore;
    }
  }
  
  /**
   * 结束游戏
   */
  endGame(gameId: string, result: {
    winnerId: number;
    winnerName: string;
    finalScores: Record<number, number>;
    finalRankings: Array<{
      playerId: number;
      playerName: string;
      score: number;
      rank: number;
    }>;
    players: Player[];
  }): GameSession {
    const session = this.sessions.get(gameId);
    if (!session) {
      throw new Error(`游戏会话不存在: ${gameId}`);
    }
    
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    
    // 更新玩家最终状态
    result.players.forEach(p => {
      const player = session.players.find(pl => pl.id === p.id);
      if (player) {
        player.finalHand = [...p.hand];
        player.score = p.score || 0;
        player.rank = p.scoreRank || 0;
        player.finishedRank = p.finishedRank || undefined;
      }
    });
    
    // 计算统计信息
    const statistics = this.calculateStatistics(session);
    
    // 设置结果
    session.result = {
      winnerId: result.winnerId,
      winnerName: result.winnerName,
      finalScores: result.finalScores,
      finalRankings: result.finalRankings,
      statistics
    };
    
    // 评估教学价值
    session.tutorialValue = this.evaluateTutorialValue(session);
    
    // 保存会话
    this.saveSession(session);
    
    // 发送到AI中控系统
    this.aiControl.getMonitorLayer().recordGameState({
      type: 'gameEnd',
      session
    });
    
    this.sessions.delete(gameId);
    if (this.currentGameId === gameId) {
      this.currentGameId = null;
    }
    
    return session;
  }
  
  /**
   * 计算统计信息
   */
  private calculateStatistics(session: GameSession): GameSession['result']['statistics'] {
    const actions = session.actions;
    const rounds = session.rounds;
    
    // 计算平均操作时间
    const actionTimes = actions
      .filter(a => a.aiDecision?.timeSpent)
      .map(a => a.aiDecision!.timeSpent);
    const averageActionTime = actionTimes.length > 0
      ? actionTimes.reduce((sum, t) => sum + t, 0) / actionTimes.length
      : 0;
    
    // 计算回合时长
    const roundDurations = rounds.map(r => r.endTime - r.startTime);
    const longestRound = roundDurations.length > 0 ? Math.max(...roundDurations) : 0;
    const shortestRound = roundDurations.length > 0 ? Math.min(...roundDurations) : 0;
    
    return {
      totalActions: actions.length,
      averageActionTime,
      longestRound,
      shortestRound
    };
  }
  
  /**
   * 评估教学价值
   */
  private evaluateTutorialValue(session: GameSession): GameSession['tutorialValue'] {
    let score = 0;
    const reasons: string[] = [];
    const tags: string[] = [];
    
    // 1. 典型牌局（完整、有代表性）
    if (session.actions.length > 50 && session.rounds.length >= 3) {
      score += 20;
      reasons.push('完整牌局，有代表性');
      tags.push('典型');
    }
    
    // 2. 错误案例（有明显错误操作）
    const errors = this.detectErrors(session);
    if (errors.length > 0) {
      score += 30;
      reasons.push(`包含${errors.length}个典型错误`);
      tags.push('错误案例');
    }
    
    // 3. 最佳实践（优秀策略）
    const bestPractices = this.detectBestPractices(session);
    if (bestPractices.length > 0) {
      score += 30;
      reasons.push(`包含${bestPractices.length}个最佳实践`);
      tags.push('最佳实践');
    }
    
    // 4. 精彩对局（激烈、有看点）
    if (this.isExcitingGame(session)) {
      score += 20;
      reasons.push('精彩对局，有教学价值');
      tags.push('精彩');
    }
    
    return {
      score: Math.min(score, 100),
      reasons,
      tags
    };
  }
  
  /**
   * 检测错误
   */
  private detectErrors(session: GameSession): string[] {
    const errors: string[] = [];
    
    // 检测明显错误（这里简化处理，实际应该更复杂）
    session.actions.forEach(action => {
      // 例如：有能打过的牌却要不起
      if (action.actionType === 'pass' && action.gameState.lastPlay) {
        // 这里应该检查是否真的没有能打过的牌
        // 简化处理
      }
    });
    
    return errors;
  }
  
  /**
   * 检测最佳实践
   */
  private detectBestPractices(session: GameSession): string[] {
    const practices: string[] = [];
    
    // 检测优秀策略（简化处理）
    // 例如：成功使用炸弹、成功抢分等
    
    return practices;
  }
  
  /**
   * 判断是否精彩对局
   */
  private isExcitingGame(session: GameSession): boolean {
    // 判断标准：回合数多、操作频繁、分数接近等
    return session.rounds.length >= 5 && session.actions.length > 100;
  }
  
  /**
   * 保存操作
   */
  private async saveAction(action: PlayerAction): Promise<void> {
    // 保存到知识库
    await this.aiControl.getKnowledgeBase().recordExecution({
      type: 'playerAction',
      data: action
    });
  }
  
  /**
   * 保存会话
   */
  private async saveSession(session: GameSession): Promise<void> {
    // 保存到知识库
    await this.aiControl.getKnowledgeBase().recordExecution({
      type: 'gameSession',
      data: session
    });
  }
  
  /**
   * 生成ID
   */
  private generateId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 获取会话
   */
  getSession(gameId: string): GameSession | undefined {
    return this.sessions.get(gameId);
  }
  
  /**
   * 获取所有会话
   */
  getAllSessions(): GameSession[] {
    return Array.from(this.sessions.values());
  }
}


/**
 * AI模块类型定义
 */

import { Card, Play } from '../types/card';
import { TeamConfig } from '../types/team';

// AI玩家配置
export interface AIConfig {
  apiKey?: string; // 保留但不使用（已禁用OpenAI）
  model?: string; // 保留但不使用（已禁用OpenAI）
  strategy?: 'aggressive' | 'conservative' | 'balanced';
  algorithm?: 'simple' | 'mcts'; // AI算法选择（OpenAI已禁用）
  mctsIterations?: number; // MCTS迭代次数
  perfectInformation?: boolean; // 完全信息模式（知道所有玩家手牌）
  allPlayerHands?: Card[][]; // 所有玩家的手牌（完全信息模式使用）
  currentRoundScore?: number; // 当前轮次累计的分数
  playerCount?: number; // 玩家总数
  teamMode?: boolean; // 是否启用团队模式
  teamConfig?: TeamConfig; // 团队配置
}

// MCTS配置
export interface MCTSConfig {
  iterations?: number; // 迭代次数
  explorationConstant?: number; // 探索常数（UCT公式中的C）
  simulationDepth?: number; // 模拟深度限制
  perfectInformation?: boolean; // 完全信息模式（知道所有玩家手牌）- "作弊"模式
  allPlayerHands?: Card[][]; // 所有玩家的手牌（完全信息模式使用）
  currentRoundScore?: number; // 当前轮次累计的分数
  playerCount?: number; // 玩家总数
  teamMode?: boolean; // 是否启用团队模式
  teamConfig?: TeamConfig; // 团队配置
  strategicPassEnabled?: boolean; // 是否启用主动要不起
}

// 团队MCTS配置（扩展版）
export interface MCTSTeamConfig extends MCTSConfig {
  teamMode: true; // 团队模式必须开启
  teamConfig: TeamConfig; // 团队配置必填
  strategicPassEnabled: boolean; // 是否启用主动要不起
  teamScoreWeight: number; // 团队得分权重
  cooperationWeight: number; // 团队配合权重
  strategicPassWeight: number; // 主动要不起权重
  bigCardPreservationBonus: number; // 保留大牌奖励
  teammateSupportBonus: number; // 支持队友奖励
  longTermStrategyWeight: number; // 长期策略权重
}

// MCTS节点
export interface MCTSNode {
  hand: Card[]; // AI的手牌
  lastPlay: Play | null; // 上家出牌
  playerToMove: 'ai' | 'opponent'; // 当前该谁出牌
  visits: number; // 访问次数
  wins: number; // 获胜次数
  children: MCTSNode[]; // 子节点
  parent: MCTSNode | null; // 父节点
  action: Card[] | null; // 导致此节点的动作
  untriedActions: Card[][]; // 未尝试的动作
}

// 游戏状态（用于模拟）
export interface SimulatedGameState {
  aiHand: Card[];
  opponentHands: Card[][]; // 所有对手的手牌（支持多人）
  allHands: Card[][]; // 所有玩家的手牌（完全信息模式）
  lastPlay: Play | null;
  lastPlayPlayerIndex: number | null; // 最后出牌的玩家索引
  currentPlayerIndex: number; // 当前玩家索引（0=AI，1+是对手）
  playerCount: number; // 玩家总数
  roundScore: number; // 当前轮次累计的分数
  aiScore: number; // AI累计的分数
  isTerminal: boolean;
  winner: number | null; // 获胜者索引
  perfectInformation: boolean; // 是否使用完全信息
}

// 团队游戏状态（扩展版）
export interface TeamSimulatedGameState extends SimulatedGameState {
  // 团队信息
  teamConfig: TeamConfig;
  teamScores: Map<number, number>; // teamId -> score
  playerTeams: Map<number, number>; // playerId -> teamId
  
  // 主动要不起相关
  canPass: boolean; // 是否可以选择要不起
  lastPassPlayerIndex: number | null; // 上一个要不起的玩家
  
  // 团队策略相关
  teammateHands: Card[][]; // 队友手牌（部分信息）
  opponentTeamHands: Card[][]; // 对手团队手牌（估计）
  
  // 决策上下文
  roundContext: {
    roundNumber: number;
    roundScore: number;
    expectedTeamBenefit: number; // 预期团队收益
    strategicPassOpportunity: boolean; // 是否有主动要不起的机会
  };
}

// 团队动作类型
export type TeamAction = 
  | { type: 'play'; cards: Card[] } // 出牌
  | { type: 'pass'; strategic: boolean }; // 要不起（strategic表示是否是主动的）

// 团队MCTS节点
export interface TeamMCTSNode {
  // 状态信息
  state: TeamSimulatedGameState;
  playerToMove: number; // 当前玩家ID（支持多人）
  
  // MCTS统计
  visits: number;
  teamWins: number; // 团队获胜次数（而不是个人获胜）
  teamScoreSum: number; // 累计团队得分
  
  // 子树
  children: TeamMCTSNode[];
  parent: TeamMCTSNode | null;
  
  // 动作
  action: TeamAction | null;
  untriedActions: TeamAction[];
  
  // 评估指标
  evaluation: {
    expectedTeamScore: number; // 预期团队得分
    strategicPassValue: number; // 主动要不起的价值
    teamCooperationScore: number; // 团队配合得分
    confidence: number; // 置信度
  };
}

// 手牌结构分析
export interface HandStructure {
  singles: Card[]; // 单张
  pairs: Card[][]; // 对子
  triples: Card[][]; // 三张
  bombs: Card[][]; // 炸弹
  duns: Card[][]; // 墩
  jokers: {
    small: Card[];
    big: Card[];
  };
  rankGroups: Map<number, Card[]>; // 按点数分组的牌
}

// 出牌选择
export interface PlayOption {
  cards: Card[];
  play: Play;
  score: number; // 综合评分
}

// 训练相关类型
export interface TrainingScenario {
  id: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  initialState: TeamSimulatedGameState;
  expectedStrategies: {
    optimalAction: TeamAction;
    alternativeActions: TeamAction[];
    strategicPassOpportunity: boolean;
  };
  evaluationMetrics: {
    teamScoreWeight: number;
    cooperationWeight: number;
    strategicPassWeight: number;
  };
}

// 训练评估结果
export interface TrainingEvaluation {
  scenarioId: string;
  actualAction: TeamAction;
  expectedAction: TeamAction;
  score: number;
  breakdown: {
    teamScoreContribution: number;
    cooperationContribution: number;
    strategicPassContribution: number;
    longTermContribution: number;
  };
}

// 团队游戏结果
export interface TeamGameResult {
  config: MCTSTeamConfig;
  
  // 核心指标
  teamWins: number;
  totalGames: number;
  teamWinRate: number;
  avgTeamScore: number;
  
  // 策略指标
  strategicPassCount: number;
  avgStrategicPassPerGame: number;
  strategicPassSuccessRate: number;
  avgCooperationScore: number;
  
  // 其他指标
  avgTurns: number;
  avgRounds: number;
  
  // 详细统计（可选）
  detailedStats?: {
    teamScoreDistribution: Map<number, number[]>;
    strategicPassByRound: Map<number, number>;
    cooperationEventsByType: Map<string, number>;
  };
}

// 单局团队游戏结果
export interface SingleTeamGameResult {
  // 团队结果
  winningTeam: number; // 获胜团队ID
  finalTeamScores: Map<number, number>; // 最终团队得分
  
  // 策略统计
  strategicPassEvents: Array<{
    playerId: number;
    round: number;
    successful: boolean;
    benefit: number;
  }>;
  
  cooperationEvents: Array<{
    type: string;
    playerId: number;
    teammateId: number;
    benefit: number;
  }>;
  
  // 其他统计
  turns: number;
  rounds: number;
  playerScores: Map<number, number>;
  finishOrder: number[];
}


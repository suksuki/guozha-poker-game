/**
 * 训练系统类型定义
 */

import { Card, Play, GameState as CardGameState } from './card';
import { GameState } from '../services/ai/brain/core/types';

// ========== 基础类型 ==========

/**
 * 训练配置
 */
export interface TrainingConfig {
  // 训练类型
  type: 'decision' | 'chat' | 'hybrid';
  
  // 训练参数
  rounds: number;              // 训练轮数
  batchSize?: number;         // 批次大小
  maxConcurrent?: number;     // 最大并发数
  
  // 快速模式配置
  fastMode?: {
    enabled: boolean;
    speedMultiplier?: number;  // 速度倍数（默认10倍）
    skipUI?: boolean;          // 跳过UI渲染
    skipTTS?: boolean;        // 跳过TTS播放
  };
  
  // 数据收集配置
  dataCollection?: {
    enabled: boolean;
    autoSave?: boolean;
    saveInterval?: number;    // 保存间隔（ms）
  };
  
  // LLM配置
  llm?: {
    enabled: boolean;
    endpoint?: string;
    model?: string;
    timeout?: number;
  };
}

/**
 * 训练进度
 */
export interface TrainingProgress {
  currentRound: number;
  totalRounds: number;
  percentage: number;
  elapsedTime: number;        // 已用时间（ms）
  estimatedTimeRemaining?: number; // 预计剩余时间（ms）
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  error?: string;
}

/**
 * 训练指标
 */
export interface TrainingMetrics {
  // 总体指标
  totalRounds: number;
  totalGames: number;
  totalDecisions: number;
  totalChats: number;
  
  // 决策指标
  decisionMetrics?: {
    avgQuality: number;       // 平均决策质量
    avgConfidence: number;    // 平均置信度
    winRate: number;          // 胜率
    avgScore: number;         // 平均得分
  };
  
  // 聊天指标
  chatMetrics?: {
    avgQuality: number;       // 平均聊天质量
    avgRelevance: number;     // 平均相关性
    avgDiversity: number;     // 平均多样性
    avgEngagement: number;    // 平均趣味性
  };
  
  // 性能指标
  performance: {
    avgGameTime: number;      // 平均游戏时间（ms）
    avgDecisionTime: number;   // 平均决策时间（ms）
    avgChatTime: number;       // 平均聊天生成时间（ms）
  };
}

// ========== 决策训练类型 ==========

/**
 * 决策训练样本
 */
export interface DecisionTrainingSample {
  // 游戏状态
  gameState: {
    hand: Card[];
    lastPlay: Play | null;
    playerCount: number;
    scores: number[];
    round: number;
    phase: 'early' | 'mid' | 'late' | 'critical';
    allHands?: Card[][]; // 完全信息模式：所有玩家的手牌
  };
  
  // 决策信息
  decision: {
    action: Card[];
    mctsScore: number;
    confidence: number;
    alternatives: Card[][];
    reasoning: string;
  };
  
  // MCTS参数
  mctsParams: {
    iterations: number;
    explorationConstant: number;
    simulationDepth: number;
    perfectInformation?: boolean; // 完全信息模式
  };
  
  // LLM评估（如果有）
  llmEvaluation?: {
    quality: number;          // 0-1分
    reasoning: string;
    risks: string[];
    opportunities: string[];
    suggestions: string[];
  };
  
  // 结果标签
  outcome: {
    gameWon: boolean;
    roundScore: number;
    finalRank: number;
    quality: 'good' | 'neutral' | 'bad';
  };
  
  // 元数据
  metadata: {
    timestamp: number;
    trainingRound: number;
    modelVersion: string;
  };
}

/**
 * MCTS训练参数
 */
export interface MCTSTrainingParams {
  iterations: number;
  explorationConstant: number;
  simulationDepth: number;
  perfectInformation: boolean;
}

// ========== 聊天训练类型 ==========

/**
 * 聊天训练样本
 */
export interface ChatTrainingSample {
  // 输入
  gameState: {
    hand: Card[];
    lastPlay: Play | null;
    scores: number[];
    round: number;
    phase: 'early' | 'mid' | 'late' | 'critical';
  };
  
  trigger: 'after_decision' | 'after_play' | 'after_pass' | 'game_event' | 'idle';
  
  player: {
    id: number;
    personality: {
      preset: string;
      chattiness: number;
    };
    dialect?: string;
  };
  
  // LLM输入
  prompt: {
    systemPrompt: string;
    userPrompt: string;
    fullPrompt: string;
  };
  
  // LLM输出
  llmResponse: {
    raw: string;           // 原始响应
    processed: string;     // 处理后内容
    tokens: number;
    latency: number;
  };
  
  // 标签（需要人工或自动标注）
  labels: {
    quality: number;      // 0-1分
    relevance: number;    // 相关性 0-1
    diversity: number;     // 多样性 0-1
    engagement: number;   // 趣味性 0-1
    appropriateness: number; // 合适性 0-1
  };
  
  // 元数据
  metadata: {
    timestamp: number;
    trainingRound: number;
    modelVersion: string;
  };
}

/**
 * 聊天质量指标
 */
export interface ChatQualityMetrics {
  relevance: number;      // 相关性 0-1
  diversity: number;      // 多样性 0-1
  engagement: number;     // 趣味性 0-1
  appropriateness: number; // 合适性 0-1
  overall: number;        // 综合分数
}

/**
 * Prompt变体测试结果
 */
export interface PromptTestResult {
  prompt: string;
  metrics: ChatQualityMetrics;
  samples: ChatTrainingSample[];
  avgLatency: number;
}

// ========== 混合训练类型 ==========

/**
 * 混合训练数据
 */
export interface HybridTrainingData {
  // 打牌决策数据
  decision: {
    gameState: GameState;
    mctsDecision: Card[];
    llmEvaluation?: {
      quality: number;
      reasoning: string;
    };
    gameOutcome: {
      won: boolean;
      score: number;
      rank: number;
    };
  };
  
  // 聊天数据
  chat: {
    gameState: GameState;
    decision: Card[];
    chatMessage: string;
    chatQuality: ChatQualityMetrics;
  };
  
  // 关联性
  correlation: {
    // 决策质量与聊天质量的相关性
    decisionChatCorrelation: number;
    
    // 聊天是否准确反映了决策意图
    chatDecisionAlignment: number;
  };
}

// ========== 训练结果类型 ==========

/**
 * 训练轮次结果
 */
export interface TrainingRoundResult {
  round: number;
  games: number;
  decisions: number;
  chats: number;
  metrics: Partial<TrainingMetrics>;
  duration: number;        // 耗时（ms）
}

/**
 * 训练结果
 */
export interface TrainingResult {
  config: TrainingConfig;
  progress: TrainingProgress;
  metrics: TrainingMetrics;
  samples: {
    decisions?: DecisionTrainingSample[];
    chats?: ChatTrainingSample[];
  };
  bestParams?: {
    mcts?: MCTSTrainingParams;
    prompt?: string;
  };
  duration: number;        // 总耗时（ms）
}


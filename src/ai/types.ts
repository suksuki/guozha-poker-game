/**
 * AI模块类型定义
 */

import { Card, Play } from '../types/card';

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


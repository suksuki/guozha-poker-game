/**
 * AI Core 统一类型定义
 * 完全独立，不依赖任何UI框架
 */

import { Card, Play } from '../types/card';

// ==================== 游戏状态 ====================

export interface GameState {
  // 基础信息
  myHand: Card[];
  myPosition: number;
  playerCount: number;
  
  // 当前局面
  lastPlay: Play | null;
  lastPlayerId: number | null;
  currentPlayerId: number;
  
  // 历史
  playHistory: any[];
  roundNumber: number;
  
  // 对手信息
  opponentHandSizes: number[];
  
  // 团队模式
  teamMode: boolean;
  myTeamId?: number;
  
  // 得分
  currentRoundScore: number;
  cumulativeScores: Map<number, number>;
  
  // 阶段
  phase: 'early' | 'middle' | 'late' | 'critical';
}

// ==================== AI行为 ====================

export interface Decision {
  action: GameAction;
  reasoning: string;
  confidence: number;
  alternatives: GameAction[];
  sources: any[];
  timestamp: number;
  riskLevel: string;
}

export type GameAction = 
  | { type: 'play'; cards: Card[]; play: Play }
  | { type: 'pass' };

export interface CommunicationMessage {
  content: string;
  intent: CommunicationIntent;
  emotion?: Emotion;
  reasoning?: string;
  targetId?: number;
  timestamp: number;
}

export type CommunicationIntent =
  | 'tactical_signal'
  | 'strategic_discuss'
  | 'emotional_express'
  | 'social_chat'
  | 'taunt'
  | 'encourage'
  | 'celebrate';

export type Emotion =
  | 'confident'
  | 'cautious'
  | 'excited'
  | 'frustrated'
  | 'relaxed'
  | 'tense';

// ==================== AI配置 ====================

export interface AIPlayerConfig {
  id: number;
  personality: PersonalityConfig;
  decisionModules: string[];
  communicationEnabled: boolean;
}

export interface PersonalityConfig {
  preset?: 'aggressive' | 'conservative' | 'balanced' | 'adaptive';
  aggression?: number;
  cooperation?: number;
  riskTolerance?: number;
  chattiness?: number;
  toxicity?: number;
}

// ==================== 事件定义 ====================

export interface AIEvent {
  type: string;
  playerId?: number;
  data?: any;
  timestamp: number;
}

// ==================== 导出所有 ====================

export * from './infrastructure/monitoring/types';
export * from './infrastructure/knowledge/types';
export * from './infrastructure/data-collection/types';


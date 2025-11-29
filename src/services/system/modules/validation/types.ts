/**
 * 验证模块类型定义
 */

import { Player, Card, RoundRecord, RoundPlayRecord } from '../../../../types/card';

/**
 * 验证上下文
 */
export interface ValidationContext {
  players: Player[];
  allRounds: RoundRecord[];
  currentRoundPlays?: RoundPlayRecord[];
  initialHands?: Card[][];
  trigger: 'roundEnd' | 'gameEnd' | 'afterPlay' | 'manual';
  roundNumber?: number;
  context?: string;
  timestamp: number;
  gameId?: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  validatorName: string;
  timestamp: number;
  context: ValidationContext;
  errorMessage?: string;
  errors?: ValidationError[];
  stats?: ValidationStats;
  // 详细结果（根据验证器类型不同）
  details?: any;
}

/**
 * 验证错误
 */
export interface ValidationError {
  type: 'cardIntegrity' | 'scoreIntegrity' | 'duplicateCard';
  message: string;
  details?: any;
}

/**
 * 验证统计
 */
export interface ValidationStats {
  totalCardsExpected?: number;
  totalCardsFound?: number;
  missingCards?: number;
  duplicateCardsCount?: number;
  totalScore?: number;
  expectedTotalScore?: number;
  scoreDifference?: number;
}

/**
 * 牌数完整性验证结果（从 scoringService.ts 中提取）
 */
export interface CardValidationResult {
  isValid: boolean;
  totalCardsExpected: number;
  totalCardsFound: number;
  missingCards: number;
  playedCardsCount: number;
  playerHandsCount: number;
  duplicateCards: Array<{ card: Card; locations: string[] }>;
  errorMessage?: string;
  details: {
    playedCardsByRound: Array<{ roundNumber: number; count: number }>;
    playerHandsByPlayer: Array<{ playerId: number; playerName: string; count: number }>;
  };
}

/**
 * 分数完整性验证结果
 */
export interface ScoreValidationResult {
  isValid: boolean;
  totalScore: number;
  expectedTotalScore: number;
  scoreDifference: number;
  errorMessage?: string;
  details?: {
    playerScores: Array<{ id: number; name: string; score: number }>;
    initialTotalScore: number;
    totalScoreCards: number;
  };
}


/**
 * 验证工具函数
 * 统一处理游戏状态验证逻辑
 */

import { Player, RoundRecord, Card } from '../types/card';
import { validateCardIntegrity, validateAllRoundsOnUpdate, CardValidationResult } from '../services/scoringService';

/**
 * 验证轮次结束时的牌数完整性
 * @returns 验证结果，用于需要进一步处理验证错误的场景
 */
export function validateRoundEnd(
  players: Player[],
  allRounds: RoundRecord[],
  playerCount: number,
  initialHands: Card[][] | undefined,
  context: string
): CardValidationResult {
  validateAllRoundsOnUpdate(
    players,
    allRounds,
    [],
    initialHands,
    context
  );
  
  const roundEndValidationResult = validateCardIntegrity(
    players,
    allRounds,
    [],
    playerCount,
    initialHands
  );
  
  if (!roundEndValidationResult.isValid) {
  } else {
  }
  
  return roundEndValidationResult;
}

/**
 * 验证游戏结束时的牌数完整性
 * @returns 验证结果，用于需要进一步处理验证错误的场景
 */
export function validateGameEnd(
  players: Player[],
  allRounds: RoundRecord[],
  playerCount: number,
  initialHands: Card[][] | undefined,
  context: string
): CardValidationResult {
  const validationResult = validateCardIntegrity(
    players,
    allRounds,
    [],
    playerCount,
    initialHands
  );
  
  if (!validationResult.isValid) {
  } else {
  }
  
  return validationResult;
}


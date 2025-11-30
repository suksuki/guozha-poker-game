/**
 * 分数完整性验证器
 */

import { Player, Card, Rank } from '../../../../../types/card';
import { ScoreValidationResult } from '../types';

/**
 * 验证分数完整性
 */
export function validateScoreIntegrityCore(
  players: Player[],
  initialHands?: Card[][],
  tolerance: number = 0.01
): ScoreValidationResult {
  // 所有玩家的分数总和应该为0
  const totalScore = players.reduce((sum, player) => sum + (player.score || 0), 0);
  
  // 计算初始分数总和（每个玩家-100）
  const initialTotalScore = -100 * players.length;
  
  // 计算分牌总分（从初始手牌中计算）
  let totalScoreCards = 0;
  if (initialHands) {
    initialHands.forEach(hand => {
      hand.forEach(card => {
        if (card.rank === Rank.FIVE) {
          totalScoreCards += 5;
        } else if (card.rank === Rank.TEN || card.rank === Rank.KING) {
          totalScoreCards += 10;
        }
      });
    });
  }
  
  // 验证分数总和是否为0（允许小的浮点数误差）
  const scoreDifference = Math.abs(totalScore);
  const isValid = scoreDifference <= tolerance;
  
  let errorMessage: string | undefined;
  if (!isValid) {
    errorMessage = `分数总和不为0！当前总和=${totalScore}，期望=0，差异=${scoreDifference}`;
  }
  
  return {
    isValid,
    totalScore,
    expectedTotalScore: 0,
    scoreDifference,
    errorMessage,
    details: {
      playerScores: players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score || 0
      })),
      initialTotalScore,
      totalScoreCards
    }
  };
}


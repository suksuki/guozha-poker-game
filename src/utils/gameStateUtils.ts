/**
 * 游戏状态工具函数
 * 包含游戏状态相关的辅助函数
 */

import { Player, GameStatus } from '../types/card';
import { applyFinalGameRules, calculateFinalRankings } from './gameRules';

export interface MultiPlayerGameState {
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  lastPlay: any;
  lastPlayPlayerIndex: number | null;
  winner: number | null;
  playerCount: number;
  totalScore: number;
  roundScore: number;
  currentRoundPlays: any[];
  roundNumber: number;
  finishOrder: number[];
  finalRankings?: any[];
  gameRecord?: any;
  initialHands?: any[][];
  allRounds?: any[];
}

/**
 * 找到下一个还在游戏中的玩家（跳过已出完牌的玩家）
 */
export function findNextActivePlayer(
  startIndex: number,
  players: Player[],
  playerCount: number
): number {
  let nextPlayerIndex = (startIndex + 1) % playerCount;
  let attempts = 0;
  // 跳过所有已出完的玩家
  while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
    nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
    attempts++;
  }
  // 如果所有玩家都出完了，返回startIndex（不应该发生，但作为保护）
  if (attempts >= playerCount) {
    return startIndex;
  }
  return nextPlayerIndex;
}

/**
 * 检查游戏是否真正结束（所有玩家都出完牌）并应用最终规则
 */
export function checkGameFinished(
  prevState: MultiPlayerGameState,
  newPlayers: Player[],
  finishOrder: number[]
): MultiPlayerGameState | null {
  // 检查是否所有玩家都出完牌了
  const allFinished = newPlayers.every(player => player.hand.length === 0);
  
  if (allFinished) {
    // 所有玩家都出完了，应用最终规则
    const finalPlayers = applyFinalGameRules(newPlayers, finishOrder);
    const finalRankings = calculateFinalRankings(finalPlayers, finishOrder);
    
    // 找到第一名（分数最高的）
    const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
    
    return {
      ...prevState,
      status: GameStatus.FINISHED,
      players: finalPlayers,
      winner: winner.player.id,
      finishOrder,
      finalRankings
    };
  }
  
  return null; // 游戏还没结束
}


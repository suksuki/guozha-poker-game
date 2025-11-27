/**
 * 游戏状态工具函数
 * 包含游戏状态相关的辅助函数
 */

import { Player, GameStatus, Card, Play } from '../types/card';
import { applyFinalGameRules, calculateFinalRankings } from './gameRules';
import { hasPlayableCards } from './cardUtils';

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
 * @returns 下一个还在游戏中的玩家索引，如果所有玩家都出完了则返回 null
 */
export function findNextActivePlayer(
  startIndex: number,
  players: Player[],
  playerCount: number
): number | null {
  let nextPlayerIndex = (startIndex + 1) % playerCount;
  let attempts = 0;
  // 跳过所有已出完的玩家
  while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
    nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
    attempts++;
  }
  // 如果所有玩家都出完了，返回 null（调用者应该检查并结束游戏）
  if (attempts >= playerCount) {
    return null;
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

/**
 * 检查所有剩余玩家是否都要不起（用于接风状态下的死循环检测）
 * @param currentPlayerIndex 当前玩家索引
 * @param players 玩家数组
 * @param playerCount 玩家总数
 * @param lastPlay 上家出的牌（null 表示接风状态）
 * @returns 如果所有剩余玩家都要不起，返回 true
 */
export function checkAllRemainingPlayersPassed(
  currentPlayerIndex: number,
  players: Player[],
  playerCount: number,
  lastPlay: Play | null
): boolean {
  // 获取所有还在游戏中的玩家（排除当前玩家）
  const remainingPlayers = players.filter((p, idx) => 
    p.hand.length > 0 && idx !== currentPlayerIndex
  );
  
  // 如果只剩一个玩家，不需要检测
  if (remainingPlayers.length <= 1) {
    return false;
  }
  
  // 检查所有剩余玩家是否都要不起
  const allPassed = remainingPlayers.every(player => {
    if (lastPlay === null) {
      // 接风状态，应该能出牌（至少能出单张）
      // 如果手牌为空，说明已经出完了，不应该在这里
      return player.hand.length === 0;
    } else {
      // 有上家出牌，检查是否能打过
      return !hasPlayableCards(player.hand, lastPlay);
    }
  });
  
  return allPassed;
}


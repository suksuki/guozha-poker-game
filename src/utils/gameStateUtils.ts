/**
 * 游戏状态工具函数
 * 包含游戏状态相关的辅助函数
 */

import { Player, GameStatus, Play, RoundPlayRecord } from '../types/card';
import { hasPlayableCards } from './cardUtils';
import { Round } from './Round';
import { Game } from './Game';

// ========== 辅助方法：从 Game 实例获取数据 ==========

/**
 * 获取当前轮次对象
 */
export function getCurrentRound(game: Game): Round | undefined {
  return game.getCurrentRound();
}

/**
 * 获取当前轮次的出牌记录
 */
export function getCurrentRoundPlays(game: Game): RoundPlayRecord[] {
  const round = getCurrentRound(game);
  return round ? Array.from(round.getPlays()) : [];
}

/**
 * 获取当前轮次的分数
 */
export function getCurrentRoundScore(game: Game): number {
  const round = getCurrentRound(game);
  return round ? round.getTotalScore() : 0;
}

/**
 * 获取最后出的牌
 */
export function getLastPlay(game: Game): Play | null {
  const round = getCurrentRound(game);
  return round ? round.getLastPlay() : null;
}

/**
 * 获取最后出牌的玩家索引
 */
export function getLastPlayPlayerIndex(game: Game): number | null {
  const round = getCurrentRound(game);
  return round ? round.getLastPlayPlayerIndex() : null;
}

/**
 * 获取当前轮次号
 */
export function getCurrentRoundNumber(game: Game): number {
  const round = getCurrentRound(game);
  return round ? round.roundNumber : 0;
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
 * 检查游戏是否真正结束（所有玩家都出完牌）
 * 
 * 新架构下，此函数只负责返回"是否所有玩家都出完牌"的信号，
 * 不再应用最终规则或修改分数/排名。最终计分和排名统一由 GameController 处理。
 */
export function checkGameFinished(
  game: Game,
  newPlayers: Player[],
  finishOrder: number[]
): { status: GameStatus; finishOrder: number[] } | null {
  // 检查是否所有玩家都出完牌了
  const allFinished = newPlayers.every(player => player.hand.length === 0);
  
  if (allFinished) {
    // 只返回状态为 FINISHED 的信号和最新的 finishOrder，
    // 真正的计分和排名由外部的 GameController 统一处理
    return {
      status: GameStatus.FINISHED,
      finishOrder
    };
  }
  
  return null; // 游戏还没结束
}

/**
 * 根据轮次号查找轮次在数组中的索引
 */
export function findRoundIndex(rounds: Round[], roundNumber: number): number {
  return rounds.findIndex(r => r.roundNumber === roundNumber);
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


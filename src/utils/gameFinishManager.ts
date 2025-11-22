/**
 * 游戏结束管理工具函数
 * 处理玩家出完牌、最终排名等逻辑
 */

import { Player, Card } from '../types/card';
import { MultiPlayerGameState, checkGameFinished } from './gameStateUtils';
import { findNextActivePlayer } from './gameStateUtils';
import { isScoreCard, calculateCardsScore } from './cardUtils';

/**
 * 处理玩家出完牌后的逻辑
 * 包括：记录完成顺序、分配分数、检查游戏是否结束、处理接风等
 */
export function handlePlayerFinished(
  prevState: MultiPlayerGameState,
  playerIndex: number,
  newPlayers: Player[],
  playScore: number,
  playRecord: any,
  play: any
): MultiPlayerGameState {
  // 玩家出完牌，记录到完成顺序
  const newFinishOrder = [...(prevState.finishOrder || []), playerIndex];
  
  // 把轮次分数给获胜者（包括当前这一手的分牌）
  const finalScore = (newPlayers[playerIndex].score || 0) + prevState.roundScore + playScore;
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    score: finalScore
  };
  
  // 检查是否只剩下一个玩家还没出完（即最后一个玩家）
  const remainingPlayers = newPlayers.filter(p => p.hand.length > 0);
  
  // 如果只剩下一个玩家还没出完，那就是最后一名，立即结束游戏
  if (remainingPlayers.length === 1) {
    const lastPlayerIndex = remainingPlayers[0].id;
    const lastPlayer = newPlayers[lastPlayerIndex];
    
    // 计算最后一名手中的分牌分数
    const lastPlayerScoreCards = lastPlayer.hand.filter(card => isScoreCard(card));
    const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);
    
    // 最后一名减去未出分牌的分数
    newPlayers[lastPlayerIndex] = {
      ...lastPlayer,
      score: (lastPlayer.score || 0) - lastPlayerRemainingScore
    };
    
    // 找到第二名（finishOrder中的第二个，即索引1）
    if (newFinishOrder.length >= 2) {
      const secondPlayerIndex = newFinishOrder[1];
      const secondPlayer = newPlayers[secondPlayerIndex];
      if (secondPlayer) {
        // 第二名加上最后一名未出的分牌分数
        newPlayers[secondPlayerIndex] = {
          ...secondPlayer,
          score: (secondPlayer.score || 0) + lastPlayerRemainingScore
        };
      }
    }
    
    // 最后一个玩家也出完了，游戏结束
    const gameFinished = checkGameFinished(prevState, newPlayers, newFinishOrder);
    if (gameFinished) {
      return gameFinished;
    }
  }
  
  // 检查是否所有玩家都出完了
  const gameFinished = checkGameFinished(prevState, newPlayers, newFinishOrder);
  if (gameFinished) {
    return gameFinished;
  }
  
  // 还没全部出完，找到下一个还在游戏中的玩家（接风）
  const nextPlayerIndex = findNextActivePlayer(playerIndex, newPlayers, prevState.playerCount);
  
  // 返回更新后的状态（接风逻辑由调用者处理）
  return {
    ...prevState,
    players: newPlayers,
    currentPlayerIndex: nextPlayerIndex,
    finishOrder: newFinishOrder
  };
}

/**
 * 检查是否需要接风（所有剩余玩家都要不起）
 */
export function shouldTakeover(
  players: Player[],
  currentPlayerIndex: number,
  lastPlay: any,
  hasPlayableCards: (hand: Card[], lastPlay: any) => boolean
): boolean {
  // 检查是否所有剩余玩家都要不起这一手牌
  for (let i = 0; i < players.length; i++) {
    if (players[i].hand.length > 0 && i !== currentPlayerIndex) {
      const hasPlayable = hasPlayableCards(players[i].hand, lastPlay);
      if (hasPlayable) {
        return false; // 有人能打过，不需要接风
      }
    }
  }
  return true; // 所有人都要不起，需要接风
}


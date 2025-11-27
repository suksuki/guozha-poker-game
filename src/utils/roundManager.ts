/**
 * 轮次管理工具函数
 * 处理轮次结束、分数分配等逻辑
 */

import { Player, RoundRecord, RoundPlayRecord } from '../types/card';
import { MultiPlayerGameState } from './gameStateUtils';
import { findNextActivePlayer } from './gameStateUtils';

/**
 * 处理一轮结束的逻辑
 * 当所有玩家都要不起，回到最后出牌的人时，分配分数并开始新轮次
 */
export function handleRoundEnd(
  prevState: MultiPlayerGameState,
  nextPlayerIndex: number,
  newPlayers: Player[]
): MultiPlayerGameState | null {
  // 如果一轮结束（回到最后出牌的人），把分数给最后出牌的人
  if (nextPlayerIndex === prevState.lastPlayPlayerIndex) {
    if (prevState.lastPlayPlayerIndex !== null && prevState.roundScore > 0) {
      const lastPlayer = newPlayers[prevState.lastPlayPlayerIndex];
      if (lastPlayer) {
        // 创建轮次记录
        const roundRecord: RoundRecord = {
          roundNumber: prevState.roundNumber,
          plays: [...prevState.currentRoundPlays],
          totalScore: prevState.roundScore,
          winnerId: prevState.lastPlayPlayerIndex,
          winnerName: lastPlayer.name
        };
        
        newPlayers[prevState.lastPlayPlayerIndex] = {
          ...lastPlayer,
          score: (lastPlayer.score || 0) + prevState.roundScore,
          wonRounds: [...(lastPlayer.wonRounds || []), roundRecord]
        };
        
        // 保存轮次记录到allRounds
        const updatedAllRounds = [...(prevState.allRounds || []), roundRecord];
        
        // 一轮结束，由赢家开始下一轮
        const winnerIndex = prevState.lastPlayPlayerIndex;
        // 确保赢家还没有出完牌，如果出完了，找下一个还在游戏中的玩家
        const nextActivePlayerIndex = newPlayers[winnerIndex]?.hand.length > 0 
          ? winnerIndex 
          : findNextActivePlayer(winnerIndex, newPlayers, prevState.playerCount);
        
        return {
          ...prevState,
          players: newPlayers,
          currentPlayerIndex: nextActivePlayerIndex, // 由赢家（或下一个还在游戏中的玩家）开始下一轮
          lastPlay: null, // 新轮次，清空lastPlay
          lastPlayPlayerIndex: null, // 新轮次，清空lastPlayPlayerIndex
          roundScore: 0, // 新轮次，重置分数
          currentRoundPlays: [], // 新轮次，清空当前轮次出牌记录
          roundNumber: prevState.roundNumber + 1, // 新轮次
          allRounds: updatedAllRounds,
          gameRecord: prevState.gameRecord ? {
            ...prevState.gameRecord,
            allRounds: updatedAllRounds
          } : prevState.gameRecord
        };
      }
    }
    
    // 即使没有分数，也要开始下一轮
    const winnerIndex = prevState.lastPlayPlayerIndex;
    const nextActivePlayerIndex = newPlayers[winnerIndex]?.hand.length > 0 
      ? winnerIndex 
      : findNextActivePlayer(winnerIndex, newPlayers, prevState.playerCount);
    
    return {
      ...prevState,
      players: newPlayers,
      currentPlayerIndex: nextActivePlayerIndex, // 由赢家（或下一个还在游戏中的玩家）开始下一轮
      lastPlay: null, // 新轮次，清空lastPlay
      lastPlayPlayerIndex: null, // 新轮次，清空lastPlayPlayerIndex
      roundScore: 0, // 新轮次，重置分数
      currentRoundPlays: [], // 新轮次，清空当前轮次出牌记录
      roundNumber: prevState.roundNumber + 1, // 新轮次
    };
  }
  
  return null; // 不是轮次结束
}

/**
 * 处理玩家出完牌后的接风逻辑
 * 检查是否所有剩余玩家都要不起，如果是则接风（清空lastPlay）
 */
export function checkAndHandleTakeover(
  players: Player[],
  currentPlayerIndex: number,
  lastPlay: any
): boolean {
  // 检查是否所有剩余玩家都要不起这一手牌
  for (let i = 0; i < players.length; i++) {
    if (players[i].hand.length > 0 && i !== currentPlayerIndex) {
      // 需要导入 hasPlayableCards
      // 这里先返回 false，实际使用时需要传入 hasPlayableCards 函数
      // const hasPlayable = hasPlayableCards(players[i].hand, lastPlay);
      // if (hasPlayable) {
      //   return false;
      // }
    }
  }
  return true; // 所有人都要不起，需要接风
}


/**
 * 游戏结束处理工具函数
 * 统一处理游戏结束时的逻辑，包括：
 * 1. 保存当前轮次记录
 * 2. 处理末游玩家的剩余手牌和分数
 * 3. 创建模拟轮
 * 4. 清空所有玩家手牌
 * 5. 验证牌数完整性
 */

import { Player, RoundRecord, RoundPlayRecord, Card } from '../types/card';
import { isScoreCard, calculateCardsScore } from './cardUtils';
import { validateAllRoundsOnUpdate } from '../services/scoringService';
import { applyFinalGameRules } from './gameRules';
import { GameStatus } from '../types/card';

export interface GameEndParams {
  prevState: {
    status: GameStatus;
    players: Player[];
    finishOrder: number[];
    allRounds?: RoundRecord[];
    currentRoundPlays?: RoundPlayRecord[];
    roundNumber: number;
    roundScore: number;
    lastPlayPlayerIndex: number | null;
    initialHands?: Card[][];
  };
  lastPlayerIndex: number;
  lastPlayer: Player;
  context: string; // 用于日志和验证的上下文信息
}

export interface GameEndResult {
  status: GameStatus.FINISHED;
  players: Player[];
  winner: number;
  finishOrder: number[];
  finalRankings: any[];
  allRounds: RoundRecord[];
}

/**
 * 处理游戏结束逻辑
 * 统一处理所有游戏结束场景
 */
export function handleGameEnd(params: GameEndParams): GameEndResult {
  const { prevState, lastPlayerIndex, lastPlayer, context } = params;
  
  if (prevState.status !== GameStatus.PLAYING) {
    throw new Error(`Invalid game status: ${prevState.status}`);
  }

  let newPlayers = [...prevState.players];
  const newFinishOrder = [...prevState.finishOrder];
  let updatedAllRounds = [...(prevState.allRounds || [])];

  // 1. 确保所有玩家都在finishOrder中
  // 首先，如果最后一名还没在finishOrder中，添加进去
  if (!newFinishOrder.includes(lastPlayerIndex)) {
    newFinishOrder.push(lastPlayerIndex);
  }
  
  // 检查是否有其他玩家不在finishOrder中（这种情况不应该发生，但为了安全起见）
  const allPlayerIds = newPlayers.map(p => p.id);
  const missingPlayers = allPlayerIds.filter(id => !newFinishOrder.includes(id));
  if (missingPlayers.length > 0) {
    console.warn(`[GameEnd] ${context} - 发现不在finishOrder中的玩家:`, {
      missingPlayers,
      currentFinishOrder: newFinishOrder,
      allPlayerIds
    });
    // 将缺失的玩家添加到finishOrder末尾（按玩家ID顺序）
    missingPlayers.sort((a, b) => a - b);
    missingPlayers.forEach(id => {
      if (!newFinishOrder.includes(id)) {
        newFinishOrder.push(id);
      }
    });
  }
  
  console.log(`[GameEnd] ${context} - finishOrder验证:`, {
    finishOrderLength: newFinishOrder.length,
    playerCount: newPlayers.length,
    finishOrder: newFinishOrder,
    allPlayerIds,
    isComplete: newFinishOrder.length === newPlayers.length
  });

  // 2. 如果当前轮次还有未保存的出牌记录，先保存到 allRounds
  console.log(`[GameEnd] ${context} - 检查当前轮次记录:`, {
    hasCurrentRoundPlays: !!prevState.currentRoundPlays,
    currentRoundPlaysCount: prevState.currentRoundPlays?.length || 0,
    lastPlayPlayerIndex: prevState.lastPlayPlayerIndex,
    roundNumber: prevState.roundNumber,
    roundScore: prevState.roundScore,
    currentRoundPlaysDetail: prevState.currentRoundPlays?.map((play, idx) => ({
      index: idx,
      playerId: play.playerId,
      playerName: play.playerName,
      cardsCount: play.cards?.length || 0,
      cards: play.cards?.map(c => `${c.suit}-${c.rank}`).slice(0, 5) || []
    })) || []
  });
  
  if (prevState.currentRoundPlays && prevState.currentRoundPlays.length > 0) {
    // 如果 lastPlayPlayerIndex 为 null，使用最后一名玩家作为 winnerId
    const winnerId = prevState.lastPlayPlayerIndex !== null 
      ? prevState.lastPlayPlayerIndex 
      : lastPlayerIndex;
    const lastPlayerInRound = newPlayers[winnerId];
    
    const roundRecord: RoundRecord = {
      roundNumber: prevState.roundNumber,
      plays: [...prevState.currentRoundPlays],
      totalScore: prevState.roundScore,
      winnerId: winnerId,
      winnerName: lastPlayerInRound?.name || `玩家${winnerId + 1}`
    };
    
    // 如果有分数，给最后出牌的人
    if (prevState.roundScore > 0 && lastPlayerInRound) {
      newPlayers[winnerId] = {
        ...lastPlayerInRound,
        score: (lastPlayerInRound.score || 0) + prevState.roundScore,
        wonRounds: [...(lastPlayerInRound.wonRounds || []), roundRecord]
      };
    }
    
    // 保存轮次记录到allRounds
    updatedAllRounds = [...updatedAllRounds, roundRecord];
    
    // 验证保存的牌数
    const totalCardsInRoundRecord = roundRecord.plays.reduce((sum, p) => sum + (p.cards?.length || 0), 0);
    const totalCardsInCurrentRoundPlays = prevState.currentRoundPlays.reduce((sum, p) => sum + (p.cards?.length || 0), 0);
    
    if (totalCardsInRoundRecord !== totalCardsInCurrentRoundPlays) {
      console.error(`[GameEnd] ${context} - ⚠️ 保存的牌数与当前轮次牌数不一致！`, {
        roundNumber: prevState.roundNumber,
        totalCardsInRoundRecord,
        totalCardsInCurrentRoundPlays,
        difference: totalCardsInRoundRecord - totalCardsInCurrentRoundPlays
      });
    }
    
    console.log(`[GameEnd] ${context} - 保存最后一轮出牌记录到 allRounds:`, {
      roundNumber: prevState.roundNumber,
      playsCount: prevState.currentRoundPlays.length,
      totalCardsInRound: totalCardsInRoundRecord,
      totalScore: prevState.roundScore,
      winnerId: winnerId,
      winnerName: lastPlayerInRound?.name,
      playsDetail: prevState.currentRoundPlays.map((play, idx) => ({
        index: idx,
        playerId: play.playerId,
        playerName: play.playerName,
        cardsCount: play.cards?.length || 0,
        cards: play.cards?.map(c => `${c.suit}-${c.rank}`).slice(0, 5) || [] // 显示前5张
      }))
    });
  } else {
    console.log(`[GameEnd] ${context} - 当前轮次没有未保存的出牌记录，跳过保存`);
  }

  // 3. 计算最后一名手中的分牌分数
  const lastPlayerScoreCards = lastPlayer.hand.filter(card => isScoreCard(card));
  const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);

  console.log(`[GameEnd] ${context} - 最后一名玩家剩余分牌统计:`, {
    lastPlayerIndex,
    lastPlayerName: lastPlayer.name,
    lastPlayerCurrentScore: lastPlayer.score || 0,
    lastPlayerHandCount: lastPlayer.hand.length,
    lastPlayerScoreCardsCount: lastPlayerScoreCards.length,
    lastPlayerRemainingScore,
    scoreCardsDetail: lastPlayerScoreCards.map(c => ({ rank: c.rank, suit: c.suit, score: calculateCardsScore([c]) })),
    finishOrder: newFinishOrder
  });

  // 4. 最后一名减去未出分牌的分数
  const lastPlayerNewScore = (lastPlayer.score || 0) - lastPlayerRemainingScore;
  newPlayers[lastPlayerIndex] = {
    ...lastPlayer,
    score: lastPlayerNewScore
  };

  // 5. 找到第二名并加上最后一名未出的分牌分数
  if (newFinishOrder.length >= 2) {
    const secondPlayerIndex = newFinishOrder[1];
    const secondPlayer = newPlayers[secondPlayerIndex];
    if (secondPlayer) {
      const secondPlayerOldScore = secondPlayer.score || 0;
      const secondPlayerNewScore = secondPlayerOldScore + lastPlayerRemainingScore;
      newPlayers[secondPlayerIndex] = {
        ...secondPlayer,
        score: secondPlayerNewScore
      };
      console.log(`[GameEnd] ${context} - 分数转移: 最后一名(${lastPlayer.name}) -${lastPlayerRemainingScore}分, 第二名(${secondPlayer.name}) +${lastPlayerRemainingScore}分`, {
        lastPlayerScore: lastPlayerNewScore,
        secondPlayerScore: secondPlayerNewScore,
        scoreTransfer: lastPlayerRemainingScore
      });
    }
  } else if (newFinishOrder.length === 1 && lastPlayerRemainingScore > 0) {
    // 如果只有1个玩家出完了，给第一个出完的玩家（即第一名）
    const firstPlayerIndex = newFinishOrder[0];
    const firstPlayer = newPlayers[firstPlayerIndex];
    if (firstPlayer) {
      const firstPlayerOldScore = firstPlayer.score || 0;
      const firstPlayerNewScore = firstPlayerOldScore + lastPlayerRemainingScore;
      console.log(`[GameEnd] ${context} - 只有1个玩家出完，将最后一名剩余${lastPlayerRemainingScore}分给第一名(${firstPlayer.name})`, {
        lastPlayerScore: lastPlayerNewScore,
        firstPlayerScore: firstPlayerNewScore,
        scoreTransfer: lastPlayerRemainingScore
      });
      newPlayers[firstPlayerIndex] = {
        ...firstPlayer,
        score: firstPlayerNewScore
      };
    }
  }

  // 验证分数转移后的总和（应该保持不变）
  const totalScoreAfterTransfer = newPlayers.reduce((sum, p) => sum + (p.score || 0), 0);
  const totalScoreBeforeTransfer = prevState.players.reduce((sum, p) => sum + (p.score || 0), 0);
  console.log(`[GameEnd] ${context} - 分数转移验证:`, {
    totalScoreBeforeTransfer,
    totalScoreAfterTransfer,
    difference: totalScoreAfterTransfer - totalScoreBeforeTransfer,
    expectedDifference: 0
  });

  // 6. 创建模拟轮（如果末游有剩余手牌）
  if (lastPlayer.hand.length > 0) {
    const lastPlayerRemainingCards = [...lastPlayer.hand]; // 复制数组，避免引用问题
    const lastPlayerScoreCards = lastPlayerRemainingCards.filter(card => isScoreCard(card));
    
    // 找到第二名（用于模拟轮的winnerId）
    const secondPlayerIndex = newFinishOrder.length >= 2 ? newFinishOrder[1] : newFinishOrder[0];
    const secondPlayer = newPlayers[secondPlayerIndex];
    
    const lastPlayerRoundRecord: RoundRecord = {
      roundNumber: prevState.roundNumber + 1,
      plays: [{
        playerId: lastPlayerIndex,
        playerName: lastPlayer.name,
        cards: lastPlayerRemainingCards, // 确保所有牌都被记录
        scoreCards: lastPlayerScoreCards,
        score: lastPlayerRemainingScore
      }],
      totalScore: 0, // 模拟轮没有分数（分数已经在前面处理过了）
      winnerId: secondPlayerIndex, // 这轮的 winner 是第二名（分数给第二名）
      winnerName: secondPlayer?.name || `玩家${secondPlayerIndex + 1}`
    };
    
    updatedAllRounds = [...updatedAllRounds, lastPlayerRoundRecord];
    
    console.log(`[GameEnd] ${context} - 创建模拟轮（最后一轮）:`, {
      roundNumber: prevState.roundNumber + 1,
      lastPlayerId: lastPlayerIndex,
      lastPlayerName: lastPlayer.name,
      cardsCount: lastPlayerRemainingCards.length,
      cardsDetail: lastPlayerRemainingCards.map(c => `${c.suit}-${c.rank}`).slice(0, 10), // 显示前10张
      scoreCardsCount: lastPlayerScoreCards.length,
      score: lastPlayerRemainingScore,
      winnerId: secondPlayerIndex,
      winnerName: secondPlayer?.name,
      roundRecordPlaysCount: lastPlayerRoundRecord.plays.length,
      roundRecordCardsCount: lastPlayerRoundRecord.plays.reduce((sum, p) => sum + (p.cards?.length || 0), 0)
    });
  } else {
    console.log(`[GameEnd] ${context} - 最后一名玩家没有剩余手牌，不需要创建模拟轮`);
  }

  // 7. 清空所有玩家的手牌（模拟轮后，所有牌都已经记录到 allRounds 中了）
  newPlayers = newPlayers.map(player => ({
    ...player,
    hand: []
  }));
  
  console.log(`[GameEnd] ${context} - 模拟轮后，清空所有玩家的手牌`);

  // 8. 验证牌数完整性（现在所有玩家的手牌都已经是空的了，这是真正的统计点）
  validateAllRoundsOnUpdate(
    newPlayers,
    updatedAllRounds,
    [], // 游戏结束，currentRoundPlays 已保存到 allRounds
    prevState.initialHands,
    `${context} - 模拟轮后统计`
  );

  // 9. 应用最终规则并结束游戏
  // 在应用最终规则前，记录当前分数总和
  const totalScoreBeforeFinalRules = newPlayers.reduce((sum, p) => sum + (p.score || 0), 0);
  console.log(`[GameEnd] ${context} - 应用最终规则前的分数总和: ${totalScoreBeforeFinalRules}`, {
    players: newPlayers.map(p => ({ id: p.id, name: p.name, score: p.score || 0 }))
  });

  const { players: finalPlayers, rankings: finalRankings } = applyFinalGameRules(newPlayers, newFinishOrder);

  // 验证应用最终规则后的分数总和
  const totalScoreAfterFinalRules = finalPlayers.reduce((sum, p) => sum + (p.score || 0), 0);
  console.log(`[GameEnd] ${context} - 应用最终规则后的分数总和: ${totalScoreAfterFinalRules}`, {
    players: finalPlayers.map(p => ({ id: p.id, name: p.name, score: p.score || 0 })),
    rankings: finalRankings.map(r => ({ id: r.player.id, name: r.player.name, finalScore: r.finalScore, rank: r.rank }))
  });

  // 10. 找到第一名（分数最高的）
  const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];

  return {
    status: GameStatus.FINISHED,
    players: finalPlayers, // applyFinalGameRules 返回的 players 已经是 Player[] 类型
    winner: winner.player.id,
    finishOrder: newFinishOrder,
    finalRankings,
    allRounds: updatedAllRounds
  };
}


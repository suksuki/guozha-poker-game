/**
 * 游戏结束处理工具函数（旧版兼容模块）
 * 
 * ⚠️ 注意：此模块已被新流程废弃
 * 新流程统一使用：checkGameFinished + GameController.calculateFinalScoresAndRankings
 * 
 * 此模块保留仅用于：
 * - 旧版代码兼容
 * - 参考实现（如需了解旧版结束逻辑）
 * 
 * 原功能包括：
 * 1. 保存当前轮次记录
 * 2. 处理末游玩家的剩余手牌和分数
 * 3. 验证牌数完整性（保留玩家手牌，不清空）
 */

import { Player, RoundRecord, RoundPlayRecord, Card } from '../types/card';
import { isScoreCard, calculateCardsScore } from './cardUtils';
import { validateAllRoundsOnUpdate, validateScoreIntegrity } from '../services/scoringService';
import { applyFinalGameRules } from './gameRules';
import { GameStatus } from '../types/card';
import { Round } from './Round';

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
  rounds: Round[];  // 所有轮次的 Round 对象数组
  currentRoundIndex: number;  // 当前轮次索引（游戏结束时指向最后一个轮次）
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
    // 将缺失的玩家添加到finishOrder末尾（按玩家ID顺序）
    missingPlayers.sort((a, b) => a - b);
    missingPlayers.forEach(id => {
      if (!newFinishOrder.includes(id)) {
        newFinishOrder.push(id);
      }
    });
  }

  // 2. 如果当前轮次还有未保存的出牌记录，先保存到 allRounds
  
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
    }
  } else {
  }

  // 3. 计算最后一名手中的分牌分数
  // ⚠️ 注意：这个逻辑现在由 GameController.handleLastPlayerRemainingScore 统一处理
  // 新流程（checkGameFinished + GameController.calculateFinalScoresAndRankings）不会调用 handleGameEnd
  // 这里的代码保留仅用于旧版兼容，新流程中不会执行到这里
  // 分牌规则：5=5分，10=10分，K=10分（8不是分牌，不计分）
  // 例如：末游手上有一个10，一个K，两个8，那么这20分（10+10）应该给第二名
  const lastPlayerScoreCards = lastPlayer.hand.filter(card => isScoreCard(card));
  const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);

  // 4. 最后一名减去未出分牌的分数
  const lastPlayerNewScore = (lastPlayer.score || 0) - lastPlayerRemainingScore;
  newPlayers[lastPlayerIndex] = {
    ...lastPlayer,
    score: lastPlayerNewScore
  };

  // 5. 找到第二名并加上最后一名未出的分牌分数
  // 规则：末游最后手牌的分牌分数，加给第二名（出牌顺序的第二名，即finishOrder[1]）
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
    }
  } else if (newFinishOrder.length === 1 && lastPlayerRemainingScore > 0) {
    // 如果只有1个玩家出完了，给第一个出完的玩家（即第一名）
    const firstPlayerIndex = newFinishOrder[0];
    const firstPlayer = newPlayers[firstPlayerIndex];
    if (firstPlayer) {
      const firstPlayerOldScore = firstPlayer.score || 0;
      const firstPlayerNewScore = firstPlayerOldScore + lastPlayerRemainingScore;
      newPlayers[firstPlayerIndex] = {
        ...firstPlayer,
        score: firstPlayerNewScore
      };
    }
  }

  // 验证分数转移后的总和（应该保持不变）
  const totalScoreAfterTransfer = newPlayers.reduce((sum, p) => sum + (p.score || 0), 0);
  const totalScoreBeforeTransfer = prevState.players.reduce((sum, p) => sum + (p.score || 0), 0);

  // 6. 验证牌数完整性（保留所有玩家的手牌，不清空）
  // 这样验证时能够正确统计所有牌：allRounds中的牌 + 玩家手牌 = 初始总牌数
  validateAllRoundsOnUpdate(
    newPlayers,
    updatedAllRounds,
    [], // 游戏结束，currentRoundPlays 已保存到 allRounds
    prevState.initialHands,
    `${context} - 游戏结束统计`
  );

  // 9. 应用最终规则并结束游戏
  // 在应用最终规则前，记录当前分数总和
  const totalScoreBeforeFinalRules = newPlayers.reduce((sum, p) => sum + (p.score || 0), 0);

  const { players: finalPlayers, rankings: finalRankings } = applyFinalGameRules(newPlayers, newFinishOrder);

  // 验证应用最终规则后的分数总和（使用独立的分数验证函数）
  validateScoreIntegrity(
    finalPlayers,
    prevState.initialHands,
    `${context} - 应用最终规则后`
  );

  // 10. 找到第一名（分数最高的）
  const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];

  // 11. 将 RoundRecord[] 转换为 Round[]，适配新的状态结构
  const rounds: Round[] = updatedAllRounds.map((record, index) => {
    // 使用 Round.fromRecord 从记录恢复 Round 对象
    // 对于已结束的轮次，startTime 可以设置为一个估算值（基于轮次号）
    const estimatedStartTime = Date.now() - (updatedAllRounds.length - index) * 60000; // 假设每轮1分钟
    return Round.fromRecord(record, estimatedStartTime);
  });

  // 游戏结束时，currentRoundIndex 指向最后一个轮次
  const currentRoundIndex = rounds.length > 0 ? rounds.length - 1 : -1;

  return {
    status: GameStatus.FINISHED,
    players: finalPlayers, // applyFinalGameRules 返回的 players 已经是 Player[] 类型
    winner: winner.player.id,
    finishOrder: newFinishOrder,
    finalRankings,
    rounds,  // 返回 Round[] 而不是 RoundRecord[]
    currentRoundIndex  // 添加当前轮次索引
  };
}


import { Card, Player } from '../types/card';
import { calculateCardsScore, isScoreCard } from './cardUtils';

// 玩家排名信息
export interface PlayerRanking {
  player: Player;
  rank: number; // 排名（1表示第一名）
  finalScore: number; // 最终分数
}

/**
 * 计算游戏结束时的最终排名和分数
 * 规则：
 * 1. 首先按手牌数量排序确定排名（手牌少的在前，手牌数相同时先出完的在前）
 * 2. 基于排名：第一名+30分，最后一名-30分
 * 3. 如果最后一名手上有未出的分牌，要给第二名
 * 4. 最终排名以分数为准（分数高的排名靠前）
 */
export function calculateFinalRankings(
  players: Player[],
  finishOrder: number[] // 玩家出完牌的顺序
): PlayerRanking[] {
  // 创建排名数组
  const rankings: PlayerRanking[] = players.map((player, index) => ({
    player: { ...player },
    rank: 0,
    finalScore: player.score || 0
  }));

  // 第一步：按手牌数量排序（手牌少的在前）
  rankings.sort((a, b) => {
    const aHandCount = a.player.hand.length;
    const bHandCount = b.player.hand.length;
    
    if (aHandCount !== bHandCount) {
      return aHandCount - bHandCount;
    }
    
    // 如果手牌数量相同，按出牌顺序排序
    const aFinishIndex = finishOrder.indexOf(a.player.id);
    const bFinishIndex = finishOrder.indexOf(b.player.id);
    
    if (aFinishIndex === -1 && bFinishIndex === -1) {
      return 0; // 都没出完，保持原顺序
    }
    if (aFinishIndex === -1) return 1; // a没出完，排后面
    if (bFinishIndex === -1) return -1; // b没出完，排前面
    
    return aFinishIndex - bFinishIndex; // 出完的早的排前面
  });

  // 第二步：分配排名
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });

  // 记录排序后的玩家顺序（用于调试）
  console.log(`[calculateFinalRankings] 排序后的玩家顺序（按手牌数，然后按finishOrder）:`, {
    rankings: rankings.map((r, idx) => ({
      rank: idx + 1,
      playerId: r.player.id,
      playerName: r.player.name,
      handCount: r.player.hand.length,
      finishOrderIndex: finishOrder.indexOf(r.player.id),
      score: r.finalScore
    })),
    finishOrder
  });

  // 保存应用最终规则前的分数（用于日志记录）
  const scoreBeforeFinalRules = new Map<number, number>();
  rankings.forEach(r => {
    scoreBeforeFinalRules.set(r.player.id, r.finalScore);
  });

  // 第三步：基于出牌排名，第一名+30分，最后一名-30分
  if (rankings.length > 0) {
    const firstPlayer = rankings[0];
    const lastPlayer = rankings[rankings.length - 1];
    const firstPlayerId = firstPlayer.player.id;
    const lastPlayerId = lastPlayer.player.id;
    
    console.log(`[calculateFinalRankings] 应用最终规则前:`, {
      firstPlayer: { id: firstPlayerId, name: firstPlayer.player.name, score: firstPlayer.finalScore, handCount: firstPlayer.player.hand.length },
      lastPlayer: { id: lastPlayerId, name: lastPlayer.player.name, score: lastPlayer.finalScore, handCount: lastPlayer.player.hand.length },
      isSamePlayer: firstPlayerId === lastPlayerId
    });
    
    firstPlayer.finalScore += 30; // 第一名+30分
    lastPlayer.finalScore -= 30; // 最后一名-30分
    
    console.log(`[calculateFinalRankings] 应用最终规则后:`, {
      firstPlayer: { id: firstPlayerId, name: firstPlayer.player.name, score: firstPlayer.finalScore, adjustment: '+30' },
      lastPlayer: { id: lastPlayerId, name: lastPlayer.player.name, score: lastPlayer.finalScore, adjustment: '-30' },
      totalAdjustment: firstPlayerId === lastPlayerId ? 0 : 0 // 如果同一玩家，+30和-30抵消
    });
  }

  // 第四步：如果最后一名手上有未出的分牌，要给第二名（出牌顺序的第二名，即finishOrder[1]）
  // 注意：这个逻辑已经在 handlePlayerFinished 或 useMultiPlayerGame 中处理过了
  // 所以这里不应该再次处理，避免重复扣除
  // 但是，为了确保正确，我们检查一下：如果最后一名还有手牌，且分数还没有被扣除，才处理
  if (rankings.length >= 2) {
    const lastPlayer = rankings[rankings.length - 1];
    
    // 计算最后一名手中未出的分牌分数
    const lastPlayerScoreCards = lastPlayer.player.hand.filter(card => isScoreCard(card));
    const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);
    
    if (lastPlayerRemainingScore > 0) {
      // 检查是否已经被处理过
      // 在 useMultiPlayerGame.ts 中，已经处理了最后一名未出的分牌，所以：
      // - 最后一名的手牌还在（因为只是扣除了分数，没有移除手牌）
      // - 但最后一名当前的分数（player.score）应该已经比初始分数少了 lastPlayerRemainingScore
      // - 在 calculateFinalRankings 中，finalScore 初始化为 player.score
      // - 所以如果 finalScore 已经比初始分数少了 lastPlayerRemainingScore，说明已经处理过了
      
      // 但是，在 calculateFinalRankings 中，我们已经应用了最终规则（第一名+30，最后一名-30）
      // 所以 finalScore 可能已经变化了
      // 我们需要检查：在应用最终规则之前，分数是否已经被扣除
      
      // 实际上，在 useMultiPlayerGame.ts 中已经处理过了，所以这里不应该再次处理
      // 但是，如果最后一名的手牌还在，说明确实没有被处理过（或者处理逻辑有问题）
      // 为了安全起见，我们完全跳过这个逻辑，因为已经在 useMultiPlayerGame.ts 中处理过了
      
      console.log(
        `[calculateFinalRankings] 最后一名(${lastPlayer.player.name})还有${lastPlayerRemainingScore}分未出，但已经在 useMultiPlayerGame.ts 中处理过了，跳过`
      );
    }
  }

  // 第五步：根据最终分数重新排序（分数高的排名靠前）
  rankings.sort((a, b) => b.finalScore - a.finalScore);
  
  // 重新分配排名（基于最终分数）
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1; // 重新分配排名
    ranking.player.score = ranking.finalScore; // 更新玩家对象的分数
  });

  // ==================== 验证分数总和 ====================
  // 所有玩家的分数总和应该为0（初始-100*4=-400，分牌总分+400，墩的分数总和为0，最终规则+30-30=0）
  const totalScore = rankings.reduce((sum, r) => sum + r.finalScore, 0);
  
  // 计算每个玩家的详细分数信息
  const playerScoreDetails = rankings.map(r => {
    const initialScore = -100; // 初始分数
    const roundsWon = r.player.wonRounds || [];
    const totalRoundScore = roundsWon.reduce((sum, round) => sum + (round.totalScore || 0), 0);
    const scoreBeforeFinalRulesValue = scoreBeforeFinalRules.get(r.player.id) || r.finalScore; // 应用最终规则前的分数
    const finalRuleAdjustment = r.finalScore - scoreBeforeFinalRulesValue; // 最终规则调整（+30或-30）
    
    return {
      name: r.player.name,
      id: r.player.id,
      initialScore,
      roundsWonCount: roundsWon.length,
      totalRoundScore,
      scoreBeforeFinalRules: scoreBeforeFinalRulesValue,
      finalRuleAdjustment,
      finalScore: r.finalScore,
      handCount: r.player.hand.length,
      finishOrder: finishOrder.indexOf(r.player.id),
      // 计算其他可能的分数来源（墩的分数等）
      otherScoreSources: scoreBeforeFinalRulesValue - initialScore - totalRoundScore
    };
  });
  
  if (Math.abs(totalScore) > 0.01) { // 允许小的浮点数误差
    // 检查是否有玩家没有被正确处理
    const playersInRankings = new Set(rankings.map(r => r.player.id));
    const playersInFinishOrderSet = new Set(finishOrder);
    const missingInRankings = finishOrder.filter(id => !playersInRankings.has(id));
    const missingInFinishOrder = Array.from(playersInRankings).filter(id => !playersInFinishOrderSet.has(id));
    
    console.error(`[ScoreValidation] ⚠️ 分数总和不为0！总和=${totalScore}`, {
      totalScore,
      playerCount: rankings.length,
      finishOrderLength: finishOrder.length,
      finishOrder,
      missingInRankings,
      missingInFinishOrder,
      playerDetails: playerScoreDetails,
      // 汇总信息
      summary: {
        totalInitialScore: playerScoreDetails.reduce((sum, p) => sum + p.initialScore, 0),
        totalRoundScore: playerScoreDetails.reduce((sum, p) => sum + p.totalRoundScore, 0),
        totalFinalRuleAdjustment: playerScoreDetails.reduce((sum, p) => sum + p.finalRuleAdjustment, 0),
        totalOtherScoreSources: playerScoreDetails.reduce((sum, p) => sum + p.otherScoreSources, 0),
        totalFinalScore: totalScore,
        expectedTotal: 0
      },
      // 所有轮次信息（如果可用）
      allRoundsInfo: rankings.map(r => ({
        playerName: r.player.name,
        roundsWon: (r.player.wonRounds || []).map(round => ({
          roundNumber: round.roundNumber,
          totalScore: round.totalScore,
          winnerName: round.winnerName,
          playsCount: round.plays?.length || 0
        }))
      }))
    });
  } else {
    console.log(`[ScoreValidation] ✅ 分数总和验证通过: ${totalScore}`, {
      players: playerScoreDetails.map(p => ({
        name: p.name,
        finalScore: p.finalScore
      }))
    });
  }
  // ====================================================================

  return rankings;
}

/**
 * 在游戏结束时应用最终规则并更新玩家分数
 * @returns 返回更新后的玩家数组和排名信息
 */
export function applyFinalGameRules(
  players: Player[],
  finishOrder: number[]
): { players: Player[]; rankings: PlayerRanking[] } {
  // 计算最终排名和分数（只计算一次，避免重复处理最后一名未出的分牌）
  const rankings = calculateFinalRankings(players, finishOrder);
  
  // 更新玩家数组，包括 finishedRank
  const updatedPlayers = players.map(player => {
    const ranking = rankings.find(r => r.player.id === player.id);
    if (ranking) {
      return {
        ...player,
        score: ranking.finalScore,
        finishedRank: ranking.rank // 添加 finishedRank
      } as Player & { finishedRank: number };
    }
    return player;
  });

  return { players: updatedPlayers, rankings };
}

/**
 * 获取玩家的排名信息（用于显示）
 */
export function getPlayerRanking(
  playerId: number,
  rankings: PlayerRanking[]
): PlayerRanking | undefined {
  return rankings.find(r => r.player.id === playerId);
}


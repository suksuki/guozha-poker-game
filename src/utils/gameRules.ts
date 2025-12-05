import { Player } from '../types/card';
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
    
    // 最终规则：头名加30分，末游减30分
    firstPlayer.finalScore += 30; // 第一名+30分
    lastPlayer.finalScore -= 30; // 最后一名-30分
    
    console.log(`[calculateFinalRankings] 应用最终规则后:`, {
      firstPlayer: { id: firstPlayerId, name: firstPlayer.player.name, score: firstPlayer.finalScore, adjustment: '+30' },
      lastPlayer: { id: lastPlayerId, name: lastPlayer.player.name, score: lastPlayer.finalScore, adjustment: '-30' },
      totalAdjustment: firstPlayerId === lastPlayerId ? 0 : 0 // 如果同一玩家，+30和-30抵消
    });
  }

  // 第四步：末游最后手牌的分牌分数处理
  // 注意：这个逻辑已经在 GameController.handleLastPlayerRemainingScore 中处理过了
  // GameController.calculateFinalScoresAndRankings 会先调用 handleLastPlayerRemainingScore：
  // 1. 计算末游剩余分牌分数（5=5分，10=10分，K=10分）
  // 2. 末游减去这个分数
  // 3. 第二名加上这个分数
  // 所以这里不应该再次处理，避免重复扣除
  if (rankings.length >= 2) {
    const lastPlayer = rankings[rankings.length - 1];
    
    // 计算最后一名手中未出的分牌分数（仅用于日志记录）
    const lastPlayerScoreCards = lastPlayer.player.hand.filter(card => isScoreCard(card));
    const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);
    
    if (lastPlayerRemainingScore > 0) {
      // 这个分数已经在 GameController.handleLastPlayerRemainingScore 中处理过了，这里只记录日志
      console.log(
        `[calculateFinalRankings] 最后一名(${lastPlayer.player.name})还有${lastPlayerRemainingScore}分未出，但已经在 GameController 中处理过了（已转移给第二名），跳过`
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
  // 所有玩家的分数总和应该为0（初始0*4=0，分牌总分+分牌分，墩的分数总和为0，最终规则+30-30=0）
  const totalScore = rankings.reduce((sum, r) => sum + r.finalScore, 0);
  
  // 计算每个玩家的详细分数信息
  const playerScoreDetails = rankings.map(r => {
    const initialScore = 0; // 初始分数
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
  
  // 更新玩家数组，包括 finishedRank（争上游名次）和 scoreRank（分数名次）
  // finishedRank：出完牌的顺序（第一个出完的是第1名），在玩家出完牌时立即设置
  // scoreRank：按最终分数排序的名次（分数高的排名靠前），在游戏结束时设置
  const updatedPlayers = players.map(player => {
    const ranking = rankings.find(r => r.player.id === player.id);
    if (ranking) {
      return {
        ...player,
        score: ranking.finalScore,
        // finishedRank 保持不变（已经在玩家出完牌时设置）
        scoreRank: ranking.rank // 分数名次（按最终分数排序）
      } as Player & { finishedRank?: number; scoreRank?: number };
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


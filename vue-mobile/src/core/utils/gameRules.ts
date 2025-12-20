import { Player } from '@/core/types/card';
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

  // 保存应用最终规则前的分数（用于日志记录）
  const scoreBeforeFinalRules = new Map<number, number>();
  rankings.forEach(r => {
    scoreBeforeFinalRules.set(r.player.id, r.finalScore);
  });

  // 第三步：基于出牌排名，第一名+30分，最后一名-30分
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


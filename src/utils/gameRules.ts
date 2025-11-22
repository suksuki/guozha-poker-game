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

  // 第三步：基于出牌排名，第一名+30分，最后一名-30分
  if (rankings.length > 0) {
    rankings[0].finalScore += 30; // 第一名+30分
    rankings[rankings.length - 1].finalScore -= 30; // 最后一名-30分
  }

  // 第四步：如果最后一名手上有未出的分牌，要给第二名
  if (rankings.length >= 2) {
    const lastPlayer = rankings[rankings.length - 1];
    const secondPlayer = rankings[1]; // 第二名（索引为1）
    
    // 计算最后一名手中未出的分牌分数
    const lastPlayerScoreCards = lastPlayer.player.hand.filter(card => isScoreCard(card));
    const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);
    
    if (lastPlayerRemainingScore > 0) {
      // 最后一名减去未出分牌的分数
      lastPlayer.finalScore -= lastPlayerRemainingScore;
      
      // 第二名加上这些分数
      secondPlayer.finalScore += lastPlayerRemainingScore;
      
      console.log(
        `最后一名(${lastPlayer.player.name})有${lastPlayerRemainingScore}分未出，给第二名(${secondPlayer.player.name})`
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

  return rankings;
}

/**
 * 在游戏结束时应用最终规则并更新玩家分数
 */
export function applyFinalGameRules(
  players: Player[],
  finishOrder: number[]
): Player[] {
  const rankings = calculateFinalRankings(players, finishOrder);
  
  // 更新玩家数组
  const updatedPlayers = players.map(player => {
    const ranking = rankings.find(r => r.player.id === player.id);
    if (ranking) {
      return {
        ...player,
        score: ranking.finalScore
      };
    }
    return player;
  });

  return updatedPlayers;
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


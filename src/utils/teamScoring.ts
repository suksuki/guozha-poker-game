/**
 * 团队计分规则
 * 用于合作模式，将个人分数改为团队分数
 */

import { Player } from '../types/card';
import { Team, TeamConfig, TeamRanking } from '../types/team';
import { updateTeamScore, getTeam, getPlayerTeamId } from './teamManager';
import { calculateCardsScore, isScoreCard } from './cardUtils';

/**
 * 计算玩家手牌分数（捡到的分数）
 */
export function calculatePlayerPickedScore(player: Player): number {
  return player.score || 0;
}

/**
 * 计算玩家墩分（实时）
 * 规则：
 * - 我出了墩：从每个其他玩家得到 30分 × 我的墩数
 * - 别人出了墩：给出墩的人 30分 × 他的墩数
 * 
 * 总墩分 = (我的墩数 × 30 × 其他玩家数) - (其他所有玩家的墩数总和 × 30)
 */
export function calculatePlayerDunScore(player: Player, allPlayers: Player[]): number {
  const myDunCount = player.dunCount || 0;
  const otherPlayersCount = allPlayers.length - 1;
  
  // 我从别人那得到的分数：每个其他玩家给我 30分 × 我的墩数
  const myEarnings = myDunCount * 30 * otherPlayersCount;
  
  // 我给别人的分数：其他所有玩家的墩，我都要给他们每墩30分
  const othersTotalDunCount = allPlayers
    .filter(p => p.id !== player.id)
    .reduce((sum, p) => sum + (p.dunCount || 0), 0);
  const myLosses = othersTotalDunCount * 30;
  
  return myEarnings - myLosses;
}

/**
 * 计算团队总分（所有成员的实时总分之和）
 */
export function calculateTeamScore(teamId: number, players: Player[], teamConfig: TeamConfig): number {
  const team = teamConfig.teams.find(t => t.id === teamId);
  if (!team) return 0;
  
  return team.players.reduce((sum, playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return sum;
    
    const pickedScore = calculatePlayerPickedScore(player);
    const dunScore = calculatePlayerDunScore(player, players);
    const totalScore = pickedScore + dunScore;
    
    return sum + totalScore;
  }, 0);
}

/**
 * 计算团队总墩数
 */
export function calculateTeamDunCount(teamId: number, players: Player[], teamConfig: TeamConfig): number {
  const team = teamConfig.teams.find(t => t.id === teamId);
  if (!team) return 0;
  
  return team.players.reduce((sum, playerId) => {
    const player = players.find(p => p.id === playerId);
    return sum + (player?.dunCount || 0);
  }, 0);
}

/**
 * 更新所有团队的分数（基于成员分数之和）
 */
export function updateAllTeamScores(players: Player[], teamConfig: TeamConfig): void {
  teamConfig.teams.forEach(team => {
    team.teamScore = calculateTeamScore(team.id, players, teamConfig);
  });
}

/**
 * 将分数分配给团队（而不是个人）
 */
export function allocateScoreToTeam(
  playerIndex: number,
  score: number,
  teamConfig: TeamConfig
): void {
  const teamId = getPlayerTeamId(playerIndex, teamConfig);
  if (teamId !== null) {
    updateTeamScore(teamId, score, teamConfig);
  }
}

/**
 * 计算团队最终排名和分数
 * 规则：
 * 1. 按团队分数排序
 * 2. 头游团队+30分（或+60分），末游团队-30分（或-60分）
 * 3. 末游团队剩余分牌转移给头游团队
 */
export function calculateTeamRankings(
  teams: Team[],
  finishOrder: number[],  // 玩家出完牌的顺序
  players: Player[],
  teamConfig: TeamConfig
): TeamRanking[] {
  // 创建团队排名数组
  // 注意：finalScore 应该基于 players 的最终分数计算（包括手牌分转移、关单/关双、扣除基础分后的手牌分 + 墩分）
  const rankings: TeamRanking[] = teams.map(team => {
    // 计算团队的最终总分（所有队员的最终手牌分 + 墩分）
    const teamTotalScore = calculateTeamScore(team.id, players, teamConfig);
    return {
      team: { ...team },
      rank: 0,
      finalScore: teamTotalScore
    };
  });

  // 确定头游和末游团队
  // 头游 = 第一个出完牌的玩家所在团队
  // 末游 = 最后一个出完牌的玩家所在团队
  
  const firstFinishedPlayerId = finishOrder[0];
  const lastFinishedPlayerId = finishOrder[finishOrder.length - 1];
  
  const firstTeamId = getPlayerTeamId(firstFinishedPlayerId, teamConfig);
  const lastTeamId = getPlayerTeamId(lastFinishedPlayerId, teamConfig);
  
  // 应用最终规则：头游团队+30分，末游团队-30分
  if (firstTeamId !== null) {
    rankings[firstTeamId].finalScore += 30;
  }
  if (lastTeamId !== null && lastTeamId !== firstTeamId) {
    rankings[lastTeamId].finalScore -= 30;
  }
  
  // 处理末游团队剩余分牌
  if (lastTeamId !== null && firstTeamId !== null && lastTeamId !== firstTeamId) {
    // 找到末游团队的所有玩家
    const lastTeam = getTeam(lastTeamId, teamConfig);
    if (lastTeam) {
      // 计算末游团队剩余分牌分数
      let remainingScore = 0;
      for (const playerId of lastTeam.players) {
        const player = players[playerId];
        if (player) {
          const scoreCards = player.hand.filter(card => isScoreCard(card));
          remainingScore += calculateCardsScore(scoreCards);
        }
      }
      
      if (remainingScore > 0) {
        // 从末游团队扣除
        rankings[lastTeamId].finalScore -= remainingScore;
        // 给头游团队加上
        rankings[firstTeamId].finalScore += remainingScore;
      }
    }
  }
  
  // 根据最终分数排序（分数高的排名靠前）
  rankings.sort((a, b) => b.finalScore - a.finalScore);
  
  // 重新分配排名
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });
  
  return rankings;
}

/**
 * 在游戏结束时应用团队最终规则
 * 
 * 清算顺序（只操作玩家）：
 * 1. 手牌分转移：最后一名的手牌分给第一名（如果关双，倒数第一、倒数第二的手牌分都给第一名）
 * 2. 关双惩罚：如果关双，倒数第一、倒数第二的手牌分再扣15（变成-15），第一名再加30
 * 3. 未出分牌转移：所有未出完牌的玩家手上的分牌，都给第二名
 * 4. 计算每个玩家总分：总分 = 手牌分 + 墩分
 * 5. 扣除基础分100：从总分里硬减100
 * 6. 计算团队总分：团队总分 = 所有队员的总分相加
 */
export function applyTeamFinalRules(
  teams: Team[],
  finishOrder: number[],
  players: Player[],
  teamConfig: TeamConfig
): { teams: Team[]; rankings: TeamRanking[]; finalPlayers: Player[] } {
  // 创建玩家副本，避免修改原数组
  const finalPlayers = players.map(p => ({ ...p, hand: [...(p.hand || [])] }));
  
  // 为每个玩家创建一个临时的手牌分累积器（用于转移计算，不修改player.score）
  const handScoreAdjustments = new Map<number, number>();
  finalPlayers.forEach(p => {
    handScoreAdjustments.set(p.id, p.score || 0); // 初始为原始手牌分
  });
  
  // 判断是否关双（有2个玩家没出完）- 直接检查手牌数量
  const unfinishedPlayerIds = finalPlayers.filter(p => p.hand && p.hand.length > 0).map(p => p.id);
  const isGuanShuang = unfinishedPlayerIds.length === 2;
  const isGuanDan = unfinishedPlayerIds.length === 1;
  
  // 检查第一名和最后一名是否是队友
  const firstPlayerId = finishOrder[0];
  const lastPlayerId = finishOrder[finishOrder.length - 1];
  const firstPlayerTeamId = getPlayerTeamId(firstPlayerId, teamConfig);
  const lastPlayerTeamId = getPlayerTeamId(lastPlayerId, teamConfig);
  const isTeammate = firstPlayerTeamId !== null && firstPlayerTeamId === lastPlayerTeamId;
  
  // 如果第一名和最后一名是队友，跳过手牌分转移和关单/关双惩罚
  if (!isTeammate) {
    // 1. 手牌分转移（只修改临时累积器，不修改player.score）
    if (isGuanShuang) {
      // 关双：未出完的2个玩家的手牌分都给第一名
      unfinishedPlayerIds.forEach(playerId => {
        const handScore = handScoreAdjustments.get(playerId) || 0;
        handScoreAdjustments.set(firstPlayerId, (handScoreAdjustments.get(firstPlayerId) || 0) + handScore);
        handScoreAdjustments.set(playerId, 0);
      });
    } else if (isGuanDan) {
      // 关单：未出完的1个玩家的手牌分给第一名
      const unfinishedPlayerId = unfinishedPlayerIds[0];
      const handScore = handScoreAdjustments.get(unfinishedPlayerId) || 0;
      handScoreAdjustments.set(firstPlayerId, (handScoreAdjustments.get(firstPlayerId) || 0) + handScore);
      handScoreAdjustments.set(unfinishedPlayerId, 0);
    } else if (finishOrder.length >= 2) {
      // 正常情况：最后一名的手牌分给第一名
      const lastPlayerId = finishOrder[finishOrder.length - 1];
      const handScore = handScoreAdjustments.get(lastPlayerId) || 0;
      handScoreAdjustments.set(firstPlayerId, (handScoreAdjustments.get(firstPlayerId) || 0) + handScore);
      handScoreAdjustments.set(lastPlayerId, 0);
    }
    
    // 2. 关单/关双惩罚和奖励
    
    if (isGuanShuang) {
      // 关双：未出完的2个玩家各扣15，第一名加30
      handScoreAdjustments.set(firstPlayerId, (handScoreAdjustments.get(firstPlayerId) || 0) + 30);
      
      unfinishedPlayerIds.forEach(playerId => {
        handScoreAdjustments.set(playerId, (handScoreAdjustments.get(playerId) || 0) - 15);
      });
    } else if (isGuanDan) {
      // 关单：未出完的1个玩家扣30，第一名加30
      handScoreAdjustments.set(firstPlayerId, (handScoreAdjustments.get(firstPlayerId) || 0) + 30);
      
      const unfinishedPlayerId = unfinishedPlayerIds[0];
      handScoreAdjustments.set(unfinishedPlayerId, (handScoreAdjustments.get(unfinishedPlayerId) || 0) - 30);
    }
  }
  
  
  // 3. 未出分牌转移：所有还有手牌的玩家，手上的分牌都给第二名（无论是否队友）
  if (finishOrder.length >= 2) {
    const secondPlayerId = finishOrder[1]; // 第二名
    
    let totalRemainingScore = 0;
    
    // 遍历所有玩家，检查手上是否还有牌
    finalPlayers.forEach(player => {
      if (player.hand && player.hand.length > 0) {
        const scoreCards = player.hand.filter(card => isScoreCard(card));
        const remainingScore = calculateCardsScore(scoreCards);
        if (remainingScore > 0) {
          totalRemainingScore += remainingScore;
        }
      }
    });
    
    if (totalRemainingScore > 0) {
      handScoreAdjustments.set(secondPlayerId, (handScoreAdjustments.get(secondPlayerId) || 0) + totalRemainingScore);
    }
  }
  
  // 4. 计算每个玩家总分 = (转移后的手牌分 + 墩分) - 100，保存到finalScore字段
  finalPlayers.forEach(player => {
    const adjustedHandScore = handScoreAdjustments.get(player.id) || 0; // 转移后的手牌分
    const dunScore = calculatePlayerDunScore(player, finalPlayers); // 墩分
    const totalScore = adjustedHandScore + dunScore; // 总分
    const finalScore = totalScore - 100; // 最终分数（扣除基础分100）
    
    // 保存到finalScore字段（用于显示和排名）
    (player as any).finalScore = finalScore;
    (player as any).adjustedHandScore = adjustedHandScore; // 转移后的手牌分
    // player.score 保持原始手牌分不变
  });
  
  // 5. 计算团队总分（所有队员的finalScore相加）
  const updatedTeams = teams.map(team => {
    const teamTotalScore = team.players.reduce((sum, playerId) => {
      const player = finalPlayers[playerId];
      return sum + ((player as any).finalScore || 0);
    }, 0);
    
    return {
      ...team,
      teamScore: teamTotalScore
    };
  });
  
  // 6. 计算团队排名（按团队总分排序）
  const rankings: TeamRanking[] = updatedTeams.map(team => ({
    team: { ...team },
    rank: 0,
    finalScore: team.teamScore
  }));
  
  rankings.sort((a, b) => b.finalScore - a.finalScore);
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });
  
  return { teams: updatedTeams, rankings, finalPlayers };
}

/**
 * 验证团队分数总和
 * 所有团队的分数总和应该为0（初始-100*人数，分牌总分+100*人数，最终规则+30-30=0）
 */
export function validateTeamScores(
  teams: Team[],
  playerCount: number
): boolean {
  const totalScore = teams.reduce((sum, team) => sum + team.teamScore, 0);
  const expectedTotal = 0;
  
  if (Math.abs(totalScore - expectedTotal) > 0.01) {    return false;
  }
  
  return true;
}


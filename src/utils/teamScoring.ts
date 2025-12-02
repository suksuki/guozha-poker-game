/**
 * 团队计分规则
 * 用于合作模式，将个人分数改为团队分数
 */

import { Player } from '../types/card';
import { Team, TeamConfig, TeamRanking } from '../types/team';
import { updateTeamScore, getTeam, getPlayerTeamId } from './teamManager';
import { calculateCardsScore, isScoreCard } from './cardUtils';

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
  const rankings: TeamRanking[] = teams.map(team => ({
    team: { ...team },
    rank: 0,
    finalScore: team.teamScore
  }));

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
 */
export function applyTeamFinalRules(
  teams: Team[],
  finishOrder: number[],
  players: Player[],
  teamConfig: TeamConfig
): { teams: Team[]; rankings: TeamRanking[] } {
  const rankings = calculateTeamRankings(teams, finishOrder, players, teamConfig);
  
  // 更新团队分数
  const updatedTeams = teams.map(team => {
    const ranking = rankings.find(r => r.team.id === team.id);
    if (ranking) {
      return {
        ...team,
        teamScore: ranking.finalScore
      };
    }
    return team;
  });
  
  return { teams: updatedTeams, rankings };
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


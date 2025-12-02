/**
 * 团队管理器
 * 负责团队的创建、分配和管理
 */

import { Player } from '../types/card';
import { Team, TeamConfig, PlayerDirection, TeamRelationship } from '../types/team';

/**
 * 创建团队配置（4人模式：2v2）
 */
export function createTeamConfig4Players(
  humanPlayerIndex: number
): TeamConfig {
  // 4人模式：玩家0和2一组，玩家1和3一组
  // 或者根据humanPlayerIndex调整
  
  const team0: Team = {
    id: 0,
    name: '团队A',
    players: [],
    teamScore: 0,
    roundScore: 0,
    roundsWon: 0,
    totalScoreEarned: 0
  };
  
  const team1: Team = {
    id: 1,
    name: '团队B',
    players: [],
    teamScore: 0,
    roundScore: 0,
    roundsWon: 0,
    totalScoreEarned: 0
  };
  
  // 确定人类玩家所在团队
  const humanTeamId = humanPlayerIndex % 2 === 0 ? 0 : 1;
  
  // 分配玩家到团队
  for (let i = 0; i < 4; i++) {
    const teamId = i % 2 === 0 ? 0 : 1;
    if (teamId === 0) {
      team0.players.push(i);
    } else {
      team1.players.push(i);
    }
  }
  
  // 确定人类玩家的方向（4人模式：东南西北）
  const directions: PlayerDirection[] = [
    PlayerDirection.SOUTH,  // 0: 南（你）
    PlayerDirection.WEST,   // 1: 西
    PlayerDirection.NORTH,  // 2: 北
    PlayerDirection.EAST    // 3: 东
  ];
  
  // 根据humanPlayerIndex调整方向
  const humanDirection = directions[humanPlayerIndex];
  
  return {
    playerCount: 4,
    teams: [team0, team1],
    humanPlayerTeam: humanTeamId,
    humanPlayerDirection: humanDirection
  };
}

/**
 * 创建团队配置（6人模式：3v3）
 */
export function createTeamConfig6Players(
  humanPlayerIndex: number
): TeamConfig {
  const team0: Team = {
    id: 0,
    name: '团队A',
    players: [],
    teamScore: 0,
    roundScore: 0,
    roundsWon: 0,
    totalScoreEarned: 0
  };
  
  const team1: Team = {
    id: 1,
    name: '团队B',
    players: [],
    teamScore: 0,
    roundScore: 0,
    roundsWon: 0,
    totalScoreEarned: 0
  };
  
  // 确定人类玩家所在团队
  const humanTeamId = humanPlayerIndex % 2 === 0 ? 0 : 1;
  
  // 分配玩家到团队（0,2,4一组，1,3,5一组）
  for (let i = 0; i < 6; i++) {
    const teamId = i % 2 === 0 ? 0 : 1;
    if (teamId === 0) {
      team0.players.push(i);
    } else {
      team1.players.push(i);
    }
  }
  
  // 6人模式的方向（需要定义具体布局）
  const directions: PlayerDirection[] = [
    PlayerDirection.SOUTH,      // 0: 南
    PlayerDirection.WEST,       // 1: 西
    PlayerDirection.NORTH,      // 2: 北
    PlayerDirection.EAST,       // 3: 东
    PlayerDirection.SOUTHEAST,  // 4: 东南
    PlayerDirection.NORTHWEST   // 5: 西北
  ];
  
  const humanDirection = directions[humanPlayerIndex];
  
  return {
    playerCount: 6,
    teams: [team0, team1],
    humanPlayerTeam: humanTeamId,
    humanPlayerDirection: humanDirection
  };
}

/**
 * 创建团队配置（根据玩家数量自动选择）
 */
export function createTeamConfig(
  playerCount: 4 | 6,
  humanPlayerIndex: number
): TeamConfig {
  if (playerCount === 4) {
    return createTeamConfig4Players(humanPlayerIndex);
  } else {
    return createTeamConfig6Players(humanPlayerIndex);
  }
}

/**
 * 获取玩家所在的团队ID
 */
export function getPlayerTeamId(
  playerId: number,
  teamConfig: TeamConfig
): number | null {
  for (const team of teamConfig.teams) {
    if (team.players.includes(playerId)) {
      return team.id;
    }
  }
  return null;
}

/**
 * 检查两个玩家是否是队友
 */
export function areTeammates(
  playerId1: number,
  playerId2: number,
  teamConfig: TeamConfig
): boolean {
  const teamId1 = getPlayerTeamId(playerId1, teamConfig);
  const teamId2 = getPlayerTeamId(playerId2, teamConfig);
  return teamId1 !== null && teamId1 === teamId2;
}

/**
 * 获取玩家的团队关系
 */
export function getTeamRelationship(
  playerId1: number,
  playerId2: number,
  teamConfig: TeamConfig
): TeamRelationship {
  const teamId1 = getPlayerTeamId(playerId1, teamConfig);
  const teamId2 = getPlayerTeamId(playerId2, teamConfig);
  
  const isTeammate = teamId1 !== null && teamId1 === teamId2;
  
  return {
    isTeammate,
    isOpponent: !isTeammate && teamId2 !== null,
    teamId: teamId1
  };
}

/**
 * 获取玩家的所有队友
 */
export function getTeammates(
  playerId: number,
  teamConfig: TeamConfig
): number[] {
  const teamId = getPlayerTeamId(playerId, teamConfig);
  if (teamId === null) {
    return [];
  }
  
  const team = teamConfig.teams[teamId];
  return team.players.filter(id => id !== playerId);
}

/**
 * 获取玩家的所有对手
 */
export function getOpponents(
  playerId: number,
  teamConfig: TeamConfig
): number[] {
  const teamId = getPlayerTeamId(playerId, teamConfig);
  if (teamId === null) {
    return [];
  }
  
  const opponents: number[] = [];
  for (const team of teamConfig.teams) {
    if (team.id !== teamId) {
      opponents.push(...team.players);
    }
  }
  return opponents;
}

/**
 * 根据方向获取玩家ID（4人模式）
 */
export function getPlayerIdByDirection(
  direction: PlayerDirection,
  teamConfig: TeamConfig
): number | null {
  if (teamConfig.playerCount !== 4) {
    return null;
  }
  
  const directionMap: Record<PlayerDirection, number> = {
    [PlayerDirection.SOUTH]: 0,
    [PlayerDirection.WEST]: 1,
    [PlayerDirection.NORTH]: 2,
    [PlayerDirection.EAST]: 3,
    [PlayerDirection.SOUTHEAST]: -1,
    [PlayerDirection.NORTHEAST]: -1,
    [PlayerDirection.SOUTHWEST]: -1,
    [PlayerDirection.NORTHWEST]: -1
  };
  
  const playerId = directionMap[direction];
  return playerId >= 0 ? playerId : null;
}

/**
 * 获取玩家的方向
 */
export function getPlayerDirection(
  playerId: number,
  teamConfig: TeamConfig
): PlayerDirection | null {
  // 4人模式的方向映射
  if (teamConfig.playerCount === 4) {
    const directions: PlayerDirection[] = [
      PlayerDirection.SOUTH,
      PlayerDirection.WEST,
      PlayerDirection.NORTH,
      PlayerDirection.EAST
    ];
    return directions[playerId] || null;
  }
  
  // 6人模式的方向映射
  if (teamConfig.playerCount === 6) {
    const directions: PlayerDirection[] = [
      PlayerDirection.SOUTH,
      PlayerDirection.WEST,
      PlayerDirection.NORTH,
      PlayerDirection.EAST,
      PlayerDirection.SOUTHEAST,
      PlayerDirection.NORTHWEST
    ];
    return directions[playerId] || null;
  }
  
  return null;
}

/**
 * 更新团队分数
 */
export function updateTeamScore(
  teamId: number,
  score: number,
  teamConfig: TeamConfig
): void {
  const team = teamConfig.teams[teamId];
  if (team) {
    team.teamScore += score;
    team.totalScoreEarned += Math.max(0, score);
  }
}

/**
 * 更新团队轮次分数
 */
export function updateTeamRoundScore(
  teamId: number,
  score: number,
  teamConfig: TeamConfig
): void {
  const team = teamConfig.teams[teamId];
  if (team) {
    team.roundScore += score;
  }
}

/**
 * 重置团队轮次分数
 */
export function resetTeamRoundScores(teamConfig: TeamConfig): void {
  for (const team of teamConfig.teams) {
    team.roundScore = 0;
  }
}

/**
 * 获取团队对象
 */
export function getTeam(
  teamId: number,
  teamConfig: TeamConfig
): Team | null {
  return teamConfig.teams[teamId] || null;
}

/**
 * 获取对手团队
 */
export function getOpponentTeam(
  teamId: number,
  teamConfig: TeamConfig
): Team | null {
  const opponentTeamId = teamId === 0 ? 1 : 0;
  return getTeam(opponentTeamId, teamConfig);
}


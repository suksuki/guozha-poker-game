/**
 * 团队相关类型定义
 * 用于合作模式（2v2或3v3）
 */

import { Player } from './card';

/**
 * 玩家方向（4人模式：东南西北）
 */
export enum PlayerDirection {
  SOUTH = 'south',  // 南（玩家位置）
  WEST = 'west',    // 西
  NORTH = 'north',  // 北
  EAST = 'east',    // 东
  
  // 6人模式额外方向
  SOUTHEAST = 'southeast',  // 东南
  NORTHEAST = 'northeast',  // 东北
  SOUTHWEST = 'southwest',  // 西南
  NORTHWEST = 'northwest'   // 西北
}

/**
 * 团队信息
 */
export interface Team {
  id: number;  // 团队ID（0或1）
  name: string;  // 团队名称
  players: number[];  // 玩家ID列表
  teamScore: number;  // 团队总分数
  roundScore: number;  // 当前轮次团队分数
  
  // 游戏统计
  roundsWon: number;  // 赢得的轮次数
  totalScoreEarned: number;  // 获得的总分
}

/**
 * 团队配置
 */
export interface TeamConfig {
  playerCount: 4 | 6;  // 玩家总数
  teams: Team[];  // 团队列表
  humanPlayerTeam: number;  // 人类玩家所在的团队ID
  humanPlayerDirection: PlayerDirection;  // 人类玩家的方向
}

/**
 * 团队排名信息
 */
export interface TeamRanking {
  team: Team;
  rank: number;  // 排名（1表示第一名）
  finalScore: number;  // 最终分数
}

/**
 * 团队关系查询工具
 */
export interface TeamRelationship {
  isTeammate: boolean;  // 是否是队友
  isOpponent: boolean;  // 是否是对手
  teamId: number | null;  // 团队ID
}


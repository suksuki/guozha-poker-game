/**
 * 游戏模式策略接口
 * 定义不同游戏模式（个人/团队）的核心行为
 */

import { Player } from '../../types/card';
import { PlayerRanking } from '../gameRules';
import { TeamRanking, TeamConfig } from '../../types/team';

/**
 * 游戏结束判断结果
 */
export interface GameEndCheckResult {
  shouldEnd: boolean;
  reason?: string;  // 结束原因（调试用）
}

/**
 * 最终分数计算结果
 */
export interface FinalScoreResult {
  updatedPlayers: Player[];
  finalRankings?: PlayerRanking[];  // 个人模式使用
  teamRankings?: TeamRanking[];     // 团队模式使用
  winningTeamId?: number | null;    // 团队模式：获胜团队ID
}

/**
 * 游戏模式策略接口
 * 封装团队模式和个人模式的差异逻辑
 */
export interface IGameModeStrategy {
  /**
   * 获取模式名称（用于日志和调试）
   */
  getModeName(): string;

  /**
   * 检查游戏是否应该结束
   * @param players 当前玩家状态
   * @param finishOrder 已完成的玩家顺序
   * @param teamConfig 团队配置（团队模式下使用）
   */
  shouldGameEnd(
    players: Player[],
    finishOrder: number[],
    teamConfig?: TeamConfig | null
  ): GameEndCheckResult;

  /**
   * 计算最终分数和排名
   * @param players 玩家列表
   * @param finishOrder 完成顺序
   * @param teamConfig 团队配置（团队模式下使用）
   */
  calculateFinalScores(
    players: Player[],
    finishOrder: number[],
    teamConfig?: TeamConfig | null
  ): FinalScoreResult;

  /**
   * 找到下一个开始新轮次的玩家（接风逻辑）
   * @param winnerIndex 当前轮次的赢家
   * @param players 玩家列表
   * @param playerCount 玩家总数
   * @param teamConfig 团队配置（团队模式下使用）
   * @returns 下一个玩家的索引，如果所有人都出完则返回null
   */
  findNextPlayerForNewRound(
    winnerIndex: number | null,
    players: Player[],
    playerCount: number,
    teamConfig?: TeamConfig | null
  ): number | null;

  /**
   * 获取结果展示组件类型
   * @returns 'team' 或 'individual'
   */
  getResultScreenType(): 'team' | 'individual';
}


/**
 * 团队模式策略
 * 实现团队协作的游戏逻辑（2v2 或 3v3）
 */

import { Player } from '@/core/types/card';
import { TeamConfig } from '../../types/team';
import { applyTeamFinalRules } from '../../services/scoringService';
import { findNextActivePlayer } from '../gameStateUtils';
import { getPlayerTeamId } from '../teamManager';
import { IGameModeStrategy, GameEndCheckResult, FinalScoreResult } from './IGameModeStrategy';

export class TeamModeStrategy implements IGameModeStrategy {

  getModeName(): string {
    return '团队模式';
  }

  /**
   * 团队模式：当某个团队全部出完时游戏结束（关单/关双）
   */
  shouldGameEnd(
    players: Player[],
    finishOrder: number[],
    teamConfig?: TeamConfig | null
  ): GameEndCheckResult {
    // console.log(`[TEAM_DEBUG] shouldGameEnd: 检查游戏是否结束, finishOrder=[${finishOrder.join(',')}]`);
    if (!teamConfig) {
      // console.log(`[TEAM_DEBUG] shouldGameEnd: 无团队配置，返回false`);
      return { shouldEnd: false };
    }

    // console.log(`[TEAM_DEBUG] shouldGameEnd: 团队配置存在，团队数=${teamConfig.teams.length}`);
    // 检查每个团队是否全部出完
    for (const team of teamConfig.teams) {
      const teamPlayerHands = team.players.map(playerId => ({ playerId, handSize: players[playerId].hand.length }));
      const teamAllFinished = team.players.every(
        playerId => players[playerId].hand.length === 0
      );
      // console.log(`[TEAM_DEBUG] shouldGameEnd: 团队${team.id}(${team.name}), 玩家手牌=${JSON.stringify(teamPlayerHands)}, 全部出完=${teamAllFinished}`);

      if (teamAllFinished) {
        const unfinishedPlayerCount = players.filter(p => p.hand.length > 0).length;
        const reason = unfinishedPlayerCount === 1 ? '关单' :
          unfinishedPlayerCount === 2 ? '关双' :
            `${team.name}全部出完`;

        // console.log(`[TEAM_DEBUG] shouldGameEnd: 团队${team.id}全部出完，游戏结束 reason=${reason}, unfinishedCount=${unfinishedPlayerCount}`);
        return {
          shouldEnd: true,
          reason: reason
        };
      }
    }

    // console.log(`[TEAM_DEBUG] shouldGameEnd: 无团队全部出完，游戏继续`);
    return {
      shouldEnd: false
    };
  }

  /**
   * 团队模式：使用团队规则计算分数和排名
   */
  calculateFinalScores(
    players: Player[],
    finishOrder: number[],
    teamConfig?: TeamConfig | null
  ): FinalScoreResult {
    if (!teamConfig) {
      throw new Error('团队模式需要 teamConfig');
    }


    const teamResult = applyTeamFinalRules(
      teamConfig.teams,
      finishOrder,
      players,
      teamConfig
    );

    // 确定获胜团队
    const winningTeamId = teamResult.rankings.length > 0
      ? teamResult.rankings[0].team.id
      : null;


    return {
      updatedPlayers: teamResult.finalPlayers,
      finalRankings: [],  // 团队模式不返回个人排名
      teamRankings: teamResult.rankings,
      winningTeamId: winningTeamId
    };
  }

  /**
   * 团队模式：优先找队友接风
   */
  findNextPlayerForNewRound(
    winnerIndex: number | null,
    players: Player[],
    playerCount: number,
    teamConfig?: TeamConfig | null
  ): number | null {
    // console.log(`[TEAM_DEBUG] findNextPlayerForNewRound: winnerIndex=${winnerIndex}, teamConfig=${teamConfig ? 'exists' : 'null'}`);

    if (!teamConfig) {
      // console.log(`[TEAM_DEBUG] findNextPlayerForNewRound: 无团队配置，降级为个人模式`);
      // 降级为个人模式逻辑
      if (winnerIndex === null) {
        return findNextActivePlayer(0, players, playerCount);
      }
      const winner = players[winnerIndex];
      if (winner && winner.hand.length > 0) {
        return winnerIndex;
      }
      return findNextActivePlayer(winnerIndex, players, playerCount);
    }

    if (winnerIndex === null) {
      // console.log(`[TEAM_DEBUG] findNextPlayerForNewRound: winnerIndex为null，从P0开始查找`);
      return findNextActivePlayer(0, players, playerCount);
    }

    const winner = players[winnerIndex];
    // console.log(`[TEAM_DEBUG] findNextPlayerForNewRound: 赢家=${winnerIndex}(${winner.name}), teamId=${winner.teamId}, handSize=${winner.hand.length}`);

    // 如果接风玩家还有牌，由接风玩家开始
    if (winner && winner.hand.length > 0) {
      // console.log(`[TEAM_DEBUG] findNextPlayerForNewRound: 赢家还有牌，返回赢家索引`);
      return winnerIndex;
    }

    // 接手权寻找：仅在同阵营（队友）中寻找
    const winnerTeamId = winner?.teamId;
    // console.log(`[TEAM_DEBUG] findNextPlayerForNewRound: 开始查找队友，winnerTeamId=${winnerTeamId}`);
    if (winnerTeamId !== null && winnerTeamId !== undefined) {
      // 按照出牌顺序（逆时针）找队友中还有牌的玩家
      let nextIndex = (winnerIndex + 1) % playerCount;
      let checkedCount = 0;

      // console.log(`[TEAM_DEBUG] findNextPlayerForNewRound: 开始循环查找，起始索引=${nextIndex}`);
      while (checkedCount < playerCount - 1) {
        const player = players[nextIndex];
        // console.log(`[TEAM_DEBUG] findNextPlayerForNewRound: 检查P${nextIndex}(${player.name}), teamId=${player.teamId}, handSize=${player.hand.length}, 是否匹配=${player.teamId === winnerTeamId && player.hand.length > 0}`);
        if (player.teamId === winnerTeamId && player.hand.length > 0) {
          // console.log(`[TEAM_DEBUG] findNextPlayerForNewRound: 找到队友接风，返回P${nextIndex}`);
          return nextIndex;
        }
        nextIndex = (nextIndex + 1) % playerCount;
        checkedCount++;
      }

      // 没找到任何有牌的队友，说明本阵营已悉数撤离
      // console.log(`[TEAM_DEBUG] findNextPlayerForNewRound: 未找到有牌的队友，返回null`);
      return null;
    }

    // 非团队模式或找不到队友信息（不应该发生），找下一个活人
    // console.log(`[TEAM_DEBUG] findNextPlayerForNewRound: 找不到队友信息，降级查找下一个活人`);
    return findNextActivePlayer(winnerIndex, players, playerCount);
  }

  getResultScreenType(): 'team' | 'individual' {
    return 'team';
  }
}


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
    if (!teamConfig) {
      return { shouldEnd: false };
    }

    for (const team of teamConfig.teams) {
      const teamAllFinished = team.players.every(
        playerId => players[playerId].hand.length === 0
      );

      if (teamAllFinished) {
        const unfinishedPlayerCount = players.filter(p => p.hand.length > 0).length;
        const reason = unfinishedPlayerCount === 1 ? '关单' :
          unfinishedPlayerCount === 2 ? '关双' :
            `${team.name}全部出完`;

        return {
          shouldEnd: true,
          reason: reason
        };
      }
    }

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
    if (!teamConfig) {
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
      return findNextActivePlayer(0, players, playerCount);
    }

    const winner = players[winnerIndex];

    if (winner && winner.hand.length > 0) {
      return winnerIndex;
    }

    const winnerTeamId = winner?.teamId;
    if (winnerTeamId !== null && winnerTeamId !== undefined) {
      let nextIndex = (winnerIndex + 1) % playerCount;
      let checkedCount = 0;

      while (checkedCount < playerCount - 1) {
        const player = players[nextIndex];
        if (player.teamId === winnerTeamId && player.hand.length > 0) {
          return nextIndex;
        }
        nextIndex = (nextIndex + 1) % playerCount;
        checkedCount++;
      }

      return null;
    }

    return findNextActivePlayer(winnerIndex, players, playerCount);
  }

  getResultScreenType(): 'team' | 'individual' {
    return 'team';
  }
}


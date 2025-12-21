/**
 * 个人模式策略
 * 实现个人竞技的游戏逻辑
 */

import { Player } from '@/core/types/card';
import { TeamConfig } from '../../types/team';
import { isScoreCard, calculateCardsScore, applyIndividualFinalRules } from '@/core/services/scoringService';
import { findNextActivePlayer } from '../gameStateUtils';
import { IGameModeStrategy, GameEndCheckResult, FinalScoreResult } from './IGameModeStrategy';

export class IndividualModeStrategy implements IGameModeStrategy {

  getModeName(): string {
    return '个人模式';
  }

  /**
   * 个人模式：当只剩1个玩家有牌时游戏结束
   */
  shouldGameEnd(
    players: Player[],
    finishOrder: number[],
    teamConfig?: TeamConfig | null
  ): GameEndCheckResult {
    const playersWithCards = players.filter(p => p.hand && p.hand.length > 0);

    if (playersWithCards.length <= 1) {
      return {
        shouldEnd: true,
        reason: `只剩 ${playersWithCards.length} 个玩家有牌`
      };
    }

    return {
      shouldEnd: false
    };
  }

  /**
   * 个人模式：使用标准的个人排名规则
   */
  calculateFinalScores(
    players: Player[],
    finishOrder: number[],
    teamConfig?: TeamConfig | null
  ): FinalScoreResult {

    const { players: finalPlayers, rankings } = applyIndividualFinalRules(players, finishOrder);

    return {
      updatedPlayers: finalPlayers,
      finalRankings: rankings,
      teamRankings: undefined,
      winningTeamId: null
    };
  }

  /**
   * 个人模式：简单的顺时针找下一个有牌的玩家
   */
  findNextPlayerForNewRound(
    winnerIndex: number | null,
    players: Player[],
    playerCount: number,
    teamConfig?: TeamConfig | null
  ): number | null {

    if (winnerIndex === null) {
      return findNextActivePlayer(0, players, playerCount);
    }

    const winner = players[winnerIndex];

    // 如果接风玩家还有牌，由接风玩家开始
    if (winner && winner.hand.length > 0) {
      return winnerIndex;
    }

    // 接风玩家已出完，找下一个有牌的玩家
    const nextPlayer = findNextActivePlayer(winnerIndex, players, playerCount);
    return nextPlayer;
  }

  getResultScreenType(): 'team' | 'individual' {
    return 'individual';
  }
}


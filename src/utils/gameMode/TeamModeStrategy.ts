/**
 * 团队模式策略
 * 实现团队协作的游戏逻辑（2v2 或 3v3）
 */

import { Player } from '../../types/card';
import { TeamConfig } from '../../types/team';
import { applyTeamFinalRules } from '../teamScoring';
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
      console.warn('[团队模式] teamConfig 为 null，无法判断游戏结束');
      return { shouldEnd: false };
    }

    // 检查每个团队是否全部出完
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
      console.error('[团队模式] teamConfig 为 null，无法计算团队分数');
      throw new Error('团队模式需要 teamConfig');
    }

    console.log('[团队模式] 计算团队最终分数和排名');
    console.log('[团队模式] 团队配置:', teamConfig);
    console.log('[团队模式] 完成顺序:', finishOrder);
    
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
    
    console.log('[团队模式] 获胜团队ID:', winningTeamId);
    console.log('[团队模式] 团队排名:', teamResult.rankings);
    
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
    console.log('[团队模式] 找下一个玩家（队友优先），winnerIndex:', winnerIndex);
    console.log('[团队模式] teamConfig:', teamConfig ? '存在' : 'null');
    
    if (!teamConfig) {
      console.warn('[团队模式] teamConfig 为 null，降级为个人模式逻辑');
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
      return findNextActivePlayer(0, players, playerCount);
    }

    const winner = players[winnerIndex];
    console.log('[团队模式] 获胜者手牌数:', winner?.hand.length);
    
    // 如果接风玩家还有牌，由接风玩家开始
    if (winner && winner.hand.length > 0) {
      console.log('[团队模式] 接风玩家还有牌，返回:', winnerIndex);
      return winnerIndex;
    }

    // 接风玩家已出完牌，优先找队友
    const winnerTeamId = winner?.teamId;
    console.log('[团队模式] 接风玩家已出完，寻找队友，teamId:', winnerTeamId);
    
    if (winnerTeamId !== null && winnerTeamId !== undefined) {
      // 找队友中还有牌的玩家
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (player.teamId === winnerTeamId && player.hand.length > 0) {
          console.log('[团队模式] 找到队友接风:', i, player.name);
          return i;
        }
      }
      
      console.log('[团队模式] 队友都出完了');
      
      // 队友都出完了，检查整个团队是否都出完
      const team = teamConfig.teams.find(t => t.id === winnerTeamId);
      if (team) {
        const teamAllFinished = team.players.every(
          pid => players[pid].hand.length === 0
        );
        
        if (teamAllFinished) {
          console.log('[团队模式] 整个团队都出完，游戏应该结束，返回 null');
          // 整个团队出完，返回null表示游戏应该结束
          return null;
        }
      }
    }
    
    // 队友都出完了（但团队未全部出完），顺时针找对手
    const nextPlayer = findNextActivePlayer(winnerIndex, players, playerCount);
    console.log('[团队模式] 顺时针找对手:', nextPlayer);
    return nextPlayer;
  }

  getResultScreenType(): 'team' | 'individual' {
    return 'team';
  }
}


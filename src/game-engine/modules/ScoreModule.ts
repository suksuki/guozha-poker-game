/**
 * ScoreModule - 计分模块（纯函数）
 * 
 * 从gameController.ts迁移计分逻辑
 */

import { GameState } from '../state/GameState';
import { Player } from '../../types/card';

/**
 * ScoreModule - 计分模块
 */
export class ScoreModule {
  
  /**
   * 分配轮次分数给获胜者（纯函数）
   */
  static allocateRoundScore(
    state: GameState,
    roundScore: number,
    winnerId: number
  ): GameState {
    // 更新获胜者的分数
    const winner = state.players[winnerId];
    if (!winner) {
      throw new Error(`Invalid winner ID: ${winnerId}`);
    }
    
    const newScore = (winner.score || 0) + roundScore;
    return state.updatePlayer(winnerId, { score: newScore });
  }
  
  /**
   * 计算玩家总分（纯函数）
   */
  static calculatePlayerTotalScore(player: Player): number {
    return (player.score || 0);
  }
  
  /**
   * 计算所有玩家总分（纯函数）
   */
  static calculateAllScores(players: readonly Player[]): number[] {
    return players.map(p => this.calculatePlayerTotalScore(p));
  }
  
  /**
   * 更新玩家分数（纯函数）
   */
  static updatePlayerScore(
    state: GameState,
    playerIndex: number,
    scoreDelta: number
  ): GameState {
    const player = state.players[playerIndex];
    if (!player) {
      throw new Error(`Invalid player index: ${playerIndex}`);
    }
    
    const newScore = (player.score || 0) + scoreDelta;
    return state.updatePlayer(playerIndex, { score: newScore });
  }
}


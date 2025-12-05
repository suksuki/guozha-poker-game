/**
 * GameFlowModule - 游戏流程模块（纯函数）
 */

import { GameState } from '../state/GameState';
import { GameStatus, Player } from '../../types/card';
import { RoundModule } from '../round/RoundModule';

export class GameFlowModule {
  
  /**
   * 开始新游戏
   */
  static startGame(state: GameState): GameState {
    return state.updateStatus(GameStatus.PLAYING);
  }
  
  /**
   * 结束游戏
   */
  static endGame(state: GameState, winnerId: number): GameState {
    let newState = state.updateStatus(GameStatus.FINISHED);
    newState = newState.setWinner(winnerId);
    return newState;
  }
  
  /**
   * 检查游戏是否结束
   */
  static checkGameEnd(state: GameState): boolean {
    return state.finishOrder.length >= state.players.length - 1;
  }
  
  /**
   * 找到下一个玩家
   */
  static findNextPlayer(state: GameState): number {
    const total = state.players.length;
    for (let i = 1; i <= total; i++) {
      const nextIdx = (state.currentPlayerIndex + i) % total;
      if (state.players[nextIdx].hand.length > 0) {
        return nextIdx;
      }
    }
    return -1;
  }
}


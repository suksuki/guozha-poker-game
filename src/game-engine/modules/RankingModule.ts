/**
 * RankingModule - 排名计算模块（纯函数）
 * 
 * 从 src/utils/gameRules.ts 复用排名计算逻辑
 */

import { GameState } from '../state/GameState';
import { Player } from '../../types/card';

// 导入原有的纯函数
import {
  calculateFinalRankings,
  applyFinalGameRules,
  type PlayerRanking
} from '../../utils/gameRules';

/**
 * RankingModule - 排名计算模块
 */
export class RankingModule {
  /**
   * 计算最终排名（纯函数）
   */
  static calculateFinalRankings(
    state: GameState
  ): { rankings: PlayerRanking[]; updatedState: GameState } {
    const players = Array.from(state.players);
    const finishOrder = Array.from(state.finishOrder);
    
    // 使用原有的纯函数计算排名
    const rankings = calculateFinalRankings(players, finishOrder);
    
    // 更新状态中的玩家（应用排名结果）
    let updatedState = state;
    rankings.forEach((ranking, index) => {
      updatedState = updatedState.updatePlayer(ranking.player.id, {
        finishedRank: ranking.rank,
        score: ranking.finalScore
      });
    });
    
    return { rankings, updatedState };
  }
  
  /**
   * 应用最终游戏规则（纯函数）
   */
  static applyFinalRules(
    players: Player[],
    finishOrder: number[]
  ): Player[] {
    return applyFinalGameRules(players, finishOrder);
  }
}

// 重新导出类型
export type { PlayerRanking } from '../../utils/gameRules';


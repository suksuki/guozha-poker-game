/**
 * RankingModule - 排名计算模块（纯函数）
 * 
 * 从 src/utils/gameRules.ts 复用排名计算逻辑
 */

import { GameState } from '../state/GameState';
import { Player } from '@/core/types/card';

// 导入新的服务
import {
  calculateIndividualRankings,
  applyIndividualFinalRules,
  type PlayerRanking
} from '@/core/services/scoringService';

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

    // 使用新的服务计算排名
    const rankings = calculateIndividualRankings(players, finishOrder);

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
    return applyIndividualFinalRules(players, finishOrder).players;
  }
}

// 重新导出类型
export type { PlayerRanking } from '../../utils/gameRules';


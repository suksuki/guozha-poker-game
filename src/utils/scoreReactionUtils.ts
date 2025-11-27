/**
 * 分数反应工具函数
 * 统一处理分数被吃后的反应逻辑
 */

import { Player, MultiPlayerGameState } from '../types/card';
import { triggerScoreEatenCurseReaction, triggerScoreStolenReaction } from '../services/chatService';

/**
 * 触发分数被吃后的反应
 * @param player 失去分数的玩家
 * @param lostScore 失去的分数
 * @param totalRoundScore 当前轮次总分数
 * @param gameState 可选的游戏状态（用于某些反应）
 */
export function triggerScoreLossReaction(
  player: Player,
  lostScore: number,
  totalRoundScore: number,
  gameState?: MultiPlayerGameState
): void {
  const shouldCurse = lostScore >= 5 || totalRoundScore >= 10;
  
  if (shouldCurse) {
    // 大分被吃，触发脏话（更激烈）- 80%概率
    if (Math.random() < 0.8) {
      triggerScoreEatenCurseReaction(player, lostScore, gameState).catch(console.error);
    } else if (Math.random() < 0.3) {
      // 20%概率普通抱怨
      triggerScoreStolenReaction(player, lostScore, gameState).catch(console.error);
    }
  } else {
    // 小分被吃，也有一定概率触发脏话（30%），或者普通抱怨（40%）
    if (Math.random() < 0.3) {
      triggerScoreEatenCurseReaction(player, lostScore, gameState).catch(console.error);
    } else if (Math.random() < 0.4) {
      triggerScoreStolenReaction(player, lostScore, gameState).catch(console.error);
    }
  }
}


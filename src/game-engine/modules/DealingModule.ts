/**
 * DealingModule - 发牌模块（纯函数）
 * 
 * 复用cardUtils的dealCards逻辑
 */

import { GameState } from '../state/GameState';
import { Card, Player } from '../../types/card';
import { dealCards as dealCardsUtil } from '../../utils/cardUtils';

// 导出dealCards供外部使用
export { dealCards } from '../../utils/cardUtils';

/**
 * DealingModule - 发牌模块
 */
export class DealingModule {
  
  /**
   * 发牌并更新状态（纯函数）
   */
  static dealAndUpdateState(
    state: GameState,
    algorithm?: string
  ): { updatedState: GameState; hands: Card[][] } {
    // 发牌（使用现有的dealCards函数）
    const hands = dealCardsUtil(state.config.playerCount);
    
    // 更新玩家手牌
    let updatedState = state;
    hands.forEach((hand, index) => {
      updatedState = updatedState.updatePlayer(index, { hand });
    });
    
    // 保存初始手牌
    updatedState = updatedState.setInitialHands(hands);
    
    return { updatedState, hands };
  }
  
  /**
   * 为玩家分配手牌（纯函数）
   */
  static assignHandsToPlayers(
    state: GameState,
    hands: Card[][]
  ): GameState {
    if (hands.length !== state.players.length) {
      throw new Error('Hands count must match player count');
    }
    
    let updatedState = state;
    hands.forEach((hand, index) => {
      updatedState = updatedState.updatePlayer(index, { hand });
    });
    
    updatedState = updatedState.setInitialHands(hands);
    
    return updatedState;
  }
}


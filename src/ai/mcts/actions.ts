/**
 * MCTS动作生成
 */

import { Card, Play } from '../../types/card';
import { findPlayableCards } from '../../utils/cardUtils';

/**
 * 生成所有可能的出牌动作
 */
export function generateActions(hand: Card[], lastPlay: Play | null): Card[][] {
  return findPlayableCards(hand, lastPlay);
}


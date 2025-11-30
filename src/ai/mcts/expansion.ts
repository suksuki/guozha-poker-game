/**
 * MCTS节点扩展
 */

import { Card } from '../../types/card';
import { MCTSNode } from '../types';
import { canPlayCards, canBeat } from '../../utils/cardUtils';

/**
 * 扩展节点：添加新的子节点
 */
export function expandNode(node: MCTSNode, allCards: Card[]): MCTSNode | null {
  if (node.untriedActions.length === 0) {
    return null; // 没有未尝试的动作
  }
  
  // 随机选择一个未尝试的动作
  const randomIndex = Math.floor(Math.random() * node.untriedActions.length);
  const action = node.untriedActions.splice(randomIndex, 1)[0];
  
  // 创建新的游戏状态
  const newHand = node.hand.filter(
    card => !action.some(c => c.id === card.id)
  );
  
  const play = canPlayCards(action);
  if (!play) {
    return null;
  }
  
  // 检查是否可以出牌
  if (node.lastPlay && !canBeat(play, node.lastPlay)) {
    return null; // 不能压过
  }
  
  // 创建新节点
  const newNode: MCTSNode = {
    hand: newHand,
    lastPlay: play,
    playerToMove: node.playerToMove === 'ai' ? 'opponent' : 'ai',
    visits: 0,
    wins: 0,
    children: [],
    parent: node,
    action: action,
    untriedActions: [] // 将在需要时生成
  };
  
  node.children.push(newNode);
  return newNode;
}


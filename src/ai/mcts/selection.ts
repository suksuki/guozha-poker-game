/**
 * MCTS节点选择算法
 */

import { MCTSNode } from '../types';
import { uctValue } from './uct';

/**
 * 选择最佳子节点（UCT算法）
 */
export function selectBestChild(node: MCTSNode, explorationConstant: number): MCTSNode {
  if (node.children.length === 0) {
    return node;
  }
  
  // 如果当前是AI的回合，选择UCT值最高的（AI想赢）
  // 如果是对手的回合，选择UCT值最低的（对手想赢）
  let bestChild = node.children[0];
  let bestValue = uctValue(node.children[0], explorationConstant);
  
  for (const child of node.children) {
    const value = uctValue(child, explorationConstant);
    if (node.playerToMove === 'ai') {
      // AI回合：选择UCT值最高的
      if (value > bestValue) {
        bestValue = value;
        bestChild = child;
      }
    } else {
      // 对手回合：选择UCT值最低的（从AI角度看，对手会选择对AI最不利的）
      if (value < bestValue) {
        bestValue = value;
        bestChild = child;
      }
    }
  }
  
  return bestChild;
}


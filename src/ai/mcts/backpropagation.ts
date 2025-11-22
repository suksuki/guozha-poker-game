/**
 * MCTS反向传播
 */

import { MCTSNode } from '../types';

/**
 * 反向传播：更新节点统计
 */
export function backpropagate(node: MCTSNode | null, winner: number): void {
  let currentNode: MCTSNode | null = node;
  
  while (currentNode) {
    currentNode.visits++;
    
    // 判断这个节点是否导致AI获胜
    // winner是获胜者的索引，0表示AI，1+表示对手
    if (winner === 0) {
      // AI获胜，加分
      currentNode.wins += 1;
    } else {
      // 对手获胜，不加分
      currentNode.wins += 0;
    }
    
    currentNode = currentNode.parent;
  }
}


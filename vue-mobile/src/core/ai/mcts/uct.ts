/**
 * UCT算法实现
 * Upper Confidence Bound for Trees
 */

import { MCTSNode } from '../types';

/**
 * UCT值计算（Upper Confidence Bound for Trees）
 */
export function uctValue(node: MCTSNode, explorationConstant: number): number {
  if (node.visits === 0) {
    return Infinity; // 未访问的节点优先探索
  }
  
  const exploitation = node.wins / node.visits; // 利用：胜率
  const exploration = explorationConstant * Math.sqrt(
    Math.log((node.parent?.visits || 1)) / node.visits
  );
  
  return exploitation + exploration;
}


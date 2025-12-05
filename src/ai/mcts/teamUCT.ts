/**
 * 团队MCTS的UCT公式
 * 优化团队收益而非个人收益
 */

import { TeamMCTSNode } from '../types';
import { normalizeTeamScore } from './teamEvaluation';

/**
 * 计算团队UCT值
 */
export function teamUCTValue(node: TeamMCTSNode, c: number): number {
  if (node.visits === 0) return Infinity;
  
  // 利用：团队平均得分（而不是胜率）
  const teamScoreAvg = node.teamScoreSum / node.visits;
  const normalizedScore = normalizeTeamScore(teamScoreAvg);  // 归一化到[0,1]
  
  // 探索：标准UCT探索项
  const exploration = c * Math.sqrt(
    Math.log(node.parent?.visits || 1) / node.visits
  );
  
  // 额外项：团队配合度奖励
  const cooperationBonus = node.evaluation.teamCooperationScore * 0.1;
  
  return normalizedScore + exploration + cooperationBonus;
}

/**
 * 选择最佳子节点（团队版）
 */
export function selectBestTeamChild(
  node: TeamMCTSNode,
  explorationConstant: number
): TeamMCTSNode {
  if (node.children.length === 0) {
    throw new Error('No children to select from');
  }
  
  let bestChild = node.children[0];
  let bestValue = teamUCTValue(bestChild, explorationConstant);
  
  for (let i = 1; i < node.children.length; i++) {
    const child = node.children[i];
    const value = teamUCTValue(child, explorationConstant);
    
    if (value > bestValue) {
      bestValue = value;
      bestChild = child;
    }
  }
  
  return bestChild;
}

/**
 * 计算节点的平均团队得分
 */
export function getAverageTeamScore(node: TeamMCTSNode): number {
  if (node.visits === 0) return 0;
  return node.teamScoreSum / node.visits;
}

/**
 * 计算节点的团队胜率
 */
export function getTeamWinRate(node: TeamMCTSNode): number {
  if (node.visits === 0) return 0;
  return node.teamWins / node.visits;
}


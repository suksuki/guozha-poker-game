/**
 * 团队MCTS主算法
 * 集成所有团队MCTS组件
 */

import { Card, Play } from '../../types/card';
import { TeamAction, TeamSimulatedGameState, TeamMCTSNode, MCTSTeamConfig } from '../types';
import { generateTeamActions } from './teamActions';
import { evaluateTeamAction } from './teamEvaluation';
import { teamUCTValue, selectBestTeamChild } from './teamUCT';
import { simulateTeamGame } from './teamSimulation';

/**
 * 团队MCTS主算法
 * @param hand AI手牌
 * @param state 当前游戏状态
 * @param config 团队MCTS配置
 * @returns 最佳团队动作
 */
export function teamMCTS(
  hand: Card[],
  state: TeamSimulatedGameState,
  config: MCTSTeamConfig
): TeamAction | null {
  const iterations = config.iterations || 100;
  const explorationConstant = config.explorationConstant || 1.414;
  const maxTime = 3000; // 最多3秒
  const startTime = Date.now();
  
  // 生成所有可能的动作
  const actions = generateTeamActions(hand, state, config.strategicPassEnabled);
  
  if (actions.length === 0) {
    return null; // 没有可用动作
  }
  
  // 创建根节点
  const root: TeamMCTSNode = {
    state: state,
    playerToMove: state.currentPlayerIndex,
    visits: 0,
    teamWins: 0,
    teamScoreSum: 0,
    children: [],
    parent: null,
    action: null,
    untriedActions: [...actions],
    evaluation: {
      expectedTeamScore: 0,
      strategicPassValue: 0,
      teamCooperationScore: 0,
      confidence: 0
    }
  };
  
  // MCTS主循环
  for (let i = 0; i < iterations; i++) {
    // 超时保护
    if (Date.now() - startTime > maxTime) {
      console.log(`MCTS timeout after ${i} iterations`);
      break;
    }
    
    let node = root;
    
    // 1. Selection（选择）：选择最有希望的节点
    while (node.children.length > 0 && node.untriedActions.length === 0) {
      node = selectBestTeamChild(node, explorationConstant);
    }
    
    // 2. Expansion（扩展）：如果节点可以扩展，添加新节点
    if (node.untriedActions.length > 0) {
      node = expandTeamNode(node, hand, config);
    }
    
    // 3. Simulation（模拟）：从当前节点模拟游戏
    const simulationResult = simulateTeamGame(node.state, 50, config);
    
    // 4. Backpropagation（反向传播）：更新节点统计
    backpropagateTeam(node, simulationResult, config);
  }
  
  // 选择最佳动作
  return selectBestTeamAction(root, config);
}

/**
 * 扩展团队MCTS节点
 */
function expandTeamNode(
  node: TeamMCTSNode,
  hand: Card[],
  config: MCTSTeamConfig
): TeamMCTSNode {
  if (node.untriedActions.length === 0) {
    return node;
  }
  
  // 随机选择一个未尝试的动作
  const actionIndex = Math.floor(Math.random() * node.untriedActions.length);
  const action = node.untriedActions[actionIndex];
  node.untriedActions.splice(actionIndex, 1);
  
  // 创建新状态
  const newState = applyActionToState(node.state, action);
  
  // 创建子节点
  const childNode: TeamMCTSNode = {
    state: newState,
    playerToMove: newState.currentPlayerIndex,
    visits: 0,
    teamWins: 0,
    teamScoreSum: 0,
    children: [],
    parent: node,
    action: action,
    untriedActions: generateTeamActions(
      newState.allHands[newState.currentPlayerIndex],
      newState,
      config.strategicPassEnabled
    ),
    evaluation: {
      expectedTeamScore: evaluateTeamAction(action, node.state, hand, config),
      strategicPassValue: action.type === 'pass' && action.strategic ? 1 : 0,
      teamCooperationScore: 0,
      confidence: 0
    }
  };
  
  node.children.push(childNode);
  return childNode;
}

/**
 * 应用动作到状态（创建新状态）
 */
function applyActionToState(
  state: TeamSimulatedGameState,
  action: TeamAction
): TeamSimulatedGameState {
  const newState: TeamSimulatedGameState = {
    ...state,
    allHands: state.allHands.map(hand => [...hand]),
    teamScores: new Map(state.teamScores),
    playerTeams: new Map(state.playerTeams),
    roundContext: { ...state.roundContext }
  };
  
  if (action.type === 'play') {
    // 从手牌中移除出的牌
    const currentHand = newState.allHands[newState.currentPlayerIndex];
    newState.allHands[newState.currentPlayerIndex] = currentHand.filter(card => 
      !action.cards.some(c => c.id === card.id)
    );
    
    // 更新最后出牌（简化版）
    newState.lastPlayPlayerIndex = newState.currentPlayerIndex;
    
    // 累计分数
    const cardScore = action.cards.reduce((sum, card) => {
      if (card.rank === 3) return sum + 5;  // 5
      if (card.rank === 8) return sum + 10; // 10
      if (card.rank === 11) return sum + 10; // K
      return sum;
    }, 0);
    newState.roundContext.roundScore += cardScore;
  } else if (action.type === 'pass') {
    newState.lastPassPlayerIndex = newState.currentPlayerIndex;
  }
  
  // 转到下一个玩家
  newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.playerCount;
  
  return newState;
}

/**
 * 反向传播团队结果
 */
function backpropagateTeam(
  node: TeamMCTSNode,
  simulationResult: { winningTeam: number; finalTeamScores: Map<number, number> },
  config: MCTSTeamConfig
): void {
  let currentNode: TeamMCTSNode | null = node;
  const aiTeamId = node.state.playerTeams.get(0)!; // AI是玩家0
  
  while (currentNode !== null) {
    currentNode.visits++;
    
    // 更新团队得分
    const teamScore = simulationResult.finalTeamScores.get(aiTeamId) || 0;
    currentNode.teamScoreSum += teamScore;
    
    // 更新团队胜利次数
    if (simulationResult.winningTeam === aiTeamId) {
      currentNode.teamWins++;
    }
    
    currentNode = currentNode.parent;
  }
}

/**
 * 选择最佳团队动作
 */
function selectBestTeamAction(
  root: TeamMCTSNode,
  config: MCTSTeamConfig
): TeamAction | null {
  if (root.children.length === 0) {
    // 没有子节点，返回第一个可用动作
    return root.untriedActions[0] || null;
  }
  
  // 计算每个子节点的综合分数
  const scoredChildren = root.children.map(child => {
    if (!child.action) return { child, score: 0 };
    
    // 访问次数分数
    const visitScore = child.visits;
    
    // 团队胜率
    const winRate = child.visits > 0 ? child.teamWins / child.visits : 0;
    
    // 平均团队得分
    const avgTeamScore = child.visits > 0 ? child.teamScoreSum / child.visits : 0;
    
    // 综合分数
    const baseScore = visitScore * 0.3 + winRate * 100 + avgTeamScore * 0.5;
    
    // 启发式分数：评估值
    const heuristicScore = child.evaluation.expectedTeamScore;
    
    return {
      child,
      score: baseScore + heuristicScore * 0.2,
      visits: visitScore,
      winRate,
      avgTeamScore
    };
  });
  
  // 排序
  scoredChildren.sort((a, b) => b.score - a.score);
  
  // 打印前3个候选（调试用）
  if (config.iterations && config.iterations > 50) {
    console.log('Top 3 team actions:');
    scoredChildren.slice(0, 3).forEach((sc, idx) => {
      const action = sc.child.action!;
      const actionDesc = action.type === 'play' 
        ? `出牌 ${action.cards.length}张`
        : `要不起 (${action.strategic ? '主动' : '被动'})`;
      console.log(`  ${idx + 1}. ${actionDesc} - 得分:${sc.score.toFixed(1)}, 访问:${sc.visits}, 胜率:${(sc.winRate * 100).toFixed(1)}%, 平均分:${sc.avgTeamScore.toFixed(1)}`);
    });
  }
  
  return scoredChildren[0].child.action;
}

/**
 * 团队MCTS生成多个候选动作
 */
export function teamMCTSChooseMultiplePlays(
  hand: Card[],
  state: TeamSimulatedGameState,
  config: MCTSTeamConfig,
  topN: number = 5
): Array<{ action: TeamAction; score: number; explanation: string }> {
  const iterations = config.iterations || 100;
  const explorationConstant = config.explorationConstant || 1.414;
  const maxTime = 3000;
  const startTime = Date.now();
  
  const actions = generateTeamActions(hand, state, config.strategicPassEnabled);
  
  if (actions.length === 0) {
    return [];
  }
  
  const root: TeamMCTSNode = {
    state: state,
    playerToMove: state.currentPlayerIndex,
    visits: 0,
    teamWins: 0,
    teamScoreSum: 0,
    children: [],
    parent: null,
    action: null,
    untriedActions: [...actions],
    evaluation: {
      expectedTeamScore: 0,
      strategicPassValue: 0,
      teamCooperationScore: 0,
      confidence: 0
    }
  };
  
  // MCTS主循环
  for (let i = 0; i < iterations; i++) {
    if (Date.now() - startTime > maxTime) {
      break;
    }
    
    let node = root;
    
    while (node.children.length > 0 && node.untriedActions.length === 0) {
      node = selectBestTeamChild(node, explorationConstant);
    }
    
    if (node.untriedActions.length > 0) {
      node = expandTeamNode(node, hand, config);
    }
    
    const simulationResult = simulateTeamGame(node.state, 50, config);
    backpropagateTeam(node, simulationResult, config);
  }
  
  // 获取所有子节点并评分
  const scoredActions = root.children.map(child => {
    const visitScore = child.visits;
    const winRate = child.visits > 0 ? child.teamWins / child.visits : 0;
    const avgTeamScore = child.visits > 0 ? child.teamScoreSum / child.visits : 0;
    const score = visitScore * 0.3 + winRate * 100 + avgTeamScore * 0.5 + child.evaluation.expectedTeamScore * 0.2;
    
    // 生成解释
    let explanation = '';
    if (child.action?.type === 'play') {
      explanation = `出${child.action.cards.length}张牌，预期团队得分${avgTeamScore.toFixed(1)}，胜率${(winRate * 100).toFixed(1)}%`;
    } else if (child.action?.type === 'pass' && child.action.strategic) {
      explanation = `主动要不起，让队友出牌，预期团队收益${child.evaluation.expectedTeamScore.toFixed(1)}`;
    } else {
      explanation = `被动要不起`;
    }
    
    return {
      action: child.action!,
      score,
      explanation
    };
  });
  
  // 排序并返回前N个
  scoredActions.sort((a, b) => b.score - a.score);
  return scoredActions.slice(0, topN);
}


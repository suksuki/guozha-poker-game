/**
 * 团队MCTS模拟过程
 * 支持团队策略和主动要不起
 */

import { Card, Play } from '../../types/card';
import { TeamSimulatedGameState, TeamAction, MCTSTeamConfig } from '../types';
import { generateTeamActions } from './teamActions';
import { evaluateTeamAction } from './teamEvaluation';
import { findPlayableCards, canPlayCards } from '../../utils/cardUtils';

/**
 * 模拟团队游戏
 */
export function simulateTeamGame(
  state: TeamSimulatedGameState,
  maxDepth: number,
  config: MCTSTeamConfig
): { winningTeam: number; finalTeamScores: Map<number, number> } {
  let depth = 0;
  const localState = cloneTeamGameState(state);
  
  while (!localState.isTerminal && depth < maxDepth) {
    const currentHand = localState.allHands[localState.currentPlayerIndex];
    
    if (!currentHand || currentHand.length === 0) {
      // 该玩家已经出完牌
      localState.currentPlayerIndex = getNextPlayer(localState);
      continue;
    }
    
    const currentTeamId = localState.playerTeams.get(localState.currentPlayerIndex)!;
    
    // 生成所有动作（包括主动要不起）
    const actions = generateTeamActions(
      currentHand,
      localState,
      config.strategicPassEnabled
    );
    
    if (actions.length === 0) {
      // 真的没有能打过的牌，被动要不起
      localState.lastPlay = null;
      localState.lastPlayPlayerIndex = null;
      localState.currentPlayerIndex = getNextPlayer(localState);
      continue;
    }
    
    // 根据策略选择动作
    const selectedAction = selectActionInSimulation(
      actions,
      localState,
      currentHand,
      currentTeamId,
      config
    );
    
    // 更新状态
    if (selectedAction.type === 'play') {
      updateStateAfterPlay(localState, selectedAction.cards);
    } else if (selectedAction.type === 'pass') {
      updateStateAfterPass(localState, selectedAction.strategic);
    }
    
    // 检查游戏是否结束
    if (checkGameFinished(localState)) {
      localState.isTerminal = true;
      break;
    }
    
    // 转到下一个玩家
    localState.currentPlayerIndex = getNextPlayer(localState);
    depth++;
  }
  
  // 返回获胜团队和最终团队得分
  const finalTeamScores = calculateFinalTeamScores(localState);
  const winningTeam = determineWinningTeam(finalTeamScores);
  
  return {
    winningTeam,
    finalTeamScores
  };
}

/**
 * 模拟中的动作选择（考虑团队策略）
 */
function selectActionInSimulation(
  actions: TeamAction[],
  state: TeamSimulatedGameState,
  hand: Card[],
  currentTeamId: number,
  config: MCTSTeamConfig
): TeamAction {
  // 如果是AI的团队，使用团队策略
  const aiTeamId = state.playerTeams.get(0); // 假设AI是玩家0
  
  if (currentTeamId === aiTeamId) {
    return selectTeamCooperativeAction(actions, state, hand, config);
  } else {
    // 对手使用竞争策略
    return selectCompetitiveAction(actions, state);
  }
}

/**
 * 团队配合动作选择
 */
function selectTeamCooperativeAction(
  actions: TeamAction[],
  state: TeamSimulatedGameState,
  hand: Card[],
  config: MCTSTeamConfig
): TeamAction {
  // 评估每个动作的团队价值
  const scoredActions = actions.map(action => ({
    action,
    score: evaluateTeamAction(action, state, hand, config)
  }));
  
  // 排序，优先选择团队价值高的
  scoredActions.sort((a, b) => b.score - a.score);
  
  // 添加一些随机性（避免过于确定）
  const topScore = scoredActions[0].score;
  const goodActions = scoredActions.filter(a => a.score >= topScore - 10);
  
  return goodActions[Math.floor(Math.random() * goodActions.length)].action;
}

/**
 * 竞争动作选择（对手策略）
 */
function selectCompetitiveAction(
  actions: TeamAction[],
  state: TeamSimulatedGameState
): TeamAction {
  // 过滤出出牌动作
  const playActions = actions.filter(a => a.type === 'play');
  
  if (playActions.length === 0) {
    // 只能要不起
    return actions[0];
  }
  
  // 选择最小的能打过的牌（贪婪策略）
  const sortedActions = playActions.sort((a, b) => {
    if (a.type === 'play' && b.type === 'play') {
      return a.cards.length - b.cards.length || 
             a.cards[0].rank - b.cards[0].rank;
    }
    return 0;
  });
  
  return sortedActions[0];
}

/**
 * 更新状态：出牌后
 */
function updateStateAfterPlay(
  state: TeamSimulatedGameState,
  cards: Card[]
): void {
  const currentPlayer = state.currentPlayerIndex;
  const currentHand = state.allHands[currentPlayer];
  
  // 从手牌中移除出的牌
  const remainingCards = currentHand.filter(card => 
    !cards.some(c => c.id === card.id)
  );
  state.allHands[currentPlayer] = remainingCards;
  
  // 更新最后出牌
  const play = canPlayCards(cards);
  if (play) {
    state.lastPlay = play;
    state.lastPlayPlayerIndex = currentPlayer;
  }
  
  // 累计分数（如果有分数牌）
  const cardScore = calculateCardScore(cards);
  state.roundScore += cardScore;
}

/**
 * 更新状态：要不起后
 */
function updateStateAfterPass(
  state: TeamSimulatedGameState,
  strategic: boolean
): void {
  state.lastPassPlayerIndex = state.currentPlayerIndex;
  
  // 如果所有其他玩家都要不起，当前轮次结束
  // 简化版：暂不实现完整逻辑
}

/**
 * 获取下一个玩家
 */
function getNextPlayer(state: TeamSimulatedGameState): number {
  return (state.currentPlayerIndex + 1) % state.playerCount;
}

/**
 * 检查游戏是否结束
 */
function checkGameFinished(state: TeamSimulatedGameState): boolean {
  // 检查是否有玩家出完牌
  for (let i = 0; i < state.playerCount; i++) {
    if (state.allHands[i].length === 0) {
      return true;
    }
  }
  return false;
}

/**
 * 计算卡牌分数
 */
function calculateCardScore(cards: Card[]): number {
  return cards.reduce((sum, card) => {
    // 5=5分，10=10分，K=10分
    if (card.rank === 3) return sum + 5;  // 5
    if (card.rank === 8) return sum + 10; // 10
    if (card.rank === 11) return sum + 10; // K
    return sum;
  }, 0);
}

/**
 * 计算最终团队得分
 */
function calculateFinalTeamScores(
  state: TeamSimulatedGameState
): Map<number, number> {
  // 简化版：直接返回当前团队得分
  return new Map(state.teamScores);
}

/**
 * 确定获胜团队
 */
function determineWinningTeam(teamScores: Map<number, number>): number {
  let maxScore = -Infinity;
  let winningTeam = -1;
  
  for (const [teamId, score] of teamScores.entries()) {
    if (score > maxScore) {
      maxScore = score;
      winningTeam = teamId;
    }
  }
  
  return winningTeam;
}

/**
 * 克隆团队游戏状态
 */
function cloneTeamGameState(state: TeamSimulatedGameState): TeamSimulatedGameState {
  return {
    ...state,
    allHands: state.allHands.map(hand => [...hand]),
    teamScores: new Map(state.teamScores),
    playerTeams: new Map(state.playerTeams),
    roundContext: { ...state.roundContext }
  };
}


/**
 * 团队MCTS评估函数
 * 评估团队动作的价值，优化团队收益而非个人收益
 */

import { Card } from '../../types/card';
import { TeamAction, TeamSimulatedGameState, MCTSTeamConfig } from '../types';
import { evaluateStrategicPass } from './teamActions';
import { isScoreCard, getCardScore } from '../../utils/cardUtils';

/**
 * 评估团队动作的价值
 */
export function evaluateTeamAction(
  action: TeamAction,
  state: TeamSimulatedGameState,
  hand: Card[],
  config: MCTSTeamConfig
): number {
  let score = 0;
  
  // 1. 团队得分评估
  const teamScore = calculateTeamScoreBenefit(action, state);
  score += teamScore * (config.teamScoreWeight || 2.0);
  
  // 2. 主动要不起的评估
  if (action.type === 'pass' && action.strategic) {
    const passValue = evaluateStrategicPass(state, hand);
    score += passValue * (config.strategicPassWeight || 1.0);
  }
  
  // 3. 个人得分评估（权重降低）
  if (action.type === 'play') {
    const personalScore = calculatePersonalScore(action.cards);
    score += personalScore * 0.3;  // 个人得分权重降低
  }
  
  // 4. 团队配合评估
  const cooperationScore = evaluateTeamCooperation(action, state, hand);
  score += cooperationScore * (config.cooperationWeight || 1.0);
  
  // 5. 长期策略评估
  const longTermScore = evaluateLongTermStrategy(action, state, hand);
  score += longTermScore * (config.longTermStrategyWeight || 0.5);
  
  return score;
}

/**
 * 计算团队得分收益
 */
function calculateTeamScoreBenefit(
  action: TeamAction,
  state: TeamSimulatedGameState
): number {
  if (action.type === 'pass') {
    // 主动要不起可能让队友得分
    const currentTeamId = state.playerTeams.get(state.currentPlayerIndex);
    // 如果当前轮次有分数，让队友得分是有价值的
    return state.roundContext.roundScore * 0.5;
  }
  
  if (action.type === 'play') {
    // 出牌可能获得分数
    const cardScore = action.cards.reduce((sum, card) => 
      sum + (isScoreCard(card) ? getCardScore(card) : 0), 0
    );
    
    // 加上当前轮次累计的分数
    return cardScore + state.roundContext.roundScore;
  }
  
  return 0;
}

/**
 * 计算个人得分
 */
function calculatePersonalScore(cards: Card[]): number {
  return cards.reduce((sum, card) => 
    sum + (isScoreCard(card) ? getCardScore(card) : 0), 0
  );
}

/**
 * 评估团队配合
 */
function evaluateTeamCooperation(
  action: TeamAction,
  state: TeamSimulatedGameState,
  hand: Card[]
): number {
  let score = 0;
  
  // 1. 是否帮助队友？
  if (action.type === 'pass' && action.strategic) {
    if (teammateNeedsHelp(state)) {
      score += 30;
    }
  }
  
  // 2. 是否保护了队友？
  if (action.type === 'play' && protectsTeammate(action.cards, state)) {
    score += 20;
  }
  
  // 3. 是否协调了出牌节奏？
  if (coordinatesWithTeammate(action, state, hand)) {
    score += 15;
  }
  
  return score;
}

/**
 * 队友是否需要帮助
 */
function teammateNeedsHelp(state: TeamSimulatedGameState): boolean {
  const currentTeamId = state.playerTeams.get(state.currentPlayerIndex);
  
  // 找到队友
  for (const [playerId, teamId] of state.playerTeams.entries()) {
    if (teamId === currentTeamId && playerId !== state.currentPlayerIndex) {
      const teammateHandCount = state.allHands[playerId]?.length || 0;
      // 如果队友手牌很少，需要帮助出牌
      return teammateHandCount > 0 && teammateHandCount <= 5;
    }
  }
  
  return false;
}

/**
 * 是否保护了队友
 */
function protectsTeammate(cards: Card[], state: TeamSimulatedGameState): boolean {
  // 简化版：如果出牌压过了对手的大牌，保护了队友
  if (!state.lastPlay) {
    return false;
  }
  
  const currentTeamId = state.playerTeams.get(state.currentPlayerIndex);
  const lastPlayTeamId = state.playerTeams.get(state.lastPlayPlayerIndex!);
  
  // 如果上家是对手，且出的是大牌，压过它就是保护队友
  return lastPlayTeamId !== currentTeamId && state.lastPlay.value >= 12;
}

/**
 * 是否协调了出牌节奏
 */
function coordinatesWithTeammate(
  action: TeamAction,
  state: TeamSimulatedGameState,
  hand: Card[]
): boolean {
  // 简化版：如果主动要不起让队友有机会出牌，是协调节奏
  if (action.type === 'pass' && action.strategic) {
    const teammateHandCount = getTeammateHandCount(state);
    return teammateHandCount > 0 && teammateHandCount < hand.length;
  }
  
  return false;
}

/**
 * 获取队友手牌数量
 */
function getTeammateHandCount(state: TeamSimulatedGameState): number {
  const currentTeamId = state.playerTeams.get(state.currentPlayerIndex);
  
  for (const [playerId, teamId] of state.playerTeams.entries()) {
    if (teamId === currentTeamId && playerId !== state.currentPlayerIndex) {
      return state.allHands[playerId]?.length || 0;
    }
  }
  
  return 0;
}

/**
 * 评估长期策略
 */
function evaluateLongTermStrategy(
  action: TeamAction,
  state: TeamSimulatedGameState,
  hand: Card[]
): number {
  let score = 0;
  
  // 1. 是否保留了关键牌？
  if (action.type === 'pass' && action.strategic) {
    const preservesKeyCards = checkKeyCardsPreserved(hand);
    if (preservesKeyCards) {
      score += 25;
    }
  }
  
  // 2. 是否影响了后续轮次？
  const futureRoundImpact = estimateFutureRoundImpact(action, state);
  score += futureRoundImpact * 0.5;
  
  // 3. 是否建立了团队优势？
  const teamAdvantage = calculateTeamAdvantage(action, state);
  score += teamAdvantage * 1.5;
  
  return score;
}

/**
 * 检查是否保留了关键牌
 */
function checkKeyCardsPreserved(hand: Card[]): boolean {
  // 简化版：检查是否有大牌（A或以上）
  return hand.some(card => card.rank >= 12);
}

/**
 * 估计对未来轮次的影响
 */
function estimateFutureRoundImpact(
  action: TeamAction,
  state: TeamSimulatedGameState
): number {
  // 简化版：主动要不起保留大牌，对未来有正面影响
  if (action.type === 'pass' && action.strategic) {
    return state.roundContext.roundScore > 10 ? 20 : 10;
  }
  
  return 0;
}

/**
 * 计算团队优势
 */
function calculateTeamAdvantage(
  action: TeamAction,
  state: TeamSimulatedGameState
): number {
  const currentTeamId = state.playerTeams.get(state.currentPlayerIndex);
  const currentTeamScore = state.teamScores.get(currentTeamId!) || 0;
  
  // 计算对手团队最高分
  let maxOpponentScore = 0;
  for (const [teamId, score] of state.teamScores.entries()) {
    if (teamId !== currentTeamId && score > maxOpponentScore) {
      maxOpponentScore = score;
    }
  }
  
  // 团队优势 = 己方得分 - 对手最高分
  return currentTeamScore - maxOpponentScore;
}

/**
 * 归一化团队得分（用于UCT公式）
 */
export function normalizeTeamScore(score: number): number {
  // 将得分归一化到[0,1]范围
  // 假设最高分数是200
  return Math.min(1, Math.max(0, score / 200));
}


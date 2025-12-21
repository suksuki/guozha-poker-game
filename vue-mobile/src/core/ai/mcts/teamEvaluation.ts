/**
 * 团队MCTS评估函数
 * 评估团队动作的价值，优化团队收益而非个人收益
 */

import { Card } from '@/core/types/card';
import { TeamAction, TeamSimulatedGameState, MCTSTeamConfig } from '../types';
import { evaluateStrategicPass } from './teamActions';
import { calculateCardsScore } from '@/core/services/scoringService';

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

  // 6. [NEW] 角色定位策略 (Role Awareness)
  // AI根据手牌强弱决定是当"C位"(Carry)还是"辅助"(Support)
  const roleScore = evaluateRoleBasedStrategy(action, state, hand);
  score += roleScore * (config.roleWeight || 1.5); // 给角色策略较高的权重

  return score;
}

/**
 * 角色定义
 */
type PlayerRole = 'carry' | 'support' | 'balanced';

/**
 * 评估基于角色的策略价值
 */
function evaluateRoleBasedStrategy(
  action: TeamAction,
  state: TeamSimulatedGameState,
  hand: Card[]
): number {
  const role = determineRole(hand);
  let score = 0;

  if (role === 'support') {
    // === 辅助位策略：牺牲自己，成全队友 ===

    // 1. 顶大牌阻击对手
    // 如果上家是对手，且自己打出了大牌（K/A/2），给予额外奖励
    if (action.type === 'play' && state.lastPlay) {
      const lastPlayTeam = state.playerTeams.get(state.lastPlayPlayerIndex!);
      const myTeam = state.playerTeams.get(state.currentPlayerIndex);
      if (lastPlayTeam !== myTeam) {
        // 出大牌顶住
        if (action.cards[0].rank >= 12) { // K, A, 2, Joker
          score += 25;
        }
      }
    }

    // 2. 喂牌给队友
    // 如果队友手牌少（需要接牌），自己打出小对子或小单张，视为喂牌
    if (action.type === 'play' && teammateNeedsHelp(state)) {
      const isSmallCards = action.cards[0].rank <= 10;
      if (isSmallCards) {
        score += 30;
      }
    }

    // 3. 敢于战略过牌（存炸弹炸关键轮）
    if (action.type === 'pass' && action.strategic) {
      score += 20; // 辅助位更倾向于通过Pass来保留实力控制局势
    }

  } else if (role === 'carry') {
    // === C位策略：进攻为主，尽快跑牌 ===

    // 1. 优先出牌权
    if (action.type === 'play') {
      score += 10; // 只要能出牌就是赚

      // 如果能回手（比如打完大对子），加分更多
      if (action.cards[0].rank >= 13) {
        score += 15;
      }
    }

    // 2. 也是要保护炸弹的，但为了做大牌
    // 这里逻辑隐含在 default 的 MCTS 搜索中（胜率导向）
  }

  return score;
}

/**
 * 简单判定角色 (Simple Role Determination)
 * 基于大牌数量和手牌整齐度
 */
function determineRole(hand: Card[]): PlayerRole {
  // 计算大牌分 (Point System)
  // 大王=4, 小王=3, 2=2, A=1
  let powerPoints = 0;
  hand.forEach(c => {
    if (c.rank === 17) powerPoints += 4; // Big Joker
    else if (c.rank === 16) powerPoints += 3; // Small Joker
    else if (c.rank === 15) powerPoints += 2; // 2
    else if (c.rank === 14) powerPoints += 1; // A
  });

  // 如果有炸弹，每个炸弹+5分
  // 这里需要简单的炸弹检测逻辑，暂时简化
  // TODO: 使用 HandStructure 分析

  // 判定阈值
  if (powerPoints >= 8) return 'carry'; // 牌力强，主攻
  if (powerPoints <= 3) return 'support'; // 牌力弱，辅助
  return 'balanced';
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


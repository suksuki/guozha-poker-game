/**
 * 智能拆牌策略评估
 * 评估拆牌的成本和收益，判断拆牌是否值得
 */

import { Card, Play } from '../types/card';
import { canPlayCards, findPlayableCards, isScoreCard, calculateCardsScore } from './cardUtils';
import { countRankGroups } from './mctsAI';

/**
 * 拆牌收益类型
 */
interface BreakingBenefit {
  rhythmControl: number;        // 节奏控制收益
  avoidSuppression: number;     // 避免被压制收益
  teamCooperation: number;      // 团队配合收益
  keyCardPreservation: number;  // 保留关键牌收益
  opportunityCreation: number;  // 创造机会收益
  highScoreRound: number;       // 高分轮次收益
}

/**
 * 游戏状态上下文（用于拆牌评估）
 */
export interface BreakingContext {
  lastPlay: Play | null;
  currentRoundScore: number;
  remainingHandCount: number;
  teamMode?: boolean;
  opponentHands?: Card[][];  // 对手手牌（完全信息模式）
}

/**
 * 评估拆牌代价（降低惩罚力度）
 */
export function evaluateBreakingCost(
  action: Card[],
  hand: Card[],
  play: Play
): number {
  const handRankGroups = countRankGroups(hand);
  const actionRank = action[0].rank;
  const originalCount = handRankGroups.get(actionRank) || 0;
  const remainingCount = originalCount - action.length;
  
  let cost = 0;
  
  // 降低惩罚力度，因为拆牌可能是必要的
  if (originalCount === 3) {
    if (play.type === 'single') {
      cost = 40;  // 降低惩罚：从-80降到40（作为代价）
    } else if (play.type === 'pair') {
      cost = 60;  // 降低惩罚：从-100降到60
    }
  } else if (originalCount >= 4 && play.type !== 'bomb' && play.type !== 'dun') {
    if (remainingCount > 0 && remainingCount < 3) {
      cost = 80;  // 降低惩罚：从-150降到80
    } else {
      cost = 30;  // 降低惩罚：从-50降到30
    }
  } else if (originalCount >= 7 && play.type !== 'dun') {
    cost = 100;  // 降低惩罚：从-200降到100
  }
  
  return cost;
}

/**
 * 评估拆牌收益
 */
export function evaluateBreakingBenefits(
  action: Card[],
  hand: Card[],
  context: BreakingContext
): BreakingBenefit {
  const benefits: BreakingBenefit = {
    rhythmControl: 0,
    avoidSuppression: 0,
    teamCooperation: 0,
    keyCardPreservation: 0,
    opportunityCreation: 0,
    highScoreRound: 0
  };
  
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  
  // 1. 节奏控制收益
  benefits.rhythmControl = evaluateRhythmControlBenefit(action, remainingHand, context);
  
  // 2. 避免被压制收益
  benefits.avoidSuppression = evaluateAvoidSuppressionBenefit(action, remainingHand, context);
  
  // 3. 团队配合收益（团队模式）
  if (context.teamMode) {
    benefits.teamCooperation = evaluateTeamCooperationBenefit(action, remainingHand, context);
  }
  
  // 4. 保留关键牌收益
  benefits.keyCardPreservation = evaluateKeyCardPreservationBenefit(action, remainingHand, context);
  
  // 5. 创造机会收益
  benefits.opportunityCreation = evaluateOpportunityCreationBenefit(action, remainingHand, context);
  
  // 6. 高分轮次收益
  benefits.highScoreRound = evaluateHighScoreRoundBenefit(action, remainingHand, context);
  
  return benefits;
}

/**
 * 评估节奏控制收益
 */
function evaluateRhythmControlBenefit(
  action: Card[],
  remainingHand: Card[],
  context: BreakingContext
): number {
  let score = 0;
  
  // 场景1：拆牌后可以连续出牌，控制节奏
  if (context.lastPlay) {
    const followUpOptions = findPlayableCards(remainingHand, context.lastPlay);
    if (followUpOptions.length > 0) {
      // 检查是否有多个连续出牌选项
      const play = canPlayCards(action);
      if (play && play.value > (context.lastPlay?.value || 0)) {
        score += 40;  // 可以连续出牌，控制节奏
      }
    }
  }
  
  // 场景2：拆牌后可以避免被对手大牌压制
  if (context.lastPlay && context.lastPlay.value >= 12) {
    const play = canPlayCards(action);
    if (play && play.value > context.lastPlay.value && play.value - context.lastPlay.value <= 3) {
      score += 30;  // 使用最小能压过的牌，避免浪费大牌
    }
  }
  
  // 场景3：拆牌后可以减少手牌数量，加快出牌速度
  if (remainingHand.length <= 6) {
    score += 25;  // 手牌少时，拆牌可以加快出牌
  }
  
  return score;
}

/**
 * 评估避免被压制收益
 */
function evaluateAvoidSuppressionBenefit(
  action: Card[],
  remainingHand: Card[],
  context: BreakingContext
): number {
  let score = 0;
  
  // 场景1：拆牌后保留更大的牌，避免被压制
  const remainingRanks = remainingHand.map(c => c.rank);
  const maxRemainingRank = remainingRanks.length > 0 ? Math.max(...remainingRanks) : 0;
  const actionRank = action[0].rank;
  
  if (maxRemainingRank > actionRank) {
    score += 35;  // 保留更大的牌
  }
  
  // 场景2：拆牌后可以保留炸弹应对对手可能的炸弹
  const remainingRankGroups = countRankGroups(remainingHand);
  let hasBomb = false;
  remainingRankGroups.forEach((count, rank) => {
    if (count >= 4) {
      hasBomb = true;
    }
  });
  
  if (hasBomb) {
    score += 30;  // 保留炸弹，可以应对对手
  }
  
  // 场景3：拆牌后可以保留大牌用于关键轮次
  if (context.currentRoundScore > 10) {
    const hasBigCards = remainingHand.some(card => {
      const testPlay = canPlayCards([card]);
      return testPlay && testPlay.value >= 12;
    });
    if (hasBigCards) {
      score += 25;  // 保留大牌用于高分轮次
    }
  }
  
  return score;
}

/**
 * 评估团队配合收益
 */
function evaluateTeamCooperationBenefit(
  action: Card[],
  remainingHand: Card[],
  context: BreakingContext
): number {
  let score = 0;
  
  // 场景1：拆牌后让队友更容易出牌（出小牌）
  const play = canPlayCards(action);
  if (play && play.value <= 10) {
    score += 50;  // 出小牌，让队友有机会出牌
  }
  
  // 场景2：拆牌后保留大牌支援队友
  const remainingRankGroups = countRankGroups(remainingHand);
  let hasBigCards = false;
  remainingRankGroups.forEach((count, rank) => {
    if (count >= 3 || rank >= 12) {
      hasBigCards = true;
    }
  });
  
  if (hasBigCards) {
    score += 40;  // 保留大牌，可以支援队友
  }
  
  // 场景3：拆牌后可以配合队友的牌型
  if (context.lastPlay && context.lastPlay.type === 'single') {
    const play = canPlayCards(action);
    if (play && play.type === 'single' && play.value > context.lastPlay.value) {
      score += 35;  // 配合队友的单张出牌
    }
  }
  
  return score;
}

/**
 * 评估保留关键牌收益
 */
function evaluateKeyCardPreservationBenefit(
  action: Card[],
  remainingHand: Card[],
  context: BreakingContext
): number {
  let score = 0;
  
  // 场景1：拆牌后保留炸弹
  const remainingRankGroups = countRankGroups(remainingHand);
  let hasBomb = false;
  remainingRankGroups.forEach((count) => {
    if (count >= 4) {
      hasBomb = true;
    }
  });
  
  if (hasBomb) {
    score += 60;  // 保留炸弹很重要
  }
  
  // 场景2：拆牌后保留大牌用于关键轮次
  const hasBigCards = remainingHand.some(card => {
    const testPlay = canPlayCards([card]);
    return testPlay && testPlay.value >= 13;
  });
  
  if (hasBigCards) {
    score += 45;  // 保留大牌
  }
  
  // 场景3：拆牌后保留关键组合牌型
  let hasKeyCombos = false;
  remainingRankGroups.forEach((count) => {
    if (count >= 3) {
      hasKeyCombos = true;
    }
  });
  
  if (hasKeyCombos) {
    score += 35;  // 保留关键组合
  }
  
  return score;
}

/**
 * 评估创造机会收益
 */
function evaluateOpportunityCreationBenefit(
  action: Card[],
  remainingHand: Card[],
  context: BreakingContext
): number {
  let score = 0;
  
  // 场景1：拆牌后可以形成新的组合牌型
  const remainingRankGroups = countRankGroups(remainingHand);
  const actionRank = action[0].rank;
  const originalCount = remainingRankGroups.get(actionRank) || 0;
  
  // 如果拆牌后剩余的牌可以形成新的组合
  if (originalCount >= 2) {
    score += 40;  // 可以形成新的组合
  }
  
  // 场景2：拆牌后可以连续出牌
  if (context.lastPlay) {
    const followUpOptions = findPlayableCards(remainingHand, context.lastPlay);
    if (followUpOptions.length >= 2) {
      score += 35;  // 可以连续出牌
    }
  }
  
  // 场景3：拆牌后可以减少手牌数量
  if (remainingHand.length <= 8) {
    score += 25;  // 减少手牌数量，加快出牌
  }
  
  return score;
}

/**
 * 评估高分轮次收益
 */
function evaluateHighScoreRoundBenefit(
  action: Card[],
  remainingHand: Card[],
  context: BreakingContext
): number {
  let score = 0;
  
  // 场景1：高分轮次，拆牌可能值得
  if (context.currentRoundScore > 15) {
    const play = canPlayCards(action);
    if (play && play.value > (context.lastPlay?.value || 0)) {
      // 如果拆牌可以帮助拿到高分
      const scoreCards = action.filter(card => isScoreCard(card));
      if (scoreCards.length > 0 || context.currentRoundScore > 20) {
        score += 50;  // 高分轮次，值得拆牌
      }
    }
  }
  
  // 场景2：高分轮次，拆牌可以保护分牌
  if (context.currentRoundScore > 20) {
    const remainingScoreCards = remainingHand.filter(card => isScoreCard(card));
    const remainingScore = calculateCardsScore(remainingScoreCards);
    if (remainingScore > 0) {
      score += 40;  // 保护分牌
    }
  }
  
  return score;
}

/**
 * 汇总拆牌收益
 */
function sumBreakingBenefits(benefits: BreakingBenefit): number {
  return (
    benefits.rhythmControl * 1.0 +
    benefits.avoidSuppression * 0.9 +
    benefits.teamCooperation * 1.2 +  // 团队配合权重更高
    benefits.keyCardPreservation * 1.1 +
    benefits.opportunityCreation * 0.8 +
    benefits.highScoreRound * 1.0
  );
}

/**
 * 综合评估拆牌价值
 * @returns 拆牌净价值（正数表示值得拆牌，负数表示不值得）
 */
export function evaluateCardBreaking(
  action: Card[],
  hand: Card[],
  play: Play,
  context: BreakingContext
): number {
  // 1. 计算拆牌代价
  const breakingCost = evaluateBreakingCost(action, hand, play);
  
  // 2. 计算拆牌收益
  const breakingBenefits = evaluateBreakingBenefits(action, hand, context);
  const totalBenefit = sumBreakingBenefits(breakingBenefits);
  
  // 3. 综合评估
  const netValue = totalBenefit - breakingCost;
  
  return netValue;
}


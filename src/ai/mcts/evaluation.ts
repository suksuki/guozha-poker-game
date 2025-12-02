/**
 * MCTS动作评估
 */

import { Card, Play } from '../../types/card';
import { canPlayCards, canBeat, isScoreCard, calculateCardsScore } from '../../utils/cardUtils';

/**
 * 统计手牌中每种点数的数量
 */
function countHandRanks(hand: Card[]): Map<number, number> {
  const rankGroups = new Map<number, number>();
  hand.forEach(card => {
    const rank = card.rank;
    rankGroups.set(rank, (rankGroups.get(rank) || 0) + 1);
  });
  return rankGroups;
}

/**
 * 评估组合牌型拆散惩罚（首发时）
 */
function evaluateComboBreakdownFirstPlay(
  originalCount: number,
  remainingCount: number,
  playType: string
): number {
  if (originalCount === 3) {
    if (playType === 'triple') return 50; // 出完整三张，加分
    if (playType === 'single') return -80; // 拆散三张成单张，扣分
    if (playType === 'pair') return -100; // 拆散三张成对子，产生死牌，扣更多分
  }
  
  if (originalCount >= 4 && playType !== 'bomb' && playType !== 'dun') {
    // 炸弹拆散成更小的牌型
    if (remainingCount > 0 && remainingCount < 3) {
      return -150; // 拆散炸弹产生死牌，严重扣分
    }
    return -50; // 拆散炸弹但不产生死牌，适度扣分
  }
  
  if (originalCount >= 7 && playType !== 'dun') {
    return -200; // 拆散墩，严重扣分
  }
  
  return 0;
}

/**
 * 评估组合牌型拆散惩罚（有上家出牌时）
 */
function evaluateComboBreakdownWithLastPlay(
  originalCount: number,
  remainingCount: number,
  playType: string
): number {
  if (originalCount >= 3 && playType === 'single' && remainingCount === 2) {
    return -40; // 拆散三张压牌，适度扣分
  }
  
  if (originalCount >= 4 && playType !== 'bomb' && playType !== 'dun') {
    if (remainingCount > 0 && remainingCount < 3) {
      return -60; // 拆散炸弹压牌，适度扣分
    }
  }
  
  return 0;
}

/**
 * 评估组合牌型拆散
 */
function evaluateComboBreakdown(
  hand: Card[],
  action: Card[],
  play: Play,
  lastPlay: Play | null
): number {
  const handRankGroups = countHandRanks(hand);
  const actionRank = action[0].rank;
  const originalCount = handRankGroups.get(actionRank) || 0;
  const remainingCount = originalCount - action.length;
  
  if (!lastPlay) {
    return evaluateComboBreakdownFirstPlay(originalCount, remainingCount, play.type);
  }
  
  return evaluateComboBreakdownWithLastPlay(originalCount, remainingCount, play.type);
}

/**
 * 评估牌型加分
 */
function evaluatePlayTypeBonus(playType: string): number {
  if (playType === 'triple') return 20;
  if (playType === 'pair') return 10;
  return 0;
}

/**
 * 评估分牌保护策略（首发出牌）
 */
function evaluateScoreCardProtectionFirstPlay(
  actionScoreCards: Card[],
  remainingHand: Card[]
): number {
  if (actionScoreCards.length === 0) {
    const remainingScoreCards = remainingHand.filter(card => isScoreCard(card));
    const remainingScore = calculateCardsScore(remainingScoreCards);
    return remainingScore > 0 ? 20 : 0; // 保护了自己的分牌，加分
  }
  
  // 检查是否有大牌能保护
  const hasBigCards = remainingHand.some(card => {
    const testPlay = canPlayCards([card]);
    return testPlay && testPlay.value >= 10; // 有大牌能压
  });
  
  return hasBigCards ? 30 : -50; // 有大牌保护可以出分牌，否则不要出
}

/**
 * 评估分牌保护策略（有上家出牌）
 */
function evaluateScoreCardProtectionWithLastPlay(
  actionScoreCards: Card[],
  play: Play,
  lastPlay: Play,
  currentRoundScore: number
): number {
  if (actionScoreCards.length === 0) {
    return 0; // 没有分牌，不扣分也不加分
  }
  
  // 如果能拿到分，出分牌是值得的
  if (currentRoundScore > 0 && play.value > lastPlay.value) {
    return 40; // 能拿到分，出分牌是值得的
  }
  
  return -30; // 不能确保拿到分，不要出分牌
}

/**
 * 评估分牌策略
 */
function evaluateScoreCardStrategy(
  action: Card[],
  hand: Card[],
  play: Play,
  lastPlay: Play | null,
  currentRoundScore: number
): number {
  const actionScoreCards = action.filter(card => isScoreCard(card));
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  
  if (!lastPlay) {
    return evaluateScoreCardProtectionFirstPlay(actionScoreCards, remainingHand);
  }
  
  return evaluateScoreCardProtectionWithLastPlay(
    actionScoreCards,
    play,
    lastPlay,
    currentRoundScore
  );
}

/**
 * 评估完全信息模式下的策略
 */
function evaluatePerfectInformationStrategy(
  action: Card[],
  play: Play,
  lastPlay: Play | null,
  opponentHands: Card[][],
  currentRoundScore: number
): number {
  if (opponentHands.length === 0) return 0;
  
  // 计算对手手牌中的分牌
  let opponentTotalScore = 0;
  opponentHands.forEach(oppHand => {
    const oppScoreCards = oppHand.filter(card => isScoreCard(card));
    opponentTotalScore += calculateCardsScore(oppScoreCards);
  });
  
  let score = 0;
  
  // 如果对手有很多分牌，引诱他们出分牌是好的
  if (opponentTotalScore > 20 && !lastPlay) {
    const actionScoreCards = action.filter(card => isScoreCard(card));
    if (play.value <= 8 && actionScoreCards.length === 0) {
      score += 25; // 用小牌引诱对手出分牌
    }
  }
  
  // 如果对手手上有分牌，自己能压过，优先出能压过的牌
  if (lastPlay && currentRoundScore > 0) {
    if (canBeat(play, lastPlay)) {
      score += 35; // 能拿到分，优先出
    }
  }
  
  return score;
}

/**
 * 评估大牌保留策略
 */
function evaluateBigCardRetention(
  hand: Card[],
  action: Card[],
  currentRoundScore: number
): number {
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  
  const hasBombOrDun = remainingHand.some(card => {
    const rank = card.rank;
    const count = remainingHand.filter(c => c.rank === rank).length;
    return count >= 4; // 有炸弹或墩
  });
  
  if (hasBombOrDun && currentRoundScore > 0) {
    return 15; // 保留大牌拿分
  }
  
  return 0;
}

/**
 * 评估动作质量（考虑分牌策略和组合牌型）
 */
export function evaluateActionQuality(
  action: Card[], 
  hand: Card[], 
  lastPlay: Play | null,
  opponentHands: Card[][] = [], // 对手手牌（完全信息模式）
  currentRoundScore: number = 0, // 当前轮次累计分数
  perfectInformation: boolean = false // 是否使用完全信息
): number {
  if (!action || action.length === 0) return -1000;
  
  const play = canPlayCards(action);
  if (!play) return -1000;
  
  let score = 0;
  
  // 1. 评估组合牌型拆散
  score += evaluateComboBreakdown(hand, action, play, lastPlay);
  
  // 2. 评估牌型加分
  score += evaluatePlayTypeBonus(play.type);
  
  // 3. 评估分牌策略
  score += evaluateScoreCardStrategy(action, hand, play, lastPlay, currentRoundScore);
  
  // 4. 完全信息模式下的策略
  if (perfectInformation) {
    score += evaluatePerfectInformationStrategy(
      action,
      play,
      lastPlay,
      opponentHands,
      currentRoundScore
    );
  }
  
  // 5. 评估大牌保留策略
  score += evaluateBigCardRetention(hand, action, currentRoundScore);
  
  return score;
}

/**
 * 使用启发式选择最佳动作（当MCTS没有生成子节点时）
 */
export function selectBestActionByHeuristic(
  actions: Card[][], 
  hand: Card[], 
  lastPlay: Play | null
): Card[] | null {
  if (actions.length === 0) return null;
  if (actions.length === 1) return actions[0];
  
  // 评估每个动作的质量
  const scoredActions = actions.map(action => ({
    action,
    score: evaluateActionQuality(action, hand, lastPlay, [], 0, false) // 基础版本
  }));
  
  // 选择得分最高的动作
  scoredActions.sort((a, b) => b.score - a.score);
  
  return scoredActions[0].action;
}


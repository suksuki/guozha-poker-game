/**
 * MCTS动作评估
 */

import { Card, Play } from '../../types/card';
import { canPlayCards, canBeat, isScoreCard, calculateCardsScore } from '../../utils/cardUtils';

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
  
  // 统计手牌中每种点数的数量
  const handRankGroups = new Map<number, number>();
  hand.forEach(card => {
    const rank = card.rank;
    handRankGroups.set(rank, (handRankGroups.get(rank) || 0) + 1);
  });
  
  const actionRank = action[0].rank;
  const originalCount = handRankGroups.get(actionRank) || 0;
  const remainingCount = originalCount - action.length;
  
  // 如果没有上家出牌（首发），优先保持组合牌型
  if (!lastPlay) {
    // 优先出完整的组合牌型（三张、对子），而不是拆散
    if (originalCount === 3 && play.type === 'triple') {
      score += 50; // 出完整三张，加分
    } else if (originalCount === 3 && play.type === 'single') {
      score -= 80; // 拆散三张成单张，扣分
    } else if (originalCount === 3 && play.type === 'pair') {
      score -= 100; // 拆散三张成对子，产生死牌，扣更多分
    } else if (originalCount >= 4 && play.type !== 'bomb' && play.type !== 'dun') {
      // 炸弹拆散成更小的牌型
      if (remainingCount > 0 && remainingCount < 3) {
        score -= 150; // 拆散炸弹产生死牌，严重扣分
      } else {
        score -= 50; // 拆散炸弹但不产生死牌，适度扣分
      }
    } else if (originalCount >= 7 && play.type !== 'dun') {
      score -= 200; // 拆散墩，严重扣分
    }
  } else {
    // 有上家出牌时，拆散可能更合理（为了压牌），但也要适度惩罚
    if (originalCount >= 3 && play.type === 'single' && remainingCount === 2) {
      score -= 40; // 拆散三张压牌，适度扣分
    } else if (originalCount >= 4 && play.type !== 'bomb' && play.type !== 'dun') {
      if (remainingCount > 0 && remainingCount < 3) {
        score -= 60; // 拆散炸弹压牌，适度扣分
      }
    }
  }
  
  // 加分项：优先出牌数多的动作
  score += play.type === 'triple' ? 20 : play.type === 'pair' ? 10 : 0;
  
  // 分牌策略评估（核心策略：保护自己的分牌，引诱对方出分牌）
  const actionScoreCards = action.filter(card => isScoreCard(card));
  const actionScore = calculateCardsScore(actionScoreCards);
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  const remainingScoreCards = remainingHand.filter(card => isScoreCard(card));
  const remainingScore = calculateCardsScore(remainingScoreCards);
  
  // 1. 评估是否保护自己的分牌
  if (actionScoreCards.length > 0) {
    // 如果出牌中包含分牌，需要评估是否能拿到分
    if (!lastPlay) {
      // 首发出牌时，如果出分牌，需要确保后面能拿回来
      // 如果自己还有足够大的牌，可能能拿回来，加分
      const hasBigCards = remainingHand.some(card => {
        const testPlay = canPlayCards([card]);
        return testPlay && testPlay.value >= 10; // 有大牌能压
      });
      if (hasBigCards) {
        score += 30; // 有大牌保护，可以出分牌引诱对手
      } else {
        score -= 50; // 没有大牌保护，不要出分牌
      }
    } else {
      // 有上家出牌时，出分牌需要确保自己能拿回来
      // 如果这轮已经有分，自己能拿到，加分
      if (currentRoundScore > 0 && play.value > lastPlay.value) {
        score += 40; // 能拿到分，出分牌是值得的
      } else {
        score -= 30; // 不能确保拿到分，不要出分牌
      }
    }
  } else {
    // 出牌中没有分牌，这是好的（保护分牌）
    if (remainingScore > 0) {
      score += 20; // 保护了自己的分牌，加分
    }
  }
  
  // 2. 在完全信息模式下，引诱对方出分牌
  if (perfectInformation && opponentHands.length > 0) {
    // 计算对手手牌中的分牌
    let opponentTotalScore = 0;
    opponentHands.forEach(oppHand => {
      const oppScoreCards = oppHand.filter(card => isScoreCard(card));
      opponentTotalScore += calculateCardsScore(oppScoreCards);
    });
    
    // 如果对手有很多分牌，引诱他们出分牌是好的
    if (opponentTotalScore > 20 && !lastPlay) {
      // 没有上家出牌，可以考虑用小牌引诱对手出分牌
      if (play.value <= 8 && actionScoreCards.length === 0) {
        score += 25; // 用小牌引诱对手出分牌
      }
    }
    
    // 如果对手手上有分牌，自己能压过，优先出能压过的牌
    if (lastPlay && currentRoundScore > 0) {
      // 这轮有分，如果能压过，加分
      if (canBeat(play, lastPlay)) {
        score += 35; // 能拿到分，优先出
      }
    }
  }
  
  // 3. 确保自己有大牌能拿分
  const hasBombOrDun = remainingHand.some(card => {
    const rank = card.rank;
    const count = remainingHand.filter(c => c.rank === rank).length;
    return count >= 4; // 有炸弹或墩
  });
  
  if (hasBombOrDun && currentRoundScore > 0) {
    // 有大牌且这轮有分，可以考虑不出，等分数更多时再拿
    score += 15; // 保留大牌拿分
  }
  
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


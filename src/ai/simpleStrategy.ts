/**
 * 简单AI策略
 * 基于启发式规则的AI出牌策略
 */

import { Card, Play } from '../types/card';
import { canPlayCards, canBeat, findPlayableCards } from '../utils/cardUtils';
import { HandStructure, PlayOption } from './types';

/**
 * 分析手牌结构
 */
export function analyzeHandStructure(hand: Card[]): HandStructure {
  const structure: HandStructure = {
    singles: [],
    pairs: [],
    triples: [],
    bombs: [],
    duns: [],
    jokers: { small: [], big: [] },
    rankGroups: new Map()
  };

  // 按点数分组
  hand.forEach(card => {
    const rank = card.rank;
    if (!structure.rankGroups.has(rank)) {
      structure.rankGroups.set(rank, []);
    }
    structure.rankGroups.get(rank)!.push(card);
  });

  // 分类统计
  structure.rankGroups.forEach((cards, rank) => {
    const count = cards.length;
    
    // 大小王特殊处理
    if (rank === 16 || rank === 17) {
      if (rank === 16) {
        structure.jokers.small = cards;
      } else {
        structure.jokers.big = cards;
      }
    } else {
      if (count === 1) {
        structure.singles.push(cards[0]);
      } else if (count === 2) {
        structure.pairs.push(cards);
      } else if (count === 3) {
        structure.triples.push(cards);
      } else if (count >= 4 && count < 7) {
        structure.bombs.push(cards);
      } else if (count >= 7) {
        structure.duns.push(cards);
      }
    }
  });

  return structure;
}

/**
 * 评估手牌价值（越少牌越好，组合越多越好）
 */
export function evaluateHandValue(hand: Card[]): number {
  if (hand.length === 0) return 1000; // 出完了最高分
  if (hand.length === 1) return 500;  // 只剩一张牌很高分
  
  const structure = analyzeHandStructure(hand);
  
  let value = 0;
  
  // 牌数越少越好（负权重）
  value -= hand.length * 10;
  
  // 有组合牌型加分
  value += structure.pairs.length * 5;
  value += structure.triples.length * 10;
  value += structure.bombs.length * 20;
  value += structure.duns.length * 30;
  
  // 有大牌加分（但不要太多单张）
  const highCards = hand.filter(c => c.rank >= 14); // A, 2, 王
  value += highCards.length * 2;
  
  // 单张太多扣分（说明手牌散乱）
  if (structure.singles.length > hand.length * 0.5) {
    value -= 20;
  }
  
  return value;
}

/**
 * 评估出牌选择
 */
export function evaluatePlayOption(
  cards: Card[],
  play: Play,
  hand: Card[],
  lastPlay: Play | null,
  strategy: string
): number {
  let score = 0;
  
  // 计算出牌后的剩余手牌
  const remainingHand = hand.filter(
    card => !cards.some(c => c.id === card.id)
  );
  
  // 1. 剩余手牌价值（越高越好）
  const remainingValue = evaluateHandValue(remainingHand);
  score += remainingValue;
  
  // 2. 出牌的大小（根据策略调整）
  if (strategy === 'aggressive') {
    // 激进：优先出大牌
    score += play.value * 2;
  } else if (strategy === 'conservative') {
    // 保守：优先出小牌，保留大牌
    score -= play.value;
  } else {
    // 平衡：适中出牌
    score += play.value * 0.5;
  }
  
  // 3. 出牌张数（优先出多张牌，减少手牌数量）
  score += cards.length * 5;
  
  // 4. 如果是炸弹或墩，根据情况加分或减分
  if (play.type === 'bomb' || play.type === 'dun') {
    const remainingCount = remainingHand.length;
    
    // 如果手牌还多，炸弹要谨慎使用（减分）
    if (remainingCount > 10) {
      score -= 30;
    }
    // 如果手牌少，可以用炸弹（加分）
    else if (remainingCount <= 5) {
      score += 50;
    }
    // 如果只剩炸弹/墩了，必须出（大幅加分）
    else if (remainingCount === 0) {
      score += 200;
    }
  }
  
  // 5. 如果不需要压牌（lastPlay为null），优先出小牌或组合牌
  if (!lastPlay) {
    if (play.value <= 10) {  // 小牌
      score += 20;
    }
    if (play.type === 'pair' || play.type === 'triple') {
      score += 15;  // 组合牌型优先
    }
  } else {
    // 需要压牌时，最小能压过的牌加分（节省大牌）
    const isMinimal = play.value <= lastPlay.value + 3;
    if (isMinimal) {
      score += 30;
    }
  }
  
  // 6. 王牌使用策略
  const hasJoker = cards.some(c => c.rank >= 16);
  if (hasJoker) {
    // 王牌很珍贵，除非必要或手牌很少，否则不用
    if (remainingHand.length <= 3) {
      score += 40;  // 快出完了，可以用王牌
    } else if (lastPlay && (lastPlay.type === 'bomb' || lastPlay.type === 'dun')) {
      score += 30;  // 对手出炸弹，必须用王牌
    } else {
      score -= 20;  // 其他情况保留王牌
    }
  }
  
  // 7. 根据剩余手牌数量调整策略
  const handCount = remainingHand.length;
  if (handCount <= 3) {
    // 快出完了，优先出牌数多的
    score += cards.length * 10;
  } else if (handCount <= 6) {
    // 中后期，平衡出牌
    score += 5;
  }
  
  // 8. 避免出单张，除非手牌很少或必须出
  if (play.type === 'single' && handCount > 8) {
    score -= 10;
  }
  
  // 9. 重要：检查是否拆散了炸弹，产生了死牌
  // 计算手牌中每种牌的数量
  const handRankGroups = new Map<number, number>();
  hand.forEach(card => {
    handRankGroups.set(card.rank, (handRankGroups.get(card.rank) || 0) + 1);
  });
  
  // 计算出牌后剩余手牌中每种牌的数量
  const remainingRankGroups = new Map<number, number>();
  remainingHand.forEach(card => {
    remainingRankGroups.set(card.rank, (remainingRankGroups.get(card.rank) || 0) + 1);
  });
  
  // 检查出牌是否拆散了炸弹
  const playRank = cards[0].rank;
  const originalCount = handRankGroups.get(playRank) || 0;
  const remainingCount = remainingRankGroups.get(playRank) || 0;
  
  // 如果原来有4张及以上（炸弹），但现在只剩1-2张（无法形成有效牌型），大幅扣分
  if (originalCount >= 4 && remainingCount > 0 && remainingCount < 3) {
    // 拆散了炸弹，产生了死牌，大幅扣分
    score -= 150; // 大幅扣分，避免拆散炸弹
    
    // 如果剩余的是单张，且不是必要出牌，更严重
    if (remainingCount === 1 && !lastPlay) {
      score -= 100; // 额外扣分
    }
  }
  
  // 10. 如果手上有炸弹/墩，除非必要（需要压炸弹/墩），否则不要拆散
  if (originalCount >= 4) {
    // 拆散炸弹是很糟糕的选择，除非必要（需要压炸弹或墩）
    const isNecessary = lastPlay && (lastPlay.type === 'bomb' || lastPlay.type === 'dun');
    
    if (!isNecessary) {
      // 没有上家出牌时，拆散炸弹是很糟糕的选择
      if (play.type === 'triple' && remainingCount === 2) {
        score -= 150; // 5张出3张，剩2张（虽然可以是对子，但拆散了炸弹）
      } else if (play.type === 'pair' && remainingCount === 3) {
        score -= 140; // 5张出2张，剩3张（虽然可以是三张，但拆散了炸弹）
      } else if (play.type === 'single' && remainingCount >= 3) {
        score -= 160; // 出单张拆散炸弹
      }
    } else if (isNecessary && play.type !== 'bomb' && play.type !== 'dun') {
      // 需要压炸弹/墩，但出的不是炸弹/墩，说明可能拆散了炸弹，也要扣分
      if (originalCount >= 4 && remainingCount > 0 && remainingCount < originalCount) {
        score -= 50; // 拆散炸弹压牌也要适度扣分
      }
    }
  }
  
  // 11. 如果出牌会留下无法组合的牌（死牌），也要扣分
  // 检查剩余手牌是否有无法组合的牌
  remainingRankGroups.forEach((count) => {
    // 如果某种牌只有1张，且手牌总数>3，说明是死牌
    if (count === 1 && remainingHand.length > 3) {
      score -= 30; // 产生死牌扣分
    }
  });
  
  return score;
}

/**
 * 智能AI策略（改进版）
 */
export function simpleAIStrategy(
  hand: Card[],
  lastPlay: Play | null,
  strategy: string
): Card[] | null {
  const playableOptions = findPlayableCards(hand, lastPlay);
  
  if (playableOptions.length === 0) {
    return null;
  }

  // 过滤出可以出的牌
  const validOptions: PlayOption[] = playableOptions
    .map(cards => {
      const play = canPlayCards(cards);
      if (!play) return null;
      
      // 如果没有上家出牌，可以出任何牌
      // 如果有上家出牌，必须能压过
      if (lastPlay && !canBeat(play, lastPlay)) {
        return null;
      }
      
      return {
        cards,
        play,
        score: 0  // 待评估
      };
    })
    .filter((option): option is PlayOption => option !== null);

  if (validOptions.length === 0) {
    return null;
  }

  // 评估每个出牌选择
  validOptions.forEach(option => {
    option.score = evaluatePlayOption(
      option.cards,
      option.play,
      hand,
      lastPlay,
      strategy
    );
  });

  // 按评分排序，选择最优的
  validOptions.sort((a, b) => b.score - a.score);
  
  // 特殊策略调整
  if (strategy === 'aggressive') {
    // 激进：如果评分相近，选择更大的牌
    const topScore = validOptions[0].score;
    const similarOptions = validOptions.filter(
      opt => opt.score >= topScore - 10
    );
    if (similarOptions.length > 1) {
      similarOptions.sort((a, b) => b.play.value - a.play.value);
      return similarOptions[0].cards;
    }
  } else if (strategy === 'conservative') {
    // 保守：如果评分相近，选择更小的牌
    const topScore = validOptions[0].score;
    const similarOptions = validOptions.filter(
      opt => opt.score >= topScore - 10
    );
    if (similarOptions.length > 1) {
      similarOptions.sort((a, b) => a.play.value - b.play.value);
      return similarOptions[0].cards;
    }
  }

  return validOptions[0].cards;
}


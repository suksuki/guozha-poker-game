/**
 * 移动端独立的卡牌工具函数
 * 完全独立于老APP，不依赖任何老APP的代码
 */

import { Card, Suit, Rank, CardType, Play } from '../types/card';

// 分牌规则：5=5分，10=10分，K=10分
export function isScoreCard(card: Card): boolean {
  return card.rank === Rank.FIVE || card.rank === Rank.TEN || card.rank === Rank.KING;
}

// 获取单张牌的分值
export function getCardScore(card: Card): number {
  if (card.rank === Rank.FIVE) {
    return 5;
  } else if (card.rank === Rank.TEN || card.rank === Rank.KING) {
    return 10;
  }
  return 0;
}

// 计算一组牌的总分值
export function calculateCardsScore(cards: Card[]): number {
  return cards.reduce((total, card) => total + getCardScore(card), 0);
}

// 计算墩的数量
// 规则：7张=1墩，8张=2墩，9张=4墩，10张=8墩，11张=16墩...（翻倍）
export function calculateDunCount(cardCount: number): number {
  if (cardCount < 7) {
    return 0; // 少于7张不是墩
  }
  
  // 7张 = 1墩 (2^0)
  // 8张 = 2墩 (2^1)
  // 9张 = 4墩 (2^2)
  // 10张 = 8墩 (2^3)
  // 11张 = 16墩 (2^4)
  // ...
  const exponent = cardCount - 7;
  return Math.pow(2, exponent);
}

// 比较两张牌的大小（用于排序）
export function compareCards(a: Card, b: Card): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  return a.suit.localeCompare(b.suit);
}

// 排序手牌
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

// 按点数排序（3,4,5...K,A,2,小王,大王）
export function sortCardsByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    // 先按点数排序
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    // 同点数按花色排序
    return a.suit.localeCompare(b.suit);
  });
}

// 按牌大小排序（考虑2和大小王的特殊位置：大王>小王>2>A>K>...>3）
export function sortCardsByValue(cards: Card[]): Card[] {
  // 获取牌的排序值（用于比较大小）
  const getCardValue = (card: Card): number => {
    // 大王最大
    if (card.rank === Rank.JOKER_BIG) return 1000;
    // 小王
    if (card.rank === Rank.JOKER_SMALL) return 999;
    // 2
    if (card.rank === Rank.TWO) return 998;
    // A
    if (card.rank === Rank.ACE) return 14;
    // 其他牌按rank值
    return card.rank;
  };

  return [...cards].sort((a, b) => {
    const valueA = getCardValue(a);
    const valueB = getCardValue(b);
    if (valueA !== valueB) {
      return valueB - valueA; // 从大到小
    }
    // 同点数按花色排序
    return a.suit.localeCompare(b.suit);
  });
}

// 按点数分组手牌
export function groupCardsByRank(cards: Card[]): Map<Rank, Card[]> {
  const groups = new Map<Rank, Card[]>();
  cards.forEach(card => {
    const rank = card.rank;
    if (!groups.has(rank)) {
      groups.set(rank, []);
    }
    groups.get(rank)!.push(card);
  });
  // 对每组内的牌按花色排序
  groups.forEach(cardsInGroup => {
    cardsInGroup.sort((a, b) => a.suit.localeCompare(b.suit));
  });
  return groups;
}

// 获取点数的显示名称
export function getRankDisplayName(rank: Rank): string {
  if (rank === Rank.JACK) return 'J';
  if (rank === Rank.QUEEN) return 'Q';
  if (rank === Rank.KING) return 'K';
  if (rank === Rank.ACE) return 'A';
  if (rank === Rank.TWO) return '2';
  if (rank === Rank.JOKER_SMALL) return '小王';
  if (rank === Rank.JOKER_BIG) return '大王';
  return rank.toString();
}

// 识别牌型
export function canPlayCards(cards: Card[]): Play | null {
  if (!cards || cards.length === 0) {
    return null;
  }

  // 按点数分组
  const rankGroups = new Map<Rank, Card[]>();
  cards.forEach(card => {
    const existing = rankGroups.get(card.rank) || [];
    existing.push(card);
    rankGroups.set(card.rank, existing);
  });

  const cardCount = cards.length;
  const rankCounts = Array.from(rankGroups.values()).map(group => group.length);
  const maxCount = Math.max(...rankCounts);
  const firstCard = cards[0];
  const rank = firstCard.rank;

  // 单张
  if (cardCount === 1) {
    return {
      type: CardType.SINGLE,
      cards,
      rank,
      length: 1
    };
  }

  // 对子
  if (cardCount === 2 && maxCount === 2) {
    return {
      type: CardType.PAIR,
      cards,
      rank,
      length: 2
    };
  }

  // 三张
  if (cardCount === 3 && maxCount === 3) {
    return {
      type: CardType.TRIPLE,
      cards,
      rank,
      length: 3
    };
  }

  // 炸弹（4张及以上相同点数）
  if (cardCount >= 4 && maxCount === cardCount) {
    return {
      type: CardType.BOMB,
      cards,
      rank,
      length: cardCount
    };
  }

  // 墩（7张及以上相同点数）
  if (cardCount >= 7 && maxCount === cardCount) {
    return {
      type: CardType.DUN,
      cards,
      rank,
      length: cardCount
    };
  }

  return null;
}

// 检查是否能压过上家
export function canBeat(play: Play, lastPlay: Play): boolean {
  // 炸弹可以压任何牌（除了更大的炸弹）
  if (play.type === CardType.BOMB) {
    if (lastPlay.type === CardType.BOMB) {
      // 都是炸弹，比较点数
      return play.rank > lastPlay.rank || (play.rank === lastPlay.rank && play.length > lastPlay.length);
    }
    return true; // 炸弹压非炸弹
  }

  // 墩可以压任何牌（除了更大的墩或炸弹）
  if (play.type === CardType.DUN) {
    if (lastPlay.type === CardType.DUN) {
      // 都是墩，比较点数或数量
      return play.rank > lastPlay.rank || (play.rank === lastPlay.rank && play.length > lastPlay.length);
    }
    if (lastPlay.type === CardType.BOMB) {
      return false; // 炸弹压墩
    }
    return true; // 墩压非墩非炸弹
  }

  // 相同牌型才能比较
  if (play.type !== lastPlay.type) {
    return false;
  }

  // 相同牌型，比较点数
  return play.rank > lastPlay.rank;
}


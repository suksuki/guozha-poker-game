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


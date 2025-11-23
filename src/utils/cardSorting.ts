/**
 * 卡牌排序工具
 * 提供不同的排序规则用于理牌
 */

import { Card, Rank, Suit } from '../types/card';

export type SortOrder = 'asc' | 'desc' | 'grouped';

/**
 * 按数字从小到大排序（3, 4, 5...K, A, 2, 小王, 大王）
 */
function sortAscending(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    // 先按rank排序
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    // 同rank按花色排序
    return a.suit.localeCompare(b.suit);
  });
}

/**
 * 按数字从大到小排序（大王, 小王, 2, A, K...5, 4, 3）
 */
function sortDescending(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    // 先按rank排序（倒序）
    if (a.rank !== b.rank) {
      return b.rank - a.rank;
    }
    // 同rank按花色排序
    return a.suit.localeCompare(b.suit);
  });
}

/**
 * 按数字分组排序（3, 3, 3...10, 10, 10...）
 * 相同数字的牌放在一起，组内按花色排序
 */
function sortGrouped(cards: Card[]): Card[] {
  // 按rank分组
  const groups = new Map<number, Card[]>();
  cards.forEach(card => {
    if (!groups.has(card.rank)) {
      groups.set(card.rank, []);
    }
    groups.get(card.rank)!.push(card);
  });
  
  // 对每组内的牌按花色排序
  groups.forEach(cards => {
    cards.sort((a, b) => a.suit.localeCompare(b.suit));
  });
  
  // 按rank从小到大排序，然后展开
  const sortedRanks = Array.from(groups.keys()).sort((a, b) => a - b);
  const result: Card[] = [];
  sortedRanks.forEach(rank => {
    result.push(...groups.get(rank)!);
  });
  
  return result;
}

/**
 * 排序卡牌
 * @param cards 要排序的卡牌数组
 * @param order 排序规则
 * @returns 排序后的卡牌数组
 */
export function sortCards(cards: Card[], order: SortOrder = 'asc'): Card[] {
  switch (order) {
    case 'asc':
      return sortAscending(cards);
    case 'desc':
      return sortDescending(cards);
    case 'grouped':
      return sortGrouped(cards);
    default:
      return sortAscending(cards);
  }
}

/**
 * 按rank分组卡牌
 * @param cards 卡牌数组
 * @returns Map<rank, Card[]>
 */
export function groupCardsByRank(cards: Card[]): Map<number, Card[]> {
  const groups = new Map<number, Card[]>();
  cards.forEach(card => {
    if (!groups.has(card.rank)) {
      groups.set(card.rank, []);
    }
    groups.get(card.rank)!.push(card);
  });
  return groups;
}


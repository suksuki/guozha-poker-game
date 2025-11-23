/**
 * 卡牌排序工具单元测试
 */

import { describe, it, expect } from 'vitest';
import { Card, Suit, Rank } from '../src/types/card';
import { sortCards, groupCardsByRank, SortOrder } from '../src/utils/cardSorting';

describe('cardSorting', () => {
  const createCard = (suit: Suit, rank: Rank, id: string): Card => ({
    suit,
    rank,
    id
  });

  describe('sortCards', () => {
    it('应该按从小到大排序 (asc)', () => {
      const cards: Card[] = [
        createCard(Suit.HEARTS, Rank.KING, '1'),
        createCard(Suit.SPADES, Rank.THREE, '2'),
        createCard(Suit.DIAMONDS, Rank.ACE, '3'),
        createCard(Suit.CLUBS, Rank.FIVE, '4')
      ];

      const sorted = sortCards(cards, 'asc');

      expect(sorted[0].rank).toBe(Rank.THREE);
      expect(sorted[1].rank).toBe(Rank.FIVE);
      expect(sorted[2].rank).toBe(Rank.KING);
      expect(sorted[3].rank).toBe(Rank.ACE);
    });

    it('应该按从大到小排序 (desc)', () => {
      const cards: Card[] = [
        createCard(Suit.HEARTS, Rank.THREE, '1'),
        createCard(Suit.SPADES, Rank.KING, '2'),
        createCard(Suit.DIAMONDS, Rank.FIVE, '3'),
        createCard(Suit.CLUBS, Rank.ACE, '4')
      ];

      const sorted = sortCards(cards, 'desc');

      expect(sorted[0].rank).toBe(Rank.ACE);
      expect(sorted[1].rank).toBe(Rank.KING);
      expect(sorted[2].rank).toBe(Rank.FIVE);
      expect(sorted[3].rank).toBe(Rank.THREE);
    });

    it('应该按数字分组排序 (grouped)', () => {
      const cards: Card[] = [
        createCard(Suit.HEARTS, Rank.TEN, '1'),
        createCard(Suit.SPADES, Rank.THREE, '2'),
        createCard(Suit.DIAMONDS, Rank.TEN, '3'),
        createCard(Suit.CLUBS, Rank.THREE, '4'),
        createCard(Suit.HEARTS, Rank.FIVE, '5')
      ];

      const sorted = sortCards(cards, 'grouped');

      // 应该先按rank分组，然后按rank从小到大
      expect(sorted[0].rank).toBe(Rank.THREE);
      expect(sorted[1].rank).toBe(Rank.THREE);
      expect(sorted[2].rank).toBe(Rank.FIVE);
      expect(sorted[3].rank).toBe(Rank.TEN);
      expect(sorted[4].rank).toBe(Rank.TEN);
    });

    it('应该处理大小王', () => {
      const cards: Card[] = [
        createCard(Suit.JOKER, Rank.JOKER_SMALL, '1'),
        createCard(Suit.JOKER, Rank.JOKER_BIG, '2'),
        createCard(Suit.HEARTS, Rank.TWO, '3'),
        createCard(Suit.SPADES, Rank.ACE, '4')
      ];

      const sorted = sortCards(cards, 'asc');

      expect(sorted[0].rank).toBe(Rank.ACE);
      expect(sorted[1].rank).toBe(Rank.TWO);
      expect(sorted[2].rank).toBe(Rank.JOKER_SMALL);
      expect(sorted[3].rank).toBe(Rank.JOKER_BIG);
    });

    it('应该处理相同rank不同花色的排序', () => {
      const cards: Card[] = [
        createCard(Suit.HEARTS, Rank.FIVE, '1'),
        createCard(Suit.SPADES, Rank.FIVE, '2'),
        createCard(Suit.DIAMONDS, Rank.FIVE, '3'),
        createCard(Suit.CLUBS, Rank.FIVE, '4')
      ];

      const sorted = sortCards(cards, 'asc');

      // 相同rank应该按花色排序
      expect(sorted[0].suit).toBe(Suit.CLUBS);
      expect(sorted[1].suit).toBe(Suit.DIAMONDS);
      expect(sorted[2].suit).toBe(Suit.HEARTS);
      expect(sorted[3].suit).toBe(Suit.SPADES);
    });

    it('应该处理空数组', () => {
      const sorted = sortCards([], 'asc');
      expect(sorted).toEqual([]);
    });

    it('应该处理单张牌', () => {
      const cards: Card[] = [createCard(Suit.HEARTS, Rank.FIVE, '1')];
      const sorted = sortCards(cards, 'asc');
      expect(sorted).toEqual(cards);
    });
  });

  describe('groupCardsByRank', () => {
    it('应该按rank分组卡牌', () => {
      const cards: Card[] = [
        createCard(Suit.HEARTS, Rank.FIVE, '1'),
        createCard(Suit.SPADES, Rank.FIVE, '2'),
        createCard(Suit.DIAMONDS, Rank.TEN, '3'),
        createCard(Suit.CLUBS, Rank.FIVE, '4'),
        createCard(Suit.HEARTS, Rank.TEN, '5')
      ];

      const groups = groupCardsByRank(cards);

      expect(groups.size).toBe(2);
      expect(groups.get(Rank.FIVE)?.length).toBe(3);
      expect(groups.get(Rank.TEN)?.length).toBe(2);
    });

    it('应该处理空数组', () => {
      const groups = groupCardsByRank([]);
      expect(groups.size).toBe(0);
    });

    it('应该处理所有牌都不同的情况', () => {
      const cards: Card[] = [
        createCard(Suit.HEARTS, Rank.THREE, '1'),
        createCard(Suit.SPADES, Rank.FOUR, '2'),
        createCard(Suit.DIAMONDS, Rank.FIVE, '3')
      ];

      const groups = groupCardsByRank(cards);

      expect(groups.size).toBe(3);
      expect(groups.get(Rank.THREE)?.length).toBe(1);
      expect(groups.get(Rank.FOUR)?.length).toBe(1);
      expect(groups.get(Rank.FIVE)?.length).toBe(1);
    });
  });
});


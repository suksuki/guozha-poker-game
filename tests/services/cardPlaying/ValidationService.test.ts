/**
 * ValidationService 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Card, Suit, Rank, Play, CardType } from '../../../src/types/card';
import { ValidationService } from '../../../src/services/cardPlaying/ValidationService';
import { createDeck } from '../../../src/utils/cardUtils';

describe('ValidationService', () => {
  let validationService: ValidationService;
  let deck: Card[];

  beforeEach(() => {
    validationService = new ValidationService();
    deck = createDeck();
  });

  describe('validateCardType', () => {
    it('应该验证单张牌', () => {
      const card = deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES);
      expect(card).toBeDefined();
      if (!card) return;
      const cards: Card[] = [card];
      const result = validationService.validateCardType(cards);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CardType.SINGLE);
      expect(result?.cards).toEqual(cards);
    });

    it('应该验证对子', () => {
      const card1 = deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES);
      const card2 = deck.find(c => c.rank === Rank.ACE && c.suit === Suit.HEARTS);
      expect(card1).toBeDefined();
      expect(card2).toBeDefined();
      if (!card1 || !card2) return;
      const cards: Card[] = [card1, card2];
      const result = validationService.validateCardType(cards);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CardType.PAIR);
    });

    it('应该验证三张', () => {
      const card1 = deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES);
      const card2 = deck.find(c => c.rank === Rank.ACE && c.suit === Suit.HEARTS);
      const card3 = deck.find(c => c.rank === Rank.ACE && c.suit === Suit.DIAMONDS);
      expect(card1).toBeDefined();
      expect(card2).toBeDefined();
      expect(card3).toBeDefined();
      if (!card1 || !card2 || !card3) return;
      const cards: Card[] = [card1, card2, card3];
      const result = validationService.validateCardType(cards);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(CardType.TRIPLE);
    });

    // 注意：当前 getCardType 不支持三带一、三带二、顺子、连对、飞机等复杂牌型
    // 这些测试暂时跳过，因为系统只支持基础牌型
    it.skip('应该验证三带一（当前不支持）', () => {
      // 当前系统不支持三带一
    });

    it.skip('应该验证三带二（当前不支持）', () => {
      // 当前系统不支持三带二
    });

    it.skip('应该验证顺子（当前不支持）', () => {
      // 当前系统不支持顺子
    });

    it.skip('应该验证连对（当前不支持）', () => {
      // 当前系统不支持连对
    });

    it.skip('应该验证飞机（当前不支持）', () => {
      // 当前系统不支持飞机
    });

    it('应该拒绝不合法的牌型', () => {
      const cards: Card[] = [
        deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!,
        deck.find(c => c.rank === Rank.KING && c.suit === Suit.HEARTS)!
      ];
      const result = validationService.validateCardType(cards);
      expect(result).toBeNull();
    });

    it('应该拒绝空牌', () => {
      const result = validationService.validateCardType([]);
      expect(result).toBeNull();
    });
  });

  describe('validatePlayRules', () => {
    it('应该允许新轮次自由出牌', () => {
      const cards: Card[] = [deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!];
      const result = validationService.validatePlayRules(cards, null);
      expect(result.valid).toBe(true);
      expect(result.play).not.toBeNull();
    });

    it('应该验证是否能压过上家', () => {
      const lastPlay: Play = {
        cards: [deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!],
        type: CardType.SINGLE,
        value: Rank.ACE
      };
      
      // 能压过：2
      const cards2: Card[] = [deck.find(c => c.rank === Rank.TWO && c.suit === Suit.SPADES)!];
      const result2 = validationService.validatePlayRules(cards2, lastPlay);
      expect(result2.valid).toBe(true);

      // 不能压过：K
      const cardsK: Card[] = [deck.find(c => c.rank === Rank.KING && c.suit === Suit.SPADES)!];
      const resultK = validationService.validatePlayRules(cardsK, lastPlay);
      expect(resultK.valid).toBe(false);
      expect(resultK.error).toContain('无法压过');
    });

    it('应该验证牌是否在手牌中', () => {
      const playerHand: Card[] = [
        deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!,
        deck.find(c => c.rank === Rank.KING && c.suit === Suit.SPADES)!
      ];
      
      const cards: Card[] = [playerHand[0]];
      const result = validationService.validatePlayRules(
        cards,
        null,
        playerHand,
        { checkInHand: true }
      );
      expect(result.valid).toBe(true);

      // 尝试出不在手牌中的牌
      const invalidCard: Card[] = [deck.find(c => c.rank === Rank.QUEEN && c.suit === Suit.SPADES)!];
      const invalidResult = validationService.validatePlayRules(
        invalidCard,
        null,
        playerHand,
        { checkInHand: true }
      );
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('不在手牌中');
    });
  });

  describe('canBeat', () => {
    it('应该正确比较单张牌', () => {
      const lastPlay: Play = {
        cards: [deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!],
        type: CardType.SINGLE,
        value: Rank.ACE
      };

      const play2: Play = {
        cards: [deck.find(c => c.rank === Rank.TWO && c.suit === Suit.SPADES)!],
        type: CardType.SINGLE,
        value: Rank.TWO
      };

      expect(validationService.canBeat(play2, lastPlay)).toBe(true);
      expect(validationService.canBeat(lastPlay, play2)).toBe(false);
    });

    it('应该正确比较对子', () => {
      const lastPlay: Play = {
        cards: [
          deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!,
          deck.find(c => c.rank === Rank.ACE && c.suit === Suit.HEARTS)!
        ],
        type: CardType.PAIR,
        value: Rank.ACE
      };

      const play2: Play = {
        cards: [
          deck.find(c => c.rank === Rank.TWO && c.suit === Suit.SPADES)!,
          deck.find(c => c.rank === Rank.TWO && c.suit === Suit.HEARTS)!
        ],
        type: CardType.PAIR,
        value: Rank.TWO
      };

      expect(validationService.canBeat(play2, lastPlay)).toBe(true);
    });

    it('应该拒绝不同牌型的比较', () => {
      const lastPlay: Play = {
        cards: [deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!],
        type: CardType.SINGLE,
        value: Rank.ACE
      };

      const playPair: Play = {
        cards: [
          deck.find(c => c.rank === Rank.TWO && c.suit === Suit.SPADES)!,
          deck.find(c => c.rank === Rank.TWO && c.suit === Suit.HEARTS)!
        ],
        type: CardType.PAIR,
        value: Rank.TWO
      };

      expect(validationService.canBeat(playPair, lastPlay)).toBe(false);
    });
  });

  describe('findPlayableCards', () => {
    it('应该找到所有可出的牌组合', () => {
      const hand: Card[] = [
        deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!,
        deck.find(c => c.rank === Rank.ACE && c.suit === Suit.HEARTS)!,
        deck.find(c => c.rank === Rank.KING && c.suit === Suit.SPADES)!,
        deck.find(c => c.rank === Rank.KING && c.suit === Suit.HEARTS)!
      ];

      const playableCards = validationService.findPlayableCards(hand, null);
      expect(playableCards.length).toBeGreaterThan(0);
      
      // 应该包含单张、对子等
      const hasSingle = playableCards.some(cards => cards.length === 1);
      const hasPair = playableCards.some(cards => cards.length === 2);
      expect(hasSingle).toBe(true);
      expect(hasPair).toBe(true);
    });

    it('应该根据上家出牌找到能压过的牌', () => {
      const hand: Card[] = [
        deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!,
        deck.find(c => c.rank === Rank.TWO && c.suit === Suit.SPADES)!,
        deck.find(c => c.rank === Rank.KING && c.suit === Suit.SPADES)!
      ];

      const lastPlay: Play = {
        cards: [deck.find(c => c.rank === Rank.ACE && c.suit === Suit.HEARTS)!],
        type: CardType.SINGLE,
        value: Rank.ACE
      };

      const playableCards = validationService.findPlayableCards(hand, lastPlay);
      // 应该只包含能压过A的牌（2）
      const validPlays = playableCards.filter(cards => {
        const play = validationService.validateCardType(cards);
        return play && validationService.canBeat(play, lastPlay);
      });
      expect(validPlays.length).toBeGreaterThan(0);
    });
  });

  describe('hasPlayableCards', () => {
    it('应该检测是否有可出的牌', () => {
      const hand: Card[] = [
        deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!,
        deck.find(c => c.rank === Rank.KING && c.suit === Suit.SPADES)!
      ];

      expect(validationService.hasPlayableCards(hand, null)).toBe(true);
    });

    it('应该检测是否有能压过上家的牌', () => {
      const hand: Card[] = [
        deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!,
        deck.find(c => c.rank === Rank.TWO && c.suit === Suit.SPADES)!
      ];

      const lastPlay: Play = {
        cards: [deck.find(c => c.rank === Rank.ACE && c.suit === Suit.HEARTS)!],
        type: CardType.SINGLE,
        value: Rank.ACE
      };

      expect(validationService.hasPlayableCards(hand, lastPlay)).toBe(true);
    });

    it('应该检测没有能压过的牌', () => {
      const hand: Card[] = [
        deck.find(c => c.rank === Rank.KING && c.suit === Suit.SPADES)!
      ];

      const lastPlay: Play = {
        cards: [deck.find(c => c.rank === Rank.ACE && c.suit === Suit.HEARTS)!],
        type: CardType.SINGLE,
        value: Rank.ACE
      };

      expect(validationService.hasPlayableCards(hand, lastPlay)).toBe(false);
    });
  });
});


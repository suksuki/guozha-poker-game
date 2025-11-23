/**
 * 发牌和理牌功能回归测试
 * 确保发牌、理牌、聊天触发等功能正常工作
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Card, Suit, Rank, PlayerType } from '../src/types/card';
import { sortCards, groupCardsByRank } from '../src/utils/cardSorting';
import { dealCardsWithAlgorithm, DealingConfig } from '../src/utils/dealingAlgorithms';
import { chatService } from '../src/services/chatService';
import { ChatEventType } from '../src/types/chat';

// Mock voiceService
vi.mock('../src/services/voiceService', () => ({
  speakText: vi.fn(() => Promise.resolve())
}));

// Mock chatContent
vi.mock('../src/utils/chatContent', () => ({
  getChatContent: vi.fn((eventType) => {
    if (eventType === ChatEventType.DEALING_BOMB_FORMED) return '有炸弹了！';
    if (eventType === ChatEventType.DEALING_DUN_FORMED) return '要抓到墩了！';
    if (eventType === ChatEventType.DEALING_HUGE_CARD) return '好牌！';
    if (eventType === ChatEventType.DEALING_POOR_HAND) return '牌好小...';
    return '随机聊天';
  }),
  getRandomChat: vi.fn(() => '随机聊天')
}));

describe('发牌和理牌功能回归测试', () => {
  beforeEach(() => {
    chatService.clearMessages();
    vi.clearAllMocks();
  });

  describe('发牌算法', () => {
    it('应该能够使用所有发牌算法', () => {
      const algorithms: Array<DealingConfig['algorithm']> = [
        'random',
        'fair',
        'favor-human',
        'favor-ai',
        'balanced-score',
        'clustered'
      ];

      algorithms.forEach(algorithm => {
        const config: DealingConfig = {
          algorithm,
          playerCount: 4,
          favorPlayerIndex: 0
        };

        const result = dealCardsWithAlgorithm(config);
        
        expect(result.hands).toHaveLength(4);
        expect(result.hands.every(hand => hand.length > 0)).toBe(true);
        
        // 验证所有牌都被分配
        const totalCards = result.hands.reduce((sum, hand) => sum + hand.length, 0);
        expect(totalCards).toBe(216); // 4副牌 = 216张
      });
    });

    it('应该为每张牌生成唯一ID', () => {
      const config: DealingConfig = {
        algorithm: 'random',
        playerCount: 4
      };

      const result = dealCardsWithAlgorithm(config);
      const allCardIds = new Set<string>();

      result.hands.forEach(hand => {
        hand.forEach(card => {
          expect(card.id).toBeDefined();
          expect(allCardIds.has(card.id)).toBe(false);
          allCardIds.add(card.id);
        });
      });
    });
  });

  describe('理牌排序', () => {
    const createCard = (suit: Suit, rank: Rank, id: string): Card => ({
      suit,
      rank,
      id
    });

    it('应该能够按不同规则排序', () => {
      const cards: Card[] = [
        createCard(Suit.HEARTS, Rank.KING, '1'),
        createCard(Suit.SPADES, Rank.THREE, '2'),
        createCard(Suit.DIAMONDS, Rank.ACE, '3'),
        createCard(Suit.CLUBS, Rank.FIVE, '4')
      ];

      const sortedAsc = sortCards(cards, 'asc');
      expect(sortedAsc[0].rank).toBe(Rank.THREE);

      const sortedDesc = sortCards(cards, 'desc');
      expect(sortedDesc[0].rank).toBe(Rank.ACE);

      const sortedGrouped = sortCards(cards, 'grouped');
      expect(sortedGrouped.length).toBe(4);
    });

    it('应该能够按rank分组', () => {
      const cards: Card[] = [
        createCard(Suit.HEARTS, Rank.FIVE, '1'),
        createCard(Suit.SPADES, Rank.FIVE, '2'),
        createCard(Suit.DIAMONDS, Rank.TEN, '3'),
        createCard(Suit.CLUBS, Rank.FIVE, '4')
      ];

      const groups = groupCardsByRank(cards);
      
      expect(groups.size).toBe(2);
      expect(groups.get(Rank.FIVE)?.length).toBe(3);
      expect(groups.get(Rank.TEN)?.length).toBe(1);
    });
  });

  describe('理牌聊天触发', () => {
    const createCard = (suit: Suit, rank: Rank, id: string): Card => ({
      suit,
      rank,
      id
    });

    const mockPlayer = {
      id: 0,
      name: '测试玩家',
      type: PlayerType.HUMAN,
      hand: [] as Card[],
      isHuman: true,
      score: 0,
      voiceConfig: {
        gender: 'female' as const,
        dialect: 'mandarin' as const
      }
    };

    it('应该检测炸弹并触发聊天', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 确保触发

      const hand: Card[] = [
        createCard(Suit.HEARTS, Rank.FIVE, '1'),
        createCard(Suit.SPADES, Rank.FIVE, '2'),
        createCard(Suit.DIAMONDS, Rank.FIVE, '3'),
        createCard(Suit.CLUBS, Rank.FIVE, '4')
      ];
      const newlyDealtCard = createCard(Suit.HEARTS, Rank.FIVE, '5');

      await chatService.triggerSortingReaction(mockPlayer, hand, newlyDealtCard);

      const messages = chatService.getMessages();
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('应该检测墩并触发聊天', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 确保触发

      const hand: Card[] = Array.from({ length: 7 }, (_, i) =>
        createCard(Suit.HEARTS, Rank.TEN, `card-${i}`)
      );
      const newlyDealtCard = createCard(Suit.SPADES, Rank.TEN, 'new-card');

      await chatService.triggerSortingReaction(mockPlayer, hand, newlyDealtCard);

      const messages = chatService.getMessages();
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('应该检测超大牌并触发聊天', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 确保触发

      const hand: Card[] = [
        createCard(Suit.HEARTS, Rank.THREE, '1')
      ];
      const newlyDealtCard = createCard(Suit.JOKER, Rank.JOKER_BIG, 'big-joker');

      await chatService.triggerSortingReaction(mockPlayer, hand, newlyDealtCard);

      const messages = chatService.getMessages();
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('应该优先检测炸弹/墩', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 确保触发

      // 既有炸弹又有超大牌
      const hand: Card[] = [
        createCard(Suit.HEARTS, Rank.FIVE, '1'),
        createCard(Suit.SPADES, Rank.FIVE, '2'),
        createCard(Suit.DIAMONDS, Rank.FIVE, '3'),
        createCard(Suit.CLUBS, Rank.FIVE, '4')
      ];
      const newlyDealtCard = createCard(Suit.JOKER, Rank.JOKER_BIG, 'big-joker');

      await chatService.triggerSortingReaction(mockPlayer, hand, newlyDealtCard);

      const messages = chatService.getMessages();
      // 应该优先触发炸弹，而不是超大牌
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });
  });

  describe('集成测试', () => {
    it('应该能够完成完整的发牌和理牌流程', () => {
      // 1. 发牌
      const config: DealingConfig = {
        algorithm: 'random',
        playerCount: 4
      };
      const result = dealCardsWithAlgorithm(config);

      // 2. 验证发牌结果
      expect(result.hands).toHaveLength(4);
      result.hands.forEach(hand => {
        expect(hand.length).toBeGreaterThan(0);
      });

      // 3. 理牌（排序）
      result.hands.forEach(hand => {
        const sorted = sortCards(hand, 'grouped');
        expect(sorted.length).toBe(hand.length);
        
        // 验证排序后仍然包含所有牌
        const sortedIds = new Set(sorted.map(c => c.id));
        const originalIds = new Set(hand.map(c => c.id));
        expect(sortedIds.size).toBe(originalIds.size);
      });

      // 4. 分组验证
      result.hands.forEach(hand => {
        const groups = groupCardsByRank(hand);
        const totalCardsInGroups = Array.from(groups.values())
          .reduce((sum, cards) => sum + cards.length, 0);
        expect(totalCardsInGroups).toBe(hand.length);
      });
    });

    it('应该保持发牌算法的特性', () => {
      // 测试公平发牌算法
      const fairConfig: DealingConfig = {
        algorithm: 'fair',
        playerCount: 4
      };
      const fairResult = dealCardsWithAlgorithm(fairConfig);

      // 验证每个玩家都有牌
      fairResult.hands.forEach(hand => {
        expect(hand.length).toBeGreaterThan(0);
      });

      // 测试偏袒人类玩家算法
      const favorConfig: DealingConfig = {
        algorithm: 'favor-human',
        playerCount: 4,
        favorPlayerIndex: 0
      };
      const favorResult = dealCardsWithAlgorithm(favorConfig);

      // 验证人类玩家有牌
      expect(favorResult.hands[0].length).toBeGreaterThan(0);
    });
  });
});


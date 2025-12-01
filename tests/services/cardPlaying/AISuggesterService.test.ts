/**
 * AISuggesterService 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Card, Suit, Rank, Play, CardType } from '../../../src/types/card';
import { AISuggesterService } from '../../../src/services/cardPlaying/AISuggesterService';
import { ValidationService } from '../../../src/services/cardPlaying/ValidationService';
import { PlayExecutorService } from '../../../src/services/cardPlaying/PlayExecutorService';
import { createDeck } from '../../../src/utils/cardUtils';

// Mock aiChoosePlay
vi.mock('../../../src/utils/aiPlayer', () => ({
  aiChoosePlay: vi.fn(async (hand, lastPlay, options) => {
    // 简单的模拟：返回第一张牌
    if (hand.length > 0) {
      return [hand[0]];
    }
    return null;
  })
}));

describe('AISuggesterService', () => {
  let aiSuggesterService: AISuggesterService;
  let validationService: ValidationService;
  let playExecutorService: PlayExecutorService;
  let deck: Card[];
  let playerId: number;
  let playerHand: Card[];

  beforeEach(() => {
    validationService = new ValidationService();
    playExecutorService = new PlayExecutorService(validationService);
    aiSuggesterService = new AISuggesterService(validationService, playExecutorService);
    deck = createDeck();
    playerId = 0;
    
    // 创建测试手牌
    playerHand = [
      deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!,
      deck.find(c => c.rank === Rank.ACE && c.suit === Suit.HEARTS)!,
      deck.find(c => c.rank === Rank.KING && c.suit === Suit.SPADES)!,
      deck.find(c => c.rank === Rank.KING && c.suit === Suit.HEARTS)!,
      deck.find(c => c.rank === Rank.QUEEN && c.suit === Suit.SPADES)!
    ];
  });

  describe('suggestPlay', () => {
    it('应该返回AI建议', async () => {
      const suggestion = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        null,
        {}
      );

      expect(suggestion).not.toBeNull();
      expect(suggestion?.cards).toBeDefined();
      expect(suggestion?.cards.length).toBeGreaterThan(0);
    });

    it('应该在没有可出牌时返回null', async () => {
      const emptyHand: Card[] = [];
      const suggestion = await aiSuggesterService.suggestPlay(
        playerId,
        emptyHand,
        null,
        {}
      );

      expect(suggestion).toBeNull();
    });

    it('应该验证建议的牌是否合法', async () => {
      const suggestion = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        null,
        {}
      );

      if (suggestion) {
        const play = validationService.validateCardType(suggestion.cards);
        expect(play).not.toBeNull();
      }
    });

    it('应该检查建议的牌是否能压过上家', async () => {
      const lastPlay: Play = {
        cards: [deck.find(c => c.rank === Rank.ACE && c.suit === Suit.DIAMONDS)!],
        type: CardType.SINGLE,
        value: Rank.ACE
      };

      const suggestion = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        lastPlay,
        {}
      );

      // 如果返回建议，应该能压过上家
      if (suggestion) {
        const play = validationService.validateCardType(suggestion.cards);
        if (play) {
          const canBeat = validationService.canBeat(play, lastPlay);
          expect(canBeat).toBe(true);
        }
      }
    });

    it('应该支持不同的策略选项', async () => {
      const aggressive = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        null,
        { strategy: 'aggressive' }
      );

      const conservative = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        null,
        { strategy: 'conservative' }
      );

      const balanced = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        null,
        { strategy: 'balanced' }
      );

      // 所有策略都应该返回建议（如果手牌有可出的牌）
      expect(aggressive || conservative || balanced).not.toBeNull();
    });
  });

  describe('suggestMultiple', () => {
    it('应该返回多个建议', async () => {
      const suggestions = await aiSuggesterService.suggestMultiple(
        playerId,
        playerHand,
        null,
        [
          { strategy: 'aggressive' },
          { strategy: 'conservative' },
          { strategy: 'balanced' }
        ]
      );

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('应该验证所有建议都是合法的', async () => {
      const suggestions = await aiSuggesterService.suggestMultiple(
        playerId,
        playerHand,
        null,
        [
          { strategy: 'aggressive' },
          { strategy: 'conservative' }
        ]
      );

      suggestions.forEach(suggestion => {
        const play = validationService.validateCardType(suggestion.cards);
        expect(play).not.toBeNull();
      });
    });
  });

  describe('explainSuggestion', () => {
    it('应该生成建议解释', () => {
      const suggestion = {
        cards: [playerHand[0], playerHand[1]],
        type: CardType.PAIR,
        value: Rank.ACE
      };

      const explanation = aiSuggesterService.explainSuggestion(suggestion);
      expect(explanation).toBeDefined();
      expect(explanation.length).toBeGreaterThan(0);
    });
  });

  describe('evaluateSuggestion', () => {
    it('应该评估建议质量', () => {
      const suggestion = {
        cards: [playerHand[0], playerHand[1]],
        type: CardType.PAIR,
        value: Rank.ACE
      };

      const score = aiSuggesterService.evaluateSuggestion(
        suggestion,
        playerHand,
        null
      );

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});


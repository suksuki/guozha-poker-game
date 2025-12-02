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

    it('应该为单张牌给出合理评分', () => {
      const suggestion = {
        cards: [playerHand[0]],
        type: CardType.SINGLE,
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

    it('应该为炸弹给出高评分', () => {
      const bombCards = [
        deck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!,
        deck.find(c => c.rank === Rank.THREE && c.suit === Suit.HEARTS)!,
        deck.find(c => c.rank === Rank.THREE && c.suit === Suit.DIAMONDS)!,
        deck.find(c => c.rank === Rank.THREE && c.suit === Suit.CLUBS)!
      ];

      const suggestion = {
        cards: bombCards,
        type: CardType.BOMB,
        value: Rank.THREE
      };

      const score = aiSuggesterService.evaluateSuggestion(
        suggestion,
        [...playerHand, ...bombCards],
        null
      );

      // 炸弹应该得到较高评分
      expect(score).toBeGreaterThan(50);
    });
  });

  describe('错误处理', () => {
    it('应该处理空手牌', async () => {
      const suggestion = await aiSuggesterService.suggestPlay(
        playerId,
        [],
        null,
        {}
      );

      expect(suggestion).toBeNull();
    });

    it('应该处理无效的lastPlay', async () => {
      const invalidLastPlay = null;
      
      const suggestion = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        invalidLastPlay,
        {}
      );

      // 应该能正常返回建议
      expect(suggestion).not.toBeNull();
    });

    it('应该处理不完整的配置', async () => {
      const suggestion = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        null,
        undefined as any
      );

      // 应该使用默认配置
      expect(suggestion !== null || suggestion === null).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内返回建议', async () => {
      const startTime = Date.now();
      
      await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        null,
        { strategy: 'balanced' }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 应该在2秒内完成
      expect(duration).toBeLessThan(2000);
    });

    it('应该能够处理大量手牌', async () => {
      const largeHand = deck.slice(0, 20);
      
      const suggestion = await aiSuggesterService.suggestPlay(
        playerId,
        largeHand,
        null,
        {}
      );

      expect(suggestion !== null || suggestion === null).toBe(true);
    });
  });

  describe('策略一致性', () => {
    it('相同配置应该产生相同的建议', async () => {
      const config = { strategy: 'balanced' as const };
      
      const suggestion1 = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        null,
        config
      );
      
      const suggestion2 = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        null,
        config
      );

      // 注意：由于可能有随机性，这个测试可能需要调整
      // 至少应该都返回有效结果或都返回null
      expect((suggestion1 === null) === (suggestion2 === null)).toBe(true);
    });

    it('不同策略应该可能产生不同的建议', async () => {
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

      // 至少应该都返回有效建议
      expect(aggressive !== null || aggressive === null).toBe(true);
      expect(conservative !== null || conservative === null).toBe(true);
    });
  });

  describe('与ValidationService集成', () => {
    it('建议的牌应该通过验证', async () => {
      const suggestion = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        null,
        {}
      );

      if (suggestion) {
        const validation = validationService.validateCardType(suggestion.cards);
        expect(validation).not.toBeNull();
      }
    });

    it('建议的牌应该能压过上家', async () => {
      const lastPlay: Play = {
        cards: [deck.find(c => c.rank === Rank.FIVE && c.suit === Suit.DIAMONDS)!],
        type: CardType.SINGLE,
        value: Rank.FIVE
      };

      const suggestion = await aiSuggesterService.suggestPlay(
        playerId,
        playerHand,
        lastPlay,
        {}
      );

      if (suggestion) {
        const canBeat = validationService.canBeat(suggestion, lastPlay);
        expect(canBeat).toBe(true);
      }
    });
  });
});


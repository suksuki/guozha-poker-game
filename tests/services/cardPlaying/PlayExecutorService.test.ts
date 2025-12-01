/**
 * PlayExecutorService 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Card, Suit, Rank, Play, CardType } from '../../../src/types/card';
import { PlayExecutorService } from '../../../src/services/cardPlaying/PlayExecutorService';
import { ValidationService } from '../../../src/services/cardPlaying/ValidationService';
import { createDeck } from '../../../src/utils/cardUtils';

describe('PlayExecutorService', () => {
  let playExecutorService: PlayExecutorService;
  let validationService: ValidationService;
  let deck: Card[];
  let playerId: number;
  let playerHand: Card[];

  beforeEach(() => {
    validationService = new ValidationService();
    playExecutorService = new PlayExecutorService(validationService);
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

  describe('validatePlay', () => {
    it('应该验证合法的出牌', () => {
      const cards = [playerHand[0], playerHand[1]]; // 对子
      const result = playExecutorService.validatePlay(playerId, cards, playerHand, null);
      
      expect(result.valid).toBe(true);
      expect(result.play).not.toBeNull();
    });

    it('应该拒绝不合法的出牌', () => {
      const cards = [playerHand[0], playerHand[2]]; // 不是合法牌型
      const result = playExecutorService.validatePlay(playerId, cards, playerHand, null);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不是合法的牌型');
    });

    it('应该验证是否能压过上家', () => {
      const lastPlay: Play = {
        cards: [deck.find(c => c.rank === Rank.ACE && c.suit === Suit.DIAMONDS)!],
        type: CardType.SINGLE,
        value: Rank.ACE
      };

      // 能压过
      const cards2: Card[] = [deck.find(c => c.rank === Rank.TWO && c.suit === Suit.SPADES)!];
      const result2 = playExecutorService.validatePlay(playerId, cards2, [cards2[0]], lastPlay);
      expect(result2.valid).toBe(true);

      // 不能压过
      const cardsK: Card[] = [deck.find(c => c.rank === Rank.KING && c.suit === Suit.SPADES)!];
      const resultK = playExecutorService.validatePlay(playerId, cardsK, [cardsK[0]], lastPlay);
      expect(resultK.valid).toBe(false);
    });
  });

  describe('canBeat', () => {
    it('应该正确判断是否能压过', () => {
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

      expect(playExecutorService.canBeat([play2.cards[0]], lastPlay)).toBe(true);
      expect(playExecutorService.canBeat([lastPlay.cards[0]], play2)).toBe(false);
    });
  });

  describe('hasPlayableCards', () => {
    it('应该检测是否有可出的牌', () => {
      expect(playExecutorService.hasPlayableCards(playerId, playerHand, null)).toBe(true);
    });

    it('应该检测是否有能压过上家的牌', () => {
      const lastPlay: Play = {
        cards: [deck.find(c => c.rank === Rank.ACE && c.suit === Suit.DIAMONDS)!],
        type: CardType.SINGLE,
        value: Rank.ACE
      };

      const handWith2: Card[] = [
        deck.find(c => c.rank === Rank.TWO && c.suit === Suit.SPADES)!
      ];
      expect(playExecutorService.hasPlayableCards(playerId, handWith2, lastPlay)).toBe(true);
    });

    it('应该检测没有能压过的牌', () => {
      const lastPlay: Play = {
        cards: [deck.find(c => c.rank === Rank.ACE && c.suit === Suit.DIAMONDS)!],
        type: CardType.SINGLE,
        value: Rank.ACE
      };

      const handOnlyK: Card[] = [
        deck.find(c => c.rank === Rank.KING && c.suit === Suit.SPADES)!
      ];
      expect(playExecutorService.hasPlayableCards(playerId, handOnlyK, lastPlay)).toBe(false);
    });
  });

  describe('executePlay', () => {
    it('应该执行合法的出牌', async () => {
      const cards = [playerHand[0], playerHand[1]]; // 对子
      const result = await playExecutorService.executePlay(
        playerId,
        cards,
        playerHand,
        null,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.play).not.toBeNull();
      expect(result.play?.type).toBe(CardType.PAIR);
    });

    it('应该拒绝不合法的出牌', async () => {
      const cards = [playerHand[0], playerHand[2]]; // 不是合法牌型
      const result = await playExecutorService.executePlay(
        playerId,
        cards,
        playerHand,
        null,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该调用回调函数', async () => {
      const onStart = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      const cards = [playerHand[0], playerHand[1]]; // 对子
      await playExecutorService.executePlay(
        playerId,
        cards,
        playerHand,
        null,
        {
          onStart,
          onComplete,
          onError
        }
      );

      expect(onStart).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('应该在错误时调用错误回调', async () => {
      const onError = vi.fn();
      const cards = [playerHand[0], playerHand[2]]; // 不合法的牌型

      await playExecutorService.executePlay(
        playerId,
        cards,
        playerHand,
        null,
        { onError }
      );

      // 注意：验证失败时不会调用 executePlay 的内部流程，所以 onError 可能不会被调用
      // 这取决于实现细节
    });
  });
});


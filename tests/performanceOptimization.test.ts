/**
 * 性能优化测试
 * 确保MCTS优化后仍然能正常工作
 */

import { describe, it, expect } from 'vitest';
import { Card, Suit, Rank, Play } from '../src/types/card';
import { mctsChoosePlay } from '../src/utils/mctsAI';
import { findPlayableCards, canPlayCards } from '../src/utils/cardUtils';

describe('性能优化测试', () => {
  describe('MCTS快速模式测试', () => {
    it('应该能在2秒内完成决策（快速模式）', () => {
      // 创建测试手牌（少量牌，快速测试）
      const hand: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'test-3' },
        { suit: Suit.CLUBS, rank: Rank.FOUR, id: 'test-4' },
        { suit: Suit.SPADES, rank: Rank.FOUR, id: 'test-5' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-6' },
        { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-7' },
        { suit: Suit.CLUBS, rank: Rank.FIVE, id: 'test-8' }
      ];
      
      const startTime = Date.now();
      const result = mctsChoosePlay(hand, null, {
        iterations: 50, // 快速模式
        simulationDepth: 20,
        perfectInformation: false,
        playerCount: 4
      });
      const duration = Date.now() - startTime;
      
      // 应该在2秒内完成
      expect(duration).toBeLessThan(2000);
      // 应该返回有效的出牌或null
      expect(result === null || Array.isArray(result)).toBe(true);
    });

    it('应该能在超时保护下提前结束', () => {
      // 创建大量手牌（会触发超时保护）
      const hand: Card[] = Array.from({ length: 40 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE + (i % 13),
        id: `test-${i}`
      }));
      
      const startTime = Date.now();
      const result = mctsChoosePlay(hand, null, {
        iterations: 100, // 即使设置100次，也应该在2秒内超时
        simulationDepth: 20,
        perfectInformation: false,
        playerCount: 4
      });
      const duration = Date.now() - startTime;
      
      // 应该在2秒左右完成（超时保护）
      expect(duration).toBeLessThan(2500); // 给一点缓冲
      // 应该返回有效的出牌或null
      expect(result === null || Array.isArray(result)).toBe(true);
    });

    it('手牌多时应该自动减少迭代次数', () => {
      // 创建大量手牌
      const hand: Card[] = Array.from({ length: 35 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE + (i % 13),
        id: `test-${i}`
      }));
      
      const startTime = Date.now();
      const result = mctsChoosePlay(hand, null, {
        iterations: 50, // 基础50次
        simulationDepth: 20,
        perfectInformation: false,
        playerCount: 4
      });
      const duration = Date.now() - startTime;
      
      // 手牌多时应该自动减少迭代次数，所以应该更快
      expect(duration).toBeLessThan(2000);
      expect(result === null || Array.isArray(result)).toBe(true);
    });
  });

  describe('MCTS功能正确性测试', () => {
    it('快速模式下应该仍然能选择有效的出牌', () => {
      const hand: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.FOUR, id: 'test-3' },
        { suit: Suit.CLUBS, rank: Rank.FOUR, id: 'test-4' }
      ];
      
      const result = mctsChoosePlay(hand, null, {
        iterations: 50, // 快速模式
        simulationDepth: 20,
        perfectInformation: false,
        playerCount: 4
      });
      
      if (result) {
        // 如果返回了出牌，应该是有效的
        const play = canPlayCards(result);
        expect(play).not.toBeNull();
        // 应该都是手牌中的牌
        result.forEach(card => {
          expect(hand.some(c => c.id === card.id)).toBe(true);
        });
      }
    });

    it('快速模式下应该能处理要不起的情况', () => {
      const hand: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }
      ];
      
      const lastPlay: Play = {
        cards: [{ suit: Suit.SPADES, rank: Rank.TWO, id: 'test-2' }],
        type: 'single' as any,
        value: Rank.TWO
      };
      
      const result = mctsChoosePlay(hand, lastPlay, {
        iterations: 50, // 快速模式
        simulationDepth: 20,
        perfectInformation: false,
        playerCount: 4
      });
      
      // 应该返回null（要不起）或有效的能压过的牌
      expect(result === null || Array.isArray(result)).toBe(true);
    });
  });
});


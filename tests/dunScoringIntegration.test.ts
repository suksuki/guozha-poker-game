/**
 * 墩的计分规则集成测试
 * 测试在实际游戏流程中墩的计分是否正确应用
 */

import { describe, it, expect } from 'vitest';
import { Card, Suit, Rank, CardType, Play } from '../src/types/card';
import { canPlayCards, calculateDunCount, calculateDunScore } from '../src/utils/cardUtils';

describe('墩的计分规则集成测试', () => {
  describe('墩的识别和计分', () => {
    it('应该正确识别7张相同牌为墩', () => {
      const cards: Card[] = Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.FIVE,
        id: `test-${i}`
      }));
      
      const play = canPlayCards(cards);
      expect(play).not.toBeNull();
      expect(play?.type).toBe(CardType.DUN);
      
      const dunCount = calculateDunCount(cards.length);
      expect(dunCount).toBe(1);
    });

    it('应该正确识别8张相同牌为2墩', () => {
      const cards: Card[] = Array.from({ length: 8 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.FIVE,
        id: `test-${i}`
      }));
      
      const play = canPlayCards(cards);
      expect(play).not.toBeNull();
      expect(play?.type).toBe(CardType.DUN);
      
      const dunCount = calculateDunCount(cards.length);
      expect(dunCount).toBe(2);
    });

    it('应该正确计算4人游戏中出7张墩的分数', () => {
      const cards: Card[] = Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.FIVE,
        id: `test-${i}`
      }));
      
      const dunCount = calculateDunCount(cards.length);
      const scoreResult = calculateDunScore(dunCount, 4, 0);
      
      expect(dunCount).toBe(1);
      expect(scoreResult.dunPlayerScore).toBe(90); // 3个其他玩家 × 30 × 1墩
      expect(scoreResult.otherPlayersScore).toBe(30); // 30 × 1墩
    });

    it('应该正确计算4人游戏中出8张墩的分数', () => {
      const cards: Card[] = Array.from({ length: 8 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.FIVE,
        id: `test-${i}`
      }));
      
      const dunCount = calculateDunCount(cards.length);
      const scoreResult = calculateDunScore(dunCount, 4, 0);
      
      expect(dunCount).toBe(2);
      expect(scoreResult.dunPlayerScore).toBe(180); // 3个其他玩家 × 30 × 2墩
      expect(scoreResult.otherPlayersScore).toBe(60); // 30 × 2墩
    });
  });

  describe('分数守恒性测试', () => {
    it('4人游戏，1墩：总分变化应该为0（守恒）', () => {
      const scoreResult = calculateDunScore(1, 4, 0);
      const totalChange = scoreResult.dunPlayerScore - (scoreResult.otherPlayersScore * 3);
      expect(totalChange).toBe(0);
    });

    it('4人游戏，2墩：总分变化应该为0（守恒）', () => {
      const scoreResult = calculateDunScore(2, 4, 0);
      const totalChange = scoreResult.dunPlayerScore - (scoreResult.otherPlayersScore * 3);
      expect(totalChange).toBe(0);
    });

    it('5人游戏，1墩：总分变化应该为0（守恒）', () => {
      const scoreResult = calculateDunScore(1, 5, 0);
      const totalChange = scoreResult.dunPlayerScore - (scoreResult.otherPlayersScore * 4);
      expect(totalChange).toBe(0);
    });

    it('8人游戏，1墩：总分变化应该为0（守恒）', () => {
      const scoreResult = calculateDunScore(1, 8, 0);
      const totalChange = scoreResult.dunPlayerScore - (scoreResult.otherPlayersScore * 7);
      expect(totalChange).toBe(0);
    });
  });

  describe('边界情况测试', () => {
    it('应该正确处理大量墩的情况（13张=64墩）', () => {
      const dunCount = calculateDunCount(13);
      expect(dunCount).toBe(64);
      
      const scoreResult = calculateDunScore(dunCount, 4, 0);
      expect(scoreResult.dunPlayerScore).toBe(5760); // 3 × 30 × 64
      expect(scoreResult.otherPlayersScore).toBe(1920); // 30 × 64
    });

    it('应该正确处理2人游戏的情况', () => {
      const scoreResult = calculateDunScore(1, 2, 0);
      expect(scoreResult.dunPlayerScore).toBe(30); // 1个其他玩家 × 30 × 1墩
      expect(scoreResult.otherPlayersScore).toBe(30); // 30 × 1墩
    });
  });
});


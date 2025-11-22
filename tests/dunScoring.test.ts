/**
 * 墩的计分规则测试
 * 
 * 规则：
 * - 7张=1墩，8张=2墩，9张=4墩，10张=8墩，11张=16墩...（翻倍）
 * - 每个墩从每个其他玩家扣除30分
 * - 出墩的玩家增加 (其他玩家数 × 30分 × 墩数)
 */

import { describe, it, expect } from 'vitest';
import { Card, Suit, Rank, CardType } from '../src/types/card';
import { calculateDunCount, calculateDunScore } from '../src/utils/cardUtils';

describe('墩的计分规则测试', () => {
  describe('计算墩的数量', () => {
    it('应该正确计算7张=1墩', () => {
      expect(calculateDunCount(7)).toBe(1);
    });

    it('应该正确计算8张=2墩', () => {
      expect(calculateDunCount(8)).toBe(2);
    });

    it('应该正确计算9张=4墩', () => {
      expect(calculateDunCount(9)).toBe(4);
    });

    it('应该正确计算10张=8墩', () => {
      expect(calculateDunCount(10)).toBe(8);
    });

    it('应该正确计算11张=16墩', () => {
      expect(calculateDunCount(11)).toBe(16);
    });

    it('应该正确计算12张=32墩', () => {
      expect(calculateDunCount(12)).toBe(32);
    });

    it('应该正确计算13张=64墩', () => {
      expect(calculateDunCount(13)).toBe(64);
    });

    it('少于7张应该返回0', () => {
      expect(calculateDunCount(6)).toBe(0);
      expect(calculateDunCount(5)).toBe(0);
      expect(calculateDunCount(4)).toBe(0);
      expect(calculateDunCount(1)).toBe(0);
      expect(calculateDunCount(0)).toBe(0);
    });
  });

  describe('计算墩的分数', () => {
    it('4人游戏，1墩：出墩玩家+90分，其他玩家各-30分', () => {
      const result = calculateDunScore(1, 4, 0);
      expect(result.dunPlayerScore).toBe(90); // 3个其他玩家 × 30分 × 1墩
      expect(result.otherPlayersScore).toBe(30); // 30分 × 1墩
    });

    it('4人游戏，2墩：出墩玩家+180分，其他玩家各-60分', () => {
      const result = calculateDunScore(2, 4, 0);
      expect(result.dunPlayerScore).toBe(180); // 3个其他玩家 × 30分 × 2墩
      expect(result.otherPlayersScore).toBe(60); // 30分 × 2墩
    });

    it('4人游戏，4墩：出墩玩家+360分，其他玩家各-120分', () => {
      const result = calculateDunScore(4, 4, 0);
      expect(result.dunPlayerScore).toBe(360); // 3个其他玩家 × 30分 × 4墩
      expect(result.otherPlayersScore).toBe(120); // 30分 × 4墩
    });

    it('5人游戏，1墩：出墩玩家+120分，其他玩家各-30分', () => {
      const result = calculateDunScore(1, 5, 0);
      expect(result.dunPlayerScore).toBe(120); // 4个其他玩家 × 30分 × 1墩
      expect(result.otherPlayersScore).toBe(30); // 30分 × 1墩
    });

    it('5人游戏，2墩：出墩玩家+240分，其他玩家各-60分', () => {
      const result = calculateDunScore(2, 5, 0);
      expect(result.dunPlayerScore).toBe(240); // 4个其他玩家 × 30分 × 2墩
      expect(result.otherPlayersScore).toBe(60); // 30分 × 2墩
    });

    it('8人游戏，1墩：出墩玩家+210分，其他玩家各-30分', () => {
      const result = calculateDunScore(1, 8, 0);
      expect(result.dunPlayerScore).toBe(210); // 7个其他玩家 × 30分 × 1墩
      expect(result.otherPlayersScore).toBe(30); // 30分 × 1墩
    });

    it('0墩应该返回0分', () => {
      const result = calculateDunScore(0, 4, 0);
      expect(result.dunPlayerScore).toBe(0);
      expect(result.otherPlayersScore).toBe(0);
    });
  });

  describe('完整计分场景测试', () => {
    it('4人游戏，玩家0出7张墩（1墩）', () => {
      const dunCount = calculateDunCount(7); // 1墩
      const result = calculateDunScore(dunCount, 4, 0);
      
      expect(dunCount).toBe(1);
      expect(result.dunPlayerScore).toBe(90); // 3 × 30 × 1
      expect(result.otherPlayersScore).toBe(30); // 30 × 1
      
      // 验证总分：出墩玩家+90，其他3个玩家各-30，总分变化为0（符合守恒）
      const totalScoreChange = result.dunPlayerScore - (result.otherPlayersScore * 3);
      expect(totalScoreChange).toBe(0);
    });

    it('4人游戏，玩家0出8张墩（2墩）', () => {
      const dunCount = calculateDunCount(8); // 2墩
      const result = calculateDunScore(dunCount, 4, 0);
      
      expect(dunCount).toBe(2);
      expect(result.dunPlayerScore).toBe(180); // 3 × 30 × 2
      expect(result.otherPlayersScore).toBe(60); // 30 × 2
      
      // 验证总分守恒
      const totalScoreChange = result.dunPlayerScore - (result.otherPlayersScore * 3);
      expect(totalScoreChange).toBe(0);
    });

    it('4人游戏，玩家0出9张墩（4墩）', () => {
      const dunCount = calculateDunCount(9); // 4墩
      const result = calculateDunScore(dunCount, 4, 0);
      
      expect(dunCount).toBe(4);
      expect(result.dunPlayerScore).toBe(360); // 3 × 30 × 4
      expect(result.otherPlayersScore).toBe(120); // 30 × 4
      
      // 验证总分守恒
      const totalScoreChange = result.dunPlayerScore - (result.otherPlayersScore * 3);
      expect(totalScoreChange).toBe(0);
    });

    it('5人游戏，玩家2出7张墩（1墩）', () => {
      const dunCount = calculateDunCount(7); // 1墩
      const result = calculateDunScore(dunCount, 5, 2);
      
      expect(dunCount).toBe(1);
      expect(result.dunPlayerScore).toBe(120); // 4个其他玩家 × 30 × 1
      expect(result.otherPlayersScore).toBe(30); // 30 × 1
      
      // 验证总分守恒
      const totalScoreChange = result.dunPlayerScore - (result.otherPlayersScore * 4);
      expect(totalScoreChange).toBe(0);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理大量墩的情况（13张=64墩）', () => {
      const dunCount = calculateDunCount(13);
      expect(dunCount).toBe(64);
      
      const result = calculateDunScore(dunCount, 4, 0);
      expect(result.dunPlayerScore).toBe(5760); // 3 × 30 × 64
      expect(result.otherPlayersScore).toBe(1920); // 30 × 64
    });

    it('应该处理2人游戏的情况', () => {
      const result = calculateDunScore(1, 2, 0);
      expect(result.dunPlayerScore).toBe(30); // 1个其他玩家 × 30 × 1
      expect(result.otherPlayersScore).toBe(30); // 30 × 1
    });
  });
});


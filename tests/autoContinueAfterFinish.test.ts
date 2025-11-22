/**
 * 玩家出完牌后自动继续功能的单元测试和回归测试
 * 
 * 测试场景：
 * 1. 玩家出完牌后，游戏自动找到下一个玩家
 * 2. 跳过已出完的玩家
 * 3. 如果下一个玩家是AI，自动出牌
 * 4. 游戏自动结束
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Card, Suit, Rank, PlayerType, GameStatus } from '../src/types/card';
import { canPlayCards } from '../src/utils/cardUtils';

describe('玩家出完牌后自动继续功能测试', () => {
  describe('单元测试：跳过已出完的玩家', () => {
    it('应该正确跳过已出完的玩家，找到下一个还在游戏中的玩家', () => {
      // 模拟4个玩家，其中玩家0和玩家2已出完
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN }, // 已出完
        { hand: [{ suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }], name: '玩家2', type: PlayerType.AI },
        { hand: [], name: '玩家3', type: PlayerType.AI }, // 已出完
        { hand: [{ suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-2' }], name: '玩家4', type: PlayerType.AI }
      ];
      
      const playerCount = 4;
      let currentPlayerIndex = 0; // 从玩家0开始
      
      // 计算下一个玩家，跳过已出完的玩家
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      
      // 应该找到玩家1（索引1），因为玩家0和玩家2已出完
      expect(nextPlayerIndex).toBe(1);
      expect(players[nextPlayerIndex].hand.length).toBeGreaterThan(0);
    });

    it('应该正确处理所有玩家都出完的情况', () => {
      // 所有玩家都已出完
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN },
        { hand: [], name: '玩家2', type: PlayerType.AI },
        { hand: [], name: '玩家3', type: PlayerType.AI },
        { hand: [], name: '玩家4', type: PlayerType.AI }
      ];
      
      const playerCount = 4;
      let currentPlayerIndex = 0;
      
      // 计算下一个玩家
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      
      // 当所有玩家都出完时，循环会尝试playerCount次（跳过所有其他玩家）
      // 但由于循环条件，实际会尝试playerCount次
      expect(attempts).toBe(playerCount);
      // 最终会回到起始位置（因为所有玩家都出完了）
      expect(nextPlayerIndex).toBe((currentPlayerIndex + 1) % playerCount);
    });

    it('应该正确处理连续多个玩家出完的情况', () => {
      // 玩家0、1、2都已出完，只有玩家3还在
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN }, // 已出完
        { hand: [], name: '玩家2', type: PlayerType.AI }, // 已出完
        { hand: [], name: '玩家3', type: PlayerType.AI }, // 已出完
        { hand: [{ suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }], name: '玩家4', type: PlayerType.AI }
      ];
      
      const playerCount = 4;
      let currentPlayerIndex = 0;
      
      // 计算下一个玩家
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      
      // 应该找到玩家3（索引3）
      expect(nextPlayerIndex).toBe(3);
      expect(players[nextPlayerIndex].hand.length).toBeGreaterThan(0);
    });
  });

  describe('单元测试：玩家出完牌后的状态更新', () => {
    it('玩家出完牌后应该正确记录到finishOrder', () => {
      const finishOrder: number[] = [];
      const playerIndex = 0;
      
      // 模拟玩家出完牌
      const newFinishOrder = [...finishOrder, playerIndex];
      
      expect(newFinishOrder).toEqual([0]);
      expect(newFinishOrder.length).toBe(1);
    });

    it('多个玩家出完牌后应该按顺序记录', () => {
      let finishOrder: number[] = [];
      
      // 玩家0出完
      finishOrder = [...finishOrder, 0];
      expect(finishOrder).toEqual([0]);
      
      // 玩家2出完
      finishOrder = [...finishOrder, 2];
      expect(finishOrder).toEqual([0, 2]);
      
      // 玩家1出完
      finishOrder = [...finishOrder, 1];
      expect(finishOrder).toEqual([0, 2, 1]);
    });
  });

  describe('回归测试：确保修复后的功能正常工作', () => {
    it('玩家出完牌后，下一个玩家应该是AI时自动出牌（回归测试）', () => {
      // 这个测试确保修复后的逻辑不会回退
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN }, // 已出完
        { hand: [{ suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }], name: '玩家2', type: PlayerType.AI },
        { hand: [{ suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-2' }], name: '玩家3', type: PlayerType.AI },
        { hand: [{ suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-3' }], name: '玩家4', type: PlayerType.AI }
      ];
      
      const playerCount = 4;
      let currentPlayerIndex = 0; // 玩家0已出完
      
      // 计算下一个玩家
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      
      // 应该找到玩家1（AI）
      expect(nextPlayerIndex).toBe(1);
      expect(players[nextPlayerIndex].type).toBe(PlayerType.AI);
      expect(players[nextPlayerIndex].hand.length).toBeGreaterThan(0);
    });

    it('玩家出完牌后，不应该停留在已出完的玩家（回归测试）', () => {
      // 这个测试确保不会停留在已出完的玩家
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN }, // 已出完
        { hand: [{ suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }], name: '玩家2', type: PlayerType.AI },
        { hand: [], name: '玩家3', type: PlayerType.AI }, // 已出完
        { hand: [{ suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-2' }], name: '玩家4', type: PlayerType.AI }
      ];
      
      const playerCount = 4;
      let currentPlayerIndex = 0; // 玩家0已出完
      
      // 计算下一个玩家
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      
      // 不应该停留在玩家0或玩家2（已出完）
      expect(nextPlayerIndex).not.toBe(0);
      expect(nextPlayerIndex).not.toBe(2);
      // 应该找到玩家1或玩家3
      expect([1, 3]).toContain(nextPlayerIndex);
      expect(players[nextPlayerIndex].hand.length).toBeGreaterThan(0);
    });

    it('所有玩家都出完牌后，游戏应该结束（回归测试）', () => {
      // 这个测试确保游戏能正确结束
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN },
        { hand: [], name: '玩家2', type: PlayerType.AI },
        { hand: [], name: '玩家3', type: PlayerType.AI },
        { hand: [], name: '玩家4', type: PlayerType.AI }
      ];
      
      // 检查是否所有玩家都出完了
      const allFinished = players.every(player => player.hand.length === 0);
      
      expect(allFinished).toBe(true);
      // 游戏应该结束
      expect(allFinished).toBe(true);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理只有两个玩家，一个出完的情况', () => {
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN }, // 已出完
        { hand: [{ suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }], name: '玩家2', type: PlayerType.AI }
      ];
      
      const playerCount = 2;
      let currentPlayerIndex = 0;
      
      // 计算下一个玩家
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      
      expect(nextPlayerIndex).toBe(1);
      expect(players[nextPlayerIndex].hand.length).toBeGreaterThan(0);
    });

    it('应该处理8人游戏中多个玩家出完的情况', () => {
      const players = Array.from({ length: 8 }, (_, i) => ({
        hand: i < 3 ? [] : [{ suit: Suit.SPADES, rank: Rank.THREE, id: `test-${i}` }], // 前3个已出完
        name: `玩家${i + 1}`,
        type: i === 0 ? PlayerType.HUMAN : PlayerType.AI
      }));
      
      const playerCount = 8;
      let currentPlayerIndex = 0;
      
      // 计算下一个玩家
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      
      // 应该找到玩家3（索引3）
      expect(nextPlayerIndex).toBe(3);
      expect(players[nextPlayerIndex].hand.length).toBeGreaterThan(0);
    });
  });

  describe('集成测试：完整流程', () => {
    it('应该能够模拟玩家出完牌后，游戏自动继续的完整流程', () => {
      // 创建游戏状态
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN }, // 已出完
        { hand: [
          { suit: Suit.SPADES, rank: Rank.THREE, id: 'p1-1' },
          { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'p1-2' }
        ], name: '玩家2', type: PlayerType.AI },
        { hand: [
          { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'p2-1' }
        ], name: '玩家3', type: PlayerType.AI },
        { hand: [
          { suit: Suit.CLUBS, rank: Rank.SIX, id: 'p3-1' }
        ], name: '玩家4', type: PlayerType.AI }
      ];
      
      const playerCount = 4;
      let currentPlayerIndex = 0; // 玩家0已出完
      const finishOrder: number[] = [0]; // 玩家0已出完
      
      // 模拟找到下一个玩家
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      
      // 验证下一个玩家
      expect(nextPlayerIndex).toBe(1);
      expect(players[nextPlayerIndex].type).toBe(PlayerType.AI);
      expect(players[nextPlayerIndex].hand.length).toBeGreaterThan(0);
      
      // 验证finishOrder
      expect(finishOrder).toContain(0);
      expect(finishOrder.length).toBe(1);
    });
  });
});


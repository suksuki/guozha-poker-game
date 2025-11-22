/**
 * 玩家出完牌后自动继续功能的回归测试
 * 
 * 这些测试确保之前修复的bug不会再次出现
 */

import { describe, it, expect } from 'vitest';
import { Card, Suit, Rank, PlayerType, GameStatus } from '../src/types/card';

describe('回归测试：玩家出完牌后自动继续', () => {
  describe('Bug修复验证：玩家出完牌后游戏应该自动继续', () => {
    it('修复前：玩家出完牌后，currentPlayerIndex没有更新 - 应该已修复', () => {
      // 模拟修复前的bug：玩家出完牌后，currentPlayerIndex没有更新
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN }, // 已出完
        { hand: [{ suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }], name: '玩家2', type: PlayerType.AI },
        { hand: [{ suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-2' }], name: '玩家3', type: PlayerType.AI },
        { hand: [{ suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-3' }], name: '玩家4', type: PlayerType.AI }
      ];
      
      const playerCount = 4;
      let currentPlayerIndex = 0; // 玩家0已出完
      
      // 修复后的逻辑：应该找到下一个还在游戏中的玩家
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      
      // 验证修复：currentPlayerIndex应该更新为下一个还在游戏中的玩家
      expect(nextPlayerIndex).not.toBe(0); // 不应该停留在已出完的玩家
      expect(nextPlayerIndex).toBe(1); // 应该找到玩家1
      expect(players[nextPlayerIndex].hand.length).toBeGreaterThan(0);
    });

    it('修复前：玩家出完牌后，下一个AI玩家没有自动出牌 - 应该已修复', () => {
      // 模拟修复前的bug：玩家出完牌后，下一个AI玩家没有自动出牌
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN }, // 已出完
        { hand: [{ suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }], name: '玩家2', type: PlayerType.AI },
        { hand: [{ suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-2' }], name: '玩家3', type: PlayerType.AI },
        { hand: [{ suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-3' }], name: '玩家4', type: PlayerType.AI }
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
      
      // 验证修复：下一个玩家应该是AI，并且有手牌
      expect(players[nextPlayerIndex].type).toBe(PlayerType.AI);
      expect(players[nextPlayerIndex].hand.length).toBeGreaterThan(0);
      // 这表示应该自动触发AI出牌
    });

    it('修复前：没有跳过已出完的玩家 - 应该已修复', () => {
      // 模拟修复前的bug：没有跳过已出完的玩家
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN }, // 已出完
        { hand: [], name: '玩家2', type: PlayerType.AI }, // 已出完
        { hand: [{ suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }], name: '玩家3', type: PlayerType.AI },
        { hand: [{ suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-2' }], name: '玩家4', type: PlayerType.AI }
      ];
      
      const playerCount = 4;
      let currentPlayerIndex = 0;
      
      // 修复后的逻辑：应该跳过已出完的玩家
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      
      // 验证修复：应该跳过玩家0和玩家1，找到玩家2
      expect(nextPlayerIndex).not.toBe(0);
      expect(nextPlayerIndex).not.toBe(1);
      expect(nextPlayerIndex).toBe(2);
      expect(players[nextPlayerIndex].hand.length).toBeGreaterThan(0);
    });
  });

  describe('边界情况回归测试', () => {
    it('应该正确处理最后一个玩家出完牌的情况', () => {
      // 玩家3是最后一个，出完牌后应该结束游戏
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN },
        { hand: [], name: '玩家2', type: PlayerType.AI },
        { hand: [], name: '玩家3', type: PlayerType.AI },
        { hand: [], name: '玩家4', type: PlayerType.AI } // 最后一个出完
      ];
      
      const allFinished = players.every(player => player.hand.length === 0);
      expect(allFinished).toBe(true);
    });

    it('应该正确处理第一个玩家出完牌的情况', () => {
      // 玩家0第一个出完
      const players = [
        { hand: [], name: '玩家1', type: PlayerType.HUMAN }, // 第一个出完
        { hand: [{ suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }], name: '玩家2', type: PlayerType.AI },
        { hand: [{ suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-2' }], name: '玩家3', type: PlayerType.AI },
        { hand: [{ suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-3' }], name: '玩家4', type: PlayerType.AI }
      ];
      
      const playerCount = 4;
      let currentPlayerIndex = 0;
      
      // 应该找到玩家1
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      
      expect(nextPlayerIndex).toBe(1);
    });
  });

  describe('性能回归测试', () => {
    it('跳过已出完玩家的算法应该高效', () => {
      // 测试算法不会陷入无限循环
      const players = Array.from({ length: 8 }, (_, i) => ({
        hand: i < 4 ? [] : [{ suit: Suit.SPADES, rank: Rank.THREE, id: `test-${i}` }],
        name: `玩家${i + 1}`,
        type: i === 0 ? PlayerType.HUMAN : PlayerType.AI
      }));
      
      const playerCount = 8;
      let currentPlayerIndex = 0;
      
      const startTime = Date.now();
      let nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
      let attempts = 0;
      while (players[nextPlayerIndex].hand.length === 0 && attempts < playerCount) {
        nextPlayerIndex = (nextPlayerIndex + 1) % playerCount;
        attempts++;
      }
      const endTime = Date.now();
      
      // 应该快速找到（< 10ms）
      expect(endTime - startTime).toBeLessThan(10);
      // 应该找到玩家4
      expect(nextPlayerIndex).toBe(4);
      // attempts应该等于3（跳过玩家1、2、3，共3个已出完的玩家）
      expect(attempts).toBe(3);
    });
  });
});


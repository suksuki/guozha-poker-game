/**
 * 个人模式策略测试
 */

import { describe, it, expect } from 'vitest';
import { IndividualModeStrategy } from '../../src/utils/gameMode/IndividualModeStrategy';
import { Player, PlayerType, Suit, Rank } from '../../src/types/card';

function createPlayer(id: number, name: string, handCount: number): Player {
  const hand = Array.from({ length: handCount }, (_, i) => ({
    id: `card-${id}-${i}`,
    suit: Suit.SPADES,
    rank: Rank.THREE
  }));
  
  return {
    id,
    name,
    type: PlayerType.AI,
    hand,
    score: 0,
    dunCount: 0,
    isHuman: false
  };
}

describe('IndividualModeStrategy', () => {
  const strategy = new IndividualModeStrategy();

  describe('getModeName', () => {
    it('应该返回正确的模式名称', () => {
      expect(strategy.getModeName()).toBe('个人模式');
    });
  });

  describe('shouldGameEnd', () => {
    it('应该在只剩1个玩家有牌时返回true', () => {
      const players = [
        createPlayer(0, '玩家1', 0), // 已出完
        createPlayer(1, '玩家2', 0), // 已出完
        createPlayer(2, '玩家3', 0), // 已出完
        createPlayer(3, '玩家4', 5)  // 还有牌
      ];
      
      const result = strategy.shouldGameEnd(players, [0, 1, 2]);
      expect(result.shouldEnd).toBe(true);
      expect(result.reason).toContain('只剩 1 个玩家有牌');
    });

    it('应该在有2个以上玩家有牌时返回false', () => {
      const players = [
        createPlayer(0, '玩家1', 0),  // 已出完
        createPlayer(1, '玩家2', 5),  // 还有牌
        createPlayer(2, '玩家3', 3),  // 还有牌
        createPlayer(3, '玩家4', 8)   // 还有牌
      ];
      
      const result = strategy.shouldGameEnd(players, [0]);
      expect(result.shouldEnd).toBe(false);
    });

    it('应该在所有玩家都出完时返回true', () => {
      const players = [
        createPlayer(0, '玩家1', 0),
        createPlayer(1, '玩家2', 0),
        createPlayer(2, '玩家3', 0),
        createPlayer(3, '玩家4', 0)
      ];
      
      const result = strategy.shouldGameEnd(players, [0, 1, 2, 3]);
      expect(result.shouldEnd).toBe(true);
    });
  });

  describe('findNextPlayerForNewRound', () => {
    it('应该在接风玩家还有牌时返回接风玩家', () => {
      const players = [
        createPlayer(0, '玩家1', 5),
        createPlayer(1, '玩家2', 3),
        createPlayer(2, '玩家3', 8),
        createPlayer(3, '玩家4', 2)
      ];
      
      const nextPlayer = strategy.findNextPlayerForNewRound(1, players, 4);
      expect(nextPlayer).toBe(1);
    });

    it('应该在接风玩家出完后返回下一个有牌的玩家', () => {
      const players = [
        createPlayer(0, '玩家1', 0), // 已出完
        createPlayer(1, '玩家2', 0), // 已出完（接风玩家）
        createPlayer(2, '玩家3', 5), // 还有牌
        createPlayer(3, '玩家4', 3)  // 还有牌
      ];
      
      const nextPlayer = strategy.findNextPlayerForNewRound(1, players, 4);
      expect(nextPlayer).toBe(2);
    });

    it('应该在winnerIndex为null时返回第一个有牌的玩家', () => {
      const players = [
        createPlayer(0, '玩家1', 0),
        createPlayer(1, '玩家2', 5),
        createPlayer(2, '玩家3', 3),
        createPlayer(3, '玩家4', 8)
      ];
      
      const nextPlayer = strategy.findNextPlayerForNewRound(null, players, 4);
      expect(nextPlayer).toBe(1);
    });
  });

  describe('getResultScreenType', () => {
    it('应该返回individual', () => {
      expect(strategy.getResultScreenType()).toBe('individual');
    });
  });
});


/**
 * 团队模式策略测试
 */

import { describe, it, expect } from 'vitest';
import { TeamModeStrategy } from '../../src/utils/gameMode/TeamModeStrategy';
import { Player, PlayerType, Suit, Rank } from '../../src/types/card';
import { TeamConfig, Team } from '../../src/types/team';

function createPlayer(id: number, name: string, handCount: number, teamId: number): Player {
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
    isHuman: false,
    teamId
  };
}

function createTeamConfig(): TeamConfig {
  const team0: Team = {
    id: 0,
    name: '团队A',
    players: [0, 2], // 玩家0和2是队友
    teamScore: 0,
    roundScore: 0,
    roundsWon: 0,
    totalScoreEarned: 0
  };
  
  const team1: Team = {
    id: 1,
    name: '团队B',
    players: [1, 3], // 玩家1和3是队友
    teamScore: 0,
    roundScore: 0,
    roundsWon: 0,
    totalScoreEarned: 0
  };
  
  return {
    playerCount: 4,
    teams: [team0, team1],
    humanPlayerTeam: 0,
    humanPlayerDirection: 0
  };
}

describe('TeamModeStrategy', () => {
  const strategy = new TeamModeStrategy();

  describe('getModeName', () => {
    it('应该返回正确的模式名称', () => {
      expect(strategy.getModeName()).toBe('团队模式');
    });
  });

  describe('shouldGameEnd', () => {
    it('应该在某个团队全部出完时返回true（关单）', () => {
      const teamConfig = createTeamConfig();
      const players = [
        createPlayer(0, '玩家1', 0, 0), // 团队A，已出完
        createPlayer(1, '玩家2', 5, 1), // 团队B，还有牌
        createPlayer(2, '玩家3', 0, 0), // 团队A，已出完（队友）
        createPlayer(3, '玩家4', 3, 1)  // 团队B，还有牌（队友）
      ];
      
      const result = strategy.shouldGameEnd(players, [0, 2], teamConfig);
      expect(result.shouldEnd).toBe(true);
      expect(result.reason).toContain('关双');
    });

    it('应该在某个团队全部出完时返回true（关双）', () => {
      const teamConfig = createTeamConfig();
      const players = [
        createPlayer(0, '玩家1', 0, 0), // 团队A，已出完
        createPlayer(1, '玩家2', 0, 1), // 团队B，已出完
        createPlayer(2, '玩家3', 0, 0), // 团队A，已出完（队友）
        createPlayer(3, '玩家4', 3, 1)  // 团队B，还有牌（队友）
      ];
      
      const result = strategy.shouldGameEnd(players, [0, 1, 2], teamConfig);
      expect(result.shouldEnd).toBe(true);
      expect(result.reason).toContain('关单');
    });

    it('应该在两个团队都有人有牌时返回false', () => {
      const teamConfig = createTeamConfig();
      const players = [
        createPlayer(0, '玩家1', 0, 0), // 团队A，已出完
        createPlayer(1, '玩家2', 5, 1), // 团队B，还有牌
        createPlayer(2, '玩家3', 3, 0), // 团队A，还有牌（队友）
        createPlayer(3, '玩家4', 8, 1)  // 团队B，还有牌（队友）
      ];
      
      const result = strategy.shouldGameEnd(players, [0], teamConfig);
      expect(result.shouldEnd).toBe(false);
    });

    it('应该在teamConfig为null时返回false', () => {
      const players = [
        createPlayer(0, '玩家1', 0, 0),
        createPlayer(1, '玩家2', 5, 1),
        createPlayer(2, '玩家3', 3, 0),
        createPlayer(3, '玩家4', 8, 1)
      ];
      
      const result = strategy.shouldGameEnd(players, [0], null);
      expect(result.shouldEnd).toBe(false);
    });
  });

  describe('findNextPlayerForNewRound', () => {
    it('应该在接风玩家还有牌时返回接风玩家', () => {
      const teamConfig = createTeamConfig();
      const players = [
        createPlayer(0, '玩家1', 5, 0),
        createPlayer(1, '玩家2', 3, 1),
        createPlayer(2, '玩家3', 8, 0),
        createPlayer(3, '玩家4', 2, 1)
      ];
      
      const nextPlayer = strategy.findNextPlayerForNewRound(1, players, 4, teamConfig);
      expect(nextPlayer).toBe(1);
    });

    it('应该在接风玩家出完后优先找队友接风', () => {
      const teamConfig = createTeamConfig();
      const players = [
        createPlayer(0, '玩家1', 0, 0), // 团队A，已出完
        createPlayer(1, '玩家2', 0, 1), // 团队B，已出完（接风玩家）
        createPlayer(2, '玩家3', 5, 0), // 团队A，还有牌
        createPlayer(3, '玩家4', 3, 1)  // 团队B，还有牌（队友）
      ];
      
      const nextPlayer = strategy.findNextPlayerForNewRound(1, players, 4, teamConfig);
      expect(nextPlayer).toBe(3); // 应该返回队友（玩家3）
    });

    it('应该在队友都出完且整个团队都出完时返回null', () => {
      const teamConfig = createTeamConfig();
      const players = [
        createPlayer(0, '玩家1', 5, 0), // 团队A，还有牌
        createPlayer(1, '玩家2', 0, 1), // 团队B，已出完（接风玩家）
        createPlayer(2, '玩家3', 3, 0), // 团队A，还有牌
        createPlayer(3, '玩家4', 0, 1)  // 团队B，已出完（队友）
      ];
      
      const nextPlayer = strategy.findNextPlayerForNewRound(1, players, 4, teamConfig);
      // 团队B全部出完，游戏应该结束，返回null
      // （虽然团队A还有人，但整个团队出完的判断会让游戏结束）
      expect(nextPlayer).toBe(null);
    });

    it('应该在teamConfig为null时降级为个人模式逻辑', () => {
      const players = [
        createPlayer(0, '玩家1', 0, 0),
        createPlayer(1, '玩家2', 0, 1), // 已出完（接风玩家）
        createPlayer(2, '玩家3', 5, 0), // 还有牌
        createPlayer(3, '玩家4', 3, 1)
      ];
      
      const nextPlayer = strategy.findNextPlayerForNewRound(1, players, 4, null);
      expect(nextPlayer).toBe(2); // 顺时针下一个有牌的玩家
    });
  });

  describe('getResultScreenType', () => {
    it('应该返回team', () => {
      expect(strategy.getResultScreenType()).toBe('team');
    });
  });
});


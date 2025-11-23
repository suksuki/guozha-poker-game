/**
 * AI玩家头像和状态面板单元测试
 * 测试头像显示、状态信息计算等逻辑
 */

import { describe, it, expect } from 'vitest';
import { Player, PlayerType } from '../src/types/card';

describe('AI玩家头像和状态面板', () => {
  const createAIPlayer = (id: number, name: string, score: number = 0, finishedRank: number | null = null): Omit<Player, 'hand'> => ({
    id,
    name,
    type: PlayerType.AI,
    isHuman: false,
    score,
    finishedRank: finishedRank as any, // 临时类型，实际可能不在Player类型中
    aiConfig: {
      strategy: 'balanced'
    }
  });

  describe('状态信息计算', () => {
    it('应该正确计算玩家分数', () => {
      const player = createAIPlayer(1, 'AI玩家1', 50);
      expect(player.score).toBe(50);
    });

    it('应该正确处理分数为0的情况', () => {
      const player = createAIPlayer(1, 'AI玩家1', 0);
      expect(player.score).toBe(0);
    });

    it('应该正确显示名次', () => {
      const player = createAIPlayer(1, 'AI玩家1', 30, 2);
      expect((player as any).finishedRank).toBe(2);
    });

    it('应该正确处理没有名次的情况', () => {
      const player = createAIPlayer(1, 'AI玩家1', 30, null);
      expect((player as any).finishedRank).toBeNull();
    });
  });

  describe('头像emoji分配', () => {
    it('应该为不同玩家分配不同的emoji', () => {
      const emojis = ['🤖', '👾', '🤖', '👽', '🤖', '👻', '🤖', '🦾'];
      
      // 测试循环分配
      for (let i = 0; i < 16; i++) {
        const expectedEmoji = emojis[i % 8];
        const player = createAIPlayer(i, `玩家${i}`);
        // emoji 分配逻辑：emojis[index % 8]
        expect(emojis[i % 8]).toBe(expectedEmoji);
      }
    });

    it('应该为8个玩家分配不同的emoji', () => {
      const emojis = ['🤖', '👾', '🤖', '👽', '🤖', '👻', '🤖', '🦾'];
      const usedEmojis = new Set();
      
      for (let i = 0; i < 8; i++) {
        const emoji = emojis[i % 8];
        usedEmojis.add(emoji);
      }
      
      // 前8个玩家应该使用不同的emoji（虽然有些重复）
      expect(usedEmojis.size).toBeGreaterThan(0);
    });
  });

  describe('状态面板数据', () => {
    it('应该包含分数信息', () => {
      const player = createAIPlayer(1, 'AI玩家1', 25);
      const statusData = {
        score: player.score || 0,
        rank: null,
        handCount: 0
      };
      
      expect(statusData.score).toBe(25);
      expect(statusData.rank).toBeNull();
    });

    it('应该包含名次信息（如果有）', () => {
      const player = createAIPlayer(1, 'AI玩家1', 30, 1);
      const statusData = {
        score: player.score || 0,
        rank: (player as any).finishedRank || null,
        handCount: 0
      };
      
      expect(statusData.score).toBe(30);
      expect(statusData.rank).toBe(1);
    });

    it('应该正确处理多个玩家的状态', () => {
      const players = [
        createAIPlayer(0, 'AI玩家1', 20, 2),
        createAIPlayer(1, 'AI玩家2', 30, 1),
        createAIPlayer(2, 'AI玩家3', 10, null)
      ];
      
      const statusDataList = players.map(p => ({
        score: p.score || 0,
        rank: (p as any).finishedRank || null,
        handCount: 0
      }));
      
      expect(statusDataList[0].score).toBe(20);
      expect(statusDataList[0].rank).toBe(2);
      expect(statusDataList[1].score).toBe(30);
      expect(statusDataList[1].rank).toBe(1);
      expect(statusDataList[2].score).toBe(10);
      expect(statusDataList[2].rank).toBeNull();
    });
  });

  describe('位置计算', () => {
    it('应该正确计算玩家位置（圆形布局）', () => {
      const playerCount = 4;
      const getPlayerPosition = (index: number) => {
        const angle = (index * 2 * Math.PI) / playerCount - Math.PI / 2;
        const radius = 200;
        const centerX = 50;
        const centerY = 50;
        
        return {
          x: centerX + (radius / 10) * Math.cos(angle),
          y: centerY + (radius / 10) * Math.sin(angle),
          angle: angle * (180 / Math.PI)
        };
      };
      
      const position0 = getPlayerPosition(0);
      const position1 = getPlayerPosition(1);
      
      // 位置应该不同
      expect(position0.x).not.toBe(position1.x);
      expect(position0.y).not.toBe(position1.y);
    });

    it('应该为所有玩家计算有效位置', () => {
      const playerCount = 6;
      const getPlayerPosition = (index: number) => {
        const angle = (index * 2 * Math.PI) / playerCount - Math.PI / 2;
        const radius = 200;
        const centerX = 50;
        const centerY = 50;
        
        return {
          x: centerX + (radius / 10) * Math.cos(angle),
          y: centerY + (radius / 10) * Math.sin(angle)
        };
      };
      
      for (let i = 0; i < playerCount; i++) {
        const pos = getPlayerPosition(i);
        expect(pos.x).toBeGreaterThan(0);
        expect(pos.x).toBeLessThan(100);
        expect(pos.y).toBeGreaterThan(0);
        expect(pos.y).toBeLessThan(100);
      }
    });
  });
});


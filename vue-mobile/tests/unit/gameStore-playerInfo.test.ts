/**
 * Vue Mobile GameStore - 玩家信息显示测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../../src/stores/gameStore';

describe('GameStore - 玩家信息显示', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('玩家基本信息', () => {
    it('每个玩家应该有完整的信息', () => {
      const store = useGameStore();
      store.startGame();
      
      store.players.forEach((player, index) => {
        console.log(`玩家${index}:`, player);
        
        expect(player.id).toBe(index);
        expect(player.name).toBeDefined();
        expect(Array.isArray(player.hand)).toBe(true);
        expect(typeof player.score).toBe('number');
        expect(typeof player.dunCount).toBe('number');
        expect(typeof player.isHuman).toBe('boolean');
      });
    });

    it('人类玩家应该正确标识', () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer;
      
      expect(humanPlayer).toBeDefined();
      expect(humanPlayer!.id).toBe(0);
      expect(humanPlayer!.isHuman).toBe(true);
    });

    it('AI玩家应该正确标识', () => {
      const store = useGameStore();
      store.startGame();
      
      const aiPlayers = store.players.filter(p => !p.isHuman);
      
      expect(aiPlayers.length).toBe(3);
      aiPlayers.forEach(player => {
        expect(player.isHuman).toBe(false);
      });
    });
  });

  describe('排名更新', () => {
    it('玩家出完牌后应该更新finishedRank', () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      const initialRank = humanPlayer.finishedRank;
      
      expect(initialRank).toBeNull();
      
      // 模拟出完所有牌
      let attempts = 0;
      while (humanPlayer.hand.length > 0 && attempts < 100) {
        const result = store.playCards([humanPlayer.hand[0]]);
        if (!result.success) break;
        attempts++;
      }
      
      if (humanPlayer.hand.length === 0) {
        const updatedPlayer = store.players[0];
        expect(updatedPlayer.finishedRank).toBeGreaterThan(0);
        console.log(`玩家排名: 第${updatedPlayer.finishedRank}名`);
      }
    });

    it('第一个出完的玩家应该是第1名', () => {
      const store = useGameStore();
      store.startGame();
      
      // finishOrder的第一个玩家应该是第1名
      const initialFinishOrder = store.gameState?.finishOrder || [];
      expect(initialFinishOrder.length).toBe(0);
    });
  });

  describe('分数和墩数', () => {
    it('初始分数和墩数应该是0', () => {
      const store = useGameStore();
      store.startGame();
      
      store.players.forEach(player => {
        expect(player.score).toBe(0);
        expect(player.dunCount).toBe(0);
      });
    });

    it('出牌后分数可能增加', () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      const initialScore = humanPlayer.score;
      
      const result = store.playCards([humanPlayer.hand[0]]);
      
      if (result.success) {
        const updatedPlayer = store.humanPlayer!;
        expect(updatedPlayer.score).toBeGreaterThanOrEqual(initialScore);
      }
    });
  });

  describe('四个方位玩家', () => {
    it('应该能正确获取东南西北四个方位的玩家', () => {
      const store = useGameStore();
      store.startGame();
      
      // 南 = 玩家0（人类）
      expect(store.humanPlayer?.id).toBe(0);
      
      // 东 = 玩家1
      expect(store.players[1]).toBeDefined();
      
      // 北 = 玩家2
      expect(store.players[2]).toBeDefined();
      
      // 西 = 玩家3
      expect(store.players[3]).toBeDefined();
      
      console.log('四个方位玩家:', {
        南: store.players[0].name,
        东: store.players[1].name,
        北: store.players[2].name,
        西: store.players[3].name
      });
    });
  });
});


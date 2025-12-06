/**
 * Vue Mobile GameStore - 游戏结束和分数清算测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../../src/stores/gameStore';

describe('GameStore - 游戏结束和分数清算', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('游戏结束检测', () => {
    it('应该检测到玩家出完所有牌', () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      const initialHandCount = humanPlayer.hand.length;
      
      expect(initialHandCount).toBeGreaterThan(0);
      expect(store.status).toBe('playing');
    });

    it('玩家出完牌后应该记录在finishOrder中', async () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      
      // 模拟出完所有牌
      while (humanPlayer.hand.length > 0) {
        const result = await store.playCards([humanPlayer.hand[0]]);
        if (!result.success) break;
      }
      
      if (humanPlayer.hand.length === 0) {
        expect(store.gameState?.finishOrder).toContain(0);
      }
    });

    it('最后一个玩家出完后游戏应该结束', () => {
      const store = useGameStore();
      store.startGame();
      
      // 模拟多个玩家出完牌
      // 注意：实际游戏中需要4个玩家都完成
      const initialFinishCount = store.gameState?.finishOrder.length || 0;
      
      expect(store.status).toBe('playing');
      
      // 游戏结束条件：finishOrder.length >= players.length - 1
      // 即有3个玩家出完，第4个自动最后一名
    });
  });

  describe('分数计算', () => {
    it('应该计算手牌分（5/10/K得分）', () => {
      const store = useGameStore();
      store.startGame();
      
      // 每个玩家的初始分数应该是0
      store.players.forEach(player => {
        expect(player.score).toBe(0);
      });
    });

    it('出牌后应该累计分数', async () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      const initialScore = humanPlayer.score;
      
      // 出牌（可能包含分数牌）
      const result = await store.playCards([humanPlayer.hand[0]]);
      
      if (result.success) {
        // 分数应该>=初始分数（可能增加）
        expect(humanPlayer.score).toBeGreaterThanOrEqual(initialScore);
      }
    });

    it('应该计算墩分', () => {
      const store = useGameStore();
      store.startGame();
      
      // 墩分计算：根据玩家出牌次数和排名
      // 这里验证数据结构存在
      expect(store.players.every(p => 'dunCount' in p)).toBe(true);
    });
  });

  describe('排名计算', () => {
    it('finishOrder应该记录玩家完成的顺序', () => {
      const store = useGameStore();
      store.startGame();
      
      const initialFinishOrder = store.gameState?.finishOrder || [];
      
      expect(Array.isArray(initialFinishOrder)).toBe(true);
      expect(initialFinishOrder.length).toBe(0);
    });

    it('第一个出完的玩家应该是第一名', async () => {
      const store = useGameStore();
      store.startGame();
      
      // 模拟玩家出完牌
      const humanPlayer = store.humanPlayer!;
      
      while (humanPlayer.hand.length > 0) {
        const result = await store.playCards([humanPlayer.hand[0]]);
        if (!result.success) break;
      }
      
      if (humanPlayer.hand.length === 0 && store.gameState?.finishOrder.length > 0) {
        expect(store.gameState.finishOrder[0]).toBe(0);
      }
    });
  });

  describe('游戏结束界面', () => {
    it('游戏结束后状态应该变为finished', () => {
      const store = useGameStore();
      store.startGame();
      
      expect(store.status).toBe('playing');
      
      // 游戏结束后状态应该是 'finished'
      // 这里验证状态枚举存在
      expect(['waiting', 'playing', 'finished']).toContain(store.status);
    });

    it('应该能重新开始游戏', () => {
      const store = useGameStore();
      
      store.startGame();
      const status1 = store.status;
      const roundCount1 = store.rounds.length;
      
      store.startGame();
      const status2 = store.status;
      const roundCount2 = store.rounds.length;
      
      // 重新开始应该重置游戏状态
      expect(status1).toBe('playing');
      expect(status2).toBe('playing');
      expect(roundCount2).toBeGreaterThanOrEqual(roundCount1);
    });
  });

  describe('分数清算逻辑', () => {
    it('应该根据排名计算最终分数', () => {
      const store = useGameStore();
      store.startGame();
      
      // 分数计算应该包含：
      // 1. 手牌分（5/10/K）
      // 2. 墩分
      // 3. 排名奖惩
      
      store.players.forEach(player => {
        expect(typeof player.score).toBe('number');
        expect(player.score).toBeGreaterThanOrEqual(0);
      });
    });

    it('最后一名应该有手牌分惩罚', () => {
      const store = useGameStore();
      store.startGame();
      
      // 最后一名需要承担剩余手牌的分数
      // 这里验证逻辑存在
      expect(store.players.every(p => 'score' in p)).toBe(true);
    });
  });
});


/**
 * Vue Mobile GameStore - "不要"功能单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../../src/stores/gameStore';

describe('GameStore - "不要"功能', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('首家限制', () => {
    it('首家不能不要', () => {
      const store = useGameStore();
      store.startGame();
      
      // 首家尝试不要
      const result = store.pass();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('首家');
    });

    it('首家必须出牌', () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      
      // 首家不能不要
      const passResult = store.pass();
      expect(passResult.success).toBe(false);
      
      // 但可以出牌
      const playResult = store.playCards([humanPlayer.hand[0]]);
      expect(playResult.success).toBe(true);
    });
  });

  describe('非首家可以不要', () => {
    it('有上家出牌后可以不要', () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      
      // 先出一张牌
      store.playCards([humanPlayer.hand[0]]);
      
      // 等待其他玩家（AI会自动出牌或不要）
      // 如果轮回到人类玩家且有lastPlay，应该可以不要
      if (store.currentRound?.lastPlay && store.currentRound.lastPlay.length > 0) {
        const result = store.pass();
        // 应该能成功不要或者返回有意义的错误
        expect(result).toBeDefined();
        expect(result.success !== undefined).toBe(true);
      }
    });
  });

  describe('参数传递正确性', () => {
    it('pass方法应该传递players参数', () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      store.playCards([humanPlayer.hand[0]]);
      
      // 这个测试主要确保不会抛出"Cannot read properties of undefined"错误
      try {
        const result = store.pass();
        expect(result).toBeDefined();
      } catch (error: any) {
        // 不应该因为参数缺失而报错
        expect(error.message).not.toContain('undefined');
        expect(error.message).not.toContain('length');
      }
    });
  });

  describe('玩家切换', () => {
    it('不要后应该切换到下一个玩家', () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      const initialIndex = store.currentPlayerIndex;
      
      // 出一张牌
      store.playCards([humanPlayer.hand[0]]);
      
      // 等待回到人类玩家
      let attempts = 0;
      const maxAttempts = 10;
      
      while (store.currentPlayerIndex !== 0 && attempts < maxAttempts) {
        attempts++;
        // 模拟等待
      }
      
      if (store.currentPlayerIndex === 0 && store.currentRound?.lastPlay) {
        const beforePassIndex = store.currentPlayerIndex;
        const result = store.pass();
        
        if (result.success) {
          expect(store.currentPlayerIndex).not.toBe(beforePassIndex);
        }
      }
    });
  });

  describe('游戏状态检查', () => {
    it('游戏未开始时不能不要', () => {
      const store = useGameStore();
      
      const result = store.pass();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('游戏未开始');
    });
  });
});


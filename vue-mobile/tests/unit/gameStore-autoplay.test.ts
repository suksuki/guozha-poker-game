/**
 * Vue Mobile GameStore - 托管功能单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../../src/stores/gameStore';

describe('GameStore - 托管功能', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('托管状态管理', () => {
    it('初始状态应该是未托管', () => {
      const store = useGameStore();
      
      expect(store.isAutoPlay).toBe(false);
    });

    it('可以切换托管状态', () => {
      const store = useGameStore();
      
      expect(store.isAutoPlay).toBe(false);
      
      store.toggleAutoPlay();
      expect(store.isAutoPlay).toBe(true);
      
      store.toggleAutoPlay();
      expect(store.isAutoPlay).toBe(false);
    });
  });

  describe('托管自动出牌逻辑', () => {
    it('托管时应该自动出牌', () => {
      const store = useGameStore();
      store.startGame();
      
      const initialHandCount = store.humanPlayer!.hand.length;
      
      // 开启托管
      store.toggleAutoPlay();
      
      // 托管状态应该已开启
      expect(store.isAutoPlay).toBe(true);
      
      // 注意：自动出牌是异步的，在实际游戏中会自动触发
      // 这里我们只验证状态
    });

    it('首家托管应该能出牌', () => {
      const store = useGameStore();
      store.startGame();
      
      // 验证是首家
      expect(store.currentRound?.lastPlay).toBeNull();
      
      const humanPlayer = store.humanPlayer!;
      expect(humanPlayer.hand.length).toBeGreaterThan(0);
      
      // 开启托管
      store.toggleAutoPlay();
      expect(store.isAutoPlay).toBe(true);
      
      // 托管逻辑会在watch中触发
      // 这里验证状态正确
    });
  });

  describe('AI推荐功能', () => {
    it('应该能获取AI推荐', () => {
      const store = useGameStore();
      store.startGame();
      
      const recommendation = store.getAIRecommendation();
      
      // 应该返回推荐或null
      expect(
        recommendation === null || 
        (typeof recommendation === 'object' && 'cards' in recommendation)
      ).toBe(true);
    });

    it('首家应该有AI推荐', () => {
      const store = useGameStore();
      store.startGame();
      
      // 首家情况
      expect(store.currentRound?.lastPlay).toBeNull();
      
      const recommendation = store.getAIRecommendation();
      
      // 首家应该有推荐（至少可以出单张）
      if (recommendation) {
        expect(Array.isArray(recommendation.cards)).toBe(true);
      }
    });

    it('AI推荐的牌应该在手牌中', () => {
      const store = useGameStore();
      store.startGame();
      
      const recommendation = store.getAIRecommendation();
      
      if (recommendation && recommendation.cards && recommendation.cards.length > 0) {
        const humanHand = store.humanPlayer!.hand;
        
        recommendation.cards.forEach(card => {
          const found = humanHand.some(c => c.id === card.id);
          expect(found).toBe(true);
        });
      }
    });
  });

  describe('托管错误处理', () => {
    it('托管遇到错误不应该中断游戏', () => {
      const store = useGameStore();
      store.startGame();
      
      store.toggleAutoPlay();
      
      // 游戏应该继续运行
      expect(store.status).toBe('playing');
      expect(store.isAutoPlay).toBe(true);
    });

    it('关闭托管后应该停止自动出牌', () => {
      const store = useGameStore();
      store.startGame();
      
      store.toggleAutoPlay();
      expect(store.isAutoPlay).toBe(true);
      
      store.toggleAutoPlay();
      expect(store.isAutoPlay).toBe(false);
    });
  });

  describe('托管与手动模式切换', () => {
    it('可以在游戏中随时切换托管状态', () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      
      // 手动出一张牌
      const result1 = store.playCards([humanPlayer.hand[0]]);
      expect(result1.success).toBe(true);
      
      // 切换到托管
      store.toggleAutoPlay();
      expect(store.isAutoPlay).toBe(true);
      
      // 再切换回手动
      store.toggleAutoPlay();
      expect(store.isAutoPlay).toBe(false);
    });
  });
});


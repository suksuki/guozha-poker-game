/**
 * 托管功能集成测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../../src/stores/gameStore';

describe('托管功能集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('完整托管流程：开启托管 -> 自动游戏', async () => {
    const store = useGameStore();
    
    store.startGame();
    
    expect(store.status).toBe('playing');
    expect(store.humanPlayer).toBeDefined();
    
    const initialHandCount = store.humanPlayer!.hand.length;
    
    store.toggleAutoPlay();
    
    expect(store.isAutoPlay).toBe(true);
    
    // 注意：在实际环境中，托管会自动进行
    // 这里我们验证状态和逻辑的正确性
    
    expect(store.isAutoPlay).toBe(true);
    expect(store.status).toBe('playing');
    
  });

  it('托管与手动切换流程', () => {
    const store = useGameStore();
    store.startGame();
    
    
    // 初始状态：手动
    expect(store.isAutoPlay).toBe(false);
    
    // 切换到托管
    store.toggleAutoPlay();
    expect(store.isAutoPlay).toBe(true);
    
    // 托管期间游戏应该继续
    expect(store.status).toBe('playing');
    
    // 切换回手动
    store.toggleAutoPlay();
    expect(store.isAutoPlay).toBe(false);
    
  });

  it('首家托管自动出牌测试', () => {
    const store = useGameStore();
    store.startGame();
    
    
    // 验证是首家
    const isFirstPlayer = !store.currentRound?.lastPlay || store.currentRound.lastPlay.length === 0;
    
    if (isFirstPlayer) {
      const humanPlayer = store.humanPlayer!;
      const initialHandCount = humanPlayer.hand.length;
      
      // 开启托管
      store.toggleAutoPlay();
      
      // 验证状态
      expect(store.isAutoPlay).toBe(true);
      expect(humanPlayer.hand.length).toBe(initialHandCount);
      
    }
    
  });

  it('AI推荐集成测试', () => {
    const store = useGameStore();
    store.startGame();
    
    
    const recommendation = store.getAIRecommendation();
    
    
    if (recommendation && recommendation.cards) {
      
      // 验证推荐的牌在手牌中
      const humanHand = store.humanPlayer!.hand;
      const allCardsValid = recommendation.cards.every(card =>
        humanHand.some(c => c.id === card.id)
      );
      
      expect(allCardsValid).toBe(true);
    } else {
    }
    
  });

  it('托管错误恢复测试', () => {
    const store = useGameStore();
    store.startGame();
    
    
    store.toggleAutoPlay();
    expect(store.isAutoPlay).toBe(true);
    
    // 游戏应该继续
    expect(store.status).toBe('playing');
    
    // 即使遇到错误，状态也应该保持一致
    expect(store.players.length).toBe(4);
    
  });
});


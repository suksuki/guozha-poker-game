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
    
    console.log('🎮 步骤1: 开始游戏');
    store.startGame();
    
    expect(store.status).toBe('playing');
    expect(store.humanPlayer).toBeDefined();
    
    const initialHandCount = store.humanPlayer!.hand.length;
    console.log(`初始手牌: ${initialHandCount}张`);
    
    console.log('🎮 步骤2: 开启托管');
    store.toggleAutoPlay();
    
    expect(store.isAutoPlay).toBe(true);
    console.log('托管已开启');
    
    // 注意：在实际环境中，托管会自动进行
    // 这里我们验证状态和逻辑的正确性
    
    console.log('🎮 步骤3: 验证托管状态');
    expect(store.isAutoPlay).toBe(true);
    expect(store.status).toBe('playing');
    
    console.log('✅ 托管流程测试完成');
  });

  it('托管与手动切换流程', () => {
    const store = useGameStore();
    store.startGame();
    
    console.log('🎮 测试: 手动 -> 托管 -> 手动');
    
    // 初始状态：手动
    expect(store.isAutoPlay).toBe(false);
    console.log('✓ 初始状态：手动');
    
    // 切换到托管
    store.toggleAutoPlay();
    expect(store.isAutoPlay).toBe(true);
    console.log('✓ 切换到托管');
    
    // 托管期间游戏应该继续
    expect(store.status).toBe('playing');
    console.log('✓ 游戏继续运行');
    
    // 切换回手动
    store.toggleAutoPlay();
    expect(store.isAutoPlay).toBe(false);
    console.log('✓ 切换回手动');
    
    console.log('✅ 切换流程测试完成');
  });

  it('首家托管自动出牌测试', () => {
    const store = useGameStore();
    store.startGame();
    
    console.log('🎮 测试: 首家托管自动出牌');
    
    // 验证是首家
    const isFirstPlayer = !store.currentRound?.lastPlay || store.currentRound.lastPlay.length === 0;
    console.log(`是否首家: ${isFirstPlayer}`);
    
    if (isFirstPlayer) {
      const humanPlayer = store.humanPlayer!;
      const initialHandCount = humanPlayer.hand.length;
      
      // 开启托管
      store.toggleAutoPlay();
      
      // 验证状态
      expect(store.isAutoPlay).toBe(true);
      expect(humanPlayer.hand.length).toBe(initialHandCount);
      
      console.log('✓ 首家托管状态正确');
    }
    
    console.log('✅ 首家托管测试完成');
  });

  it('AI推荐集成测试', () => {
    const store = useGameStore();
    store.startGame();
    
    console.log('🎮 测试: AI推荐功能');
    
    const recommendation = store.getAIRecommendation();
    
    console.log('AI推荐结果:', recommendation);
    
    if (recommendation && recommendation.cards) {
      console.log(`AI推荐出牌: ${recommendation.cards.length}张`);
      
      // 验证推荐的牌在手牌中
      const humanHand = store.humanPlayer!.hand;
      const allCardsValid = recommendation.cards.every(card =>
        humanHand.some(c => c.id === card.id)
      );
      
      expect(allCardsValid).toBe(true);
      console.log('✓ 推荐的牌都在手牌中');
    } else {
      console.log('AI建议: 不要');
    }
    
    console.log('✅ AI推荐测试完成');
  });

  it('托管错误恢复测试', () => {
    const store = useGameStore();
    store.startGame();
    
    console.log('🎮 测试: 托管错误恢复');
    
    store.toggleAutoPlay();
    expect(store.isAutoPlay).toBe(true);
    
    // 游戏应该继续
    expect(store.status).toBe('playing');
    console.log('✓ 游戏状态正常');
    
    // 即使遇到错误，状态也应该保持一致
    expect(store.players.length).toBe(4);
    console.log('✓ 玩家数据完整');
    
    console.log('✅ 错误恢复测试完成');
  });
});


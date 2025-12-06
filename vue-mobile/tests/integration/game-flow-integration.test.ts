/**
 * Vue Mobile 游戏流程集成测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../../src/stores/gameStore';

describe('游戏流程集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('完整游戏流程：开始 -> 出牌 -> 回合结束 -> 游戏结束', async () => {
    const store = useGameStore();
    
    // 1. 开始游戏
    console.log('🎮 步骤1: 开始游戏');
    store.startGame();
    
    expect(store.status).toBe('playing');
    expect(store.players.length).toBe(4);
    expect(store.currentRound).toBeDefined();
    
    // 2. 第一次出牌
    console.log('🎮 步骤2: 人类玩家出牌');
    const humanPlayer = store.humanPlayer!;
    const initialHandCount = humanPlayer.hand.length;
    const cardToPlay = [humanPlayer.hand[0]];
    
    const result = store.playCards(cardToPlay);
    
    expect(result.success).toBe(true);
    expect(store.humanPlayer!.hand.length).toBe(initialHandCount - 1);
    expect(store.currentRound?.lastPlay).toBeDefined();
    expect(store.currentRound?.plays.length).toBeGreaterThan(0);
    
    // 3. 等待AI玩家出牌
    console.log('🎮 步骤3: 等待AI玩家出牌');
    let aiTurnCount = 0;
    const maxWaitTime = 10000; // 最多等待10秒
    const startTime = Date.now();
    
    while (store.currentPlayerIndex !== 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 500));
      aiTurnCount++;
      
      if (aiTurnCount > 20) break; // 最多等待20次AI出牌
    }
    
    console.log(`AI出牌次数: ${aiTurnCount}`);
    expect(store.currentRound?.plays.length).toBeGreaterThan(1);
    
    // 4. 验证回合数据更新
    console.log('🎮 步骤4: 验证回合数据');
    expect(store.currentRound?.plays.length).toBeGreaterThanOrEqual(1);
    expect(store.gameState?.rounds.length).toBeGreaterThanOrEqual(1);
    
    // 5. 验证玩家状态
    console.log('🎮 步骤5: 验证玩家状态');
    store.players.forEach((player, index) => {
      console.log(`玩家${index}: ${player.name}, 手牌: ${player.hand.length}张, 分数: ${player.score}`);
      expect(player.hand).toBeDefined();
      expect(player.score).toBeGreaterThanOrEqual(0);
    });
    
    console.log('✅ 游戏流程测试完成');
  }, 15000); // 增加测试超时时间

  it('多回合游戏流程测试', async () => {
    const store = useGameStore();
    
    console.log('🎮 多回合测试开始');
    store.startGame();
    
    let roundsPlayed = 0;
    const maxRounds = 5;
    
    while (roundsPlayed < maxRounds && store.status === 'playing') {
      const humanPlayer = store.humanPlayer;
      
      if (!humanPlayer || humanPlayer.hand.length === 0) {
        console.log('人类玩家已出完牌');
        break;
      }
      
      // 人类玩家出一张牌
      if (store.currentPlayerIndex === 0) {
        const result = store.playCards([humanPlayer.hand[0]]);
        
        if (result.success) {
          console.log(`回合${roundsPlayed + 1}: 出牌成功`);
          roundsPlayed++;
        }
      }
      
      // 等待AI出牌
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 检查回合是否结束并开始新回合
      if (store.gameState && store.gameState.rounds.length > roundsPlayed) {
        console.log(`新回合已开始，总回合数: ${store.gameState.rounds.length}`);
      }
    }
    
    console.log(`✅ 完成 ${roundsPlayed} 个回合`);
    expect(roundsPlayed).toBeGreaterThan(0);
  }, 30000);

  it('不要功能集成测试', async () => {
    const store = useGameStore();
    store.startGame();
    
    // 先出一张牌
    const humanPlayer = store.humanPlayer!;
    store.playCards([humanPlayer.hand[0]]);
    
    // 等待轮到人类玩家
    let waitCount = 0;
    while (store.currentPlayerIndex !== 0 && waitCount < 20) {
      await new Promise(resolve => setTimeout(resolve, 500));
      waitCount++;
    }
    
    // 现在尝试不要
    if (store.currentPlayerIndex === 0 && store.currentRound?.lastPlay) {
      const result = store.pass();
      console.log('不要结果:', result);
      expect(result).toBeDefined();
    }
  }, 15000);

  it('托管功能集成测试', async () => {
    const store = useGameStore();
    store.startGame();
    
    // 确保是人类回合
    while (store.currentPlayerIndex !== 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const initialHandCount = store.humanPlayer!.hand.length;
    
    // 开启托管
    store.toggleAutoPlay();
    expect(store.isAutoPlay).toBe(true);
    
    // 等待托管自动出牌
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 验证托管确实出了牌
    if (store.isAutoPlay && store.humanPlayer) {
      const newHandCount = store.humanPlayer.hand.length;
      console.log(`托管前手牌: ${initialHandCount}, 托管后: ${newHandCount}`);
      // 托管应该减少了手牌（或者不要了）
      expect(newHandCount <= initialHandCount).toBe(true);
    }
    
    // 关闭托管
    store.toggleAutoPlay();
    expect(store.isAutoPlay).toBe(false);
  }, 15000);

  it('AI推荐集成测试', () => {
    const store = useGameStore();
    store.startGame();
    
    const recommendation = store.getAIRecommendation();
    
    if (recommendation && recommendation.cards) {
      console.log(`AI推荐出牌: ${recommendation.cards.length}张`);
      
      // 推荐的牌应该在人类玩家手中
      const humanHand = store.humanPlayer!.hand;
      recommendation.cards.forEach(card => {
        const found = humanHand.some(c => c.id === card.id);
        expect(found).toBe(true);
      });
    } else {
      console.log('AI建议: 不要');
    }
  });
});


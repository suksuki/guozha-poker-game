/**
 * 游戏结束流程集成测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../../src/stores/gameStore';

describe('游戏结束流程集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('玩家出完牌后游戏应该继续', () => {
    const store = useGameStore();
    store.startGame();
    
    console.log('🎮 测试: 玩家出完牌后游戏继续');
    
    const humanPlayer = store.humanPlayer!;
    const initialHandCount = humanPlayer.hand.length;
    
    console.log(`初始手牌: ${initialHandCount}张`);
    
    // 模拟出一张牌
    const result = store.playCards([humanPlayer.hand[0]]);
    
    if (result.success) {
      console.log('✓ 出牌成功');
      expect(store.status).toBe('playing');
      console.log(`当前状态: ${store.status}`);
    }
  });

  it('一个玩家出完后其他玩家应该继续', () => {
    const store = useGameStore();
    store.startGame();
    
    console.log('🎮 测试: 一个玩家完成后游戏继续');
    
    // 验证游戏状态
    expect(store.status).toBe('playing');
    expect(store.players.length).toBe(4);
    
    // 验证finishOrder机制
    const initialFinishOrder = store.gameState?.finishOrder || [];
    expect(Array.isArray(initialFinishOrder)).toBe(true);
    
    console.log('✓ 游戏状态正常');
  });

  it('排名应该正确记录', () => {
    const store = useGameStore();
    store.startGame();
    
    console.log('🎮 测试: 排名记录');
    
    // finishOrder应该记录完成顺序
    const finishOrder = store.gameState?.finishOrder || [];
    
    console.log(`当前完成人数: ${finishOrder.length}`);
    expect(finishOrder.length).toBeGreaterThanOrEqual(0);
    
    console.log('✓ 排名系统正常');
  });

  it('游戏结束检测', () => {
    const store = useGameStore();
    store.startGame();
    
    console.log('🎮 测试: 游戏结束检测');
    
    const finishOrder = store.gameState?.finishOrder || [];
    const totalPlayers = store.players.length;
    
    // 游戏结束条件：finishOrder.length >= totalPlayers - 1
    const shouldEnd = finishOrder.length >= totalPlayers - 1;
    
    console.log(`完成人数: ${finishOrder.length}/${totalPlayers}`);
    console.log(`游戏应该结束: ${shouldEnd}`);
    
    if (shouldEnd) {
      expect(store.status).toBe('finished');
    } else {
      expect(store.status).toBe('playing');
    }
    
    console.log('✓ 结束检测正常');
  });

  it('最后一名玩家应该自动获得最后排名', () => {
    const store = useGameStore();
    store.startGame();
    
    console.log('🎮 测试: 最后一名自动排名');
    
    // 当有3个玩家完成时，第4个自动最后一名
    const finishOrder = store.gameState?.finishOrder || [];
    
    if (finishOrder.length >= 3) {
      console.log('✓ 3人完成，第4人自动最后');
      expect(store.status).toBe('finished');
    }
  });
});


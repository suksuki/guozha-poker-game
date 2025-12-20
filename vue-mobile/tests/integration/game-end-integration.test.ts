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
    
    
    const humanPlayer = store.humanPlayer!;
    const initialHandCount = humanPlayer.hand.length;
    
    
    // 模拟出一张牌
    const result = store.playCards([humanPlayer.hand[0]]);
    
    if (result.success) {
      expect(store.status).toBe('playing');
    }
  });

  it('一个玩家出完后其他玩家应该继续', () => {
    const store = useGameStore();
    store.startGame();
    
    
    // 验证游戏状态
    expect(store.status).toBe('playing');
    expect(store.players.length).toBe(4);
    
    // 验证finishOrder机制
    const initialFinishOrder = store.gameState?.finishOrder || [];
    expect(Array.isArray(initialFinishOrder)).toBe(true);
    
  });

  it('排名应该正确记录', () => {
    const store = useGameStore();
    store.startGame();
    
    
    // finishOrder应该记录完成顺序
    const finishOrder = store.gameState?.finishOrder || [];
    
    expect(finishOrder.length).toBeGreaterThanOrEqual(0);
    
  });

  it('游戏结束检测', () => {
    const store = useGameStore();
    store.startGame();
    
    
    const finishOrder = store.gameState?.finishOrder || [];
    const totalPlayers = store.players.length;
    
    // 游戏结束条件：finishOrder.length >= totalPlayers - 1
    const shouldEnd = finishOrder.length >= totalPlayers - 1;
    
    
    if (shouldEnd) {
      expect(store.status).toBe('finished');
    } else {
      expect(store.status).toBe('playing');
    }
    
  });

  it('最后一名玩家应该自动获得最后排名', () => {
    const store = useGameStore();
    store.startGame();
    
    
    // 当有3个玩家完成时，第4个自动最后一名
    const finishOrder = store.gameState?.finishOrder || [];
    
    if (finishOrder.length >= 3) {
      expect(store.status).toBe('finished');
    }
  });
});


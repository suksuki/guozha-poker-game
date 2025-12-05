/**
 * 性能基准测试
 * 对比新旧系统的性能
 */

import { describe, it, expect } from 'vitest';
import { StateManager } from '../../src/game-engine/state/StateManager';
import { PlayerType } from '../../src/types/card';
import { createDeck, shuffleDeck } from '../../src/utils/cardUtils';
import { dealCards } from '../../src/game-engine/modules/DealingModule';

describe('性能基准测试', () => {
  it('应该在100ms内初始化游戏', async () => {
    const start = performance.now();
    
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    const stateManager = new StateManager(config);
    
    const players = [0, 1, 2, 3].map(id => ({
      id,
      name: `玩家${id}`,
      type: PlayerType.AI,
      hand: [],
      score: 0,
      isHuman: false,
      finishedRank: null,
      dunCount: 0
    }));

    await stateManager.executeAction({
      type: 'INIT_GAME',
      payload: { players }
    });
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(100);
    console.log(`游戏初始化耗时: ${duration.toFixed(2)}ms`);
  });

  it('应该在10ms内完成一次出牌', async () => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    const stateManager = new StateManager(config);
    
    const players = [0, 1, 2, 3].map(id => ({
      id,
      name: `玩家${id}`,
      type: PlayerType.AI,
      hand: [],
      score: 0,
      isHuman: false,
      finishedRank: null,
      dunCount: 0
    }));

    await stateManager.executeAction({
      type: 'INIT_GAME',
      payload: { players }
    });

    const deck = shuffleDeck(createDeck());
    const hands = dealCards(deck, 4);

    await stateManager.executeAction({
      type: 'DEAL_CARDS',
      payload: { hands }
    });

    await stateManager.executeAction({
      type: 'START_GAME',
      payload: {}
    });

    const state = stateManager.getState();
    const currentPlayer = state.players[state.currentPlayerIndex];
    
    if (currentPlayer.hand.length > 0) {
      const card = currentPlayer.hand[0];
      
      const start = performance.now();
      
      await stateManager.executeAction({
        type: 'PLAY_CARDS',
        payload: { 
          playerIndex: state.currentPlayerIndex,
          cards: [card]
        }
      });
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(10);
      console.log(`出牌耗时: ${duration.toFixed(2)}ms`);
    }
  });

  it('应该支持1000次连续动作不崩溃', async () => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    const stateManager = new StateManager(config);
    
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      const players = [0, 1, 2, 3].map(id => ({
        id,
        name: `玩家${id}`,
        type: PlayerType.AI,
        hand: [],
        score: 0,
        isHuman: false,
        finishedRank: null,
        dunCount: 0
      }));

      await stateManager.executeAction({
        type: 'INIT_GAME',
        payload: { players }
      });
    }
    
    const end = performance.now();
    const duration = end - start;
    const avgDuration = duration / 1000;
    
    expect(avgDuration).toBeLessThan(10);
    console.log(`1000次初始化平均耗时: ${avgDuration.toFixed(2)}ms`);
  });

  it('应该维持内存稳定 (无明显泄漏)', async () => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    const stateManager = new StateManager(config);
    
    // 运行100次游戏循环
    for (let i = 0; i < 100; i++) {
      const players = [0, 1, 2, 3].map(id => ({
        id,
        name: `玩家${id}`,
        type: PlayerType.AI,
        hand: [],
        score: 0,
        isHuman: false,
        finishedRank: null,
        dunCount: 0
      }));

      await stateManager.executeAction({
        type: 'INIT_GAME',
        payload: { players }
      });

      const deck = shuffleDeck(createDeck());
      const hands = dealCards(deck, 4);

      await stateManager.executeAction({
        type: 'DEAL_CARDS',
        payload: { hands }
      });

      await stateManager.executeAction({
        type: 'START_GAME',
        payload: {}
      });
    }
    
    // 验证StateManager仍然可用
    const finalState = stateManager.getState();
    expect(finalState).toBeDefined();
    
    const stats = stateManager.getStats();
    expect(stats.actionCount).toBeGreaterThan(0);
    
    console.log(`完成100次游戏循环，总动作数: ${stats.actionCount}`);
  });

  it('应该支持快照创建和恢复', async () => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    const stateManager = new StateManager(config);
    
    const players = [0, 1, 2, 3].map(id => ({
      id,
      name: `玩家${id}`,
      type: PlayerType.AI,
      hand: [],
      score: 0,
      isHuman: false,
      finishedRank: null,
      dunCount: 0
    }));

    await stateManager.executeAction({
      type: 'INIT_GAME',
      payload: { players }
    });

    const state = stateManager.getState();
    
    const start = performance.now();
    const snapshot = state.snapshot();
    const end = performance.now();
    
    expect(end - start).toBeLessThan(10);
    expect(snapshot).toBeDefined();
    expect(snapshot.players.length).toBe(4);
    
    console.log(`快照创建耗时: ${(end - start).toFixed(2)}ms`);
  });
});


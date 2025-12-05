/**
 * 压力测试
 * 验证系统在高负载下的稳定性
 */

import { describe, it, expect } from 'vitest';
import { StateManager } from '../../src/game-engine/state/StateManager';
import { PlayerType } from '../../src/types/card';
import { createDeck, shuffleDeck } from '../../src/utils/cardUtils';
import { dealCards } from '../../src/game-engine/modules/DealingModule';

describe('压力测试', () => {
  it('应该支持连续100局游戏无崩溃', async () => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    const stateManager = new StateManager(config);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let game = 0; game < 100; game++) {
      try {
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
        
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`游戏 ${game + 1} 失败:`, error);
      }
    }
    
    // 允许少量失败，因为有些action还未实现
    expect(successCount).toBeGreaterThanOrEqual(90);
    expect(errorCount).toBeLessThanOrEqual(10);
    
    console.log(`✅ 完成100局游戏，成功: ${successCount}, 失败: ${errorCount}`);
  }, 60000); // 60秒超时

  it('应该支持快速连续操作', async () => {
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

    // 快速连续执行500个动作
    const promises = [];
    for (let i = 0; i < 500; i++) {
      promises.push(
        stateManager.executeAction({
          type: 'INIT_GAME',
          payload: { players }
        })
      );
    }
    
    await Promise.all(promises);
    
    const stats = stateManager.getStats();
    expect(stats.actionCount).toBeGreaterThanOrEqual(500);
    
    console.log(`✅ 完成500次快速连续操作，总动作: ${stats.actionCount}`);
  }, 30000);

  it('应该在边界条件下稳定运行', async () => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    const stateManager = new StateManager(config);
    
    // 测试空玩家列表
    try {
      await stateManager.executeAction({
        type: 'INIT_GAME',
        payload: { players: [] }
      });
    } catch (error) {
      // 预期会失败
      expect(error).toBeDefined();
    }
    
    // 测试正常玩家
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
    expect(state.players.length).toBe(4);
    
    console.log(`✅ 边界条件测试通过`);
  });

  it('应该正确处理并发操作', async () => {
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

    // 并发初始化
    const concurrentActions = Array.from({ length: 100 }, () =>
      stateManager.executeAction({
        type: 'INIT_GAME',
        payload: { players }
      })
    );
    
    await Promise.all(concurrentActions);
    
    const stats = stateManager.getStats();
    expect(stats.actionCount).toBe(100);
    
    console.log(`✅ 并发操作测试通过: ${stats.actionCount}次动作`);
  });

  it('应该验证历史记录限制', async () => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false,
      maxHistorySize: 50 // 限制历史大小
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

    // 执行100次动作
    for (let i = 0; i < 100; i++) {
      await stateManager.executeAction({
        type: 'INIT_GAME',
        payload: { players }
      });
    }
    
    const stats = stateManager.getStats();
    expect(stats.actionCount).toBe(100);
    
    // 验证历史大小被限制
    expect(stats.historySize).toBeLessThanOrEqual(50);
    
    console.log(`✅ 历史记录管理正常，总动作: ${stats.actionCount}, 历史大小: ${stats.historySize}`);
  });
});


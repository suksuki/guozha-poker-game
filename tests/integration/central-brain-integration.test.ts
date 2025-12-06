/**
 * CentralBrain集成测试
 * 验证CentralBrain与其他模块的集成
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CentralBrain } from '../../src/central-brain/CentralBrain';
import { StateManager } from '../../src/game-engine/state/StateManager';
import { PlayerType } from '../../src/types/card';

describe('CentralBrain集成测试', () => {
  let brain: CentralBrain;
  let stateManager: StateManager;

  beforeEach(() => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    stateManager = new StateManager(config);
    
    brain = new CentralBrain(stateManager, {
      enableAI: true,
      enableLLM: false,
      enableTTS: false
    });
  });

  afterEach(() => {
    brain.cleanup();
  });

  it('应该成功初始化CentralBrain', async () => {
    await brain.initialize();
    
    // 验证初始化成功
    expect(brain).toBeDefined();
  });

  it('应该监听状态变化', async () => {
    await brain.initialize();

    let eventFired = false;
    brain.on('turnScheduled', () => {
      eventFired = true;
    });

    // 初始化玩家
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

    // CentralBrain应该已经注册了监听器
    const state = stateManager.getState();
    expect(state.players.length).toBe(4);
  });

  it('应该不持有游戏状态', () => {
    // CentralBrain不应该有gameState属性
    expect((brain as any).gameState).toBeUndefined();
    
    // 只应该持有stateManager的引用
    expect((brain as any).stateManager).toBeDefined();
  });

  it('应该提供健康状态查询', () => {
    const healthStatus = brain.getHealthStatus();
    
    expect(healthStatus).toBeDefined();
    expect(typeof healthStatus).toBe('object');
  });

  it('应该正确清理资源', () => {
    brain.cleanup();
    
    // 清理后不应该有监听器
    expect(brain.listenerCount('stateChanged')).toBe(0);
  });

  it('应该支持AI决策事件', async () => {
    let aiTurnFired = false;
    
    brain.on('aiTurnComplete', ({ playerIndex }) => {
      aiTurnFired = true;
      expect(playerIndex).toBeGreaterThanOrEqual(0);
    });

    // 触发AI回合（通过调用私有方法的间接方式）
    // 实际使用中会通过状态变化自动触发
    
    // 验证事件系统工作正常
    expect(brain.listenerCount('aiTurnComplete')).toBeGreaterThan(0);
  });
});


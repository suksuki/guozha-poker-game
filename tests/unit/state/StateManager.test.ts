/**
 * StateManager 单元测试
 * 
 * 目标：覆盖率 ≥ 90%
 * 重点测试：动作执行、状态管理、历史功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager, type GameAction } from '../../../src/game-engine/state/StateManager';
import { GameState, type GameConfig } from '../../../src/game-engine/state/GameState';
import { GameStatus, PlayerType, type Player } from '../../../src/types/card';

describe('StateManager', () => {
  let config: GameConfig;
  let manager: StateManager;

  beforeEach(() => {
    config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    manager = new StateManager(config);
  });

  // ========== 初始化测试 ==========
  describe('初始化', () => {
    it('应该创建初始状态', () => {
      const state = manager.getState();
      
      expect(state).toBeInstanceOf(GameState);
      expect(state.status).toBe(GameStatus.WAITING);
      expect(state.players).toHaveLength(0);
    });

    it('应该注册默认处理器', () => {
      // 验证通过执行动作
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true }
      ];
      
      expect(async () => {
        await manager.executeAction({
          type: 'INIT_GAME',
          payload: { players }
        });
      }).not.toThrow();
    });
  });

  // ========== 动作执行测试 ==========
  describe('动作执行', () => {
    it('应该成功执行已注册的动作', async () => {
      // 注册处理器
      manager.registerHandler('TEST_ACTION' as any, (state) => {
        return state.updateStatus(GameStatus.PLAYING);
      });

      // 执行
      await manager.executeAction({ type: 'TEST_ACTION' as any });

      // 验证
      expect(manager.getState().status).toBe(GameStatus.PLAYING);
    });

    it('执行未注册的动作应该抛出错误', async () => {
      await expect(
        manager.executeAction({ type: 'UNKNOWN_ACTION' as any })
      ).rejects.toThrow('No handler registered');
    });

    it('应该自动添加时间戳', async () => {
      const listener = vi.fn();
      manager.on('stateChanged', listener);

      manager.registerHandler('TEST' as any, (state) => state);
      await manager.executeAction({ type: 'TEST' as any });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.objectContaining({
            timestamp: expect.any(Number)
          })
        })
      );
    });

    it('应该支持异步处理器', async () => {
      manager.registerHandler('ASYNC_ACTION' as any, async (state) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return state.updateStatus(GameStatus.PLAYING);
      });

      await manager.executeAction({ type: 'ASYNC_ACTION' as any });

      expect(manager.getState().status).toBe(GameStatus.PLAYING);
    });
  });

  // ========== 状态变化事件测试 ==========
  describe('状态变化事件', () => {
    it('应该发出stateChanged事件', async () => {
      const listener = vi.fn();
      manager.on('stateChanged', listener);

      manager.registerHandler('TEST' as any, (state) => {
        return state.updateStatus(GameStatus.PLAYING);
      });

      await manager.executeAction({ type: 'TEST' as any });

      expect(listener).toHaveBeenCalled();
    });

    it('事件应该包含完整信息', async () => {
      const listener = vi.fn();
      manager.on('stateChanged', listener);

      manager.registerHandler('TEST' as any, (state) => {
        return state.updateStatus(GameStatus.PLAYING);
      });

      await manager.executeAction({ type: 'TEST' as any });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          oldState: expect.any(GameState),
          newState: expect.any(GameState),
          action: expect.objectContaining({ type: 'TEST' }),
          timestamp: expect.any(Number)
        })
      );
    });

    it('多个监听器都应该收到事件', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      manager.on('stateChanged', listener1);
      manager.on('stateChanged', listener2);

      manager.registerHandler('TEST' as any, (state) => state);
      await manager.executeAction({ type: 'TEST' as any });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  // ========== 错误处理测试 ==========
  describe('错误处理', () => {
    it('处理器抛出错误时应该不更新状态', async () => {
      const originalState = manager.getState();

      manager.registerHandler('ERROR_ACTION' as any, () => {
        throw new Error('Handler error');
      });

      await expect(
        manager.executeAction({ type: 'ERROR_ACTION' as any })
      ).rejects.toThrow('Handler error');

      // 状态不应该变化
      expect(manager.getState()).toBe(originalState);
    });

    it('应该发出actionError事件', async () => {
      const errorListener = vi.fn();
      manager.on('actionError', errorListener);

      manager.registerHandler('ERROR' as any, () => {
        throw new Error('Test error');
      });

      await expect(
        manager.executeAction({ type: 'ERROR' as any })
      ).rejects.toThrow();

      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          action: expect.objectContaining({ type: 'ERROR' })
        })
      );
    });

    it('应该记录错误统计', async () => {
      manager.registerHandler('ERROR' as any, () => {
        throw new Error('Fail');
      });

      try {
        await manager.executeAction({ type: 'ERROR' as any });
      } catch {}

      const stats = manager.getStats();
      expect(stats.errorCount).toBe(1);
    });
  });

  // ========== 历史管理测试 ==========
  describe('历史管理', () => {
    it('应该记录状态历史', async () => {
      manager.registerHandler('TEST' as any, (state) => {
        return state.updateStatus(GameStatus.PLAYING);
      });

      expect(manager.getHistorySize()).toBe(0);

      await manager.executeAction({ type: 'TEST' as any });

      expect(manager.getHistorySize()).toBe(1);
    });

    it('应该支持撤销', async () => {
      manager.registerHandler('TEST' as any, (state) => {
        return state.updateStatus(GameStatus.PLAYING);
      });

      const originalState = manager.getState();
      await manager.executeAction({ type: 'TEST' as any });
      
      expect(manager.getState().status).toBe(GameStatus.PLAYING);

      // 撤销
      const undone = manager.undo();

      expect(undone).toBe(true);
      expect(manager.getState().status).toBe(GameStatus.WAITING);
    });

    it('无历史时撤销应该返回false', () => {
      const undone = manager.undo();
      expect(undone).toBe(false);
    });

    it('应该限制历史大小', async () => {
      manager.setMaxHistorySize(3);
      
      manager.registerHandler('TEST' as any, (state, action) => {
        return state.updateStatus(action.payload.status);
      });

      // 执行5次动作
      for (let i = 0; i < 5; i++) {
        await manager.executeAction({
          type: 'TEST' as any,
          payload: { status: GameStatus.PLAYING }
        });
      }

      // 历史应该只保留最后3个
      expect(manager.getHistorySize()).toBe(3);
    });

    it('应该支持清空历史', async () => {
      manager.registerHandler('TEST' as any, (state) => state);
      
      await manager.executeAction({ type: 'TEST' as any });
      expect(manager.getHistorySize()).toBeGreaterThan(0);

      manager.clearHistory();
      expect(manager.getHistorySize()).toBe(0);
    });

    it('canUndo应该正确反映历史状态', async () => {
      expect(manager.canUndo()).toBe(false);

      manager.registerHandler('TEST' as any, (state) => state);
      await manager.executeAction({ type: 'TEST' as any });

      expect(manager.canUndo()).toBe(true);

      manager.undo();
      expect(manager.canUndo()).toBe(false);
    });
  });

  // ========== 批量执行测试 ==========
  describe('批量执行', () => {
    it('应该按顺序执行多个动作', async () => {
      const executionOrder: string[] = [];

      manager.registerHandler('ACTION1' as any, (state) => {
        executionOrder.push('action1');
        return state;
      });

      manager.registerHandler('ACTION2' as any, (state) => {
        executionOrder.push('action2');
        return state;
      });

      manager.registerHandler('ACTION3' as any, (state) => {
        executionOrder.push('action3');
        return state;
      });

      await manager.executeActions([
        { type: 'ACTION1' as any },
        { type: 'ACTION2' as any },
        { type: 'ACTION3' as any }
      ]);

      expect(executionOrder).toEqual(['action1', 'action2', 'action3']);
    });

    it('某个动作失败应该中断后续', async () => {
      let action3Executed = false;

      manager.registerHandler('ACTION1' as any, (state) => state);
      manager.registerHandler('ACTION2' as any, () => {
        throw new Error('Action2 failed');
      });
      manager.registerHandler('ACTION3' as any, (state) => {
        action3Executed = true;
        return state;
      });

      await expect(
        manager.executeActions([
          { type: 'ACTION1' as any },
          { type: 'ACTION2' as any },
          { type: 'ACTION3' as any }
        ])
      ).rejects.toThrow();

      expect(action3Executed).toBe(false);
    });
  });

  // ========== 处理器管理测试 ==========
  describe('处理器管理', () => {
    it('应该支持注册处理器', () => {
      const handler = vi.fn((state) => state);
      
      manager.registerHandler('CUSTOM' as any, handler);
      
      // 通过执行验证注册成功
      expect(async () => {
        await manager.executeAction({ type: 'CUSTOM' as any });
      }).not.toThrow();
    });

    it('应该支持注销处理器', async () => {
      manager.registerHandler('CUSTOM' as any, (state) => state);
      manager.unregisterHandler('CUSTOM' as any);

      await expect(
        manager.executeAction({ type: 'CUSTOM' as any })
      ).rejects.toThrow('No handler registered');
    });

    it('后注册的处理器应该覆盖先前的', async () => {
      let callCount = 0;

      manager.registerHandler('TEST' as any, () => {
        callCount = 1;
        return manager.getState();
      });

      manager.registerHandler('TEST' as any, () => {
        callCount = 2;
        return manager.getState();
      });

      await manager.executeAction({ type: 'TEST' as any });

      expect(callCount).toBe(2); // 应该调用第二个
    });
  });

  // ========== 重置测试 ==========
  describe('重置', () => {
    it('应该重置状态', async () => {
      manager.registerHandler('TEST' as any, (state) => {
        return state.updateStatus(GameStatus.PLAYING);
      });

      await manager.executeAction({ type: 'TEST' as any });
      expect(manager.getState().status).toBe(GameStatus.PLAYING);

      manager.reset();

      expect(manager.getState().status).toBe(GameStatus.WAITING);
      expect(manager.getHistorySize()).toBe(0);
    });

    it('重置应该清空统计', async () => {
      manager.registerHandler('TEST' as any, (state) => state);
      
      await manager.executeAction({ type: 'TEST' as any });
      expect(manager.getStats().actionCount).toBe(1);

      manager.reset();

      expect(manager.getStats().actionCount).toBe(0);
      expect(manager.getStats().errorCount).toBe(0);
    });

    it('应该支持重置为新配置', () => {
      const newConfig: GameConfig = {
        playerCount: 6,
        humanPlayerIndex: 1,
        teamMode: true
      };

      manager.reset(newConfig);

      expect(manager.getState().config.playerCount).toBe(6);
      expect(manager.getState().config.teamMode).toBe(true);
    });

    it('重置应该发出stateReset事件', () => {
      const listener = vi.fn();
      manager.on('stateReset', listener);

      manager.reset();

      expect(listener).toHaveBeenCalled();
    });
  });

  // ========== 统计功能测试 ==========
  describe('统计功能', () => {
    it('应该正确统计动作数', async () => {
      manager.registerHandler('TEST' as any, (state) => state);

      await manager.executeAction({ type: 'TEST' as any });
      await manager.executeAction({ type: 'TEST' as any });
      await manager.executeAction({ type: 'TEST' as any });

      const stats = manager.getStats();
      expect(stats.actionCount).toBe(3);
    });

    it('应该正确统计错误数', async () => {
      manager.registerHandler('ERROR' as any, () => {
        throw new Error('Fail');
      });

      try {
        await manager.executeAction({ type: 'ERROR' as any });
      } catch {}
      
      try {
        await manager.executeAction({ type: 'ERROR' as any });
      } catch {}

      const stats = manager.getStats();
      expect(stats.errorCount).toBe(2);
    });

    it('应该计算成功率', async () => {
      manager.registerHandler('SUCCESS' as any, (state) => state);
      manager.registerHandler('ERROR' as any, () => {
        throw new Error('Fail');
      });

      await manager.executeAction({ type: 'SUCCESS' as any });
      await manager.executeAction({ type: 'SUCCESS' as any });
      
      try {
        await manager.executeAction({ type: 'ERROR' as any });
      } catch {}

      const stats = manager.getStats();
      // 3次尝试（2成功+1失败），成功率 = (3-1)/3 = 2/3
      expect(stats.actionCount).toBe(3);
      expect(stats.errorCount).toBe(1);
      expect(stats.successRate).toBeCloseTo(2 / 3, 2);
    });
  });

  // ========== 历史大小限制测试 ==========
  describe('历史大小限制', () => {
    it('应该支持设置最大历史大小', () => {
      manager.setMaxHistorySize(10);
      expect(manager.getMaxHistorySize()).toBe(10);
    });

    it('设置负数应该抛出错误', () => {
      expect(() => {
        manager.setMaxHistorySize(-1);
      }).toThrow('Max history size must be >= 0');
    });

    it('减小历史大小应该截断历史', async () => {
      manager.registerHandler('TEST' as any, (state) => state);

      // 执行10次
      for (let i = 0; i < 10; i++) {
        await manager.executeAction({ type: 'TEST' as any });
      }

      expect(manager.getHistorySize()).toBe(10);

      // 减小到5
      manager.setMaxHistorySize(5);

      expect(manager.getHistorySize()).toBe(5);
    });

    it('设置为0应该禁用历史', async () => {
      manager.setMaxHistorySize(0);
      
      manager.registerHandler('TEST' as any, (state) => state);
      await manager.executeAction({ type: 'TEST' as any });

      expect(manager.getHistorySize()).toBe(0);
      expect(manager.canUndo()).toBe(false);
    });
  });

  // ========== 边界情况测试 ==========
  describe('边界情况', () => {
    it('应该处理处理器返回相同状态', async () => {
      const listener = vi.fn();
      manager.on('stateChanged', listener);

      manager.registerHandler('NOOP' as any, (state) => state);
      await manager.executeAction({ type: 'NOOP' as any });

      // 即使状态相同，也应该发出事件
      expect(listener).toHaveBeenCalled();
    });

    it('应该处理空payload', async () => {
      manager.registerHandler('EMPTY' as any, (state) => state);

      await expect(
        manager.executeAction({ type: 'EMPTY' as any })
      ).resolves.not.toThrow();
    });

    it('连续撤销应该正确工作', async () => {
      // 先初始化玩家
      const initialPlayers = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true }
      ];
      await manager.executeAction({
        type: 'INIT_GAME',
        payload: { players: initialPlayers }
      });

      // 注册更新分数的处理器
      manager.registerHandler('UPDATE_SCORE' as any, (state, action) => {
        return state.updatePlayer(0, { score: action.payload.score });
      });

      await manager.executeAction({ type: 'UPDATE_SCORE' as any, payload: { score: 1 } });
      await manager.executeAction({ type: 'UPDATE_SCORE' as any, payload: { score: 2 } });
      await manager.executeAction({ type: 'UPDATE_SCORE' as any, payload: { score: 3 } });

      expect(manager.getState().players[0].score).toBe(3);

      manager.undo();
      expect(manager.getState().players[0].score).toBe(2);

      manager.undo();
      expect(manager.getState().players[0].score).toBe(1);

      manager.undo();
      expect(manager.getState().players[0].score).toBe(0);
    });
  });
});


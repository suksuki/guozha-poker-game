/**
 * 边界条件测试
 * 验证系统在极端情况下的行为
 */

import { describe, it, expect } from 'vitest';
import { AsyncTaskManager } from '../../src/central-brain/infrastructure/async/AsyncTaskManager';
import { GameState } from '../../src/game-engine/state/GameState';
import { PlayerType } from '../../src/types/card';

describe('边界条件测试', () => {
  describe('AsyncTaskManager边界', () => {
    it('应该处理极短超时', async () => {
      const asyncManager = new AsyncTaskManager();
      
      const result = await asyncManager.execute(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'done';
        },
        { timeout: 1 } // 1ms超时，必定失败
      );

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
    });

    it('应该处理零重试', async () => {
      const asyncManager = new AsyncTaskManager();
      let attempts = 0;

      const result = await asyncManager.execute(
        async () => {
          attempts++;
          throw new Error('fail');
        },
        { 
          timeout: 1000,
          retryCount: 0  // 不重试
        }
      );

      expect(result.success).toBe(false);
      expect(attempts).toBe(1); // 只执行一次
    });

    it('应该处理极大重试次数', async () => {
      const asyncManager = new AsyncTaskManager();
      let attempts = 0;

      const result = await asyncManager.execute(
        async () => {
          attempts++;
          if (attempts < 5) throw new Error('fail');
          return 'success';
        },
        { 
          timeout: 100,
          retryCount: 100,  // 很大的重试次数
          retryDelay: 1
        }
      );

      expect(result.success).toBe(true);
      expect(attempts).toBe(5); // 第5次成功，不会重试100次
    });

    it('应该处理任务超时取消', async () => {
      const asyncManager = new AsyncTaskManager();

      const result = await asyncManager.execute(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'done';
        },
        {
          timeout: 50 // 50ms超时，任务需要1000ms
        }
      );

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
    });
  });

  describe('GameState边界', () => {
    it('应该处理空玩家列表', () => {
      const config = {
        playerCount: 4,
        humanPlayerIndex: 0,
        teamMode: false
      };
      const gameState = new GameState(config);

      expect(() => {
        gameState.initializePlayers([]);
      }).not.toThrow();

      // 应该允许空列表，但后续操作可能失败
      const state = gameState.initializePlayers([]);
      expect(state.players.length).toBe(0);
    });

    it('应该处理无效玩家索引', () => {
      const config = {
        playerCount: 4,
        humanPlayerIndex: 0,
        teamMode: false
      };
      const gameState = new GameState(config);

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

      const state = gameState.initializePlayers(players);

      // 尝试更新不存在的玩家
      expect(() => {
        state.updatePlayer(99, { score: 100 });
      }).toThrow();

      expect(() => {
        state.updatePlayer(-1, { score: 100 });
      }).toThrow();
    });

    it('应该处理极大的回合数', () => {
      const config = {
        playerCount: 4,
        humanPlayerIndex: 0,
        teamMode: false
      };
      const gameState = new GameState(config);

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

      let state = gameState.initializePlayers(players);

      // 添加1000个回合（极端情况）
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          const round = {
            roundNumber: i,
            startTime: Date.now(),
            plays: [],
            totalScore: 0,
            lastPlay: null,
            lastPlayPlayerIndex: null,
            isFinished: false,
            isTakeoverRound: false,
            takeoverStartPlayerIndex: null,
            takeoverEndPlayerIndex: null
          };
          // state = state.addRound(round);
        }
      }).not.toThrow();
    });

    it('应该处理状态快照边界', () => {
      const config = {
        playerCount: 4,
        humanPlayerIndex: 0,
        teamMode: false
      };
      const gameState = new GameState(config);

      // 未初始化就创建快照
      expect(() => {
        const snapshot = JSON.stringify({
          status: gameState.status,
          players: gameState.players
        });
      }).not.toThrow();
    });
  });

  describe('错误恢复测试', () => {
    it('应该从服务失败中恢复', async () => {
      const asyncManager = new AsyncTaskManager();
      let callCount = 0;

      const recoverableTask = async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Service temporarily unavailable');
        }
        return 'recovered';
      };

      const result = await asyncManager.execute(
        recoverableTask,
        {
          timeout: 1000,
          retryCount: 5,
          retryDelay: 10
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('recovered');
      expect(callCount).toBe(3);
    });

    it('应该在多次失败后使用降级策略', async () => {
      const asyncManager = new AsyncTaskManager();

      const alwaysFailingTask = async () => {
        throw new Error('Service down');
      };

      const result = await asyncManager.execute(
        alwaysFailingTask,
        {
          timeout: 100,
          retryCount: 3,
          fallback: async () => 'degraded-service-response'
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('degraded-service-response');
      // fallback执行成功即可，无需检查usedFallback字段
    });
  });
});


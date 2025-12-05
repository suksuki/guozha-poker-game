/**
 * ScheduleManager 单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import { ScheduleManager } from '../../../src/central-brain/scheduler/ScheduleManager';
import { GameState, type GameConfig } from '../../../src/game-engine/state/GameState';
import { PlayerType, type Player } from '../../../src/types/card';

describe('ScheduleManager', () => {
  
  const createTestPlayer = (id: number): Player => ({
    id,
    name: `Player${id}`,
    type: PlayerType.AI,
    hand: [],
    score: 0,
    isHuman: false
  });
  
  // ========== 基础测试 ==========
  describe('基础功能', () => {
    it('应该创建ScheduleManager', () => {
      const manager = new ScheduleManager();
      
      expect(manager).toBeDefined();
      expect(manager.getStats()).toBeDefined();
    });
    
    it('应该调度下一个玩家', async () => {
      const manager = new ScheduleManager();
      const listener = vi.fn();
      
      manager.on('scheduleEvent', listener);
      
      // 创建游戏状态
      const config: GameConfig = { playerCount: 4, humanPlayerIndex: 0, teamMode: false };
      let state = new GameState(config);
      const players = [0, 1, 2, 3].map(createTestPlayer);
      state = state.initializePlayers(players);
      state = state.updateCurrentPlayer(0);
      
      // 调度
      manager.scheduleNextPlayer(state);
      
      // 等待执行
      await manager.waitUntilIdle();
      
      // 应该发出事件
      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'player_turn',
          playerIndex: 0
        })
      );
    });
  });
  
  // ========== 清理测试 ==========
  describe('清理功能', () => {
    it('应该清空所有任务', () => {
      const manager = new ScheduleManager();
      
      const config: GameConfig = { playerCount: 4, humanPlayerIndex: 0, teamMode: false };
      let state = new GameState(config);
      state = state.initializePlayers([0, 1, 2, 3].map(createTestPlayer));
      state = state.updateCurrentPlayer(0);
      
      manager.scheduleNextPlayer(state);
      manager.clearAll();
      
      const stats = manager.getStats();
      expect(stats.queueSize).toBe(0);
    });
  });
  
  // ========== 统计测试 ==========
  describe('统计功能', () => {
    it('应该提供统计信息', async () => {
      const manager = new ScheduleManager();
      
      const config: GameConfig = { playerCount: 4, humanPlayerIndex: 0, teamMode: false };
      let state = new GameState(config);
      state = state.initializePlayers([0, 1, 2, 3].map(createTestPlayer));
      state = state.updateCurrentPlayer(0);
      
      manager.scheduleNextPlayer(state);
      await manager.waitUntilIdle();
      
      const stats = manager.getStats();
      expect(stats.processedCount).toBeGreaterThan(0);
    });
  });
});


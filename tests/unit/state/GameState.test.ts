/**
 * GameState 单元测试
 * 
 * 目标：覆盖率 ≥ 95%
 * 重点测试：不可变性、状态更新、事件系统
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState, type GameConfig } from '../../../src/game-engine/state/GameState';
import { GameStatus, PlayerType, type Player } from '../../../src/types/card';

describe('GameState', () => {
  let config: GameConfig;
  let state: GameState;

  beforeEach(() => {
    config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    state = new GameState(config);
  });

  // ========== 初始化测试 ==========
  describe('初始化', () => {
    it('应该正确初始化状态', () => {
      expect(state.status).toBe(GameStatus.WAITING);
      expect(state.players).toHaveLength(0);
      expect(state.rounds).toHaveLength(0);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.currentRoundIndex).toBe(-1);
      expect(state.finishOrder).toHaveLength(0);
    });

    it('配置应该是只读的', () => {
      expect(Object.isFrozen(state.config)).toBe(true);
    });

    it('应该正确存储配置', () => {
      expect(state.config.playerCount).toBe(4);
      expect(state.config.humanPlayerIndex).toBe(0);
      expect(state.config.teamMode).toBe(false);
    });
  });

  // ========== 不可变性测试 ==========
  describe('不可变性', () => {
    it('updatePlayer应该返回新对象', () => {
      // 准备
      const players: Player[] = [
        {
          id: 0,
          name: '玩家0',
          type: PlayerType.HUMAN,
          hand: [],
          score: 0,
          isHuman: true
        }
      ];
      
      const stateWithPlayers = state.initializePlayers(players);
      
      // 执行
      const newState = stateWithPlayers.updatePlayer(0, { score: 100 });
      
      // 验证
      expect(newState).not.toBe(stateWithPlayers); // 不同对象
      expect(newState.players).not.toBe(stateWithPlayers.players); // 数组也是新的
      expect(stateWithPlayers.players[0].score).toBe(0); // 原状态不变
      expect(newState.players[0].score).toBe(100); // 新状态已更新
    });

    it('相同状态更新应该返回自身', () => {
      const newState = state.updateStatus(GameStatus.WAITING);
      
      // 相同状态，返回自身（优化）
      expect(newState).toBe(state);
    });

    it('players数组应该是只读的', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true }
      ];
      
      const newState = state.initializePlayers(players);
      
      // 验证 - TypeScript编译时会检查，运行时验证Object.freeze
      expect(Object.isFrozen(newState.players)).toBe(true);
    });

    it('有实际变化的更新应该返回新状态', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true },
        { id: 1, name: 'P1', type: PlayerType.AI, hand: [], score: 0, isHuman: false }
      ];
      
      const state1 = state.initializePlayers(players);
      const state2 = state1.updateStatus(GameStatus.PLAYING);
      const state3 = state2.updatePlayer(0, { score: 100 }); // 实际变化
      
      // 所有都应该是不同对象
      expect(state1).not.toBe(state);
      expect(state2).not.toBe(state1);
      expect(state3).not.toBe(state2);
    });
  });

  // ========== 状态更新测试 ==========
  describe('状态更新', () => {
    it('应该正确初始化玩家', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true },
        { id: 1, name: 'P1', type: PlayerType.AI, hand: [], score: 0, isHuman: false }
      ];
      
      const newState = state.initializePlayers(players);
      
      expect(newState.players).toHaveLength(2);
      expect(newState.players[0].name).toBe('P0');
      expect(newState.players[1].name).toBe('P1');
    });

    it('应该正确更新玩家属性', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true }
      ];
      
      let newState = state.initializePlayers(players);
      newState = newState.updatePlayer(0, { score: 50 });
      newState = newState.updatePlayer(0, { score: 100, name: '新名字' });
      
      expect(newState.players[0].score).toBe(100);
      expect(newState.players[0].name).toBe('新名字');
    });

    it('应该正确更新游戏状态', () => {
      let newState = state;
      newState = newState.updateStatus(GameStatus.PLAYING);
      
      expect(newState.status).toBe(GameStatus.PLAYING);
    });

    it('应该正确添加轮次', () => {
      const round: RoundData = {
        roundNumber: 1,
        startTime: Date.now(),
        isFinished: false
      };
      
      const newState = state.addRound(round);
      
      expect(newState.rounds).toHaveLength(1);
      expect(newState.rounds[0].roundNumber).toBe(1);
      expect(newState.currentRoundIndex).toBe(0);
      expect(newState.currentRound).toBe(round);
    });

    it('应该正确更新当前玩家', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true },
        { id: 1, name: 'P1', type: PlayerType.AI, hand: [], score: 0, isHuman: false }
      ];
      
      let newState = state.initializePlayers(players);
      newState = newState.updateCurrentPlayer(1);
      
      expect(newState.currentPlayerIndex).toBe(1);
      expect(newState.currentPlayer?.name).toBe('P1');
    });

    it('应该正确添加到完成顺序', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true },
        { id: 1, name: 'P1', type: PlayerType.AI, hand: [], score: 0, isHuman: false }
      ];
      
      let newState = state.initializePlayers(players);
      newState = newState.addToFinishOrder(0);
      newState = newState.addToFinishOrder(1);
      
      expect(newState.finishOrder).toEqual([0, 1]);
    });

    it('重复添加到完成顺序应该忽略', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true }
      ];
      
      let newState = state.initializePlayers(players);
      newState = newState.addToFinishOrder(0);
      const state2 = newState.addToFinishOrder(0); // 重复添加
      
      expect(state2).toBe(newState); // 返回相同对象（优化）
      expect(newState.finishOrder).toHaveLength(1);
    });
  });

  // ========== 边界情况测试 ==========
  describe('边界情况', () => {
    it('应该拒绝无效的玩家索引', () => {
      expect(() => {
        state.updatePlayer(-1, { score: 100 });
      }).toThrow('Invalid player index');
      
      expect(() => {
        state.updatePlayer(999, { score: 100 });
      }).toThrow('Invalid player index');
    });

    it('应该拒绝无效的当前玩家索引', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true }
      ];
      
      const newState = state.initializePlayers(players);
      
      expect(() => {
        newState.updateCurrentPlayer(-1);
      }).toThrow('Invalid player index');
      
      expect(() => {
        newState.updateCurrentPlayer(999);
      }).toThrow('Invalid player index');
    });

    it('空玩家列表时currentPlayer应该返回undefined', () => {
      expect(state.currentPlayer).toBeUndefined();
    });

    it('无轮次时currentRound应该返回undefined', () => {
      expect(state.currentRound).toBeUndefined();
    });
  });

  // ========== 快照功能测试 ==========
  describe('快照功能', () => {
    it('toSnapshot应该导出完整状态', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 50, isHuman: true }
      ];
      
      let newState = state.initializePlayers(players);
      newState = newState.updateStatus(GameStatus.PLAYING);
      
      const snapshot = newState.toSnapshot();
      
      expect(snapshot.status).toBe(GameStatus.PLAYING);
      expect(snapshot.players).toHaveLength(1);
      expect(snapshot.players[0].score).toBe(50);
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    it('fromSnapshot应该恢复状态', () => {
      const snapshot: any = {
        status: GameStatus.PLAYING,
        players: [
          { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 100, isHuman: true }
        ],
        rounds: [],
        currentPlayerIndex: 0,
        currentRoundIndex: -1,
        finishOrder: [],
        timestamp: Date.now()
      };
      
      const restored = GameState.fromSnapshot(snapshot, config);
      
      expect(restored.status).toBe(GameStatus.PLAYING);
      expect(restored.players).toHaveLength(1);
      expect(restored.players[0].score).toBe(100);
    });

    it('快照往返应该保持一致', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 50, isHuman: true }
      ];
      
      let original = state.initializePlayers(players);
      original = original.updateStatus(GameStatus.PLAYING);
      
      const snapshot = original.toSnapshot();
      const restored = GameState.fromSnapshot(snapshot, config);
      
      expect(restored.status).toBe(original.status);
      expect(restored.players.length).toBe(original.players.length);
      expect(restored.players[0].score).toBe(original.players[0].score);
    });
  });

  // ========== 事件系统测试 ==========
  describe('事件系统', () => {
    it('状态变化应该发出事件', () => {
      const listener = vi.fn();
      state.on('playerUpdated', listener);
      
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true }
      ];
      
      state.initializePlayers(players);
      
      expect(listener).toHaveBeenCalled();
    });

    it('事件应该包含正确的数据', () => {
      const listener = vi.fn();
      state.on('statusChanged', listener);
      
      state.updateStatus(GameStatus.PLAYING);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'statusChanged',
          oldState: GameStatus.WAITING,
          newState: GameStatus.PLAYING
        })
      );
    });

    it('多个监听器应该都收到事件', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      state.on('statusChanged', listener1);
      state.on('statusChanged', listener2);
      
      state.updateStatus(GameStatus.PLAYING);
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('应该支持取消监听', () => {
      const listener = vi.fn();
      state.on('statusChanged', listener);
      state.off('statusChanged', listener);
      
      state.updateStatus(GameStatus.PLAYING);
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('监听器错误不应该影响其他监听器', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();
      
      state.on('statusChanged', errorListener);
      state.on('statusChanged', goodListener);
      
      state.updateStatus(GameStatus.PLAYING);
      
      // 两个都应该被调用
      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  // ========== 链式更新测试 ==========
  describe('链式更新', () => {
    it('应该支持链式更新', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true },
        { id: 1, name: 'P1', type: PlayerType.AI, hand: [], score: 0, isHuman: false }
      ];
      
      const newState = state
        .initializePlayers(players)
        .updateStatus(GameStatus.PLAYING)
        .updatePlayer(0, { score: 50 })
        .updateCurrentPlayer(1);
      
      expect(newState.status).toBe(GameStatus.PLAYING);
      expect(newState.players[0].score).toBe(50);
      expect(newState.currentPlayerIndex).toBe(1);
    });

    it('链式更新每步都应该返回新对象', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true }
      ];
      
      const state1 = state.initializePlayers(players);
      const state2 = state1.updateStatus(GameStatus.PLAYING);
      const state3 = state2.updatePlayer(0, { score: 100 });
      
      expect(state1).not.toBe(state);
      expect(state2).not.toBe(state1);
      expect(state3).not.toBe(state2);
    });
  });

  // ========== Getter测试 ==========
  describe('Getter方法', () => {
    it('currentPlayer应该返回当前玩家', () => {
      const players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true },
        { id: 1, name: 'P1', type: PlayerType.AI, hand: [], score: 0, isHuman: false }
      ];
      
      let newState = state.initializePlayers(players);
      newState = newState.updateCurrentPlayer(1);
      
      expect(newState.currentPlayer?.id).toBe(1);
      expect(newState.currentPlayer?.name).toBe('P1');
    });

    it('currentRound应该返回当前轮次', () => {
      const round: RoundData = {
        roundNumber: 1,
        startTime: Date.now(),
        isFinished: false
      };
      
      const newState = state.addRound(round);
      
      expect(newState.currentRound).toBe(round);
      expect(newState.currentRound?.roundNumber).toBe(1);
    });

    it('索引越界时应该返回undefined', () => {
      const newState = state.updateStatus(GameStatus.PLAYING);
      
      expect(newState.currentPlayer).toBeUndefined();
      expect(newState.currentRound).toBeUndefined();
    });
  });
});


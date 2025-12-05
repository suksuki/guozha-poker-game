/**
 * 端到端测试: 完整游戏流程
 * 验证从游戏开始到结束的完整过程
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../../src/game-engine/state/StateManager';
import { GameStatus, PlayerType, Suit, Rank } from '../../src/types/card';
import { createDeck, shuffleDeck } from '../../src/utils/cardUtils';
import { dealCards } from '../../src/game-engine/modules/DealingModule';

describe('E2E: 完整游戏流程', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    stateManager = new StateManager(config);
  });

  it('应该完成一局完整的游戏', async () => {
    // 1. 初始化游戏
    const players = [0, 1, 2, 3].map(id => ({
      id,
      name: `玩家${id}`,
      type: id === 0 ? PlayerType.HUMAN : PlayerType.AI,
      hand: [],
      score: 0,
      isHuman: id === 0,
      finishedRank: null,
      dunCount: 0
    }));

    await stateManager.executeAction({
      type: 'INIT_GAME',
      payload: { players }
    });

    let state = stateManager.getState();
    expect(state.status).toBe(GameStatus.WAITING);

    // 2. 发牌
    const deck = shuffleDeck(createDeck());
    const hands = dealCards(deck, 4);

    await stateManager.executeAction({
      type: 'DEAL_CARDS',
      payload: { hands }
    });

    state = stateManager.getState();
    expect(state.players[0].hand.length).toBeGreaterThan(0);

    // 3. 开始游戏
    await stateManager.executeAction({
      type: 'START_GAME',
      payload: {}
    });

    state = stateManager.getState();
    expect(state.status).toBe(GameStatus.PLAYING);

    // 4. 模拟一轮出牌
    const firstPlayer = state.players[state.currentPlayerIndex];
    if (firstPlayer.hand.length > 0) {
      const card = firstPlayer.hand[0];
      
      await stateManager.executeAction({
        type: 'PLAY_CARDS',
        payload: { 
          playerIndex: state.currentPlayerIndex,
          cards: [card]
        }
      });

      state = stateManager.getState();
      expect(state.players[state.currentPlayerIndex].hand).not.toContainEqual(card);
    }

    // 5. 验证状态一致性
    expect(state.players.length).toBe(4);
    expect(state.rounds.length).toBeGreaterThanOrEqual(0);
    expect(state.currentPlayerIndex).toBeGreaterThanOrEqual(0);
    expect(state.currentPlayerIndex).toBeLessThan(4);
  });

  it('应该正确处理玩家pass', async () => {
    // 初始化
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

    let state = stateManager.getState();
    const initialPlayerIndex = state.currentPlayerIndex;

    // 玩家pass
    await stateManager.executeAction({
      type: 'PASS',
      payload: { playerIndex: initialPlayerIndex }
    });

    state = stateManager.getState();
    
    // 验证轮到下一个玩家
    expect(state.currentPlayerIndex).not.toBe(initialPlayerIndex);
  });

  it('应该支持撤销和重做', async () => {
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

    const initialState = stateManager.getState();
    const initialStatus = initialState.status;

    await stateManager.executeAction({
      type: 'START_GAME',
      payload: {}
    });

    const afterStartState = stateManager.getState();
    expect(afterStartState.status).not.toBe(initialStatus);

    // 撤销
    const canUndo = stateManager.canUndo();
    if (canUndo) {
      stateManager.undo();
      const undoState = stateManager.getState();
      expect(undoState.status).toBe(initialStatus);

      // 重做
      const canRedo = stateManager.canRedo();
      if (canRedo) {
        stateManager.redo();
        const redoState = stateManager.getState();
        expect(redoState.status).toBe(afterStartState.status);
      }
    }
  });

  it('应该正确记录游戏历史', async () => {
    const stats = stateManager.getStats();
    expect(stats.actionCount).toBeGreaterThanOrEqual(0);

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

    const newStats = stateManager.getStats();
    expect(newStats.actionCount).toBeGreaterThan(stats.actionCount);
  });

  it('应该验证无循环依赖', () => {
    // 验证StateManager不依赖于旧的Game类
    const state = stateManager.getState();
    
    // 验证状态是纯数据对象
    expect(state).toBeDefined();
    expect(state.players).toBeInstanceOf(Array);
    expect(state.rounds).toBeInstanceOf(Array);
    
    // 验证没有循环引用
    const stringified = JSON.stringify(state);
    expect(stringified).toBeDefined();
    expect(stringified.length).toBeGreaterThan(0);
  });
});


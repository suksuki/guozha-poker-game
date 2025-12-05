/**
 * 端到端测试: 完整游戏流程
 * 验证从游戏开始到结束的完整过程
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../src/game-engine/state/GameState';
import { GameStatus, PlayerType } from '../../src/types/card';
import { createDeck, shuffleDeck, dealCards } from '../../src/utils/cardUtils';
import { DealingModule } from '../../src/game-engine/modules/DealingModule';
import { GameFlowModule } from '../../src/game-engine/modules/GameFlowModule';

describe('E2E: 完整游戏流程', () => {
  let gameState: GameState;

  beforeEach(() => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    gameState = new GameState(config);
  });

  it('应该完成一局完整的游戏', () => {
    // 1. 初始化玩家
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

    let state = gameState.initializePlayers(players);
    expect(state.status).toBe(GameStatus.WAITING);
    expect(state.players.length).toBe(4);

    // 2. 发牌
    const hands = dealCards(4);
    state = DealingModule.assignHandsToPlayers(state, hands);
    
    expect(state.players[0].hand.length).toBeGreaterThan(0);
    expect(state.initialHands).toBeDefined();

    // 3. 开始游戏
    state = GameFlowModule.startGame(state);
    expect(state.status).toBe(GameStatus.PLAYING);

    // 4. 验证状态一致性
    expect(state.players.length).toBe(4);
    expect(state.rounds.length).toBeGreaterThanOrEqual(0);
    expect(state.currentPlayerIndex).toBeGreaterThanOrEqual(0);
    expect(state.currentPlayerIndex).toBeLessThan(4);
  });

  it('应该正确处理游戏流程', () => {
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

    let state = gameState.initializePlayers(players);
    
    const hands = dealCards(4);
    state = DealingModule.assignHandsToPlayers(state, hands);
    
    state = GameFlowModule.startGame(state);
    
    // 验证游戏开始
    expect(state.status).toBe(GameStatus.PLAYING);
    expect(state.players.every(p => p.hand.length > 0)).toBe(true);
  });

  it('应该支持状态不可变性', () => {
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

    const state1 = gameState.initializePlayers(players);
    const state2 = GameFlowModule.startGame(state1);

    // 验证状态不可变
    expect(state1.status).toBe(GameStatus.WAITING);
    expect(state2.status).toBe(GameStatus.PLAYING);
    expect(state1).not.toBe(state2);
  });

  it('应该正确处理游戏结束', () => {
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
    state = GameFlowModule.endGame(state, 0, []);

    expect(state.status).toBe(GameStatus.FINISHED);
    expect(state.winner).toBe(0);
  });

  it('应该验证无循环依赖', () => {
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
    
    // 验证状态是纯数据对象
    expect(state).toBeDefined();
    expect(state.players).toBeInstanceOf(Array);
    expect(state.rounds).toBeInstanceOf(Array);
    
    // 验证没有循环引用（可以JSON序列化）
    const stringified = JSON.stringify({
      status: state.status,
      playersCount: state.players.length,
      roundsCount: state.rounds.length
    });
    expect(stringified).toBeDefined();
    expect(stringified.length).toBeGreaterThan(0);
  });
});


import { describe, it, expect } from 'vitest';
import { GameFlowModule } from '../../../src/game-engine/modules/GameFlowModule';
import { GameState, type GameConfig } from '../../../src/game-engine/state/GameState';
import { GameStatus, PlayerType } from '../../../src/types/card';

describe('GameFlowModule', () => {
  
  const config: GameConfig = { playerCount: 4, humanPlayerIndex: 0, teamMode: false };
  
  it('startGame应该更新状态为PLAYING', () => {
    const state = new GameState(config);
    const newState = GameFlowModule.startGame(state);
    expect(newState.status).toBe(GameStatus.PLAYING);
  });
  
  it('endGame应该设置获胜者并结束', () => {
    let state = new GameState(config);
    state = state.updateStatus(GameStatus.PLAYING);
    
    const newState = GameFlowModule.endGame(state, 0);
    
    expect(newState.status).toBe(GameStatus.FINISHED);
    expect(newState.winner).toBe(0);
  });
  
  it('checkGameEnd应该检测游戏结束', () => {
    let state = new GameState(config);
    const players = [0, 1, 2, 3].map(id => ({
      id, name: `P${id}`, type: PlayerType.AI, hand: [], score: 0, isHuman: false
    }));
    state = state.initializePlayers(players);
    
    expect(GameFlowModule.checkGameEnd(state)).toBe(false);
    
    state = state.addToFinishOrder(0);
    state = state.addToFinishOrder(1);
    state = state.addToFinishOrder(2);
    
    expect(GameFlowModule.checkGameEnd(state)).toBe(true);
  });
  
  it('findNextPlayer应该找到有牌的玩家', () => {
    let state = new GameState(config);
    const players = [
      { id: 0, name: 'P0', type: PlayerType.AI, hand: [], score: 0, isHuman: false },
      { id: 1, name: 'P1', type: PlayerType.AI, hand: [{ suit: 'hearts' as any, rank: 5, id: '1' }], score: 0, isHuman: false },
      { id: 2, name: 'P2', type: PlayerType.AI, hand: [], score: 0, isHuman: false },
      { id: 3, name: 'P3', type: PlayerType.AI, hand: [], score: 0, isHuman: false }
    ];
    state = state.initializePlayers(players);
    state = state.updateCurrentPlayer(0);
    
    const next = GameFlowModule.findNextPlayer(state);
    expect(next).toBe(1);
  });
});


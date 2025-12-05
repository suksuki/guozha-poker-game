/**
 * ScoreModule 单元测试
 */

import { describe, it, expect } from 'vitest';
import { ScoreModule } from '../../../src/game-engine/modules/ScoreModule';
import { GameState, type GameConfig } from '../../../src/game-engine/state/GameState';
import { PlayerType, type Player } from '../../../src/types/card';

describe('ScoreModule', () => {
  
  const createPlayer = (id: number, score: number = 0): Player => ({
    id,
    name: `Player${id}`,
    type: PlayerType.AI,
    hand: [],
    score,
    isHuman: false
  });
  
  describe('allocateRoundScore', () => {
    it('应该分配分数给获胜者', () => {
      const config: GameConfig = { playerCount: 2, humanPlayerIndex: 0, teamMode: false };
      let state = new GameState(config);
      state = state.initializePlayers([createPlayer(0, 10), createPlayer(1, 20)]);
      
      const newState = ScoreModule.allocateRoundScore(state, 50, 0);
      
      expect(newState.players[0].score).toBe(60); // 10 + 50
      expect(newState.players[1].score).toBe(20); // 不变
    });
    
    it('无效的获胜者ID应该抛出错误', () => {
      const config: GameConfig = { playerCount: 2, humanPlayerIndex: 0, teamMode: false };
      const state = new GameState(config);
      
      expect(() => {
        ScoreModule.allocateRoundScore(state, 50, 5);
      }).toThrow('Invalid winner ID');
    });
  });
  
  describe('calculatePlayerTotalScore', () => {
    it('应该返回玩家分数', () => {
      const player = createPlayer(0, 100);
      expect(ScoreModule.calculatePlayerTotalScore(player)).toBe(100);
    });
    
    it('未设置分数应该返回0', () => {
      const player = createPlayer(0);
      player.score = undefined;
      expect(ScoreModule.calculatePlayerTotalScore(player)).toBe(0);
    });
  });
  
  describe('calculateAllScores', () => {
    it('应该计算所有玩家分数', () => {
      const players = [
        createPlayer(0, 10),
        createPlayer(1, 20),
        createPlayer(2, 30)
      ];
      
      const scores = ScoreModule.calculateAllScores(players);
      expect(scores).toEqual([10, 20, 30]);
    });
  });
  
  describe('updatePlayerScore', () => {
    it('应该更新玩家分数', () => {
      const config: GameConfig = { playerCount: 2, humanPlayerIndex: 0, teamMode: false };
      let state = new GameState(config);
      state = state.initializePlayers([createPlayer(0, 10), createPlayer(1, 20)]);
      
      const newState = ScoreModule.updatePlayerScore(state, 0, 15);
      
      expect(newState.players[0].score).toBe(25); // 10 + 15
    });
    
    it('无效索引应该抛出错误', () => {
      const config: GameConfig = { playerCount: 2, humanPlayerIndex: 0, teamMode: false };
      const state = new GameState(config);
      
      expect(() => {
        ScoreModule.updatePlayerScore(state, 5, 10);
      }).toThrow('Invalid player index');
    });
  });
});


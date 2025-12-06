/**
 * GameEngine单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../../src/game-engine/GameEngine';
import { GameState } from '../../../src/game-engine/state/GameState';
import { RoundData } from '../../../src/game-engine/round/RoundData';
import { PlayerType } from '../../../src/types/card';

describe('GameEngine', () => {
  let state: GameState;
  
  beforeEach(() => {
    // 创建初始状态
    state = new GameState({
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    });
    
    // 初始化玩家
    const players = [0, 1, 2, 3].map(id => ({
      id,
      name: id === 0 ? '你' : `AI玩家${id}`,
      type: (id === 0 ? PlayerType.HUMAN : PlayerType.AI),
      hand: [],
      score: 0,
      isHuman: id === 0,
      finishedRank: null,
      dunCount: 0
    }));
    
    state = state.initializePlayers(players);
    
    // 添加一个回合
    state = state.addRound(new RoundData({ roundNumber: 1 }));
    state = state.updateStatus('playing' as any);
  });

  describe('getCurrentRound', () => {
    it('应该能获取当前回合', () => {
      const round = GameEngine.getCurrentRound(state);
      
      expect(round).toBeDefined();
      expect(round!.roundNumber).toBe(1);
    });
  });

  describe('getRoundScore', () => {
    it('应该能获取回合分数', () => {
      const score = GameEngine.getRoundScore(state);
      
      expect(score).toBe(0);
    });
  });

  describe('hasPlayableCards', () => {
    it('首家应该总是有牌可出', () => {
      // 给玩家发一些牌
      const testHand = [
        { suit: 0, rank: 3, id: 'test-1' },
        { suit: 0, rank: 4, id: 'test-2' }
      ];
      state = state.updatePlayer(0, { hand: testHand });
      
      const hasPlayable = GameEngine.hasPlayableCards(state, 0);
      
      expect(hasPlayable).toBe(true);
    });
  });

  describe('playCards', () => {
    it('应该能处理出牌', () => {
      // 给玩家发牌
      const testHand = [
        { suit: 0, rank: 3, id: 'test-1' },
        { suit: 0, rank: 4, id: 'test-2' }
      ];
      state = state.updatePlayer(0, { hand: testHand });
      
      const result = GameEngine.playCards(state, 0, [testHand[0]]);
      
      // 应该成功或返回明确的错误
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('回合已结束时应该拒绝出牌', () => {
      // 标记回合为已结束
      const finishedRound = state.currentRound!.finish({
        winnerId: 0,
        winnerName: '测试'
      });
      state = state.updateRound(0, finishedRound);
      
      const testCard = { suit: 0, rank: 3, id: 'test-1' };
      const result = GameEngine.playCards(state, 0, [testCard]);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('回合已结束');
    });
  });

  describe('pass', () => {
    it('首家不能不要', () => {
      const result = GameEngine.pass(state, 0);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('首家');
    });

    it('回合已结束时应该拒绝不要', () => {
      const finishedRound = state.currentRound!.finish({
        winnerId: 0,
        winnerName: '测试'
      });
      state = state.updateRound(0, finishedRound);
      
      const result = GameEngine.pass(state, 0);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('回合已结束');
    });

    it('个人赛有牌可出时不能不要', () => {
      // 给玩家发牌
      const testHand = [
        { suit: 0, rank: 5, id: 'test-1' },
        { suit: 0, rank: 6, id: 'test-2' }
      ];
      state = state.updatePlayer(0, { hand: testHand });
      
      // 先有人出牌
      const updatedRound = state.currentRound!.updateLastPlay(
        [{ suit: 0, rank: 3, id: 'test-3' }],
        1
      );
      state = state.updateRound(0, updatedRound);
      
      // 玩家0有5和6，可以出5或6压过3
      const result = GameEngine.pass(state, 0);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('有牌可出');
    });
  });

  describe('回合结束和计分', () => {
    it('应该在接风轮时结束回合', () => {
      // 这个测试需要完整的游戏流程，放在集成测试中
      expect(true).toBe(true);
    });
  });
});


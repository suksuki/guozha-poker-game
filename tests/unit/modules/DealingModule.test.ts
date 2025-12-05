/**
 * DealingModule 单元测试
 */

import { describe, it, expect } from 'vitest';
import { DealingModule } from '../../../src/game-engine/modules/DealingModule';
import { GameState, type GameConfig } from '../../../src/game-engine/state/GameState';
import { PlayerType, type Player } from '../../../src/types/card';

describe('DealingModule', () => {
  
  const createPlayer = (id: number): Player => ({
    id,
    name: `Player${id}`,
    type: PlayerType.AI,
    hand: [],
    score: 0,
    isHuman: false
  });
  
  describe('dealAndUpdateState', () => {
    it('应该发牌并更新状态', () => {
      const config: GameConfig = { playerCount: 4, humanPlayerIndex: 0, teamMode: false };
      let state = new GameState(config);
      state = state.initializePlayers([
        createPlayer(0),
        createPlayer(1),
        createPlayer(2),
        createPlayer(3)
      ]);
      
      const { updatedState, hands } = DealingModule.dealAndUpdateState(state);
      
      // 验证发牌
      expect(hands.length).toBe(4);
      hands.forEach(hand => {
        expect(hand.length).toBeGreaterThan(0);
      });
      
      // 验证状态更新
      updatedState.players.forEach((player, idx) => {
        expect(player.hand.length).toBe(hands[idx].length);
      });
      
      // 验证保存了初始手牌
      expect(updatedState.initialHands).toBeDefined();
    });
  });
  
  describe('assignHandsToPlayers', () => {
    it('应该分配手牌给玩家', () => {
      const config: GameConfig = { playerCount: 2, humanPlayerIndex: 0, teamMode: false };
      let state = new GameState(config);
      state = state.initializePlayers([createPlayer(0), createPlayer(1)]);
      
      const hands = [
        [{ suit: 'hearts' as any, rank: 5 as any, id: '1' }],
        [{ suit: 'spades' as any, rank: 6 as any, id: '2' }]
      ];
      
      const newState = DealingModule.assignHandsToPlayers(state, hands);
      
      expect(newState.players[0].hand.length).toBe(1);
      expect(newState.players[1].hand.length).toBe(1);
      expect(newState.initialHands).toBeDefined();
    });
    
    it('手牌数量不匹配应该抛出错误', () => {
      const config: GameConfig = { playerCount: 2, humanPlayerIndex: 0, teamMode: false };
      let state = new GameState(config);
      state = state.initializePlayers([createPlayer(0), createPlayer(1)]);
      
      const hands = [[{ suit: 'hearts' as any, rank: 5 as any, id: '1' }]]; // 只有1个手牌
      
      expect(() => {
        DealingModule.assignHandsToPlayers(state, hands);
      }).toThrow('Hands count must match player count');
    });
  });
});


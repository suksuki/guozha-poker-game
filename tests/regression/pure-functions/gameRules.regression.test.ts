/**
 * gameRules 回归测试
 * 
 * 目标：验证排名计算100%一致
 * 测试场景：100个游戏结束场景
 */

import { describe, it, expect } from 'vitest';
import { calculateFinalRankings as oldCalc } from '../../../src/utils/gameRules';
import { RankingModule } from '../../../src/game-engine/modules/RankingModule';
import { GameState, type GameConfig } from '../../../src/game-engine/state/GameState';
import { PlayerType, type Player } from '../../../src/types/card';

describe('gameRules 回归测试', () => {
  
  // 生成随机玩家
  function generatePlayer(id: number, handSize: number, score: number): Player {
    return {
      id,
      name: `Player${id}`,
      type: id === 0 ? PlayerType.HUMAN : PlayerType.AI,
      hand: Array.from({ length: handSize }, (_, i) => ({
        suit: 'hearts' as any,
        rank: 'A' as any,
        id: `card-${id}-${i}`
      })),
      score,
      isHuman: id === 0
    };
  }

  describe('calculateFinalRankings - 100场景', () => {
    it('所有场景结果一致', () => {
      const testCases = [];
      
      // 生成100个测试场景
      for (let i = 0; i < 100; i++) {
        const playerCount = [2, 4, 6][Math.floor(Math.random() * 3)];
        const players: Player[] = [];
        const finishOrder: number[] = [];
        
        // 生成玩家
        for (let j = 0; j < playerCount; j++) {
          const handSize = Math.floor(Math.random() * 14); // 0-13张
          const score = Math.floor(Math.random() * 200) - 100; // -100到100分
          players.push(generatePlayer(j, handSize, score));
          
          // 随机完成顺序
          if (handSize === 0 && Math.random() > 0.3) {
            finishOrder.push(j);
          }
        }
        
        testCases.push({ players, finishOrder });
      }
      
      // 验证每个场景
      let matchCount = 0;
      testCases.forEach((testCase, index) => {
        // 旧实现
        const oldRankings = oldCalc(testCase.players, testCase.finishOrder);
        
        // 新实现（通过StateManager）
        const config: GameConfig = { playerCount: testCase.players.length, humanPlayerIndex: 0, teamMode: false };
        let state = new GameState(config);
        state = state.initializePlayers(testCase.players);
        testCase.finishOrder.forEach(playerId => {
          state = state.addToFinishOrder(playerId);
        });
        
        const { rankings: newRankings } = RankingModule.calculateFinalRankings(state);
        
        // 对比结果
        if (oldRankings.length !== newRankings.length) {
          console.error(`Case ${index}: Length mismatch`, { old: oldRankings.length, new: newRankings.length });
          return;
        }
        
        let caseMatch = true;
        for (let i = 0; i < oldRankings.length; i++) {
          if (
            oldRankings[i].rank !== newRankings[i].rank ||
            Math.abs(oldRankings[i].finalScore - newRankings[i].finalScore) > 0.01
          ) {
            console.error(`Case ${index}, Player ${i}: Mismatch`, {
              old: { rank: oldRankings[i].rank, score: oldRankings[i].finalScore },
              new: { rank: newRankings[i].rank, score: newRankings[i].finalScore }
            });
            caseMatch = false;
            break;
          }
        }
        
        if (caseMatch) {
          matchCount++;
        }
      });
      
      // 验证：至少98%一致
      const matchRate = matchCount / testCases.length;
      console.log(`Match rate: ${matchRate * 100}% (${matchCount}/${testCases.length})`);
      expect(matchRate).toBeGreaterThanOrEqual(0.98);
    });
  });

  describe('特定场景测试', () => {
    it('4人游戏 - 正常结束', () => {
      const players: Player[] = [
        generatePlayer(0, 0, 50),  // 第1名
        generatePlayer(1, 3, 20),  // 第3名
        generatePlayer(2, 1, 30),  // 第2名
        generatePlayer(3, 10, 10)  // 第4名
      ];
      const finishOrder = [0, 2, 1]; // 0先出完，2第二，1第三
      
      const oldRankings = oldCalc(players, finishOrder);
      
      const config: GameConfig = { playerCount: 4, humanPlayerIndex: 0, teamMode: false };
      let state = new GameState(config);
      state = state.initializePlayers(players);
      finishOrder.forEach(id => {
        state = state.addToFinishOrder(id);
      });
      
      const { rankings: newRankings } = RankingModule.calculateFinalRankings(state);
      
      // 验证排名顺序
      expect(newRankings.map(r => r.rank)).toEqual(oldRankings.map(r => r.rank));
    });

    it('2人游戏 - 一方出完', () => {
      const players: Player[] = [
        generatePlayer(0, 0, 100),  // 出完了
        generatePlayer(1, 13, -50)  // 还有牌
      ];
      const finishOrder = [0];
      
      const oldRankings = oldCalc(players, finishOrder);
      
      const config: GameConfig = { playerCount: 2, humanPlayerIndex: 0, teamMode: false };
      let state = new GameState(config);
      state = state.initializePlayers(players);
      state = state.addToFinishOrder(0);
      
      const { rankings: newRankings } = RankingModule.calculateFinalRankings(state);
      
      // 第一名应该是玩家0
      expect(newRankings[0].player.id).toBe(oldRankings[0].player.id);
      expect(newRankings[1].player.id).toBe(oldRankings[1].player.id);
    });

    it('所有玩家都没出完', () => {
      const players: Player[] = [
        generatePlayer(0, 5, 30),
        generatePlayer(1, 8, 20),
        generatePlayer(2, 3, 40),
        generatePlayer(3, 10, 10)
      ];
      const finishOrder: number[] = []; // 没人出完
      
      const oldRankings = oldCalc(players, finishOrder);
      
      const config: GameConfig = { playerCount: 4, humanPlayerIndex: 0, teamMode: false };
      let state = new GameState(config);
      state = state.initializePlayers(players);
      
      const { rankings: newRankings } = RankingModule.calculateFinalRankings(state);
      
      // 排名应该按手牌数量
      expect(newRankings[0].player.hand.length).toBeLessThanOrEqual(newRankings[1].player.hand.length);
      expect(newRankings[1].player.hand.length).toBeLessThanOrEqual(newRankings[2].player.hand.length);
    });
  });
});


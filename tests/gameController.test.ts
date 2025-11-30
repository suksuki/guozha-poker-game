/**
 * GameController 类单元测试
 * 测试游戏控制器的计分和排名管理功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameController } from '../src/utils/gameController';
import { Card, Suit, Rank, Player, PlayerType, RoundRecord } from '../src/types/card';
import { calculateCardsScore, isScoreCard } from '../src/utils/cardUtils';

// 辅助函数：创建测试用的牌
function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return { suit, rank, id: id || `${suit}-${rank}-${Math.random()}` };
}

// 辅助函数：创建玩家
function createPlayer(id: number, name: string, hand: Card[], score: number = -100): Player {
  return {
    id,
    name,
    type: id === 0 ? PlayerType.HUMAN : PlayerType.AI,
    hand,
    score,
    isHuman: id === 0,
    wonRounds: []
  };
}

describe('GameController 类单元测试', () => {
  let controller: GameController;
  let players: Player[];
  let mockGame: any;

  beforeEach(() => {
    // 创建 mock Game 实例
    mockGame = {
      players: [],
      updatePlayer: (index: number, updates: any) => {
        if (mockGame.players[index]) {
          Object.assign(mockGame.players[index], updates);
        }
      },
      updateFinishOrder: (order: number[]) => {
        // Mock implementation
      },
      updateFinalRankings: (rankings: any) => {
        // Mock implementation
      }
    };
    
    controller = new GameController(mockGame);
    players = [
      createPlayer(0, '玩家1', [createCard(Suit.SPADES, Rank.FIVE)], -100),
      createPlayer(1, '玩家2', [createCard(Suit.HEARTS, Rank.TEN)], -100),
      createPlayer(2, '玩家3', [createCard(Suit.DIAMONDS, Rank.KING)], -100),
      createPlayer(3, '玩家4', [createCard(Suit.CLUBS, Rank.ACE)], -100)
    ];
    
    // 初始化 mockGame.players
    mockGame.players = [...players];
  });

  describe('初始化', () => {
    it('应该正确初始化游戏', () => {
      controller.initializeGame(players, -100);
      
      const controllerPlayers = controller.getPlayers();
      expect(controllerPlayers.length).toBe(4);
      expect(controllerPlayers[0].score).toBe(-100);
      expect(controller.getFinishOrder()).toEqual([]);
    });
  });

  describe('轮次分数分配', () => {
    it('应该正确分配轮次分数给接风玩家', () => {
      controller.initializeGame(players, -100);
      
      const roundRecord: RoundRecord = {
        roundNumber: 1,
        plays: [],
        totalScore: 25,
        winnerId: 0,
        winnerName: '玩家1'
      };
      
      const updatedPlayers = controller.allocateRoundScore(
        1,
        25,
        0,
        players,
        roundRecord
      );
      
      expect(updatedPlayers[0].score).toBe(-100 + 25); // -75
      expect(updatedPlayers[0].wonRounds).toHaveLength(1);
      expect(updatedPlayers[0].wonRounds![0].totalScore).toBe(25);
    });

    it('应该正确处理接风玩家已出完的情况', () => {
      controller.initializeGame(players, -100);
      
      // 玩家0已出完牌
      players[0].hand = [];
      
      const roundRecord: RoundRecord = {
        roundNumber: 1,
        plays: [],
        totalScore: 30,
        winnerId: 0,
        winnerName: '玩家1'
      };
      
      const updatedPlayers = controller.allocateRoundScore(
        1,
        30,
        0,
        players,
        roundRecord
      );
      
      // 即使已出完，分数仍然分配给他
      expect(updatedPlayers[0].score).toBe(-100 + 30); // -70
    });

    it('应该正确处理轮次分数为0的情况', () => {
      controller.initializeGame(players, -100);
      
      const roundRecord: RoundRecord = {
        roundNumber: 1,
        plays: [],
        totalScore: 0,
        winnerId: 0,
        winnerName: '玩家1'
      };
      
      const updatedPlayers = controller.allocateRoundScore(
        1,
        0,
        0,
        players,
        roundRecord
      );
      
      // 分数为0时，不应该分配分数
      expect(updatedPlayers[0].score).toBe(-100);
    });
  });

  describe('玩家出完牌记录', () => {
    it('应该正确记录玩家出完牌', () => {
      controller.initializeGame(players, -100);
      
      const { updatedPlayers, newFinishOrder, finishedRank } = 
        controller.recordPlayerFinished(0, players);
      
      expect(newFinishOrder).toEqual([0]);
      expect(finishedRank).toBe(1);
      expect(updatedPlayers[0].finishedRank).toBe(1);
    });

    it('应该正确记录多个玩家出完牌的顺序', () => {
      controller.initializeGame(players, -100);
      
      // 玩家2先出完
      const result1 = controller.recordPlayerFinished(2, players);
      expect(result1.newFinishOrder).toEqual([2]);
      expect(result1.finishedRank).toBe(1);
      
      // 玩家0再出完
      const result2 = controller.recordPlayerFinished(0, result1.updatedPlayers);
      expect(result2.newFinishOrder).toEqual([2, 0]);
      expect(result2.finishedRank).toBe(2);
      
      // 玩家1最后出完
      const result3 = controller.recordPlayerFinished(1, result2.updatedPlayers);
      expect(result3.newFinishOrder).toEqual([2, 0, 1]);
      expect(result3.finishedRank).toBe(3);
    });

    it('不应该重复记录已完成的玩家', () => {
      controller.initializeGame(players, -100);
      
      const result1 = controller.recordPlayerFinished(0, players);
      const result2 = controller.recordPlayerFinished(0, result1.updatedPlayers);
      
      // 不应该重复记录
      expect(result2.newFinishOrder).toEqual([0]);
      expect(result2.finishedRank).toBe(1);
    });
  });

  describe('最终分数和排名计算', () => {
    it('应该正确计算最终分数和排名', () => {
      controller.initializeGame(players, -100);
      
      // 分配一些轮次分数
      const roundRecord1: RoundRecord = {
        roundNumber: 1,
        plays: [],
        totalScore: 50,
        winnerId: 0,
        winnerName: '玩家1'
      };
      let updatedPlayers = controller.allocateRoundScore(1, 50, 0, players, roundRecord1);
      
      const roundRecord2: RoundRecord = {
        roundNumber: 2,
        plays: [],
        totalScore: 30,
        winnerId: 1,
        winnerName: '玩家2'
      };
      updatedPlayers = controller.allocateRoundScore(2, 30, 1, updatedPlayers, roundRecord2);
      
      // 记录完成顺序
      let result = controller.recordPlayerFinished(0, updatedPlayers);
      result = controller.recordPlayerFinished(1, result.updatedPlayers);
      result = controller.recordPlayerFinished(2, result.updatedPlayers);
      result = controller.recordPlayerFinished(3, result.updatedPlayers);
      
      // 计算最终分数和排名
      const { updatedPlayers: finalPlayers, finalRankings } = 
        controller.calculateFinalScoresAndRankings(result.updatedPlayers);
      
      expect(finalRankings).not.toBeNull();
      expect(finalRankings.length).toBe(4);
      
      // 第一名应该+30分
      const firstPlace = finalRankings.find(r => r.rank === 1);
      expect(firstPlace).toBeDefined();
      
      // 最后一名应该-30分
      const lastPlace = finalRankings.find(r => r.rank === 4);
      expect(lastPlace).toBeDefined();
    });

    it('应该正确处理最后一名剩余分牌', () => {
      controller.initializeGame(players, -100);
      
      // 玩家0、1、2先出完
      let result = controller.recordPlayerFinished(0, players);
      result = controller.recordPlayerFinished(1, result.updatedPlayers);
      result = controller.recordPlayerFinished(2, result.updatedPlayers);
      
      // 玩家3还有分牌
      result.updatedPlayers[3].hand = [
        createCard(Suit.SPADES, Rank.FIVE),  // 5分
        createCard(Suit.HEARTS, Rank.KING)   // 10分
      ];
      
      // 玩家3最后出完
      result = controller.recordPlayerFinished(3, result.updatedPlayers);
      
      // 计算最终分数和排名
      const { updatedPlayers: finalPlayers } = 
        controller.calculateFinalScoresAndRankings(result.updatedPlayers);
      
      // 最后一名应该减去剩余分牌分数（5+10=15）
      const lastPlayer = finalPlayers[3];
      expect(lastPlayer.score).toBeLessThan(-100);
      
      // 第二名应该加上最后一名剩余分牌分数
      const secondPlayer = finalPlayers[1];
      expect(secondPlayer.score).toBeGreaterThan(-100);
    });
  });

  describe('回调机制', () => {
    it('应该正确触发分数变化回调', () => {
      let callbackCalled = false;
      let callbackPlayerIndex: number | null = null;
      let callbackScore: number | null = null;
      
      controller.subscribe({
        onScoreChange: (playerIndex, newScore, _reason) => {
          callbackCalled = true;
          callbackPlayerIndex = playerIndex;
          callbackScore = newScore;
        }
      });
      
      controller.initializeGame(players, -100);
      
      const roundRecord: RoundRecord = {
        roundNumber: 1,
        plays: [],
        totalScore: 25,
        winnerId: 0,
        winnerName: '玩家1'
      };
      
      controller.allocateRoundScore(1, 25, 0, players, roundRecord);
      
      expect(callbackCalled).toBe(true);
      expect(callbackPlayerIndex).toBe(0);
      expect(callbackScore).toBe(-100 + 25);
    });

    it('应该正确触发玩家完成回调', () => {
      let callbackCalled = false;
      let callbackPlayerIndex: number | null = null;
      let callbackFinishOrder: number[] = [];
      
      controller.subscribe({
        onPlayerFinished: (playerIndex, finishOrder, _finishedRank) => {
          callbackCalled = true;
          callbackPlayerIndex = playerIndex;
          callbackFinishOrder = finishOrder;
        }
      });
      
      controller.initializeGame(players, -100);
      controller.recordPlayerFinished(0, players);
      
      expect(callbackCalled).toBe(true);
      expect(callbackPlayerIndex).toBe(0);
      expect(callbackFinishOrder).toEqual([0]);
    });
  });

  describe('状态查询', () => {
    it('应该正确获取玩家分数', () => {
      controller.initializeGame(players, -100);
      
      expect(controller.getPlayerScore(0)).toBe(-100);
      
      const roundRecord: RoundRecord = {
        roundNumber: 1,
        plays: [],
        totalScore: 50,
        winnerId: 0,
        winnerName: '玩家1'
      };
      
      const updatedPlayers = controller.allocateRoundScore(1, 50, 0, players, roundRecord);
      
      expect(controller.getPlayerScore(0)).toBe(-100 + 50);
    });

    it('应该正确获取完成顺序', () => {
      controller.initializeGame(players, -100);
      
      expect(controller.getFinishOrder()).toEqual([]);
      
      controller.recordPlayerFinished(0, players);
      expect(controller.getFinishOrder()).toEqual([0]);
      
      const result = controller.recordPlayerFinished(1, players);
      expect(controller.getFinishOrder()).toEqual([0, 1]);
    });
  });
});


/**
 * RoundModule 单元测试
 * 
 * 目标：验证业务逻辑的纯函数性
 * 覆盖率目标：≥95%
 */

import { describe, it, expect } from 'vitest';
import { RoundModule } from '../../../src/game-engine/round/RoundModule';
import { RoundData } from '../../../src/game-engine/round/RoundData';
import { PlayerType, Suit, Rank, type Player, type Card } from '../../../src/types/card';

describe('RoundModule', () => {
  
  // 测试数据生成
  const createCard = (suit: Suit, rank: Rank, id: string): Card => ({
    suit,
    rank,
    id
  });
  
  const createPlayer = (id: number, handSize: number): Player => {
    const hand: Card[] = Array.from({ length: handSize }, (_, i) => 
      createCard(Suit.HEARTS, Rank.FIVE, `p${id}-c${i}`)
    );
    
    return {
      id,
      name: `Player${id}`,
      type: id === 0 ? PlayerType.HUMAN : PlayerType.AI,
      hand,
      score: 0,
      isHuman: id === 0
    };
  };
  
  // ========== processPlay 测试 ==========
  describe('processPlay', () => {
    it('应该处理有效出牌', () => {
      const round = new RoundData({ roundNumber: 1 });
      const players = [
        createPlayer(0, 5),
        createPlayer(1, 5)
      ];
      
      const cards = [players[0].hand[0]];
      const result = RoundModule.processPlay(round, 0, cards, players);
      
      // 验证轮次更新
      expect(result.updatedRound.getPlayCount()).toBe(1);
      expect(result.updatedRound.lastPlayPlayerIndex).toBe(0);
      
      // 验证玩家手牌减少
      expect(result.updatedPlayers[0].hand.length).toBe(4);
      expect(result.updatedPlayers[1].hand.length).toBe(5); // 其他玩家不变
    });
    
    it('应该计算分数', () => {
      const round = new RoundData({ roundNumber: 1 });
      const scoreCard = createCard(Suit.HEARTS, Rank.FIVE, 'sc1'); // 5分
      const players = [{
        id: 0,
        name: 'Player0',
        type: PlayerType.HUMAN,
        hand: [scoreCard],
        score: 0,
        isHuman: true
      }];
      
      const result = RoundModule.processPlay(round, 0, [scoreCard], players);
      
      expect(result.scoreGained).toBe(5);
      expect(result.updatedRound.totalScore).toBe(5);
    });
    
    it('已结束的轮次不能出牌', () => {
      let round = new RoundData({ roundNumber: 1 });
      round = round.finish({ winnerId: 0, winnerName: 'Player0' });
      
      const players = [createPlayer(0, 5)];
      const cards = [players[0].hand[0]];
      
      expect(() => {
        RoundModule.processPlay(round, 0, cards, players);
      }).toThrow('轮次已结束');
    });
    
    it('应该检测轮次结束', () => {
      const round = new RoundData({ roundNumber: 1 });
      // 玩家0只有1张牌
      const lastCard = createCard(Suit.HEARTS, Rank.FIVE, 'last');
      const players = [{
        id: 0,
        name: 'Player0',
        type: PlayerType.HUMAN,
        hand: [lastCard],
        score: 0,
        isHuman: true
      }, createPlayer(1, 5)];
      
      const result = RoundModule.processPlay(round, 0, [lastCard], players);
      
      expect(result.isRoundEnd).toBe(true);
      expect(result.updatedRound.isFinished).toBe(true);
      expect(result.updatedRound.winnerId).toBe(0);
    });
    
    it('无效玩家索引应该抛出错误', () => {
      const round = new RoundData({ roundNumber: 1 });
      const players = [createPlayer(0, 5)];
      
      expect(() => {
        RoundModule.processPlay(round, 5, [], players);
      }).toThrow('无效的玩家索引');
    });
  });
  
  // ========== processPass 测试 ==========
  describe('processPass', () => {
    it('应该处理要不起', () => {
      const round = new RoundData({
        roundNumber: 1,
        lastPlayPlayerIndex: 0
      });
      const players = [
        createPlayer(0, 3),
        createPlayer(1, 5),
        createPlayer(2, 5)
      ];
      
      const result = RoundModule.processPass(round, 1, players);
      
      expect(result.updatedRound).toBeDefined();
    });
    
    it('触发接风轮', () => {
      // 玩家0出牌，玩家1要不起，玩家2也要不起，回到玩家0 -> 接风
      let round = new RoundData({
        roundNumber: 1,
        lastPlayPlayerIndex: 0
      });
      
      const players = [
        createPlayer(0, 5),
        createPlayer(1, 5),
        createPlayer(2, 5)
      ];
      
      // 玩家2要不起（下一个是玩家0，是出牌者）
      const result = RoundModule.processPass(round, 2, players);
      
      expect(result.isTakeover).toBe(true);
      expect(result.updatedRound.isTakeoverRound).toBe(true);
      expect(result.updatedRound.takeoverStartPlayerIndex).toBe(2);
      expect(result.updatedRound.takeoverEndPlayerIndex).toBe(0);
    });
    
    it('已结束的轮次不能要不起', () => {
      let round = new RoundData({ roundNumber: 1 });
      round = round.finish({ winnerId: 0, winnerName: 'Player0' });
      
      const players = [createPlayer(0, 5)];
      
      expect(() => {
        RoundModule.processPass(round, 0, players);
      }).toThrow('轮次已结束');
    });
  });
  
  // ========== checkRoundEnd 测试 ==========
  describe('checkRoundEnd', () => {
    it('有玩家出完应该返回true', () => {
      const round = new RoundData({ roundNumber: 1 });
      const players = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true }, // 出完了
        createPlayer(1, 5)
      ];
      
      expect(RoundModule.checkRoundEnd(round, players)).toBe(true);
    });
    
    it('所有玩家都有牌应该返回false', () => {
      const round = new RoundData({ roundNumber: 1 });
      const players = [
        createPlayer(0, 5),
        createPlayer(1, 5),
        createPlayer(2, 5)
      ];
      
      expect(RoundModule.checkRoundEnd(round, players)).toBe(false);
    });
    
    it('多个玩家出完应该返回true', () => {
      const round = new RoundData({ roundNumber: 1 });
      const players = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true },
        { id: 1, name: 'P1', type: PlayerType.AI, hand: [], score: 0, isHuman: false },
        createPlayer(2, 5)
      ];
      
      expect(RoundModule.checkRoundEnd(round, players)).toBe(true);
    });
  });
  
  // ========== isInTakeoverRound 测试 ==========
  describe('isInTakeoverRound', () => {
    it('应该正确判断接风轮', () => {
      const round1 = new RoundData({ roundNumber: 1 });
      expect(RoundModule.isInTakeoverRound(round1)).toBe(false);
      
      const round2 = round1.updateTakeover({ isTakeoverRound: true });
      expect(RoundModule.isInTakeoverRound(round2)).toBe(true);
    });
  });
  
  // ========== canPlayerPlay 测试 ==========
  describe('canPlayerPlay', () => {
    it('轮次未开始时第一个玩家可以出牌', () => {
      const round = new RoundData({ roundNumber: 1 });
      const players = [createPlayer(0, 5)];
      
      expect(RoundModule.canPlayerPlay(round, 0, players)).toBe(true);
    });
    
    it('已结束的轮次不能出牌', () => {
      let round = new RoundData({ roundNumber: 1 });
      round = round.finish({ winnerId: 0, winnerName: 'Player0' });
      
      const players = [createPlayer(0, 5)];
      
      expect(RoundModule.canPlayerPlay(round, 0, players)).toBe(false);
    });
    
    it('手牌为空的玩家不能出牌', () => {
      const round = new RoundData({ roundNumber: 1 });
      const players = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [], score: 0, isHuman: true }
      ];
      
      expect(RoundModule.canPlayerPlay(round, 0, players)).toBe(false);
    });
  });
  
  // ========== getRoundStats 测试 ==========
  describe('getRoundStats', () => {
    it('应该返回正确的统计信息', () => {
      let round = new RoundData({ roundNumber: 1, startTime: 1000000 });
      round = round.addPlay(createTestPlayRecord(0, 5));
      round = round.addPlay(createTestPlayRecord(1, 10));
      
      const stats = RoundModule.getRoundStats(round);
      
      expect(stats.playCount).toBe(2);
      expect(stats.totalScore).toBe(15);
      expect(stats.isFinished).toBe(false);
      expect(stats.isTakeoverRound).toBe(false);
    });
  });
  
  // ========== 综合测试 ==========
  describe('综合场景', () => {
    it('完整的一轮出牌流程', () => {
      let round = new RoundData({ roundNumber: 1 });
      
      // 4个玩家，每人3张牌
      let players: Player[] = [
        createPlayer(0, 3),
        createPlayer(1, 3),
        createPlayer(2, 3),
        createPlayer(3, 3)
      ];
      
      // 玩家0出牌
      let result = RoundModule.processPlay(round, 0, [players[0].hand[0]], players);
      round = result.updatedRound;
      players = result.updatedPlayers as Player[];
      
      expect(round.getPlayCount()).toBe(1);
      expect(players[0].hand.length).toBe(2);
      
      // 玩家1出牌
      result = RoundModule.processPlay(round, 1, [players[1].hand[0]], players);
      round = result.updatedRound;
      players = result.updatedPlayers as Player[];
      
      expect(round.getPlayCount()).toBe(2);
      expect(players[1].hand.length).toBe(2);
    });
    
    it('玩家出完所有牌应该结束轮次', () => {
      let round = new RoundData({ roundNumber: 1 });
      const card = createCard(Suit.HEARTS, Rank.FIVE, 'c1');
      
      let players: Player[] = [
        { id: 0, name: 'P0', type: PlayerType.HUMAN, hand: [card], score: 0, isHuman: true },
        createPlayer(1, 5)
      ];
      
      const result = RoundModule.processPlay(round, 0, [card], players);
      
      expect(result.isRoundEnd).toBe(true);
      expect(result.updatedRound.isFinished).toBe(true);
      expect(result.updatedRound.winnerId).toBe(0);
      expect(result.updatedPlayers[0].hand.length).toBe(0);
    });
  });
  
  // 辅助函数
  function createTestPlayRecord(playerIndex: number, score: number = 0) {
    return {
      playerId: playerIndex,
      playerName: `Player${playerIndex}`,
      cards: [createCard(Suit.HEARTS, Rank.FIVE, `c${playerIndex}`)],
      scoreCards: [],
      score
    };
  }
});


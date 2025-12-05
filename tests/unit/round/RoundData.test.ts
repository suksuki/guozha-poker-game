/**
 * RoundData 单元测试
 * 
 * 目标：验证不可变性和数据完整性
 * 覆盖率目标：≥95%
 */

import { describe, it, expect } from 'vitest';
import { RoundData } from '../../../src/game-engine/round/RoundData';
import { Play, RoundPlayRecord, CardType, Suit, Rank, Card } from '../../../src/types/card';

describe('RoundData', () => {
  
  // 测试数据
  const createTestCard = (): Card => ({
    suit: Suit.HEARTS,
    rank: Rank.FIVE,
    id: '1'
  });
  
  const createTestPlay = (): Play => ({
    type: CardType.SINGLE,
    cards: [createTestCard()],
    value: 5
  });
  
  const createTestPlayRecord = (playerIndex: number, score: number = 0): RoundPlayRecord => ({
    playerId: playerIndex,
    playerName: `Player${playerIndex}`,
    cards: [createTestCard()],
    scoreCards: score > 0 ? [createTestCard()] : [],
    score
  });
  
  // ========== 初始化测试 ==========
  describe('初始化', () => {
    it('应该正确初始化空轮次', () => {
      const round = new RoundData({ roundNumber: 1 });
      
      expect(round.roundNumber).toBe(1);
      expect(round.plays).toEqual([]);
      expect(round.totalScore).toBe(0);
      expect(round.lastPlay).toBeNull();
      expect(round.lastPlayPlayerIndex).toBeNull();
      expect(round.isFinished).toBe(false);
      expect(round.isTakeoverRound).toBe(false);
    });
    
    it('应该使用提供的startTime', () => {
      const startTime = 1000000;
      const round = new RoundData({ roundNumber: 1, startTime });
      
      expect(round.startTime).toBe(startTime);
    });
    
    it('未提供startTime时应使用当前时间', () => {
      const before = Date.now();
      const round = new RoundData({ roundNumber: 1 });
      const after = Date.now();
      
      expect(round.startTime).toBeGreaterThanOrEqual(before);
      expect(round.startTime).toBeLessThanOrEqual(after);
    });
    
    it('应该正确初始化带数据的轮次', () => {
      const plays = [createTestPlayRecord(0, 10)];
      const round = new RoundData({
        roundNumber: 2,
        plays,
        totalScore: 10,
        lastPlay: plays[0].cards,
        lastPlayPlayerIndex: 0
      });
      
      expect(round.plays.length).toBe(1);
      expect(round.totalScore).toBe(10);
      expect(round.lastPlayPlayerIndex).toBe(0);
    });
  });
  
  // ========== 不可变性测试 ==========
  describe('不可变性', () => {
    it('对象应该被冻结', () => {
      const round = new RoundData({ roundNumber: 1 });
      
      expect(Object.isFrozen(round)).toBe(true);
    });
    
    it('plays数组应该被冻结', () => {
      const round = new RoundData({ roundNumber: 1 });
      
      expect(Object.isFrozen(round.plays)).toBe(true);
    });
    
    it('不能修改属性', () => {
      const round = new RoundData({ roundNumber: 1 });
      
      expect(() => {
        (round as any).roundNumber = 2;
      }).toThrow();
    });
    
    it('不能修改plays数组', () => {
      const round = new RoundData({ roundNumber: 1 });
      
      expect(() => {
        (round.plays as any).push(createTestPlayRecord(0));
      }).toThrow();
    });
    
    it('更新操作应该返回新实例', () => {
      const round1 = new RoundData({ roundNumber: 1 });
      const round2 = round1.addPlay(createTestPlayRecord(0, 5));
      
      expect(round2).not.toBe(round1);
      expect(round1.plays.length).toBe(0);
      expect(round2.plays.length).toBe(1);
    });
  });
  
  // ========== addPlay测试 ==========
  describe('addPlay', () => {
    it('应该添加出牌记录', () => {
      const round1 = new RoundData({ roundNumber: 1 });
      const playRecord = createTestPlayRecord(0, 10);
      const round2 = round1.addPlay(playRecord);
      
      expect(round2.plays.length).toBe(1);
      expect(round2.plays[0]).toBe(playRecord);
    });
    
    it('应该更新totalScore', () => {
      const round1 = new RoundData({ roundNumber: 1 });
      const round2 = round1.addPlay(createTestPlayRecord(0, 10));
      const round3 = round2.addPlay(createTestPlayRecord(1, 5));
      
      expect(round3.totalScore).toBe(15);
    });
    
    it('应该更新lastPlay和lastPlayPlayerIndex', () => {
      const round1 = new RoundData({ roundNumber: 1 });
      const playRecord = createTestPlayRecord(0, 10);
      const round2 = round1.addPlay(playRecord);
      
      expect(round2.lastPlay).toBe(playRecord.cards);
      expect(round2.lastPlayPlayerIndex).toBe(0);
    });
    
    it('连续添加应该保持所有记录', () => {
      let round = new RoundData({ roundNumber: 1 });
      
      for (let i = 0; i < 5; i++) {
        round = round.addPlay(createTestPlayRecord(i, i * 5));
      }
      
      expect(round.plays.length).toBe(5);
      expect(round.totalScore).toBe(0 + 5 + 10 + 15 + 20);
    });
  });
  
  // ========== updateTakeover测试 ==========
  describe('updateTakeover', () => {
    it('应该设置接风轮标记', () => {
      const round1 = new RoundData({ roundNumber: 1 });
      const round2 = round1.updateTakeover({
        isTakeoverRound: true,
        takeoverStartPlayerIndex: 1,
        takeoverEndPlayerIndex: 3
      });
      
      expect(round2.isTakeoverRound).toBe(true);
      expect(round2.takeoverStartPlayerIndex).toBe(1);
      expect(round2.takeoverEndPlayerIndex).toBe(3);
    });
    
    it('应该取消接风轮标记', () => {
      const round1 = new RoundData({
        roundNumber: 1,
        isTakeoverRound: true,
        takeoverStartPlayerIndex: 1
      });
      
      const round2 = round1.updateTakeover({
        isTakeoverRound: false
      });
      
      expect(round2.isTakeoverRound).toBe(false);
    });
    
    it('未提供的参数应保持原值', () => {
      const round1 = new RoundData({
        roundNumber: 1,
        takeoverStartPlayerIndex: 1,
        takeoverEndPlayerIndex: 3
      });
      
      const round2 = round1.updateTakeover({
        isTakeoverRound: true
      });
      
      expect(round2.takeoverStartPlayerIndex).toBe(1);
      expect(round2.takeoverEndPlayerIndex).toBe(3);
    });
  });
  
  // ========== finish测试 ==========
  describe('finish', () => {
    it('应该标记轮次结束', () => {
      const round1 = new RoundData({ roundNumber: 1 });
      const round2 = round1.finish({
        winnerId: 0,
        winnerName: 'Player0'
      });
      
      expect(round2.isFinished).toBe(true);
      expect(round2.winnerId).toBe(0);
      expect(round2.winnerName).toBe('Player0');
      expect(round2.endTime).toBeDefined();
    });
    
    it('应该使用提供的endTime', () => {
      const round1 = new RoundData({ roundNumber: 1 });
      const endTime = 2000000;
      const round2 = round1.finish({
        winnerId: 0,
        winnerName: 'Player0',
        endTime
      });
      
      expect(round2.endTime).toBe(endTime);
    });
  });
  
  // ========== updateLastPlay测试 ==========
  describe('updateLastPlay', () => {
    it('应该更新最后出牌', () => {
      const round1 = new RoundData({ roundNumber: 1 });
      const cards = [createTestCard()];
      const round2 = round1.updateLastPlay(cards, 2);
      
      expect(round2.lastPlay).toBe(cards);
      expect(round2.lastPlayPlayerIndex).toBe(2);
    });
  });
  
  // ========== 查询方法测试 ==========
  describe('查询方法', () => {
    it('getDuration应该返回正确的持续时间', () => {
      const startTime = 1000000;
      const endTime = 1005000;
      const round = new RoundData({
        roundNumber: 1,
        startTime,
        isFinished: true,
        endTime
      });
      
      expect(round.getDuration()).toBe(5000);
    });
    
    it('未结束的轮次getDuration应该使用当前时间', () => {
      const startTime = Date.now() - 1000;
      const round = new RoundData({ roundNumber: 1, startTime });
      
      const duration = round.getDuration();
      expect(duration).toBeGreaterThanOrEqual(1000);
      expect(duration).toBeLessThanOrEqual(2000);
    });
    
    it('getPlayCount应该返回正确数量', () => {
      let round = new RoundData({ roundNumber: 1 });
      
      expect(round.getPlayCount()).toBe(0);
      
      round = round.addPlay(createTestPlayRecord(0));
      round = round.addPlay(createTestPlayRecord(1));
      
      expect(round.getPlayCount()).toBe(2);
    });
    
    it('getLastPlays应该返回最后N次出牌', () => {
      let round = new RoundData({ roundNumber: 1 });
      
      for (let i = 0; i < 5; i++) {
        round = round.addPlay(createTestPlayRecord(i));
      }
      
      const lastTwo = round.getLastPlays(2);
      expect(lastTwo.length).toBe(2);
      expect(lastTwo[0].playerId).toBe(3);
      expect(lastTwo[1].playerId).toBe(4);
    });
    
    it('getPlayerPlays应该返回指定玩家的出牌', () => {
      let round = new RoundData({ roundNumber: 1 });
      
      round = round.addPlay(createTestPlayRecord(0));
      round = round.addPlay(createTestPlayRecord(1));
      round = round.addPlay(createTestPlayRecord(0));
      round = round.addPlay(createTestPlayRecord(2));
      
      const player0Plays = round.getPlayerPlays(0);
      expect(player0Plays.length).toBe(2);
      expect(player0Plays.every(p => p.playerId === 0)).toBe(true);
    });
    
    it('hasPlayerPlayed应该正确判断', () => {
      let round = new RoundData({ roundNumber: 1 });
      
      expect(round.hasPlayerPlayed(0)).toBe(false);
      
      round = round.addPlay(createTestPlayRecord(0));
      
      expect(round.hasPlayerPlayed(0)).toBe(true);
      expect(round.hasPlayerPlayed(1)).toBe(false);
    });
  });
  
  // ========== 快照功能测试 ==========
  describe('快照功能', () => {
    it('toSnapshot应该导出完整数据', () => {
      let round = new RoundData({ roundNumber: 1 });
      round = round.addPlay(createTestPlayRecord(0, 10));
      round = round.finish({ winnerId: 0, winnerName: 'Player0' });
      
      const snapshot = round.toSnapshot();
      
      expect(snapshot.roundNumber).toBe(1);
      expect(snapshot.plays.length).toBe(1);
      expect(snapshot.totalScore).toBe(10);
      expect(snapshot.isFinished).toBe(true);
      expect(snapshot.winnerId).toBe(0);
    });
    
    it('fromSnapshot应该恢复完整数据', () => {
      const snapshot = {
        roundNumber: 2,
        startTime: 1000000,
        plays: [createTestPlayRecord(0, 15)],
        totalScore: 15,
        lastPlay: [createTestCard()],
        lastPlayPlayerIndex: 0,
        isFinished: true,
        endTime: 1005000,
        winnerId: 0,
        winnerName: 'Player0',
        isTakeoverRound: true,
        takeoverStartPlayerIndex: 1,
        takeoverEndPlayerIndex: 3
      };
      
      const round = RoundData.fromSnapshot(snapshot);
      
      expect(round.roundNumber).toBe(2);
      expect(round.plays.length).toBe(1);
      expect(round.totalScore).toBe(15);
      expect(round.isFinished).toBe(true);
      expect(round.isTakeoverRound).toBe(true);
    });
    
    it('快照往返应该保持一致', () => {
      let round = new RoundData({ roundNumber: 3 });
      round = round.addPlay(createTestPlayRecord(0, 5));
      round = round.addPlay(createTestPlayRecord(1, 10));
      round = round.updateTakeover({
        isTakeoverRound: true,
        takeoverStartPlayerIndex: 2
      });
      
      const snapshot = round.toSnapshot();
      const restored = RoundData.fromSnapshot(snapshot);
      
      expect(restored.roundNumber).toBe(round.roundNumber);
      expect(restored.plays.length).toBe(round.plays.length);
      expect(restored.totalScore).toBe(round.totalScore);
      expect(restored.isTakeoverRound).toBe(round.isTakeoverRound);
    });
  });
  
  // ========== toRoundRecord测试 ==========
  describe('toRoundRecord', () => {
    it('应该转换为RoundRecord', () => {
      let round = new RoundData({ roundNumber: 1 });
      round = round.addPlay(createTestPlayRecord(0, 10));
      round = round.finish({
        winnerId: 0,
        winnerName: 'Player0',
        endTime: 2000000
      });
      
      const record = round.toRoundRecord();
      
      expect(record.roundNumber).toBe(1);
      expect(record.plays.length).toBe(1);
      expect(record.totalScore).toBe(10);
      expect(record.winnerId).toBe(0);
      expect(record.winnerName).toBe('Player0');
      expect(record.endTime).toBe(2000000);
    });
    
    it('未结束的轮次不能转换', () => {
      const round = new RoundData({ roundNumber: 1 });
      
      expect(() => {
        round.toRoundRecord();
      }).toThrow('轮次未结束');
    });
  });
  
  // ========== 边界情况测试 ==========
  describe('边界情况', () => {
    it('空plays数组应该正常工作', () => {
      const round = new RoundData({ roundNumber: 1, plays: [] });
      
      expect(round.plays.length).toBe(0);
      expect(round.getPlayCount()).toBe(0);
      expect(round.getLastPlays(5)).toEqual([]);
    });
    
    it('getLastPlays请求超过总数应该返回全部', () => {
      let round = new RoundData({ roundNumber: 1 });
      round = round.addPlay(createTestPlayRecord(0));
      
      const lastPlays = round.getLastPlays(10);
      expect(lastPlays.length).toBe(1);
    });
    
    it('getPlayerPlays没有记录应该返回空数组', () => {
      const round = new RoundData({ roundNumber: 1 });
      
      expect(round.getPlayerPlays(0)).toEqual([]);
    });
    
    it('多次finish应该使用最后一次的值', () => {
      let round = new RoundData({ roundNumber: 1 });
      round = round.finish({ winnerId: 0, winnerName: 'Player0' });
      round = round.finish({ winnerId: 1, winnerName: 'Player1' });
      
      expect(round.winnerId).toBe(1);
      expect(round.winnerName).toBe('Player1');
    });
  });
});


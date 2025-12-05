/**
 * RoundPlayManager 单元测试
 * 测试轮次管理逻辑
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoundPlayManager } from '../src/utils/roundPlayManager';
import { Player, Play, CardType, RoundPlayRecord, Card, Rank, Suit } from '../src/types/card';

// 创建测试用的工具函数
function createTestPlayer(id: number, name: string, hand: Card[] = [], score: number = 0): Player {
  return {
    id,
    name,
    type: id === 0 ? 'human' : 'ai',
    hand,
    score,
    wonRounds: []
  };
}

function createTestCard(rank: Rank, suit: Suit, index: number): Card {
  return {
    id: `test-${rank}-${suit}-${index}`,
    rank,
    suit
  };
}

function createTestPlay(type: CardType, value: number): Play {
  const cards: Card[] = [];
  return { cards, type, value };
}

function createTestPlayRecord(
  playerId: number,
  playerName: string,
  cards: Card[],
  score: number
): RoundPlayRecord {
  return {
    playerId,
    playerName,
    cards,
    scoreCards: cards.filter(c => c.rank === Rank.FIVE || c.rank === Rank.TEN || c.rank === Rank.KING),
    score
  };
}

describe('RoundPlayManager', () => {
  let manager: RoundPlayManager;
  let players: Player[];

  beforeEach(() => {
    players = [
      createTestPlayer(0, '玩家1', [createTestCard(Rank.THREE, Suit.HEARTS, 1)]),
      createTestPlayer(1, '玩家2', [createTestCard(Rank.FOUR, Suit.HEARTS, 2)]),
      createTestPlayer(2, '玩家3', [createTestCard(Rank.FIVE, Suit.HEARTS, 3)]),
      createTestPlayer(3, '玩家4', [createTestCard(Rank.SIX, Suit.HEARTS, 4)])
    ];
    manager = new RoundPlayManager({
      roundNumber: 1,
      currentPlayerIndex: 0,
      lastPlay: null,
      lastPlayPlayerIndex: null,
      roundScore: 0,
      currentRoundPlays: [],
      isRoundActive: true
    });
  });

  describe('构造函数和初始状态', () => {
    it('应该使用默认值创建管理器', () => {
      const defaultManager = new RoundPlayManager();
      const state = defaultManager.getState();
      
      expect(state.roundNumber).toBe(1);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.lastPlay).toBeNull();
      expect(state.lastPlayPlayerIndex).toBeNull();
      expect(state.roundScore).toBe(0);
      expect(state.currentRoundPlays).toEqual([]);
      expect(state.isRoundActive).toBe(true);
    });

    it('应该使用提供的初始状态创建管理器', () => {
      const initialState = {
        roundNumber: 5,
        currentPlayerIndex: 2,
        roundScore: 10
      };
      const customManager = new RoundPlayManager(initialState);
      const state = customManager.getState();
      
      expect(state.roundNumber).toBe(5);
      expect(state.currentPlayerIndex).toBe(2);
      expect(state.roundScore).toBe(10);
    });
  });

  describe('startNewRound', () => {
    it('应该开始新轮次，由赢家开始', () => {
      const winnerIndex = 1;
      const result = manager.startNewRound(winnerIndex, players, 4);
      
      expect(result.roundNumber).toBe(2);
      expect(result.currentPlayerIndex).toBe(winnerIndex);
      
      const state = manager.getState();
      expect(state.roundNumber).toBe(2);
      expect(state.currentPlayerIndex).toBe(winnerIndex);
      expect(state.lastPlay).toBeNull();
      expect(state.lastPlayPlayerIndex).toBeNull();
      expect(state.roundScore).toBe(0);
      expect(state.currentRoundPlays).toEqual([]);
      expect(state.isRoundActive).toBe(true);
    });

    it('如果赢家已出完牌，应该找下一个还在游戏中的玩家', () => {
      players[1].hand = []; // 赢家已出完
      const winnerIndex = 1;
      const result = manager.startNewRound(winnerIndex, players, 4);
      
      expect(result.currentPlayerIndex).toBe(2); // 应该是下一个玩家
    });

    it('如果所有玩家都出完，应该抛出错误', () => {
      players.forEach(p => p.hand = []);
      const winnerIndex = 1;
      
      expect(() => {
        manager.startNewRound(winnerIndex, players, 4);
      }).toThrow('无法开始新轮次：所有玩家都已出完牌，应该结束游戏');
    });
  });

  describe('handlePlayerPlay', () => {
    it('应该正确处理玩家出牌', () => {
      const playerIndex = 0;
      const play = createTestPlay(CardType.SINGLE, 3);
      const playRecord = createTestPlayRecord(playerIndex, '玩家1', [players[0].hand[0]], 0);
      const playScore = 0;

      const result = manager.handlePlayerPlay(
        playerIndex,
        play,
        playRecord,
        playScore,
        players,
        4
      );

      expect(result.updatedState.lastPlay).toEqual(play);
      expect(result.updatedState.lastPlayPlayerIndex).toBe(playerIndex);
      expect(result.updatedState.roundScore).toBe(0);
      expect(result.updatedState.currentRoundPlays).toHaveLength(1);
      expect(result.nextPlayerIndex).toBe(1);
      expect(result.shouldEndRound).toBe(false);
    });

    it('应该累加轮次分数', () => {
      const playerIndex = 0;
      const play = createTestPlay(CardType.SINGLE, 3);
      const playRecord = createTestPlayRecord(playerIndex, '玩家1', [players[0].hand[0]], 5);
      const playScore = 5;

      const result = manager.handlePlayerPlay(
        playerIndex,
        play,
        playRecord,
        playScore,
        players,
        4
      );

      expect(result.updatedState.roundScore).toBe(5);
    });

    it('如果玩家出完牌且所有剩余玩家都要不起，应该标记结束轮次', () => {
      const playerIndex = 0;
      players[0].hand = []; // 玩家出完牌
      // 其他玩家都要不起（手牌中没有能打过单张3的牌）
      const play = createTestPlay(CardType.SINGLE, 3);
      const playRecord = createTestPlayRecord(playerIndex, '玩家1', [], 0);
      const playScore = 0;

      const result = manager.handlePlayerPlay(
        playerIndex,
        play,
        playRecord,
        playScore,
        players,
        4
      );

      expect(result.shouldEndRound).toBe(true);
    });
  });

  describe('handlePlayerPass', () => {
    beforeEach(() => {
      // 设置一个最后出牌
      const play = createTestPlay(CardType.SINGLE, 3);
      const playRecord = createTestPlayRecord(0, '玩家1', [], 0);
      manager.handlePlayerPlay(0, play, playRecord, 0, players, 4);
    });

    it('如果所有玩家都要不起，应该标记结束轮次', () => {
      const playerIndex = 3; // 最后一个玩家
      const result = manager.handlePlayerPass(playerIndex, players, 4);
      
      // 下一个玩家应该是最后出牌的人（玩家0），说明所有玩家都要不起
      expect(result.shouldEndRound).toBe(true);
      expect(result.nextPlayerIndex).toBe(0);
    });

    it('如果没有最后出牌（接风状态），不应该结束轮次', () => {
      const newManager = new RoundPlayManager({
        roundNumber: 1,
        currentPlayerIndex: 0,
        lastPlay: null,
        lastPlayPlayerIndex: null,
        roundScore: 0,
        currentRoundPlays: [],
        isRoundActive: true
      });

      const result = newManager.handlePlayerPass(0, players, 4);
      
      expect(result.shouldEndRound).toBe(false);
    });
  });

  describe('endRound', () => {
    beforeEach(() => {
      // 设置轮次状态
      const play = createTestPlay(CardType.SINGLE, 3);
      const playRecord = createTestPlayRecord(0, '玩家1', [], 5);
      manager.handlePlayerPlay(0, play, playRecord, 5, players, 4);
    });

    it('应该正确结束轮次并分配分数', () => {
      const result = manager.endRound(players, 4, []);

      expect(result.roundRecord.roundNumber).toBe(1);
      expect(result.roundRecord.totalScore).toBe(5);
      expect(result.roundRecord.winnerId).toBe(0);
      expect(result.updatedPlayers[0].score).toBe(5);
      expect(result.updatedAllRounds).toHaveLength(1);
    });

    it('应该确定下一轮开始玩家', () => {
      const result = manager.endRound(players, 4, []);
      
      expect(result.nextRoundStartPlayer).toBe(0); // 赢家还有牌，应该由赢家开始
    });

    it('如果赢家已出完，应该找下一个玩家开始', () => {
      players[0].hand = []; // 赢家已出完
      const result = manager.endRound(players, 4, []);
      
      expect(result.nextRoundStartPlayer).toBe(1);
    });
  });

  describe('checkTakeover', () => {
    it('如果没有最后出牌，应该返回false', () => {
      const result = manager.checkTakeover(players, 0, null);
      expect(result).toBe(false);
    });

    it('如果所有剩余玩家都要不起，应该返回true', () => {
      const lastPlay = createTestPlay(CardType.SINGLE, 10); // 大牌
      const result = manager.checkTakeover(players, 0, lastPlay);
      // 由于其他玩家只有小牌，应该都要不起
      expect(result).toBe(true);
    });
  });

  describe('updateCurrentPlayerIndex', () => {
    it('应该更新当前玩家索引', () => {
      manager.updateCurrentPlayerIndex(2);
      const state = manager.getState();
      expect(state.currentPlayerIndex).toBe(2);
    });
  });

  describe('reset', () => {
    it('应该重置所有状态到初始值', () => {
      // 先修改一些状态
      manager.updateCurrentPlayerIndex(2);
      const play = createTestPlay(CardType.SINGLE, 3);
      const playRecord = createTestPlayRecord(0, '玩家1', [], 5);
      manager.handlePlayerPlay(0, play, playRecord, 5, players, 4);

      // 重置
      manager.reset();
      const state = manager.getState();

      expect(state.roundNumber).toBe(1);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.lastPlay).toBeNull();
      expect(state.lastPlayPlayerIndex).toBeNull();
      expect(state.roundScore).toBe(0);
      expect(state.currentRoundPlays).toEqual([]);
      expect(state.isRoundActive).toBe(true);
    });
  });
});


/**
 * RoundScheduler 和 Round 接风轮功能的单元测试和集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Card, Suit, Rank, PlayerType, GameStatus, RoundPlayRecord } from '../src/types/card';
import { Round } from '../src/utils/Round';
import { RoundScheduler, RoundSchedulerConfig } from '../src/utils/roundScheduler';
import { Player } from '../src/types/card';
import { canPlayCards } from '../src/utils/cardUtils';

// 辅助函数
function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return { suit, rank, id: id || `${suit}-${rank}-${Math.random()}` };
}

function createPlayer(id: number, name: string, hand: Card[], type: PlayerType = PlayerType.AI): Player {
  return {
    id,
    name,
    type,
    hand,
    score: -100,
    isHuman: type === PlayerType.HUMAN
  };
}

describe('Round 接风轮标记功能', () => {
  let round: Round;

  beforeEach(() => {
    round = Round.createNew(1, 0);
  });

  describe('接风轮标记基本功能', () => {
    it('应该正确开始接风轮', () => {
      round.startTakeoverRound(1, 0);
      
      expect(round.isTakeoverRoundActive()).toBe(true);
      expect(round.getTakeoverStartPlayerIndex()).toBe(1);
      expect(round.getTakeoverEndPlayerIndex()).toBe(0);
    });

    it('应该正确结束接风轮', () => {
      round.startTakeoverRound(1, 0);
      expect(round.isTakeoverRoundActive()).toBe(true);
      
      round.endTakeoverRound();
      expect(round.isTakeoverRoundActive()).toBe(false);
      // 信息应该保留
      expect(round.getTakeoverStartPlayerIndex()).toBe(1);
      expect(round.getTakeoverEndPlayerIndex()).toBe(0);
    });

    it('默认情况下不应该标记为接风轮', () => {
      expect(round.isTakeoverRoundActive()).toBe(false);
      expect(round.getTakeoverStartPlayerIndex()).toBe(null);
      expect(round.getTakeoverEndPlayerIndex()).toBe(null);
    });
  });

  describe('接风轮询完成判断', () => {
    it('应该正确判断接风轮询是否完成（回到出牌玩家）', () => {
      round.startTakeoverRound(1, 0);
      
      // 当前玩家是出牌玩家（0），应该返回true
      expect(round.isTakeoverPollingComplete(0)).toBe(true);
      
      // 当前玩家不是出牌玩家（1），应该返回false
      expect(round.isTakeoverPollingComplete(1)).toBe(false);
      expect(round.isTakeoverPollingComplete(2)).toBe(false);
    });

    it('非接风轮应该返回false', () => {
      expect(round.isTakeoverPollingComplete(0)).toBe(false);
    });

    it('应该在4人游戏中正确判断（玩家1出牌，玩家2要不起，回到玩家1）', () => {
      round.startTakeoverRound(2, 1); // 玩家2要不起，玩家1出牌
      
      // 遍历到玩家3、玩家4
      expect(round.isTakeoverPollingComplete(2)).toBe(false);
      expect(round.isTakeoverPollingComplete(3)).toBe(false);
      expect(round.isTakeoverPollingComplete(0)).toBe(false);
      
      // 回到玩家1（出牌玩家）
      expect(round.isTakeoverPollingComplete(1)).toBe(true);
    });
  });
});

describe('RoundScheduler 接风轮询逻辑', () => {
  let scheduler: RoundScheduler;
  let mockGameState: any;
  let onNextTurnCallback: (playerIndex: number, state: any) => Promise<void>;
  let onRoundEnd: (round: Round, players: Player[], nextPlayerIndex: number | null, savedWinnerIndex?: number | null) => Promise<void>;
  let nextTurnCalls: number[];
  let roundEndCalls: any[];

  beforeEach(() => {
    nextTurnCalls = [];
    roundEndCalls = [];
    
    onNextTurnCallback = vi.fn(async (playerIndex: number, state: any) => {
      nextTurnCalls.push(playerIndex);
    });
    
    onRoundEnd = vi.fn(async (round: Round, players: Player[], nextPlayerIndex: number | null, savedWinnerIndex?: number | null) => {
      roundEndCalls.push({ round, players, nextPlayerIndex, savedWinnerIndex });
    });

    mockGameState = {
      status: GameStatus.PLAYING,
      currentPlayerIndex: 0,
      rounds: [Round.createNew(1, 0)],
      currentRoundIndex: 0,
      players: [
        createPlayer(0, 'Player 0', [createCard(Suit.SPADES, Rank.THREE)]),
        createPlayer(1, 'Player 1', [createCard(Suit.HEARTS, Rank.FOUR)]),
        createPlayer(2, 'Player 2', [createCard(Suit.DIAMONDS, Rank.FIVE)]),
        createPlayer(3, 'Player 3', [createCard(Suit.CLUBS, Rank.SIX)])
      ]
    };

    const config: RoundSchedulerConfig = {
      isAutoPlay: false,
      humanPlayerIndex: 0,
      getGameState: () => mockGameState
    };

    scheduler = new RoundScheduler(config);
    scheduler.onNextTurnCallback = onNextTurnCallback;
    // 初始化轮次号
    scheduler.updateRoundNumber(1);
  });

  describe('onPassCompleted - 开始接风轮询', () => {
    beforeEach(() => {
      nextTurnCalls = [];
      roundEndCalls = [];
    });

    it('应该正确开始接风轮询（玩家要不起后）', async () => {
      const round = mockGameState.rounds[0];
      const player0Cards = [createCard(Suit.SPADES, Rank.THREE), createCard(Suit.HEARTS, Rank.THREE)];
      const playedCards = [createCard(Suit.SPADES, Rank.THREE), createCard(Suit.HEARTS, Rank.THREE)];
      
      // 玩家0出牌
      const play = canPlayCards(playedCards);
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: 'Player 0',
        cards: playedCards,
        scoreCards: [],
        score: 0
      };
      if (play) {
        round.recordPlay(playRecord, play);
      }
      mockGameState.players[0].hand = player0Cards.filter(c => 
        !playedCards.some(pc => pc.id === c.id)
      );
      
      // 更新游戏状态
      mockGameState.currentPlayerIndex = 1;
      mockGameState.rounds = [round];
      
      // 玩家1要不起
      await scheduler.onPassCompleted(
        1,
        round,
        mockGameState.players,
        4,
        (updater) => {
          mockGameState = updater(mockGameState);
        },
        onRoundEnd
      );

      // 应该标记为接风轮
      const updatedRound = mockGameState.rounds[mockGameState.currentRoundIndex];
      expect(updatedRound.isTakeoverRoundActive()).toBe(true);
      expect(updatedRound.getTakeoverStartPlayerIndex()).toBe(1);
      expect(updatedRound.getTakeoverEndPlayerIndex()).toBe(0);
      
      // 应该继续下一个玩家（玩家2）
      expect(nextTurnCalls.length).toBe(1);
      expect(nextTurnCalls[0]).toBe(2);
    });

    it('如果没有上家出牌，不应该开始接风轮询', async () => {
      const round = Round.createNew(1, 0);
      mockGameState.rounds = [round];
      
      // 玩家1要不起，但没有上家出牌
      await scheduler.onPassCompleted(
        1,
        round,
        mockGameState.players,
        4,
        (updater) => {
          mockGameState = updater(mockGameState);
        },
        onRoundEnd
      );

      // 不应该标记为接风轮
      const updatedRound = mockGameState.rounds[mockGameState.currentRoundIndex];
      expect(updatedRound.isTakeoverRoundActive()).toBe(false);
      
      // 应该继续下一个玩家（正常轮）
      expect(nextTurnCalls.length).toBe(1);
      expect(nextTurnCalls[0]).toBe(2);
    });
  });

  describe('onPassCompleted - 接风轮询进行中', () => {
    beforeEach(() => {
      nextTurnCalls = [];
      roundEndCalls = [];
    });

    it('应该继续接风轮询到下一个玩家', async () => {
      const round = mockGameState.rounds[0];
      const player0Cards = [createCard(Suit.SPADES, Rank.THREE), createCard(Suit.HEARTS, Rank.THREE)];
      const playedCards = [createCard(Suit.SPADES, Rank.THREE), createCard(Suit.HEARTS, Rank.THREE)];
      
      // 玩家0出牌
      const play = canPlayCards(playedCards);
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: 'Player 0',
        cards: playedCards,
        scoreCards: [],
        score: 0
      };
      if (play) {
        round.recordPlay(playRecord, play);
      }
      
      // 开始接风轮询（玩家1要不起）
      round.startTakeoverRound(1, 0);
      mockGameState.rounds = [round];
      mockGameState.currentPlayerIndex = 2;
      
      // 玩家2也要不起
      await scheduler.onPassCompleted(
        2,
        round,
        mockGameState.players,
        4,
        (updater) => {
          mockGameState = updater(mockGameState);
        },
        onRoundEnd
      );

      // 应该继续接风轮询
      const updatedRound = mockGameState.rounds[mockGameState.currentRoundIndex];
      expect(updatedRound.isTakeoverRoundActive()).toBe(true);
      
      // 应该继续下一个玩家（玩家3）
      expect(nextTurnCalls.length).toBe(1);
      expect(nextTurnCalls[0]).toBe(3);
    });

    it('当接风轮询完成时（回到出牌玩家），应该结束本轮', async () => {
      const round = mockGameState.rounds[0];
      const player0Cards = [createCard(Suit.SPADES, Rank.THREE), createCard(Suit.HEARTS, Rank.THREE)];
      const playedCards = [createCard(Suit.SPADES, Rank.THREE), createCard(Suit.HEARTS, Rank.THREE)];
      
      // 玩家0出牌
      const play = canPlayCards(playedCards);
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: 'Player 0',
        cards: playedCards,
        scoreCards: [],
        score: 0
      };
      if (play) {
        round.recordPlay(playRecord, play);
      }
      
      // 接风轮询进行中：玩家1、2、3都要不起
      round.startTakeoverRound(1, 0);
      mockGameState.rounds = [round];
      mockGameState.currentPlayerIndex = 0; // 回到玩家0
      
      // 玩家0（出牌玩家）要不起（实际上这不应该发生，但测试边界情况）
      await scheduler.onPassCompleted(
        0,
        round,
        mockGameState.players,
        4,
        (updater) => {
          mockGameState = updater(mockGameState);
        },
        onRoundEnd
      );

      // 应该调用onRoundEnd，结束本轮
      expect(roundEndCalls.length).toBe(1);
      expect(roundEndCalls[0].savedWinnerIndex).toBe(0); // 玩家0是接风玩家
      
      // 不应该继续下一个玩家
      expect(nextTurnCalls.length).toBe(0);
    });
  });

  describe('onPlayCompleted - 接风轮询中玩家出牌', () => {
    beforeEach(() => {
      nextTurnCalls = [];
      roundEndCalls = [];
    });

    it('当接风轮询中有玩家出牌时，应该结束接风轮询', async () => {
      const round = mockGameState.rounds[0];
      const player0Cards = [createCard(Suit.SPADES, Rank.THREE), createCard(Suit.HEARTS, Rank.THREE)];
      const playedCards0 = [createCard(Suit.SPADES, Rank.THREE), createCard(Suit.HEARTS, Rank.THREE)];
      
      // 玩家0出牌
      const play0 = canPlayCards(playedCards0);
      const playRecord0: RoundPlayRecord = {
        playerId: 0,
        playerName: 'Player 0',
        cards: playedCards0,
        scoreCards: [],
        score: 0
      };
      if (play0) {
        round.recordPlay(playRecord0, play0);
      }
      
      // 开始接风轮询（玩家1要不起）
      round.startTakeoverRound(1, 0);
      mockGameState.rounds = [round];
      
      const player2Cards = [createCard(Suit.DIAMONDS, Rank.FOUR), createCard(Suit.CLUBS, Rank.FOUR)];
      const playedCards2 = [createCard(Suit.DIAMONDS, Rank.FOUR), createCard(Suit.CLUBS, Rank.FOUR)];
      
      // 玩家2出牌（要得起）
      const play2 = canPlayCards(playedCards2);
      const playRecord2: RoundPlayRecord = {
        playerId: 2,
        playerName: 'Player 2',
        cards: playedCards2,
        scoreCards: [],
        score: 0
      };
      if (play2) {
        round.recordPlay(playRecord2, play2);
      }
      
      // 确保 mockGameState 中的 round 是最新的
      mockGameState.rounds = [round];
      
      await scheduler.onPlayCompleted(
        2,
        round,
        mockGameState.players,
        4,
        (updater) => {
          mockGameState = updater(mockGameState);
        },
        onRoundEnd
      );

      // 应该结束接风轮询
      const updatedRound = mockGameState.rounds[mockGameState.currentRoundIndex];
      expect(updatedRound.isTakeoverRoundActive()).toBe(false);
      
      // 应该继续下一个玩家（正常轮）
      expect(nextTurnCalls.length).toBe(1);
      expect(nextTurnCalls[0]).toBe(3);
    });
  });
});

describe('RoundScheduler 集成测试 - 完整接风流程', () => {
  let scheduler: RoundScheduler;
  let mockGameState: any;
  let nextTurnCalls: number[];
  let roundEndCalls: any[];

  beforeEach(() => {
    nextTurnCalls = [];
    roundEndCalls = [];
    
    mockGameState = {
      status: GameStatus.PLAYING,
      currentPlayerIndex: 0,
      rounds: [Round.createNew(1, 0)],
      currentRoundIndex: 0,
      players: [
        createPlayer(0, 'Player 0', [createCard(Suit.SPADES, Rank.THREE)]),
        createPlayer(1, 'Player 1', [createCard(Suit.HEARTS, Rank.FOUR)]),
        createPlayer(2, 'Player 2', [createCard(Suit.DIAMONDS, Rank.FIVE)]),
        createPlayer(3, 'Player 3', [createCard(Suit.CLUBS, Rank.SIX)])
      ]
    };

    const config: RoundSchedulerConfig = {
      isAutoPlay: false,
      humanPlayerIndex: 0,
      getGameState: () => mockGameState
    };

    scheduler = new RoundScheduler(config);
    scheduler.onNextTurnCallback = vi.fn(async (playerIndex: number, state: any) => {
      nextTurnCalls.push(playerIndex);
    });
    // 初始化轮次号
    scheduler.updateRoundNumber(1);
  });

    it('完整接风流程：玩家0出牌 -> 玩家1要不起 -> 玩家2要不起 -> 玩家3要得起', async () => {
      const round = mockGameState.rounds[0];
      const playedCards0 = [createCard(Suit.SPADES, Rank.THREE), createCard(Suit.HEARTS, Rank.THREE)];
      
      // 步骤1：玩家0出牌
      const play0 = canPlayCards(playedCards0);
      const playRecord0: RoundPlayRecord = {
        playerId: 0,
        playerName: 'Player 0',
        cards: playedCards0,
        scoreCards: [],
        score: 0
      };
      if (play0) {
        round.recordPlay(playRecord0, play0);
      }
    mockGameState.currentPlayerIndex = 1;
    mockGameState.rounds = [round];
    
    // 步骤2：玩家1要不起 -> 开始接风轮询
    await scheduler.onPassCompleted(
      1,
      round,
      mockGameState.players,
      4,
      (updater) => { mockGameState = updater(mockGameState); },
      vi.fn()
    );
    
    expect(round.isTakeoverRoundActive()).toBe(true);
    expect(round.getTakeoverStartPlayerIndex()).toBe(1);
    expect(round.getTakeoverEndPlayerIndex()).toBe(0);
    expect(nextTurnCalls[0]).toBe(2); // 应该轮到玩家2
    
    // 重置回调调用记录
    nextTurnCalls = [];
    
    // 步骤3：玩家2要不起 -> 继续接风轮询
    mockGameState.currentPlayerIndex = 2;
    await scheduler.onPassCompleted(
      2,
      round,
      mockGameState.players,
      4,
      (updater) => { mockGameState = updater(mockGameState); },
      vi.fn()
    );
    
    expect(round.isTakeoverRoundActive()).toBe(true);
    expect(nextTurnCalls[0]).toBe(3); // 应该轮到玩家3
    
    // 重置回调调用记录
    nextTurnCalls = [];
    
    // 步骤4：玩家3出牌 -> 结束接风轮询
      const playedCards3 = [createCard(Suit.CLUBS, Rank.FOUR), createCard(Suit.SPADES, Rank.FOUR)];
      const play3 = canPlayCards(playedCards3);
      const playRecord3: RoundPlayRecord = {
        playerId: 3,
        playerName: 'Player 3',
        cards: playedCards3,
        scoreCards: [],
        score: 0
      };
      if (play3) {
        round.recordPlay(playRecord3, play3);
      }
    mockGameState.currentPlayerIndex = 3;
    
    await scheduler.onPlayCompleted(
      3,
      round,
      mockGameState.players,
      4,
      (updater) => { mockGameState = updater(mockGameState); },
      vi.fn()
    );
    
    expect(round.isTakeoverRoundActive()).toBe(false); // 接风轮询应该结束
    expect(nextTurnCalls[0]).toBe(0); // 应该轮到玩家0（正常轮）
  });

    it('完整接风流程：所有玩家都要不起，回到出牌玩家', async () => {
      const round = mockGameState.rounds[0];
      const playedCards0 = [createCard(Suit.SPADES, Rank.THREE), createCard(Suit.HEARTS, Rank.THREE)];
      
      // 步骤1：玩家0出牌
      const play0 = canPlayCards(playedCards0);
      const playRecord0: RoundPlayRecord = {
        playerId: 0,
        playerName: 'Player 0',
        cards: playedCards0,
        scoreCards: [],
        score: 0
      };
      if (play0) {
        round.recordPlay(playRecord0, play0);
      }
    mockGameState.currentPlayerIndex = 1;
    mockGameState.rounds = [round];
    
    const onRoundEnd = vi.fn(async (round: Round, players: Player[], nextPlayerIndex: number | null, savedWinnerIndex?: number | null) => {
      roundEndCalls.push({ round, players, nextPlayerIndex, savedWinnerIndex });
    });
    
    // 步骤2：玩家1要不起 -> 开始接风轮询
    await scheduler.onPassCompleted(1, round, mockGameState.players, 4, (updater) => { mockGameState = updater(mockGameState); }, onRoundEnd);
    nextTurnCalls = [];
    
    // 步骤3：玩家2要不起 -> 继续接风轮询
    mockGameState.currentPlayerIndex = 2;
    await scheduler.onPassCompleted(2, round, mockGameState.players, 4, (updater) => { mockGameState = updater(mockGameState); }, onRoundEnd);
    nextTurnCalls = [];
    
    // 步骤4：玩家3要不起 -> 继续接风轮询
    mockGameState.currentPlayerIndex = 3;
    await scheduler.onPassCompleted(3, round, mockGameState.players, 4, (updater) => { mockGameState = updater(mockGameState); }, onRoundEnd);
    nextTurnCalls = [];
    
    // 步骤5：回到玩家0（出牌玩家）-> 接风轮询完成，应该结束本轮
    mockGameState.currentPlayerIndex = 0;
    await scheduler.onPassCompleted(0, round, mockGameState.players, 4, (updater) => { mockGameState = updater(mockGameState); }, onRoundEnd);
    
    // 应该调用onRoundEnd，玩家0是接风玩家
    expect(roundEndCalls.length).toBe(1);
    expect(roundEndCalls[0].savedWinnerIndex).toBe(0);
    expect(roundEndCalls[0].nextPlayerIndex).toBe(0); // 下一轮由玩家0开始
  });
});


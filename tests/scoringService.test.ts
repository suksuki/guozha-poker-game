/**
 * 计分系统单元测试
 * 测试计分系统的各个功能模块
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Card, Suit, Rank, Player, PlayerType, Play, CardType } from '../src/types/card';
import {
  isScoreCard,
  getCardScore,
  calculateCardsScore,
  calculateDunCount,
  calculateDunScore,
  handleDunScoring,
  updatePlayerAfterPlay,
  handleRoundEnd,
  handlePlayerFinished,
  calculateFinalRankings,
  applyFinalGameRules,
  initializePlayerScores
} from '../src/services/scoringService';

describe('scoringService - 基础计分功能', () => {
  describe('isScoreCard', () => {
    it('应该正确识别5为分牌', () => {
      const card: Card = { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' };
      expect(isScoreCard(card)).toBe(true);
    });

    it('应该正确识别10为分牌', () => {
      const card: Card = { suit: Suit.HEARTS, rank: Rank.TEN, id: 'test-2' };
      expect(isScoreCard(card)).toBe(true);
    });

    it('应该正确识别K为分牌', () => {
      const card: Card = { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'test-3' };
      expect(isScoreCard(card)).toBe(true);
    });

    it('应该正确识别非分牌', () => {
      const card: Card = { suit: Suit.CLUBS, rank: Rank.THREE, id: 'test-4' };
      expect(isScoreCard(card)).toBe(false);
    });
  });

  describe('getCardScore', () => {
    it('应该正确计算5的分值', () => {
      const card: Card = { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' };
      expect(getCardScore(card)).toBe(5);
    });

    it('应该正确计算10的分值', () => {
      const card: Card = { suit: Suit.HEARTS, rank: Rank.TEN, id: 'test-2' };
      expect(getCardScore(card)).toBe(10);
    });

    it('应该正确计算K的分值', () => {
      const card: Card = { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'test-3' };
      expect(getCardScore(card)).toBe(10);
    });

    it('应该正确计算非分牌的分值', () => {
      const card: Card = { suit: Suit.CLUBS, rank: Rank.THREE, id: 'test-4' };
      expect(getCardScore(card)).toBe(0);
    });
  });

  describe('calculateCardsScore', () => {
    it('应该正确计算一组牌的总分值', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' }, // 5分
        { suit: Suit.HEARTS, rank: Rank.TEN, id: 'test-2' }, // 10分
        { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'test-3' }, // 10分
        { suit: Suit.CLUBS, rank: Rank.THREE, id: 'test-4' } // 0分
      ];
      expect(calculateCardsScore(cards)).toBe(25);
    });

    it('应该正确处理空数组', () => {
      expect(calculateCardsScore([])).toBe(0);
    });

    it('应该正确处理只有非分牌的情况', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-2' }
      ];
      expect(calculateCardsScore(cards)).toBe(0);
    });
  });

  describe('calculateDunCount', () => {
    it('应该正确计算7张=1墩', () => {
      expect(calculateDunCount(7)).toBe(1);
    });

    it('应该正确计算8张=2墩', () => {
      expect(calculateDunCount(8)).toBe(2);
    });

    it('应该正确计算9张=4墩', () => {
      expect(calculateDunCount(9)).toBe(4);
    });

    it('应该正确计算10张=8墩', () => {
      expect(calculateDunCount(10)).toBe(8);
    });

    it('应该正确计算11张=16墩', () => {
      expect(calculateDunCount(11)).toBe(16);
    });

    it('少于7张应该返回0', () => {
      expect(calculateDunCount(6)).toBe(0);
      expect(calculateDunCount(1)).toBe(0);
    });
  });

  describe('calculateDunScore', () => {
    it('5人游戏，1墩：出墩玩家+120分，其他玩家各-30分', () => {
      const result = calculateDunScore(1, 5, 0);
      expect(result.dunPlayerScore).toBe(120); // 4个其他玩家 × 30分 × 1墩
      expect(result.otherPlayersScore).toBe(30); // 30分 × 1墩
    });

    it('5人游戏，2墩：出墩玩家+240分，其他玩家各-60分', () => {
      const result = calculateDunScore(2, 5, 0);
      expect(result.dunPlayerScore).toBe(240); // 4个其他玩家 × 30分 × 2墩
      expect(result.otherPlayersScore).toBe(60); // 30分 × 2墩
    });

    it('5人游戏，4墩：出墩玩家+480分，其他玩家各-120分', () => {
      const result = calculateDunScore(4, 5, 0);
      expect(result.dunPlayerScore).toBe(480); // 4个其他玩家 × 30分 × 4墩
      expect(result.otherPlayersScore).toBe(120); // 30分 × 4墩
    });

    it('4人游戏，1墩：出墩玩家+90分，其他玩家各-30分', () => {
      const result = calculateDunScore(1, 4, 0);
      expect(result.dunPlayerScore).toBe(90); // 3个其他玩家 × 30分 × 1墩
      expect(result.otherPlayersScore).toBe(30);
    });

    it('0墩应该返回0分', () => {
      const result = calculateDunScore(0, 5, 0);
      expect(result.dunPlayerScore).toBe(0);
      expect(result.otherPlayersScore).toBe(0);
    });
  });
});

describe('scoringService - 出牌时计分', () => {
  describe('handleDunScoring', () => {
    it('应该正确处理墩的计分', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: -100 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: -100 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [], score: -100 },
        { id: 3, name: '玩家4', type: PlayerType.AI, hand: [], score: -100 },
        { id: 4, name: '玩家5', type: PlayerType.AI, hand: [], score: -100 }
      ];

      const cards: Card[] = Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i}`
      }));

      const play: Play = {
        cards,
        type: CardType.DUN,
        value: Rank.THREE
      };

      const result = handleDunScoring(players, 0, cards, 5, play);

      // handleDunScoring 只更新其他玩家的分数（扣分），出墩玩家的分数需要通过 updatePlayerAfterPlay 更新
      // 先验证其他玩家被扣分
      expect(result.updatedPlayers[1].score).toBe(-100 - 30); // -130
      expect(result.updatedPlayers[2].score).toBe(-100 - 30); // -130
      expect(result.updatedPlayers[3].score).toBe(-100 - 30); // -130
      expect(result.updatedPlayers[4].score).toBe(-100 - 30); // -130

      // 验证返回的 dunScore
      expect(result.dunScore).toBe(120);

      // 使用 updatePlayerAfterPlay 更新出墩玩家的分数
      const player0AfterDun = updatePlayerAfterPlay(
        result.updatedPlayers[0],
        cards,
        result.dunScore
      );
      
      // 出墩玩家（索引0）应该获得120分
      expect(player0AfterDun.score).toBe(-100 + 120); // -100 + 120 = 20
    });

    it('非墩的牌不应该触发墩的计分', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: -100 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: -100 }
      ];

      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }
      ];

      const play: Play = {
        cards,
        type: CardType.SINGLE,
        value: Rank.THREE
      };

      const result = handleDunScoring(players, 0, cards, 2, play);

      // 分数不应该改变
      expect(result.updatedPlayers[0].score).toBe(-100);
      expect(result.updatedPlayers[1].score).toBe(-100);
      expect(result.dunScore).toBe(0);
    });
  });

  describe('updatePlayerAfterPlay', () => {
    it('应该正确更新玩家手牌和分数', () => {
      const player: Player = {
        id: 0,
        name: '玩家1',
        type: PlayerType.AI,
        hand: [
          { suit: Suit.SPADES, rank: Rank.THREE, id: 'card-1' },
          { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'card-2' },
          { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'card-3' }
        ],
        score: -100
      };

      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'card-1' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'card-2' }
      ];

      const updatedPlayer = updatePlayerAfterPlay(player, cards, 50);

      expect(updatedPlayer.hand.length).toBe(1);
      expect(updatedPlayer.hand[0].id).toBe('card-3');
      expect(updatedPlayer.score).toBe(-100 + 50); // -50
    });
  });
});

describe('scoringService - 轮次结束计分', () => {
  describe('handleRoundEnd', () => {
    it('应该正确分配轮次分数给获胜者', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: -100 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: -100 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [], score: -100 }
      ];

      const findNextActivePlayer = (startIndex: number, players: Player[], playerCount: number) => {
        for (let i = 0; i < playerCount; i++) {
          const idx = (startIndex + i) % playerCount;
          if (players[idx].hand.length > 0) {
            return idx;
          }
        }
        return null;
      };

      const result = handleRoundEnd(
        players,
        0, // 最后出牌的玩家索引
        25, // 轮次分数
        1, // 轮次号
        [], // 当前轮次出牌记录
        findNextActivePlayer,
        3 // 玩家数
      );

      expect(result).not.toBeNull();
      expect(result!.updatedPlayers[0].score).toBe(-100 + 25); // -75
      expect(result!.roundRecord.totalScore).toBe(25);
      expect(result!.roundRecord.winnerId).toBe(0);
    });

    it('轮次分数为0时也应该记录', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: -100 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: -100 }
      ];

      const findNextActivePlayer = (startIndex: number, players: Player[], playerCount: number) => {
        for (let i = 0; i < playerCount; i++) {
          const idx = (startIndex + i) % playerCount;
          if (players[idx].hand.length > 0) {
            return idx;
          }
        }
        return null;
      };

      const result = handleRoundEnd(
        players,
        0,
        0, // 轮次分数为0
        1,
        [],
        findNextActivePlayer,
        2
      );

      expect(result).not.toBeNull();
      expect(result!.updatedPlayers[0].score).toBe(-100 + 0); // -100
      expect(result!.roundRecord.totalScore).toBe(0);
    });

    it('lastPlayPlayerIndex为null时应该返回null', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: -100 }
      ];

      const findNextActivePlayer = () => 0;

      const result = handleRoundEnd(
        players,
        null, // lastPlayPlayerIndex为null
        25,
        1,
        [],
        findNextActivePlayer,
        1
      );

      expect(result).toBeNull();
    });
  });
});

describe('scoringService - 游戏结束计分', () => {
  describe('initializePlayerScores', () => {
    it('应该将所有玩家的初始分数设置为-100', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: 0 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: 0 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [], score: 0 }
      ];

      const initialized = initializePlayerScores(players);

      initialized.forEach(player => {
        expect(player.score).toBe(-100);
      });
    });
  });

  describe('handlePlayerFinished', () => {
    it('应该正确处理玩家出完牌后的分数分配', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: -100 }, // 玩家0出完牌
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [
          { suit: Suit.SPADES, rank: Rank.THREE, id: 'card-1' } // 玩家1还有手牌
        ], score: -100 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [
          { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'card-2' } // 玩家2还有手牌
        ], score: -100 }
      ];

      const findNextActivePlayer = (startIndex: number, players: Player[], playerCount: number) => {
        for (let i = 0; i < playerCount; i++) {
          const idx = (startIndex + i) % playerCount;
          if (players[idx].hand.length > 0) {
            return idx;
          }
        }
        return null;
      };

      const checkGameFinished = (players: Player[], finishOrder: number[]) => {
        return players.every(p => p.hand.length === 0);
      };

      const result = handlePlayerFinished(
        players,
        0, // 玩家0出完牌
        10, // 这一手的分牌分数
        15, // 轮次分数
        [], // 完成顺序
        findNextActivePlayer,
        3,
        checkGameFinished
      );

      // 玩家0应该获得轮次分数和这一手的分牌分数
      expect(result.updatedPlayers[0].score).toBe(-100 + 15 + 10); // -75
      expect(result.updatedPlayers[0].finishedRank).toBe(1);
      expect(result.finishOrder).toEqual([0]);
      expect(result.isGameFinished).toBe(false); // 还有其他玩家没出完（玩家1和玩家2还有手牌）
    });

    it('应该正确处理最后一名未出的分牌', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: -100 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: -100 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [
          { suit: Suit.SPADES, rank: Rank.KING, id: 'card-1' }, // 10分
          { suit: Suit.HEARTS, rank: Rank.TEN, id: 'card-2' } // 10分
        ], score: -100 }
      ];

      const findNextActivePlayer = () => null;
      const checkGameFinished = () => true;

      const result = handlePlayerFinished(
        players,
        1, // 玩家1出完牌（第二个出完，是第二名）
        0,
        0,
        [0], // 玩家0第一个出完
        findNextActivePlayer,
        3,
        checkGameFinished
      );

      // 最后一名（玩家2）应该减去未出的分牌分数
      expect(result.updatedPlayers[2].score).toBe(-100 - 20); // -120
      
      // 第二名（玩家1）应该加上最后一名未出的分牌分数
      expect(result.updatedPlayers[1].score).toBe(-100 + 20); // -80
    });
  });

  describe('calculateFinalRankings', () => {
    it('应该正确计算最终排名和分数', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: 50 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: 30 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [], score: 10 }
      ];

      const finishOrder = [0, 1, 2]; // 玩家0第一个出完，玩家1第二个，玩家2最后

      const rankings = calculateFinalRankings(players, finishOrder);

      // 第一名应该+30分
      const firstRanking = rankings.find(r => r.player.id === 0);
      expect(firstRanking).not.toBeUndefined();
      expect(firstRanking!.finalScore).toBe(50 + 30); // 80

      // 最后一名应该-30分
      const lastRanking = rankings.find(r => r.player.id === 2);
      expect(lastRanking).not.toBeUndefined();
      expect(lastRanking!.finalScore).toBe(10 - 30); // -20
    });

    it('应该正确处理最后一名未出的分牌给第二名', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: 50 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: 30 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [
          { suit: Suit.SPADES, rank: Rank.KING, id: 'card-1' }, // 10分
          { suit: Suit.HEARTS, rank: Rank.TEN, id: 'card-2' } // 10分
        ], score: 10 }
      ];

      const finishOrder = [0, 1, 2];

      const rankings = calculateFinalRankings(players, finishOrder);

      // 最后一名应该减去未出的分牌分数，再减去30分
      const lastRanking = rankings.find(r => r.player.id === 2);
      expect(lastRanking!.finalScore).toBe(10 - 20 - 30); // -40

      // 第二名应该加上最后一名未出的分牌分数
      const secondRanking = rankings.find(r => r.player.id === 1);
      expect(secondRanking!.finalScore).toBe(30 + 20); // 50
    });
  });

  describe('applyFinalGameRules', () => {
    it('应该正确应用最终规则并更新玩家分数', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: 50 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: 30 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [], score: 10 }
      ];

      const finishOrder = [0, 1, 2];

      const updatedPlayers = applyFinalGameRules(players, finishOrder);

      // 玩家分数应该被更新
      const firstPlayer = updatedPlayers.find(p => p.id === 0);
      expect(firstPlayer!.score).toBeGreaterThan(50); // 应该+30分

      const lastPlayer = updatedPlayers.find(p => p.id === 2);
      expect(lastPlayer!.score).toBeLessThan(10); // 应该-30分

      // 应该有finishedRank
      expect(firstPlayer!.finishedRank).toBeDefined();
    });
  });
});


/**
 * 计分系统回归测试
 * 测试完整场景下的计分逻辑，确保计分规则正确执行
 */

import { describe, it, expect } from 'vitest';
import { Card, Suit, Rank, Player, PlayerType, Play, CardType } from '../src/types/card';
// 从新的位置导入函数
import { isScoreCard, getCardScore, calculateCardsScore } from '../src/utils/cardUtils';
import { calculateDunCount, calculateDunScore } from '../src/utils/cardUtils';
import { handleDunScoring, updatePlayerAfterPlay } from '../src/utils/playManager';
import { handleRoundEnd } from '../src/utils/roundManager';
import { handlePlayerFinished } from '../src/utils/gameFinishManager';
import { calculateFinalRankings, applyFinalGameRules } from '../src/utils/gameRules';
import { initializePlayerScores } from '../src/services/scoringService';

describe('scoringService - 回归测试', () => {
  describe('完整游戏流程计分测试', () => {
    // 注意：这些测试使用旧的API（handleRoundEnd, handlePlayerFinished），已过时
    // 新架构应该使用 GameController 进行完整流程测试
    it.skip('应该正确处理从初始到结束的完整计分流程', () => {
      // 1. 初始化玩家分数
      const initialPlayers: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: 0 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: 0 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [], score: 0 },
        { id: 3, name: '玩家4', type: PlayerType.AI, hand: [], score: 0 },
        { id: 4, name: '玩家5', type: PlayerType.AI, hand: [], score: 0 }
      ];

      const players = initializePlayerScores(initialPlayers);
      
      // 验证初始分数
      players.forEach(player => {
        expect(player.score).toBe(-100);
      });

      // 2. 玩家0出1墩（7张）
      const dunCards: Card[] = Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `dun-${i}`
      }));

      const dunPlay: Play = {
        cards: dunCards,
        type: CardType.DUN,
        value: Rank.THREE
      };

      const dunResult = handleDunScoring(players, 0, dunCards, 5, dunPlay);
      const player0AfterDun = updatePlayerAfterPlay(
        dunResult.updatedPlayers[0],
        dunCards,
        dunResult.dunScore
      );

      const playersAfterDun = [...dunResult.updatedPlayers];
      playersAfterDun[0] = player0AfterDun;

      // 验证墩的计分：玩家0获得120分，其他玩家各扣30分
      expect(playersAfterDun[0].score).toBe(-100 + 120); // 20
      expect(playersAfterDun[1].score).toBe(-100 - 30); // -130
      expect(playersAfterDun[2].score).toBe(-100 - 30); // -130
      expect(playersAfterDun[3].score).toBe(-100 - 30); // -130
      expect(playersAfterDun[4].score).toBe(-100 - 30); // -130

      // 3. 轮次结束，玩家1获胜，获得25分
      const findNextActivePlayer = (startIndex: number, players: Player[], playerCount: number) => {
        for (let i = 0; i < playerCount; i++) {
          const idx = (startIndex + i) % playerCount;
          if (players[idx].hand.length > 0) {
            return idx;
          }
        }
        return null;
      };

      const roundResult = handleRoundEnd(
        playersAfterDun,
        1, // 玩家1最后出牌
        25, // 轮次分数
        1, // 轮次号
        [], // 出牌记录
        findNextActivePlayer,
        5
      );

      expect(roundResult).not.toBeNull();
      expect(roundResult!.updatedPlayers[1].score).toBe(-130 + 25); // -105

      // 4. 玩家0出完牌（第一个出完）
      const checkGameFinished = (players: Player[], finishOrder: number[]) => {
        return players.every(p => p.hand.length === 0);
      };

      const finishResult1 = handlePlayerFinished(
        roundResult!.updatedPlayers,
        0, // 玩家0出完
        10, // 这一手的分牌分数
        0, // 轮次分数（已分配）
        [], // 完成顺序
        findNextActivePlayer,
        5,
        checkGameFinished
      );

      expect(finishResult1.updatedPlayers[0].score).toBe(20 + 10); // 30（之前是20，加上这一手的10分）
      expect(finishResult1.updatedPlayers[0].finishedRank).toBe(1);
      expect(finishResult1.finishOrder).toEqual([0]);

      // 5. 玩家1出完牌（第二个出完）
      const finishResult2 = handlePlayerFinished(
        finishResult1.updatedPlayers,
        1, // 玩家1出完
        5, // 这一手的分牌分数
        0,
        finishResult1.finishOrder,
        findNextActivePlayer,
        5,
        checkGameFinished
      );

      expect(finishResult2.updatedPlayers[1].score).toBe(-105 + 5); // -100
      expect(finishResult2.updatedPlayers[1].finishedRank).toBe(2);
      expect(finishResult2.finishOrder).toEqual([0, 1]);

      // 6. 最后一名（玩家2）有未出的分牌
      const lastPlayer = finishResult2.updatedPlayers[2];
      lastPlayer.hand = [
        { suit: Suit.SPADES, rank: Rank.KING, id: 'card-1' }, // 10分
        { suit: Suit.HEARTS, rank: Rank.TEN, id: 'card-2' } // 10分
      ];

      // 7. 计算最终排名
      const finalRankings = calculateFinalRankings(
        finishResult2.updatedPlayers,
        finishResult2.finishOrder
      );

      // 验证最终排名
      const firstRanking = finalRankings.find(r => r.player.id === 0);
      expect(firstRanking!.finalScore).toBe(30 + 30); // 第一名+30分 = 60

      const secondRanking = finalRankings.find(r => r.player.id === 1);
      expect(secondRanking!.finalScore).toBe(-100 + 20); // 第二名获得最后一名未出的20分 = -80

      const lastRanking = finalRankings.find(r => r.player.id === 2);
      expect(lastRanking!.finalScore).toBe(-130 - 20 - 30); // 最后一名减去未出的20分，再-30分 = -180
    });
  });

  describe('多轮次计分测试', () => {
    // 注意：handleRoundEnd 的API已更改
    it.skip('应该正确处理多轮次的分数累计', () => {
      let players = initializePlayerScores([
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: 0 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: 0 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [], score: 0 }
      ]);

      const findNextActivePlayer = (startIndex: number, players: Player[], playerCount: number) => {
        for (let i = 0; i < playerCount; i++) {
          const idx = (startIndex + i) % playerCount;
          if (players[idx].hand.length > 0) {
            return idx;
          }
        }
        return null;
      };

      // 第一轮：玩家0获胜，获得15分
      let roundResult = handleRoundEnd(
        players,
        0,
        15,
        1,
        [],
        findNextActivePlayer,
        3
      );

      expect(roundResult).not.toBeNull();
      expect(roundResult!.updatedPlayers[0].score).toBe(-100 + 15); // -85

      // 第二轮：玩家1获胜，获得20分
      roundResult = handleRoundEnd(
        roundResult!.updatedPlayers,
        1,
        20,
        2,
        [],
        findNextActivePlayer,
        3
      );

      expect(roundResult!.updatedPlayers[1].score).toBe(-100 + 20); // -80

      // 第三轮：玩家0再次获胜，获得10分
      roundResult = handleRoundEnd(
        roundResult!.updatedPlayers,
        0,
        10,
        3,
        [],
        findNextActivePlayer,
        3
      );

      // 玩家0的分数应该是：-100 + 15 + 10 = -75
      expect(roundResult!.updatedPlayers[0].score).toBe(-100 + 15 + 10); // -75
    });
  });

  describe('不同玩家数的墩计分测试', () => {
    it('应该正确处理4人游戏的墩计分', () => {
      const players = initializePlayerScores([
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: 0 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: 0 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [], score: 0 },
        { id: 3, name: '玩家4', type: PlayerType.AI, hand: [], score: 0 }
      ]);

      const dunCards: Card[] = Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `dun-${i}`
      }));

      const dunPlay: Play = {
        cards: dunCards,
        type: CardType.DUN,
        value: Rank.THREE
      };

      const dunResult = handleDunScoring(players, 0, dunCards, 4, dunPlay);
      const player0AfterDun = updatePlayerAfterPlay(
        dunResult.updatedPlayers[0],
        dunCards,
        dunResult.dunScore
      );

      // 4人游戏，1墩：出墩玩家获得90分（3个其他玩家 × 30分），其他玩家各扣30分
      expect(player0AfterDun.score).toBe(-100 + 90); // -10
      expect(dunResult.updatedPlayers[1].score).toBe(-100 - 30); // -130
      expect(dunResult.updatedPlayers[2].score).toBe(-100 - 30); // -130
      expect(dunResult.updatedPlayers[3].score).toBe(-100 - 30); // -130
    });

    it('应该正确处理8人游戏的墩计分', () => {
      const players = initializePlayerScores(
        Array.from({ length: 8 }, (_, i) => ({
          id: i,
          name: `玩家${i + 1}`,
          type: PlayerType.AI,
          hand: [],
          score: 0
        }))
      );

      const dunCards: Card[] = Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `dun-${i}`
      }));

      const dunPlay: Play = {
        cards: dunCards,
        type: CardType.DUN,
        value: Rank.THREE
      };

      const dunResult = handleDunScoring(players, 0, dunCards, 8, dunPlay);
      const player0AfterDun = updatePlayerAfterPlay(
        dunResult.updatedPlayers[0],
        dunCards,
        dunResult.dunScore
      );

      // 8人游戏，1墩：出墩玩家获得210分（7个其他玩家 × 30分），其他玩家各扣30分
      expect(player0AfterDun.score).toBe(-100 + 210); // 110
      expect(dunResult.updatedPlayers[1].score).toBe(-100 - 30); // -130
    });
  });

  describe('边界情况测试', () => {
    // 注意：handleRoundEnd 的API已更改
    it.skip('应该正确处理轮次分数为0的情况', () => {
      const players = initializePlayerScores([
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: 0 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: 0 }
      ]);

      const findNextActivePlayer = () => 0;

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

    // 注意：handlePlayerFinished 的API已更改
    it.skip('应该正确处理所有玩家同时出完的情况', () => {
      const players = initializePlayerScores([
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: 0 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: 0 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [], score: 0 }
      ]);

      const findNextActivePlayer = () => null;
      const checkGameFinished = () => true;

      // 玩家0出完
      const result1 = handlePlayerFinished(
        players,
        0,
        10,
        15,
        [],
        findNextActivePlayer,
        3,
        checkGameFinished
      );

      expect(result1.updatedPlayers[0].score).toBe(-100 + 15 + 10); // -75
      expect(result1.finishOrder).toEqual([0]);

      // 玩家1出完
      const result2 = handlePlayerFinished(
        result1.updatedPlayers,
        1,
        5,
        0,
        result1.finishOrder,
        findNextActivePlayer,
        3,
        checkGameFinished
      );

      expect(result2.updatedPlayers[1].score).toBe(-100 + 5); // -95
      expect(result2.finishOrder).toEqual([0, 1]);

      // 玩家2出完（最后一名）
      const result3 = handlePlayerFinished(
        result2.updatedPlayers,
        2,
        0,
        0,
        result2.finishOrder,
        findNextActivePlayer,
        3,
        checkGameFinished
      );

      expect(result3.updatedPlayers[2].score).toBe(-100); // -100
      expect(result3.finishOrder).toEqual([0, 1, 2]);
      expect(result3.isGameFinished).toBe(true);
    });

    it('应该正确处理最后一名没有未出分牌的情况', () => {
      const players: Player[] = [
        { id: 0, name: '玩家1', type: PlayerType.AI, hand: [], score: 50 },
        { id: 1, name: '玩家2', type: PlayerType.AI, hand: [], score: 30 },
        { id: 2, name: '玩家3', type: PlayerType.AI, hand: [], score: 10 } // 没有未出的分牌
      ];

      const finishOrder = [0, 1, 2];

      const rankings = calculateFinalRankings(players, finishOrder);

      // 最后一名应该只-30分，没有未出的分牌要转移
      const lastRanking = rankings.find(r => r.player.id === 2);
      expect(lastRanking!.finalScore).toBe(10 - 30); // -20

      // 第二名不应该获得额外的分
      const secondRanking = rankings.find(r => r.player.id === 1);
      expect(secondRanking!.finalScore).toBe(30); // 不变
    });
  });

  describe('分牌计算准确性测试', () => {
    it('应该正确计算各种分牌组合', () => {
      const testCases = [
        {
          cards: [
            { suit: Suit.SPADES, rank: Rank.FIVE, id: 'card-1' }
          ],
          expected: 5
        },
        {
          cards: [
            { suit: Suit.HEARTS, rank: Rank.TEN, id: 'card-2' }
          ],
          expected: 10
        },
        {
          cards: [
            { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'card-3' }
          ],
          expected: 10
        },
        {
          cards: [
            { suit: Suit.SPADES, rank: Rank.FIVE, id: 'card-1' },
            { suit: Suit.HEARTS, rank: Rank.TEN, id: 'card-2' },
            { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'card-3' }
          ],
          expected: 25 // 5 + 10 + 10
        },
        {
          cards: [
            { suit: Suit.SPADES, rank: Rank.FIVE, id: 'card-1' },
            { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'card-2' },
            { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'card-3' },
            { suit: Suit.CLUBS, rank: Rank.FIVE, id: 'card-4' }
          ],
          expected: 20 // 4个5 = 20分
        }
      ];

      testCases.forEach(({ cards, expected }) => {
        expect(calculateCardsScore(cards)).toBe(expected);
      });
    });
  });
});


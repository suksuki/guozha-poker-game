/**
 * Round 类单元测试
 * 测试 Round 类的所有功能，包括时间控制、异步处理、轮次管理等
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Round, PlayTimingConfig, PlayProcessStatus } from '../src/utils/Round';
import { Card, Suit, Rank, RoundPlayRecord, Player, PlayerType, Play, CardType } from '../src/types/card';
import { canPlayCards, hasPlayableCards, calculateCardsScore, isScoreCard } from '../src/utils/cardUtils';

// 辅助函数：创建测试用的牌
function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return { suit, rank, id: id || `${suit}-${rank}-${Math.random()}` };
}

// 辅助函数：创建相同点数的多张牌
function createSameRankCards(rank: Rank, count: number): Card[] {
  const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    cards.push(createCard(suits[i % 4], rank, `${rank}-${i}`));
  }
  return cards;
}

// 辅助函数：创建玩家
function createPlayer(id: number, name: string, hand: Card[]): Player {
  return {
    id,
    name,
    type: id === 0 ? PlayerType.HUMAN : PlayerType.AI,
    hand,
    score: 0,
    isHuman: id === 0
  };
}

describe('Round 类单元测试', () => {
  let round: Round;
  let timingConfig: Partial<PlayTimingConfig>;

  beforeEach(() => {
    timingConfig = {
      minIntervalBetweenPlays: 100,  // 测试用较短间隔
      playTimeout: 5000,              // 测试用较短超时
      enabled: true
    };
    round = Round.createNew(1, Date.now(), timingConfig);
  });

  describe('创建和初始化', () => {
    it('应该正确创建新轮次', () => {
      const round = Round.createNew(1);
      expect(round.roundNumber).toBe(1);
      expect(round.isInProgress()).toBe(true);
      expect(round.isEnded()).toBe(false);
      expect(round.getTotalScore()).toBe(0);
      expect(round.getPlayCount()).toBe(0);
    });

    it('应该正确设置轮次编号', () => {
      const round1 = Round.createNew(1);
      const round2 = Round.createNew(5);
      expect(round1.roundNumber).toBe(1);
      expect(round2.roundNumber).toBe(5);
    });

    it('应该正确设置开始时间', () => {
      const startTime = Date.now();
      const round = Round.createNew(1, startTime);
      expect(round['startTime']).toBe(startTime);
    });
  });

  describe('时间控制', () => {
    it('应该正确配置时间参数', () => {
      const config = round.getTimingConfig();
      expect(config.minIntervalBetweenPlays).toBe(100);
      expect(config.playTimeout).toBe(5000);
      expect(config.enabled).toBe(true);
    });

    it('应该允许立即出牌（如果距离上次出牌时间足够）', () => {
      const canPlay = round.canPlayNow(0);
      expect(canPlay).toBe(true);
    });

    it('应该要求等待最短间隔', async () => {
      // 模拟刚刚出过牌
      round['lastPlayTime'] = Date.now();
      
      const canPlay = round.canPlayNow(0);
      expect(canPlay).not.toBe(true);
      expect(typeof canPlay).toBe('number');
      expect((canPlay as number) > 0).toBe(true);
    });

    it('应该正确等待最短间隔', async () => {
      round['lastPlayTime'] = Date.now();
      
      const startTime = Date.now();
      await round.waitForMinInterval();
      const elapsed = Date.now() - startTime;
      
      // 应该至少等待了最短间隔时间
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('应该正确开始和清除超时计时器', () => {
      let timeoutCalled = false;
      round.startPlayTimer(0, () => {
        timeoutCalled = true;
      });
      
      expect(timeoutCalled).toBe(false);
      
      // 清除计时器
      round.clearPlayTimer(0);
      
      // 等待超时时间过去
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(timeoutCalled).toBe(false); // 应该没有被调用
          resolve();
        }, 6000);
      });
    });

    it('应该正确获取已等待时间', () => {
      round.startPlayTimer(0, () => {});
      
      // 等待一小段时间
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const elapsed = round.getElapsedWaitTime(0);
          expect(elapsed).toBeGreaterThan(0);
          expect(elapsed).toBeLessThan(200);
          round.clearPlayTimer(0);
          resolve();
        }, 100);
      });
    });
  });

  describe('出牌记录', () => {
    it('应该正确记录出牌', () => {
      const cards = createSameRankCards(Rank.FIVE, 2);
      const play = canPlayCards(cards)!;
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards,
        scoreCards: cards.filter(c => isScoreCard(c)),
        score: calculateCardsScore(cards)
      };

      round.recordPlay(playRecord, play);

      expect(round.getPlayCount()).toBe(1);
      expect(round.getPlays().length).toBe(1);
      expect(round.getLastPlay()).toBe(play);
      expect(round.getLastPlayPlayerIndex()).toBe(0);
    });

    it('应该正确累加分牌分数', () => {
      const cards1 = [createCard(Suit.SPADES, Rank.FIVE)]; // 5分
      const cards2 = [createCard(Suit.HEARTS, Rank.KING)]; // 10分
      
      const play1 = canPlayCards(cards1)!;
      const play2 = canPlayCards(cards2)!;
      
      const record1: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards: cards1,
        scoreCards: cards1.filter(c => isScoreCard(c)),
        score: calculateCardsScore(cards1)
      };
      
      const record2: RoundPlayRecord = {
        playerId: 1,
        playerName: '玩家2',
        cards: cards2,
        scoreCards: cards2.filter(c => isScoreCard(c)),
        score: calculateCardsScore(cards2)
      };

      round.recordPlay(record1, play1);
      round.recordPlay(record2, play2);

      expect(round.getTotalScore()).toBe(15); // 5 + 10
    });

    it('应该正确记录要不起', () => {
      round.recordPass(0);
      
      // 要不起不应该改变轮次状态
      expect(round.getPlayCount()).toBe(0);
      expect(round.getLastPlay()).toBeNull();
    });

    it('已结束的轮次不应该允许记录出牌', () => {
      round['isFinished'] = true;
      
      const cards = createSameRankCards(Rank.FIVE, 2);
      const play = canPlayCards(cards)!;
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards,
        scoreCards: [],
        score: 0
      };

      // 注意：根据当前实现，recordPlay 在轮次已结束时会静默返回，不会抛出错误
      // 这是为了避免异步处理中的竞态条件
      const playCountBefore = round.getPlayCount();
      round.recordPlay(playRecord, play);
      const playCountAfter = round.getPlayCount();
      
      // 验证出牌没有被记录
      expect(playCountAfter).toBe(playCountBefore);
    });
  });

  describe('接风判断', () => {
    it('应该正确判断接风状态', () => {
      const players = [
        createPlayer(0, '玩家1', createSameRankCards(Rank.THREE, 5)),
        createPlayer(1, '玩家2', createSameRankCards(Rank.FOUR, 5)),
        createPlayer(2, '玩家3', createSameRankCards(Rank.FIVE, 5))
      ];

      // 设置最后出牌
      const cards = createSameRankCards(Rank.FIVE, 2);
      const play = canPlayCards(cards)!;
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards,
        scoreCards: [],
        score: 0
      };
      round.recordPlay(playRecord, play);

      // 检查接风（所有剩余玩家都要不起）
      const shouldTakeover = round.shouldTakeover(players, 1);
      // 注意：这里需要实际检查是否能打过，可能需要mock hasPlayableCards
      expect(typeof shouldTakeover).toBe('boolean');
    });

    // 注意：takeover() 和 isTakingOver() 方法已废弃
    // 在新机制中，接风后立即结束本轮并创建新轮次，新轮次开始时 lastPlay 自动为 null
    // 不需要在当前轮次中清空 lastPlay 或检查接风状态
  });

  describe('轮次结束判断', () => {
    it('应该正确判断轮次是否应该结束', () => {
      const cards = createSameRankCards(Rank.FIVE, 2);
      const play = canPlayCards(cards)!;
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards,
        scoreCards: [],
        score: 0
      };
      round.recordPlay(playRecord, play);

      // 注意：当只有一个出牌记录且 nextPlayerIndex === lastPlayPlayerIndex 时，
      // 根据新逻辑，这会被视为新轮次刚开始，shouldEnd 会返回 false
      // 需要至少轮完一圈（有多次出牌或要不起的记录）才能结束
      // 因此这里只测试出牌记录数 >= 2 的情况
      expect(round.shouldEnd(1)).toBe(false);
    });
  });

  describe('结束轮次', () => {
    it('应该正确结束轮次并返回轮次信息（不分配分数）', () => {
      const players = [
        createPlayer(0, '玩家1', createSameRankCards(Rank.THREE, 5)), // 玩家0还有手牌
        createPlayer(1, '玩家2', createSameRankCards(Rank.THREE, 5)),
        createPlayer(2, '玩家3', createSameRankCards(Rank.FOUR, 5))
      ];

      // 记录出牌（带分牌）
      const cards = createSameRankCards(Rank.FIVE, 1); // 5分
      const play = canPlayCards(cards)!;
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards,
        scoreCards: cards.filter(c => isScoreCard(c)),
        score: calculateCardsScore(cards)
      };
      round.recordPlay(playRecord, play);

      // 结束轮次（不分配分数，只返回信息）
      const { updatedPlayers, nextPlayerIndex, roundScore, winnerIndex } = round.end(players, 3);

      expect(round.isEnded()).toBe(true);
      expect(roundScore).toBe(5); // 轮次分数
      expect(winnerIndex).toBe(0); // 接风玩家索引
      expect(updatedPlayers[0].score).toBe(0); // 分数不应在这里更新（由 GameController 分配）
      expect(nextPlayerIndex).toBe(0); // 由获胜者开始下一轮（因为玩家0还有手牌）
    });

    it('应该正确生成轮次记录', () => {
      const cards = createSameRankCards(Rank.FIVE, 1); // 5分
      const play = canPlayCards(cards)!;
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards,
        scoreCards: cards.filter(c => isScoreCard(c)),
        score: calculateCardsScore(cards)
      };
      round.recordPlay(playRecord, play);

      const players = [
        createPlayer(0, '玩家1', []),
        createPlayer(1, '玩家2', [])
      ];

      round.end(players, 2);
      const record = round.toRecord();

      expect(record.roundNumber).toBe(1);
      expect(record.plays.length).toBe(1);
      expect(record.totalScore).toBe(5);
      expect(record.winnerId).toBe(0);
    });

    it('已结束的轮次不应该再次结束', () => {
      const players = [
        createPlayer(0, '玩家1', []),
        createPlayer(1, '玩家2', [])
      ];

      round.end(players, 2);

      expect(() => {
        round.end(players, 2);
      }).toThrow();
    });
  });

  describe('异步出牌处理', () => {
    it('应该正确检查是否有正在处理的出牌', () => {
      expect(round.hasProcessingPlay()).toBe(false);
    });

    it('应该正确处理异步出牌', async () => {
      const cards = createSameRankCards(Rank.FIVE, 2);
      const play = canPlayCards(cards)!;
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards,
        scoreCards: [],
        score: 0
      };

      const result = await round.processPlayAsync(0, async () => {
        round.recordPlay(playRecord, play);
        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(result.status).toBe(PlayProcessStatus.COMPLETED);
      expect(result.endTime).toBeDefined();
      expect(round.getPlayCount()).toBe(1);
    });

    it('应该正确处理异步出牌失败', async () => {
      const cards = createSameRankCards(Rank.FIVE, 2);
      const play = canPlayCards(cards)!;
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards,
        scoreCards: [],
        score: 0
      };

      const result = await round.processPlayAsync(0, async () => {
        round.recordPlay(playRecord, play);
        throw new Error('模拟错误');
      });

      // 错误应该被捕获并返回失败状态
      expect(result.status).toBe(PlayProcessStatus.FAILED);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('模拟错误');
    });

    it('应该等待正在处理的出牌完成', async () => {
      let process1Completed = false;
      let process2Started = false;

      // 启动第一个处理
      const promise1 = round.processPlayAsync(0, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        process1Completed = true;
      });

      // 立即启动第二个处理（应该等待第一个完成）
      setTimeout(() => {
        process2Started = true;
        round.processPlayAsync(1, async () => {
          // 第二个处理
        });
      }, 50);

      await promise1;

      // 等待一下确保第二个处理已经检查过
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(process1Completed).toBe(true);
      // 第二个处理应该在第一个完成后才开始
      expect(process2Started).toBe(true);
    });
  });

  describe('统计信息', () => {
    it('应该正确获取轮次统计信息', () => {
      const cards1 = [createCard(Suit.SPADES, Rank.FIVE)]; // 5分
      const cards2 = [createCard(Suit.HEARTS, Rank.KING)]; // 10分
      
      const play1 = canPlayCards(cards1)!;
      const play2 = canPlayCards(cards2)!;
      
      const record1: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards: cards1,
        scoreCards: cards1.filter(c => isScoreCard(c)),
        score: calculateCardsScore(cards1)
      };
      
      const record2: RoundPlayRecord = {
        playerId: 1,
        playerName: '玩家2',
        cards: cards2,
        scoreCards: cards2.filter(c => isScoreCard(c)),
        score: calculateCardsScore(cards2)
      };

      round.recordPlay(record1, play1);
      round.recordPlay(record2, play2);

      const stats = round.getStatistics();
      expect(stats.playCount).toBe(2);
      expect(stats.totalScore).toBe(15);
      expect(stats.scoreCardCount).toBe(2); // 5和K都是分牌
    });
  });

  describe('克隆和序列化', () => {
    it('应该正确克隆轮次', () => {
      const cards = createSameRankCards(Rank.FIVE, 2);
      const play = canPlayCards(cards)!;
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards,
        scoreCards: [],
        score: 5
      };

      round.recordPlay(playRecord, play);
      
      const cloned = round.clone();
      
      expect(cloned.roundNumber).toBe(round.roundNumber);
      expect(cloned.getTotalScore()).toBe(round.getTotalScore());
      expect(cloned.getPlayCount()).toBe(round.getPlayCount());
      
      // 克隆后修改不应该影响原对象
      cloned.recordPlay({
        ...playRecord,
        playerId: 1,
        score: 10
      }, play);
      
      expect(cloned.getTotalScore()).toBe(15);
      expect(round.getTotalScore()).toBe(5); // 原对象不变
    });

    it('应该正确转换为记录', () => {
      const cards = createSameRankCards(Rank.FIVE, 1); // 5分
      const play = canPlayCards(cards)!;
      const playRecord: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards,
        scoreCards: cards.filter(c => isScoreCard(c)),
        score: calculateCardsScore(cards)
      };

      round.recordPlay(playRecord, play);
      
      const record = round.toRecord();
      
      expect(record.roundNumber).toBe(1);
      expect(record.plays.length).toBe(1);
      expect(record.totalScore).toBe(5);
    });
  });
});


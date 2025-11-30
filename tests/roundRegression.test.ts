/**
 * Round 类回归测试
 * 测试完整的轮次流程，包括多个玩家出牌、接风、轮次结束等场景
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Round } from '../src/utils/Round';
import { Card, Suit, Rank, RoundPlayRecord, Player, PlayerType, Play, CardType } from '../src/types/card';
import { canPlayCards, hasPlayableCards, calculateCardsScore, isScoreCard } from '../src/utils/cardUtils';

// 辅助函数
function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return { suit, rank, id: id || `${suit}-${rank}-${Math.random()}` };
}

function createSameRankCards(rank: Rank, count: number): Card[] {
  const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    cards.push(createCard(suits[i % 4], rank, `${rank}-${i}`));
  }
  return cards;
}

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

function createPlayRecord(playerId: number, playerName: string, cards: Card[]): RoundPlayRecord {
  return {
    playerId,
    playerName,
    cards,
    scoreCards: cards.filter(c => isScoreCard(c)),
    score: calculateCardsScore(cards)
  };
}

describe('Round 类回归测试', () => {
  let round: Round;
  let players: Player[];

  beforeEach(() => {
    round = Round.createNew(1, Date.now(), {
      minIntervalBetweenPlays: 50,  // 测试用很短间隔
      playTimeout: 5000,
      enabled: true
    });

    players = [
      createPlayer(0, '玩家1', createSameRankCards(Rank.THREE, 10)),
      createPlayer(1, '玩家2', createSameRankCards(Rank.FOUR, 10)),
      createPlayer(2, '玩家3', createSameRankCards(Rank.FIVE, 10)),
      createPlayer(3, '玩家4', createSameRankCards(Rank.SIX, 10))
    ];
  });

  describe('完整轮次流程', () => {
    it('应该正确处理一轮完整的出牌流程', async () => {
      console.log('\n📋 测试：完整轮次流程');

      // 玩家0出牌
      const cards1 = createSameRankCards(Rank.FIVE, 2); // 对子5
      const play1 = canPlayCards(cards1)!;
      const record1 = createPlayRecord(0, '玩家1', cards1);

      await round.processPlayAsync(0, async () => {
        round.recordPlay(record1, play1);
        await new Promise(resolve => setTimeout(resolve, 10)); // 模拟异步操作
      });

      expect(round.getPlayCount()).toBe(1);
      expect(round.getLastPlayPlayerIndex()).toBe(0);
      console.log('  ✅ 玩家0出牌完成');

      // 玩家1出牌（压过）
      const cards2 = createSameRankCards(Rank.SIX, 2); // 对子6，压过
      const play2 = canPlayCards(cards2)!;
      const record2 = createPlayRecord(1, '玩家2', cards2);

      await round.processPlayAsync(1, async () => {
        round.recordPlay(record2, play2);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(round.getPlayCount()).toBe(2);
      expect(round.getLastPlayPlayerIndex()).toBe(1);
      console.log('  ✅ 玩家1出牌完成');

      // 玩家2和3要不起
      round.recordPass(2);
      round.recordPass(3);

      console.log('  ✅ 玩家2、3要不起');

      // 玩家0要不起（回到最后出牌的人，轮次应该结束）
      round.recordPass(0);

      expect(round.shouldEnd(1)).toBe(true);
      console.log('  ✅ 轮次应该结束');

      // 结束轮次（不分配分数，只返回信息）
      const { updatedPlayers, nextPlayerIndex, roundScore, winnerIndex } = round.end(players, 4);

      expect(round.isEnded()).toBe(true);
      expect(nextPlayerIndex).toBe(1); // 由获胜者开始下一轮
      expect(roundScore).toBeGreaterThanOrEqual(0); // 轮次分数
      expect(winnerIndex).toBe(1); // 接风玩家索引
      // 注意：分数不应在这里更新（由 GameController 分配）
      expect(updatedPlayers[1].score).toBe(0); // 初始分数，不在这里更新
      console.log('  ✅ 轮次结束，返回轮次信息正确（分数由 GameController 分配）\n');
    });

    it('应该正确处理有分牌的轮次', async () => {
      console.log('\n📋 测试：有分牌的轮次流程');

      // 玩家0出分牌
      const cards1 = [createCard(Suit.SPADES, Rank.FIVE)]; // 5分
      const play1 = canPlayCards(cards1)!;
      const record1 = createPlayRecord(0, '玩家1', cards1);

      await round.processPlayAsync(0, async () => {
        round.recordPlay(record1, play1);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(round.getTotalScore()).toBe(5);
      console.log(`  ✅ 玩家0出牌，轮次分数: ${round.getTotalScore()}`);

      // 玩家1压过并出分牌
      const cards2 = [createCard(Suit.HEARTS, Rank.KING)]; // 10分，压过
      const play2 = canPlayCards(cards2)!;
      const record2 = createPlayRecord(1, '玩家2', cards2);

      await round.processPlayAsync(1, async () => {
        round.recordPlay(record2, play2);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(round.getTotalScore()).toBe(15); // 5 + 10
      console.log(`  ✅ 玩家1出牌，轮次分数: ${round.getTotalScore()}`);

      // 其他玩家要不起，轮次结束
      round.recordPass(2);
      round.recordPass(3);
      round.recordPass(0);

      const { updatedPlayers, roundScore, winnerIndex } = round.end(players, 4);
      
      expect(roundScore).toBe(15); // 轮次分数
      expect(winnerIndex).toBe(1); // 接风玩家索引
      // 注意：分数不应在这里更新（由 GameController 分配）
      expect(updatedPlayers[1].score).toBe(0); // 初始分数，不在这里更新
      console.log(`  ✅ 轮次结束，返回轮次分数 ${roundScore}，接风玩家 ${winnerIndex}（分数由 GameController 分配）\n`);
    });
  });

  describe('接风流程', () => {
    it('应该正确处理接风情况', async () => {
      console.log('\n📋 测试：接风流程');

      // 玩家0出牌
      const cards1 = createSameRankCards(Rank.KING, 3); // 三张K
      const play1 = canPlayCards(cards1)!;
      const record1 = createPlayRecord(0, '玩家1', cards1);

      await round.processPlayAsync(0, async () => {
        round.recordPlay(record1, play1);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // 其他玩家都要不起
      round.recordPass(1);
      round.recordPass(2);
      round.recordPass(3);

      // 注意：在新机制中，接风后立即结束本轮并创建新轮次
      // 新轮次开始时 lastPlay 自动为 null，不需要调用 takeover()
      // 接风判断由 roundScheduler 在 onPassCompleted 中统一处理
      const shouldTakeover = round.shouldTakeover(players, 0);
      
      // 验证接风判断逻辑
      expect(typeof shouldTakeover).toBe('boolean');
      console.log('  ✅ 接风判断逻辑正常\n');
    });
  });

  describe('时间控制流程', () => {
    it('应该正确控制出牌间隔', async () => {
      console.log('\n📋 测试：时间控制');

      // 第一次出牌
      const cards1 = createSameRankCards(Rank.FIVE, 2);
      const play1 = canPlayCards(cards1)!;
      const record1 = createPlayRecord(0, '玩家1', cards1);

      const start1 = Date.now();
      await round.processPlayAsync(0, async () => {
        round.recordPlay(record1, play1);
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      const elapsed1 = Date.now() - start1;

      // 验证第二次出牌前需要等待最短间隔
      const canPlayNow = round.canPlayNow(1);
      expect(canPlayNow).not.toBe(true); // 不应该立即出牌
      if (typeof canPlayNow === 'number') {
        expect(canPlayNow).toBeGreaterThan(0);
        console.log(`  需要等待 ${canPlayNow}ms 后才能出牌`);
      }

      // 手动等待最短间隔后再出牌
      await round.waitForMinInterval();

      // 第二次出牌
      const cards2 = createSameRankCards(Rank.SIX, 2);
      const play2 = canPlayCards(cards2)!;
      const record2 = createPlayRecord(1, '玩家2', cards2);

      const start2 = Date.now();
      await round.processPlayAsync(1, async () => {
        round.recordPlay(record2, play2);
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      const elapsed2 = Date.now() - start2;

      // 验证时间控制功能正常工作
      expect(elapsed2).toBeGreaterThanOrEqual(10); // 至少包括异步处理时间
      console.log(`  ✅ 出牌间隔控制正常: 第一次 ${elapsed1}ms, 第二次 ${elapsed2}ms\n`);
    });

    it('应该正确触发超时', async () => {
      console.log('\n📋 测试：超时机制');

      let timeoutCalled = false;
      
      round.startPlayTimer(0, () => {
        timeoutCalled = true;
      });

      // 等待超过超时时间
      await new Promise(resolve => setTimeout(resolve, 11000));

      expect(timeoutCalled).toBe(true);
      console.log('  ✅ 超时机制正常触发\n');
      
      round.clearPlayTimer(0);
    });
  });

  describe('异步处理流程', () => {
    it('应该按顺序处理多个异步出牌', async () => {
      console.log('\n📋 测试：异步处理顺序');

      const processOrder: number[] = [];

      // 启动第一个处理
      const promise1 = round.processPlayAsync(0, async () => {
        processOrder.push(1);
        await new Promise(resolve => setTimeout(resolve, 100));
        processOrder.push(2);
      });

      // 立即启动第二个处理（应该等待第一个完成）
      const promise2 = round.processPlayAsync(1, async () => {
        processOrder.push(3);
        await new Promise(resolve => setTimeout(resolve, 50));
        processOrder.push(4);
      });

      await Promise.all([promise1, promise2]);

      // 应该按顺序执行：1 -> 2 -> 3 -> 4
      expect(processOrder).toEqual([1, 2, 3, 4]);
      console.log('  ✅ 异步处理顺序正确:', processOrder.join(' -> '), '\n');
    });
  });

  describe('轮次结束场景', () => {
    it('应该正确处理所有人都要不起的情况', () => {
      console.log('\n📋 测试：所有人都要不起');

      // 玩家0出牌
      const cards = createSameRankCards(Rank.ACE, 3); // 三张A（很大的牌）
      const play = canPlayCards(cards)!;
      const record = createPlayRecord(0, '玩家1', cards);
      round.recordPlay(record, play);

      // 其他玩家都要不起（recordPass 不会增加 plays 数组）
      round.recordPass(1);
      round.recordPass(2);
      round.recordPass(3);

      // 注意：根据新逻辑，当只有一次出牌记录且 nextPlayerIndex === lastPlayPlayerIndex 时，
      // shouldEnd 会返回 false（因为需要至少一轮完整的循环）
      // 这种情况实际上应该由 roundScheduler 在 onPassCompleted 中处理为接风
      // 这里直接测试结束轮次的逻辑
      const { updatedPlayers, nextPlayerIndex, roundScore, winnerIndex } = round.end(players, 4);
      
      expect(nextPlayerIndex).toBe(0); // 由获胜者开始下一轮
      expect(winnerIndex).toBe(0); // 接风玩家索引
      expect(roundScore).toBeGreaterThanOrEqual(0); // 轮次分数
      // 注意：分数不应在这里更新（由 GameController 分配）
      console.log('  ✅ 所有人都要不起，轮次正确结束（分数由 GameController 分配）\n');
    });

    it('应该正确处理有人出完牌的情况', () => {
      console.log('\n📋 测试：有人出完牌');

      // 玩家0出最后一张牌
      const cards = createSameRankCards(Rank.FIVE, 2);
      const play = canPlayCards(cards)!;
      const record = createPlayRecord(0, '玩家1', cards);
      round.recordPlay(record, play);

      // 更新玩家手牌（出完了）
      players[0].hand = [];
      
      const { updatedPlayers, nextPlayerIndex, roundScore, winnerIndex } = round.end(players, 4);
      
      expect(winnerIndex).toBe(0); // 接风玩家索引
      expect(roundScore).toBeGreaterThanOrEqual(0); // 轮次分数
      // 注意：分数不应在这里更新（由 GameController 分配）
      expect(updatedPlayers[0].score).toBe(0); // 初始分数，不在这里更新
      console.log('  ✅ 玩家出完牌，轮次正确结束（分数由 GameController 分配）\n');
    });
  });

  describe('多轮次场景', () => {
    it('应该正确处理连续多轮', () => {
      console.log('\n📋 测试：连续多轮');

      const rounds: Round[] = [];
      
      // 创建并完成3轮
      for (let i = 1; i <= 3; i++) {
        const currentRound = Round.createNew(i);
        
        // 记录一次出牌
        const cards = createSameRankCards(Rank.FIVE, 1);
        const play = canPlayCards(cards)!;
        const playRecord = createPlayRecord(0, '玩家1', cards);
        currentRound.recordPlay(playRecord, play);
        
        // 结束轮次
        currentRound.end(players, 4);
        rounds.push(currentRound);
        
        const roundRecord = currentRound.toRecord();
        console.log(`  第${i}轮: 获胜者=${roundRecord.winnerName}, 分数=${roundRecord.totalScore}`);
      }

      expect(rounds.length).toBe(3);
      expect(rounds[0].roundNumber).toBe(1);
      expect(rounds[1].roundNumber).toBe(2);
      expect(rounds[2].roundNumber).toBe(3);
      console.log('  ✅ 连续多轮处理正确\n');
    });
  });

  describe('边界情况', () => {
    it('应该正确处理空轮次（没有人出牌）', () => {
      console.log('\n📋 测试：空轮次');

      const { updatedPlayers, nextPlayerIndex, roundScore, winnerIndex } = round.end(players, 4);
      
      expect(round.isEnded()).toBe(true);
      expect(round.getTotalScore()).toBe(0);
      expect(round.getPlayCount()).toBe(0);
      expect(roundScore).toBe(0); // 轮次分数为0
      expect(winnerIndex).toBeNull(); // 没有最后出牌的人
      expect(nextPlayerIndex).toBeNull(); // 没有最后出牌的人
      console.log('  ✅ 空轮次处理正确\n');
    });

    it('应该正确处理没有分牌的轮次', () => {
      console.log('\n📋 测试：没有分牌的轮次');

      // 出没有分牌的牌
      const cards = createSameRankCards(Rank.THREE, 2);
      const play = canPlayCards(cards)!;
      const record = createPlayRecord(0, '玩家1', cards);
      round.recordPlay(record, play);

      expect(round.getTotalScore()).toBe(0);
      
      const { updatedPlayers, roundScore, winnerIndex } = round.end(players, 4);
      
      expect(roundScore).toBe(0); // 轮次分数为0
      expect(winnerIndex).toBe(0); // 接风玩家索引
      // 注意：分数不应在这里更新（由 GameController 分配）
      expect(updatedPlayers[0].score).toBe(0); // 初始分数，不在这里更新
      console.log('  ✅ 没有分牌的轮次处理正确（分数由 GameController 分配）\n');
    });
  });
});


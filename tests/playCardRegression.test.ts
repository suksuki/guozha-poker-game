/**
 * 打牌出牌回归测试
 * 测试打牌、出牌相关的核心逻辑，包括牌型识别、压牌规则、计分等
 * 带实时信息输出，方便调试和验证
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Card, Suit, Rank, CardType, Play } from '../src/types/card';
import { 
  canPlayCards, 
  canBeat, 
  findPlayableCards, 
  hasPlayableCards,
  calculateDunCount,
  calculateDunScore,
  calculateCardsScore,
  isScoreCard,
  getCardScore
} from '../src/utils/cardUtils';

// 辅助函数：创建测试用的牌
function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return { suit, rank, id: id || `${suit}-${rank}` };
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

describe('打牌出牌回归测试', () => {
  beforeEach(() => {
    console.log('\n' + '='.repeat(60));
  });

  describe('牌型识别测试', () => {
    it('应该正确识别单张', () => {
      console.log('📋 测试：识别单张');
      const cards = [createCard(Suit.SPADES, Rank.FIVE)];
      const play = canPlayCards(cards);
      
      console.log(`  出牌: ${cards.map(c => `${c.suit}-${c.rank}`).join(', ')}`);
      console.log(`  识别结果: ${play ? `类型=${play.type}, 值=${play.value}` : 'null'}`);
      
      expect(play).not.toBeNull();
      expect(play?.type).toBe(CardType.SINGLE);
      expect(play?.value).toBe(Rank.FIVE);
      console.log('  ✅ 单张识别正确\n');
    });

    it('应该正确识别对子', () => {
      console.log('📋 测试：识别对子');
      const cards = createSameRankCards(Rank.THREE, 2);
      const play = canPlayCards(cards);
      
      console.log(`  出牌: ${cards.length}张相同点数`);
      console.log(`  识别结果: ${play ? `类型=${play.type}, 值=${play.value}` : 'null'}`);
      
      expect(play).not.toBeNull();
      expect(play?.type).toBe(CardType.PAIR);
      expect(play?.value).toBe(Rank.THREE);
      console.log('  ✅ 对子识别正确\n');
    });

    it('应该正确识别三张', () => {
      console.log('📋 测试：识别三张');
      const cards = createSameRankCards(Rank.FOUR, 3);
      const play = canPlayCards(cards);
      
      console.log(`  出牌: ${cards.length}张相同点数`);
      console.log(`  识别结果: ${play ? `类型=${play.type}, 值=${play.value}` : 'null'}`);
      
      expect(play).not.toBeNull();
      expect(play?.type).toBe(CardType.TRIPLE);
      expect(play?.value).toBe(Rank.FOUR);
      console.log('  ✅ 三张识别正确\n');
    });

    it('应该正确识别炸弹（4-6张）', () => {
      console.log('📋 测试：识别炸弹');
      for (let count = 4; count <= 6; count++) {
        const cards = createSameRankCards(Rank.FIVE, count);
        const play = canPlayCards(cards);
        
        console.log(`  出牌: ${count}张相同点数`);
        console.log(`  识别结果: ${play ? `类型=${play.type}, 值=${play.value}` : 'null'}`);
        
        expect(play).not.toBeNull();
        expect(play?.type).toBe(CardType.BOMB);
        expect(play?.value).toBe(Rank.FIVE);
        console.log(`  ✅ ${count}张炸弹识别正确`);
      }
      console.log('');
    });

    it('应该正确识别墩（7张及以上）', () => {
      console.log('📋 测试：识别墩');
      for (let count = 7; count <= 10; count++) {
        const cards = createSameRankCards(Rank.SIX, count);
        const play = canPlayCards(cards);
        
        console.log(`  出牌: ${count}张相同点数`);
        console.log(`  识别结果: ${play ? `类型=${play.type}, 值=${play.value}` : 'null'}`);
        
        expect(play).not.toBeNull();
        expect(play?.type).toBe(CardType.DUN);
        expect(play?.value).toBe(Rank.SIX);
        console.log(`  ✅ ${count}张墩识别正确`);
      }
      console.log('');
    });
  });

  describe('压牌规则测试', () => {
    it('应该正确判断单张压牌', () => {
      console.log('📋 测试：单张压牌规则');
      const lastPlay: Play = {
        cards: [createCard(Suit.SPADES, Rank.THREE)],
        type: CardType.SINGLE,
        value: Rank.THREE
      };
      
      const higherPlay: Play = {
        cards: [createCard(Suit.HEARTS, Rank.FOUR)],
        type: CardType.SINGLE,
        value: Rank.FOUR
      };
      
      // 使用更小的牌值（ACE比THREE小，但在这个游戏中可能不是这样）
      // 改为使用THREE和FOUR，确保FOUR能压过THREE
      const lowerPlay: Play = {
        cards: [createCard(Suit.DIAMONDS, Rank.THREE)],
        type: CardType.SINGLE,
        value: Rank.THREE
      };
      
      console.log(`  上家: 单张${lastPlay.value}`);
      console.log(`  测试1: 单张${higherPlay.value} 能否压过? ${canBeat(higherPlay, lastPlay)}`);
      console.log(`  测试2: 单张${lowerPlay.value} 能否压过? ${canBeat(lowerPlay, lastPlay)} (相同点数不能压过)`);
      
      expect(canBeat(higherPlay, lastPlay)).toBe(true);
      // 相同点数的牌不能压过
      expect(canBeat(lowerPlay, lastPlay)).toBe(false);
      console.log('  ✅ 单张压牌规则正确\n');
    });

    it('应该正确判断对子压牌', () => {
      console.log('📋 测试：对子压牌规则');
      const lastPlay: Play = {
        cards: createSameRankCards(Rank.THREE, 2),
        type: CardType.PAIR,
        value: Rank.THREE
      };
      
      const higherPlay: Play = {
        cards: createSameRankCards(Rank.FOUR, 2),
        type: CardType.PAIR,
        value: Rank.FOUR
      };
      
      console.log(`  上家: 对子${lastPlay.value}`);
      console.log(`  测试: 对子${higherPlay.value} 能否压过? ${canBeat(higherPlay, lastPlay)}`);
      
      expect(canBeat(higherPlay, lastPlay)).toBe(true);
      console.log('  ✅ 对子压牌规则正确\n');
    });

    it('应该正确判断炸弹压单张/对子/三张', () => {
      console.log('📋 测试：炸弹压牌规则');
      const bombPlay: Play = {
        cards: createSameRankCards(Rank.FIVE, 4),
        type: CardType.BOMB,
        value: Rank.FIVE
      };
      
      const singlePlay: Play = {
        cards: [createCard(Suit.SPADES, Rank.ACE)],
        type: CardType.SINGLE,
        value: Rank.ACE
      };
      
      const pairPlay: Play = {
        cards: createSameRankCards(Rank.TWO, 2),
        type: CardType.PAIR,
        value: Rank.TWO
      };
      
      const triplePlay: Play = {
        cards: createSameRankCards(Rank.KING, 3),
        type: CardType.TRIPLE,
        value: Rank.KING
      };
      
      console.log(`  炸弹: 4张${bombPlay.value}`);
      console.log(`  测试1: 炸弹能否压单张? ${canBeat(bombPlay, singlePlay)}`);
      console.log(`  测试2: 炸弹能否压对子? ${canBeat(bombPlay, pairPlay)}`);
      console.log(`  测试3: 炸弹能否压三张? ${canBeat(bombPlay, triplePlay)}`);
      
      expect(canBeat(bombPlay, singlePlay)).toBe(true);
      expect(canBeat(bombPlay, pairPlay)).toBe(true);
      expect(canBeat(bombPlay, triplePlay)).toBe(true);
      console.log('  ✅ 炸弹压牌规则正确\n');
    });

    it('应该正确判断墩压任何非墩牌型', () => {
      console.log('📋 测试：墩压牌规则');
      const dunPlay: Play = {
        cards: createSameRankCards(Rank.SIX, 7),
        type: CardType.DUN,
        value: Rank.SIX
      };
      
      const singlePlay: Play = {
        cards: [createCard(Suit.SPADES, Rank.ACE)],
        type: CardType.SINGLE,
        value: Rank.ACE
      };
      
      const bombPlay: Play = {
        cards: createSameRankCards(Rank.TWO, 6),
        type: CardType.BOMB,
        value: Rank.TWO
      };
      
      console.log(`  墩: 7张${dunPlay.value}`);
      console.log(`  测试1: 墩能否压单张? ${canBeat(dunPlay, singlePlay)}`);
      console.log(`  测试2: 墩能否压炸弹? ${canBeat(dunPlay, bombPlay)}`);
      
      expect(canBeat(dunPlay, singlePlay)).toBe(true);
      expect(canBeat(dunPlay, bombPlay)).toBe(true);
      console.log('  ✅ 墩压牌规则正确\n');
    });

    it('应该正确判断墩压墩（数量多的赢）', () => {
      console.log('📋 测试：墩压墩规则');
      const smallDun: Play = {
        cards: createSameRankCards(Rank.SEVEN, 7),
        type: CardType.DUN,
        value: Rank.SEVEN
      };
      
      const largeDun: Play = {
        cards: createSameRankCards(Rank.EIGHT, 8),
        type: CardType.DUN,
        value: Rank.EIGHT
      };
      
      console.log(`  上家: 7张${smallDun.value}`);
      console.log(`  测试: 8张${largeDun.value} 能否压过? ${canBeat(largeDun, smallDun)}`);
      
      expect(canBeat(largeDun, smallDun)).toBe(true);
      console.log('  ✅ 墩压墩规则正确（数量多的赢）\n');
    });

    it('应该正确判断炸弹压炸弹（数量多的赢）', () => {
      console.log('📋 测试：炸弹压炸弹规则');
      const smallBomb: Play = {
        cards: createSameRankCards(Rank.NINE, 4),
        type: CardType.BOMB,
        value: Rank.NINE
      };
      
      const largeBomb: Play = {
        cards: createSameRankCards(Rank.TEN, 5),
        type: CardType.BOMB,
        value: Rank.TEN
      };
      
      console.log(`  上家: 4张${smallBomb.value}`);
      console.log(`  测试: 5张${largeBomb.value} 能否压过? ${canBeat(largeBomb, smallBomb)}`);
      
      expect(canBeat(largeBomb, smallBomb)).toBe(true);
      console.log('  ✅ 炸弹压炸弹规则正确（数量多的赢）\n');
    });
  });

  describe('出牌查找测试', () => {
    it('应该能找到可以出的牌（接风状态）', () => {
      console.log('📋 测试：接风状态下找可出的牌');
      const hand: Card[] = [
        createCard(Suit.SPADES, Rank.THREE),
        createCard(Suit.HEARTS, Rank.FOUR),
        ...createSameRankCards(Rank.FIVE, 2),
        ...createSameRankCards(Rank.SIX, 3)
      ];
      
      const playable = findPlayableCards(hand, null);
      
      console.log(`  手牌: ${hand.length}张`);
      console.log(`  找到可出牌组合: ${playable.length}种`);
      playable.slice(0, 5).forEach((cards, idx) => {
        const play = canPlayCards(cards);
        console.log(`    组合${idx + 1}: ${cards.length}张, 类型=${play?.type}`);
      });
      
      expect(playable.length).toBeGreaterThan(0);
      console.log('  ✅ 接风状态下能找到可出的牌\n');
    });

    it('应该能找到可以压过上家的牌', () => {
      console.log('📋 测试：找能压过上家的牌');
      const hand: Card[] = [
        createCard(Suit.SPADES, Rank.THREE),
        createCard(Suit.HEARTS, Rank.FOUR),
        createCard(Suit.DIAMONDS, Rank.FIVE),
        ...createSameRankCards(Rank.SIX, 2),
        ...createSameRankCards(Rank.SEVEN, 4)
      ];
      
      const lastPlay: Play = {
        cards: [createCard(Suit.CLUBS, Rank.THREE)],
        type: CardType.SINGLE,
        value: Rank.THREE
      };
      
      const playable = findPlayableCards(hand, lastPlay);
      
      console.log(`  手牌: ${hand.length}张`);
      console.log(`  上家: 单张${lastPlay.value}`);
      console.log(`  找到可压过的牌组合: ${playable.length}种`);
      playable.slice(0, 5).forEach((cards, idx) => {
        const play = canPlayCards(cards);
        if (play && canBeat(play, lastPlay)) {
          console.log(`    组合${idx + 1}: ${cards.length}张, 类型=${play.type}, 值=${play.value}`);
        }
      });
      
      expect(playable.length).toBeGreaterThan(0);
      // 验证所有找到的牌都能压过
      playable.forEach(cards => {
        const play = canPlayCards(cards);
        if (play) {
          expect(canBeat(play, lastPlay)).toBe(true);
        }
      });
      console.log('  ✅ 能找到能压过上家的牌\n');
    });

    it('应该正确判断是否有能打过的牌', () => {
      console.log('📋 测试：判断是否有能打过的牌');
      const hand: Card[] = [
        createCard(Suit.SPADES, Rank.FOUR),
        createCard(Suit.HEARTS, Rank.FIVE),
        ...createSameRankCards(Rank.SIX, 2)
      ];
      
      const lastPlay: Play = {
        cards: [createCard(Suit.CLUBS, Rank.THREE)],
        type: CardType.SINGLE,
        value: Rank.THREE
      };
      
      const hasPlayable = hasPlayableCards(hand, lastPlay);
      
      console.log(`  手牌: ${hand.length}张`);
      console.log(`  上家: 单张${lastPlay.value}`);
      console.log(`  是否有能打过的牌: ${hasPlayable}`);
      
      expect(hasPlayable).toBe(true);
      console.log('  ✅ 正确判断有能打过的牌\n');
    });
  });

  describe('计分规则测试', () => {
    it('应该正确识别分牌', () => {
      console.log('📋 测试：识别分牌');
      const scoreCards = [
        createCard(Suit.SPADES, Rank.FIVE),
        createCard(Suit.HEARTS, Rank.TEN),
        createCard(Suit.DIAMONDS, Rank.KING)
      ];
      
      const nonScoreCards = [
        createCard(Suit.SPADES, Rank.THREE),
        createCard(Suit.HEARTS, Rank.FOUR)
      ];
      
      console.log('  分牌测试:');
      scoreCards.forEach(card => {
        const isScore = isScoreCard(card);
        const score = getCardScore(card);
        console.log(`    ${card.rank}: 是分牌=${isScore}, 分值=${score}`);
        expect(isScore).toBe(true);
      });
      
      console.log('  非分牌测试:');
      nonScoreCards.forEach(card => {
        const isScore = isScoreCard(card);
        const score = getCardScore(card);
        console.log(`    ${card.rank}: 是分牌=${isScore}, 分值=${score}`);
        expect(isScore).toBe(false);
        expect(score).toBe(0);
      });
      
      console.log('  ✅ 分牌识别正确\n');
    });

    it('应该正确计算分牌总分', () => {
      console.log('📋 测试：计算分牌总分');
      const cards: Card[] = [
        createCard(Suit.SPADES, Rank.FIVE),      // 5分
        createCard(Suit.HEARTS, Rank.FIVE),      // 5分
        createCard(Suit.DIAMONDS, Rank.TEN),     // 10分
        createCard(Suit.CLUBS, Rank.TEN),        // 10分
        createCard(Suit.SPADES, Rank.KING),      // 10分
        createCard(Suit.HEARTS, Rank.THREE)      // 0分
      ];
      
      const totalScore = calculateCardsScore(cards);
      const expectedScore = 5 + 5 + 10 + 10 + 10 + 0; // 40分
      
      console.log(`  牌组: ${cards.length}张`);
      console.log(`  计算总分: ${totalScore}分`);
      console.log(`  期望总分: ${expectedScore}分`);
      
      expect(totalScore).toBe(expectedScore);
      console.log('  ✅ 分牌总分计算正确\n');
    });

    it('应该正确计算墩的数量', () => {
      console.log('📋 测试：计算墩的数量');
      const testCases = [
        { count: 7, expected: 1 },
        { count: 8, expected: 2 },
        { count: 9, expected: 4 },
        { count: 10, expected: 8 },
        { count: 11, expected: 16 },
        { count: 12, expected: 32 },
        { count: 13, expected: 64 }
      ];
      
      console.log('  墩数计算测试:');
      testCases.forEach(({ count, expected }) => {
        const dunCount = calculateDunCount(count);
        console.log(`    ${count}张 = ${dunCount}墩 (期望: ${expected}墩)`);
        expect(dunCount).toBe(expected);
      });
      
      console.log('  ✅ 墩的数量计算正确\n');
    });

    it('应该正确计算墩的分数（4人游戏）', () => {
      console.log('📋 测试：计算墩的分数（4人游戏）');
      const playerCount = 4;
      const testCases = [
        { dunCount: 1, expectedDunScore: 90, expectedOtherScore: 30 },
        { dunCount: 2, expectedDunScore: 180, expectedOtherScore: 60 },
        { dunCount: 4, expectedDunScore: 360, expectedOtherScore: 120 }
      ];
      
      console.log(`  玩家数: ${playerCount}人`);
      testCases.forEach(({ dunCount, expectedDunScore, expectedOtherScore }) => {
        const result = calculateDunScore(dunCount, playerCount, 0);
        console.log(`  ${dunCount}墩:`);
        console.log(`    出墩玩家得分: ${result.dunPlayerScore} (期望: ${expectedDunScore})`);
        console.log(`    其他玩家扣分: ${result.otherPlayersScore} (期望: ${expectedOtherScore})`);
        expect(result.dunPlayerScore).toBe(expectedDunScore);
        expect(result.otherPlayersScore).toBe(expectedOtherScore);
      });
      
      console.log('  ✅ 墩的分数计算正确\n');
    });
  });

  describe('综合场景测试', () => {
    it('应该正确处理完整的出牌流程', () => {
      console.log('📋 测试：完整出牌流程');
      
      // 场景：玩家A出单张3，玩家B出单张4压过
      const playerAHand: Card[] = [
        createCard(Suit.SPADES, Rank.THREE),
        createCard(Suit.HEARTS, Rank.FOUR)
      ];
      
      const playerBHand: Card[] = [
        createCard(Suit.DIAMONDS, Rank.FOUR),
        createCard(Suit.CLUBS, Rank.FIVE)
      ];
      
      // 玩家A出单张3
      const playA = canPlayCards([playerAHand[0]]);
      console.log(`  玩家A出牌: 单张${playA?.value}`);
      expect(playA).not.toBeNull();
      expect(playA?.type).toBe(CardType.SINGLE);
      
      // 玩家B找能压过的牌
      const playableB = findPlayableCards(playerBHand, playA!);
      console.log(`  玩家B可出的牌: ${playableB.length}种`);
      expect(playableB.length).toBeGreaterThan(0);
      
      // 玩家B出单张4压过
      const playB = canPlayCards([playerBHand[0]]);
      console.log(`  玩家B出牌: 单张${playB?.value}`);
      expect(playB).not.toBeNull();
      expect(canBeat(playB!, playA!)).toBe(true);
      
      console.log('  ✅ 完整出牌流程正确\n');
    });

    it('应该正确处理炸弹压单张的场景', () => {
      console.log('📋 测试：炸弹压单张场景');
      
      const singlePlay: Play = {
        cards: [createCard(Suit.SPADES, Rank.ACE)],
        type: CardType.SINGLE,
        value: Rank.ACE
      };
      
      const bombHand: Card[] = createSameRankCards(Rank.THREE, 4);
      const bombPlay = canPlayCards(bombHand);
      
      console.log(`  上家: 单张${singlePlay.value}`);
      console.log(`  炸弹: 4张${bombPlay?.value}`);
      console.log(`  能否压过: ${canBeat(bombPlay!, singlePlay)}`);
      
      expect(bombPlay).not.toBeNull();
      expect(bombPlay?.type).toBe(CardType.BOMB);
      expect(canBeat(bombPlay!, singlePlay)).toBe(true);
      
      console.log('  ✅ 炸弹压单张场景正确\n');
    });

    it('应该正确处理墩压炸弹的场景', () => {
      console.log('📋 测试：墩压炸弹场景');
      
      const bombPlay: Play = {
        cards: createSameRankCards(Rank.TWO, 6),
        type: CardType.BOMB,
        value: Rank.TWO
      };
      
      const dunHand: Card[] = createSameRankCards(Rank.THREE, 7);
      const dunPlay = canPlayCards(dunHand);
      
      console.log(`  上家: 6张炸弹${bombPlay.value}`);
      console.log(`  墩: 7张${dunPlay?.value}`);
      console.log(`  能否压过: ${canBeat(dunPlay!, bombPlay)}`);
      
      expect(dunPlay).not.toBeNull();
      expect(dunPlay?.type).toBe(CardType.DUN);
      expect(canBeat(dunPlay!, bombPlay)).toBe(true);
      
      console.log('  ✅ 墩压炸弹场景正确\n');
    });
  });

  describe('边界情况测试', () => {
    it('应该正确处理空手牌', () => {
      console.log('📋 测试：空手牌处理');
      const emptyHand: Card[] = [];
      const playable = findPlayableCards(emptyHand, null);
      
      console.log(`  手牌: ${emptyHand.length}张`);
      console.log(`  可出的牌: ${playable.length}种`);
      
      expect(playable.length).toBe(0);
      expect(hasPlayableCards(emptyHand, null)).toBe(false);
      console.log('  ✅ 空手牌处理正确\n');
    });

    it('应该正确处理无法压过的情况', () => {
      console.log('📋 测试：无法压过的情况');
      const smallHand: Card[] = [
        createCard(Suit.SPADES, Rank.THREE),
        createCard(Suit.HEARTS, Rank.FOUR)
      ];
      
      const largePlay: Play = {
        cards: [createCard(Suit.CLUBS, Rank.ACE)],
        type: CardType.SINGLE,
        value: Rank.ACE
      };
      
      const playable = findPlayableCards(smallHand, largePlay);
      const hasPlayable = hasPlayableCards(smallHand, largePlay);
      
      console.log(`  手牌: 单张3, 单张4`);
      console.log(`  上家: 单张A`);
      console.log(`  可出的牌: ${playable.length}种`);
      console.log(`  是否有能打过的牌: ${hasPlayable}`);
      
      // 单张3和4都不能压过单张A
      expect(hasPlayable).toBe(false);
      console.log('  ✅ 无法压过的情况处理正确\n');
    });
  });
});


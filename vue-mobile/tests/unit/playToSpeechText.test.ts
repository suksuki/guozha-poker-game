/**
 * playToSpeechText工具函数单元测试
 */

import { describe, it, expect } from 'vitest';
import { playToSpeechText } from '../../src/utils/playToSpeechText';
import { Play, CardType, Rank, Suit } from '../../src/types/card';

describe('playToSpeechText', () => {
  it('应该正确转换单张牌', () => {
    const play: Play = {
      cards: [{ suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' }],
      type: CardType.SINGLE,
      value: Rank.FIVE
    };

    const text = playToSpeechText(play);
    expect(text).toBe('五');
  });

  it('应该正确转换对子', () => {
    const play: Play = {
      cards: [
        { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'test-2' }
      ],
      type: CardType.PAIR,
      value: Rank.FIVE
    };

    const text = playToSpeechText(play);
    expect(text).toBe('对五');
  });

  it('应该正确转换三张', () => {
    const play: Play = {
      cards: [
        { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-3' }
      ],
      type: CardType.TRIPLE,
      value: Rank.FIVE
    };

    const text = playToSpeechText(play);
    expect(text).toBe('三个五');
  });

  it('应该正确转换炸弹（6个）', () => {
    const play: Play = {
      cards: Array.from({ length: 6 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.FIVE,
        id: `test-${i}`
      })),
      type: CardType.BOMB,
      value: Rank.FIVE
    };

    const text = playToSpeechText(play);
    expect(text).toBe('6个五');
  });

  it('应该正确转换墩（7个）', () => {
    const play: Play = {
      cards: Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.FIVE,
        id: `test-${i}`
      })),
      type: CardType.DUN,
      value: Rank.FIVE
    };

    const text = playToSpeechText(play);
    expect(text).toBe('7个五');
  });

  it('应该正确转换大小王', () => {
    const playSmall: Play = {
      cards: [{ suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'test-1' }],
      type: CardType.SINGLE,
      value: Rank.JOKER_SMALL
    };

    const textSmall = playToSpeechText(playSmall);
    expect(textSmall).toBe('小王');

    const playBig: Play = {
      cards: [{ suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'test-2' }],
      type: CardType.SINGLE,
      value: Rank.JOKER_BIG
    };

    const textBig = playToSpeechText(playBig);
    expect(textBig).toBe('大王');
  });

  it('应该正确转换各种点数', () => {
    const ranks = [
      Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN,
      Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN,
      Rank.KING, Rank.ACE, Rank.TWO
    ];

    const expectedTexts = ['三', '四', '五', '六', '七', '八', '九', '十', 'J', 'Q', 'K', 'A', '二'];

    ranks.forEach((rank, index) => {
      const play: Play = {
        cards: [{ suit: Suit.SPADES, rank, id: `test-${index}` }],
        type: CardType.SINGLE,
        value: rank
      };

      const text = playToSpeechText(play);
      expect(text).toBe(expectedTexts[index]);
    });
  });
});


import { describe, it, expect, beforeEach } from 'vitest'
import { Card, Suit, Rank, CardType, PlayerType } from '../src/types/card'
import { createDeck, shuffleDeck, dealCards, canPlayCards, canBeat } from '../src/utils/cardUtils'

describe('游戏逻辑测试', () => {
  describe('牌型判断', () => {
    it('应该正确识别所有合法牌型', () => {
      // 单张
      const single = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }
      ])
      expect(single?.type).toBe(CardType.SINGLE)

      // 对子
      const pair = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-2' }
      ])
      expect(pair?.type).toBe(CardType.PAIR)

      // 三张
      const triple = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'test-3' }
      ])
      expect(triple?.type).toBe(CardType.TRIPLE)

      // 炸弹（4张）
      const bomb4 = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'test-3' },
        { suit: Suit.CLUBS, rank: Rank.THREE, id: 'test-4' }
      ])
      expect(bomb4?.type).toBe(CardType.BOMB)

      // 炸弹（5张）
      const bomb5 = canPlayCards(Array.from({ length: 5 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i}`
      })))
      expect(bomb5?.type).toBe(CardType.BOMB)

      // 炸弹（6张）
      const bomb6 = canPlayCards(Array.from({ length: 6 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i}`
      })))
      expect(bomb6?.type).toBe(CardType.BOMB)

      // 墩（7张）
      const dun = canPlayCards(Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i}`
      })))
      expect(dun?.type).toBe(CardType.DUN)
    })

    it('应该拒绝不合法的牌型组合', () => {
      // 不同点数的牌
      const invalid = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-3' }
      ])
      expect(invalid).toBeNull()
    })
  })

  describe('出牌规则', () => {
    it('应该正确比较牌的大小', () => {
      const three = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }
      ])
      const four = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.FOUR, id: 'test-2' }
      ])
      const two = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.TWO, id: 'test-3' }
      ])

      expect(three).not.toBeNull()
      expect(four).not.toBeNull()
      expect(two).not.toBeNull()

      // 4 > 3
      expect(canBeat(four!, three!)).toBe(true)
      // 2 > 4 (2是最大的单牌)
      expect(canBeat(two!, four!)).toBe(true)
      // 2 > 3
      expect(canBeat(two!, three!)).toBe(true)
    })

    it('应该正确处理炸弹压过普通牌型', () => {
      const single = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.TWO, id: 'test-1' }
      ])
      const pair = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.TWO, id: 'test-2' },
        { suit: Suit.HEARTS, rank: Rank.TWO, id: 'test-3' }
      ])
      const bomb = canPlayCards(Array.from({ length: 4 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i + 4}`
      })))

      expect(single).not.toBeNull()
      expect(pair).not.toBeNull()
      expect(bomb).not.toBeNull()

      // 炸弹可以压过单张
      expect(canBeat(bomb!, single!)).toBe(true)
      // 炸弹可以压过对子
      expect(canBeat(bomb!, pair!)).toBe(true)
    })

    it('应该正确处理墩压过炸弹', () => {
      const bomb = canPlayCards(Array.from({ length: 4 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.TWO,
        id: `test-${i}`
      })))
      const dun = canPlayCards(Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i + 4}`
      })))

      expect(bomb).not.toBeNull()
      expect(dun).not.toBeNull()

      // 墩可以压过炸弹
      expect(canBeat(dun!, bomb!)).toBe(true)
    })
  })

  describe('发牌测试', () => {
    it('4人游戏应该每人发54张牌', () => {
      const hands = dealCards(4)
      expect(hands.length).toBe(4)
      hands.forEach(hand => {
        expect(hand.length).toBe(54)
      })
    })

    it('5人游戏应该每人发54张牌', () => {
      const hands = dealCards(5)
      expect(hands.length).toBe(5)
      hands.forEach(hand => {
        expect(hand.length).toBe(54)
      })
    })

    it('发牌应该是随机的', () => {
      const hands1 = dealCards(4)
      const hands2 = dealCards(4)
      
      // 至少有一个玩家的手牌顺序不同（概率很高）
      let hasDifferent = false
      for (let i = 0; i < 4; i++) {
        const hand1 = hands1[i]
        const hand2 = hands2[i]
        if (hand1.some((card, index) => card.id !== hand2[index]?.id)) {
          hasDifferent = true
          break
        }
      }
      expect(hasDifferent).toBe(true)
    })
  })
})


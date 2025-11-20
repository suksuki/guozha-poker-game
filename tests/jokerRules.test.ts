import { describe, it, expect } from 'vitest'
import { Card, Suit, Rank, CardType } from '../src/types/card'
import { getCardType, canPlayCards } from '../src/utils/cardUtils'

describe('大小王特殊规则测试', () => {
  describe('4张以下的大小王规则', () => {
    it('1张小王应该可以单独出', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' }
      ]
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.SINGLE)
    })

    it('2张小王应该可以出对子', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' }
      ]
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.PAIR)
    })

    it('3张小王应该可以出三张', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-3' }
      ]
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.TRIPLE)
    })

    it('1小王1大王混合应该被拒绝（4张以下）', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' }
      ]
      const result = getCardType(cards)
      
      expect(result).toBeNull() // 应该被拒绝
    })

    it('2小王1大王混合应该被拒绝（4张以下）', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' }
      ]
      const result = getCardType(cards)
      
      expect(result).toBeNull() // 应该被拒绝
    })

    it('大小王混合普通牌应该被拒绝（4张以下）', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'normal-1' }
      ]
      const result = getCardType(cards)
      
      expect(result).toBeNull() // 应该被拒绝
    })
  })

  describe('4张及以上大小王规则', () => {
    it('4张大小王（2小2大）应该可以一起出作为炸弹', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-2' }
      ]
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.BOMB)
    })

    it('5张大小王应该可以一起出作为炸弹', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-3' }
      ]
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.BOMB)
    })

    it('7张大小王应该可以一起出作为墩', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-3' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-3' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-4' }
      ]
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.DUN)
    })
  })

  describe('大小王与其他牌的比较', () => {
    it('大王应该比小王大', () => {
      const small = canPlayCards([
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' }
      ])
      const big = canPlayCards([
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' }
      ])

      expect(small).not.toBeNull()
      expect(big).not.toBeNull()
      expect(big!.value).toBeGreaterThan(small!.value)
    })
  })
})


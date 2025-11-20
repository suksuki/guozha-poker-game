import { describe, it, expect } from 'vitest'
import { Card, Suit, Rank, CardType } from '../src/types/card'
import {
  createDeck,
  shuffleDeck,
  dealCards,
  getCardType,
  canPlayCards,
  canBeat,
  sortCards
} from '../src/utils/cardUtils'

describe('cardUtils', () => {
  describe('createDeck', () => {
    it('应该创建包含54张牌的完整牌组（包括大小王）', () => {
      const deck = createDeck()
      expect(deck.length).toBe(54)
      
      // 检查普通牌（52张）
      const normalCards = deck.filter(c => c.suit !== Suit.JOKER)
      expect(normalCards.length).toBe(52)
      
      // 检查大小王
      const jokers = deck.filter(c => c.suit === Suit.JOKER)
      expect(jokers.length).toBe(2)
      
      const smallJokers = jokers.filter(c => c.rank === Rank.JOKER_SMALL)
      const bigJokers = jokers.filter(c => c.rank === Rank.JOKER_BIG)
      expect(smallJokers.length).toBe(1)
      expect(bigJokers.length).toBe(1)
    })
  })

  describe('shuffleDeck', () => {
    it('应该洗牌并改变顺序', () => {
      const deck1 = createDeck()
      const deck2 = createDeck()
      const shuffled1 = shuffleDeck([...deck1])
      const shuffled2 = shuffleDeck([...deck2])
      
      // 至少有一次洗牌后的顺序不同（概率很高）
      const isDifferent = shuffled1.some((card, index) => card.id !== shuffled2[index]?.id)
      expect(isDifferent).toBe(true)
    })

    it('应该保持所有牌都在', () => {
      const deck = createDeck()
      const shuffled = shuffleDeck([...deck])
      
      expect(shuffled.length).toBe(deck.length)
      deck.forEach(card => {
        expect(shuffled.some(c => c.id === card.id)).toBe(true)
      })
    })
  })

  describe('dealCards', () => {
    it('应该为每个玩家发一副完整的牌', () => {
      const hands = dealCards(4)
      
      expect(hands.length).toBe(4)
      hands.forEach(hand => {
        expect(hand.length).toBe(54) // 每人一副完整牌
      })
    })

    it('应该为不同玩家发不同的牌', () => {
      const hands = dealCards(4)
      
      // 检查每个玩家的牌ID都是唯一的
      const allCardIds = hands.flatMap(hand => hand.map(c => c.id))
      const uniqueIds = new Set(allCardIds)
      expect(uniqueIds.size).toBe(allCardIds.length)
    })
  })

  describe('getCardType', () => {
    it('应该识别单张', () => {
      const card: Card = { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }
      const result = getCardType([card])
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.SINGLE)
      expect(result?.value).toBe(Rank.THREE)
    })

    it('应该识别对子', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-2' }
      ]
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.PAIR)
      expect(result?.value).toBe(Rank.THREE)
    })

    it('应该识别三张', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'test-3' }
      ]
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.TRIPLE)
      expect(result?.value).toBe(Rank.THREE)
    })

    it('应该识别炸弹（4张）', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'test-3' },
        { suit: Suit.CLUBS, rank: Rank.THREE, id: 'test-4' }
      ]
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.BOMB)
      expect(result?.value).toBe(Rank.THREE)
    })

    it('应该识别炸弹（5张）', () => {
      // 5张相同（每人一副牌，可能有重复）
      const cards: Card[] = Array.from({ length: 5 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i}`
      }))
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.BOMB)
    })

    it('应该识别炸弹（6张）', () => {
      const cards: Card[] = Array.from({ length: 6 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i}`
      }))
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.BOMB)
    })

    it('应该识别墩（7张及以上）', () => {
      const cards: Card[] = Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i}`
      }))
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.DUN)
    })

    it('应该拒绝不合法的牌型', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-3' }
      ]
      const result = getCardType(cards)
      
      expect(result).toBeNull()
    })
  })

  describe('大小王特殊规则', () => {
    it('4张以下的小王应该只能单独出', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-3' }
      ]
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.TRIPLE)
    })

    it('4张以下的大小王混合应该被拒绝', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' }
      ]
      const result = getCardType(cards)
      
      expect(result).toBeNull() // 应该被拒绝
    })

    it('4张及以上大小王可以一起出作为炸弹', () => {
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

    it('7张及以上大小王可以一起出作为墩', () => {
      const cards: Card[] = Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.JOKER,
        rank: i < 3 ? Rank.JOKER_SMALL : Rank.JOKER_BIG,
        id: `joker-${i}`
      }))
      const result = getCardType(cards)
      
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.DUN)
    })
  })

  describe('canBeat', () => {
    it('没有上家出牌时，可以出任何牌', () => {
      const play = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }
      ])
      
      expect(play).not.toBeNull()
      expect(canBeat(play!, null)).toBe(true)
    })

    it('炸弹可以压过单张', () => {
      const single = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }
      ])
      const bomb = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.FOUR, id: 'test-2' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-3' },
        { suit: Suit.DIAMONDS, rank: Rank.FOUR, id: 'test-4' },
        { suit: Suit.CLUBS, rank: Rank.FOUR, id: 'test-5' }
      ])
      
      expect(single).not.toBeNull()
      expect(bomb).not.toBeNull()
      expect(canBeat(bomb!, single!)).toBe(true)
    })

    it('墩可以压过炸弹', () => {
      const bomb = canPlayCards(Array.from({ length: 4 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i}`
      })))
      const dun = canPlayCards(Array.from({ length: 7 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.FOUR,
        id: `test-${i + 4}`
      })))
      
      expect(bomb).not.toBeNull()
      expect(dun).not.toBeNull()
      expect(canBeat(dun!, bomb!)).toBe(true)
    })

    it('同类型牌型，值大的可以压过值小的', () => {
      const small = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }
      ])
      const big = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.FOUR, id: 'test-2' }
      ])
      
      expect(small).not.toBeNull()
      expect(big).not.toBeNull()
      expect(canBeat(big!, small!)).toBe(true)
    })

    it('同类型炸弹，数量多的可以压过数量少的', () => {
      const smallBomb = canPlayCards(Array.from({ length: 4 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i}`
      })))
      const bigBomb = canPlayCards(Array.from({ length: 5 }, (_, i) => ({
        suit: Suit.SPADES,
        rank: Rank.THREE,
        id: `test-${i + 4}`
      })))
      
      expect(smallBomb).not.toBeNull()
      expect(bigBomb).not.toBeNull()
      expect(canBeat(bigBomb!, smallBomb!)).toBe(true)
    })
  })

  describe('sortCards', () => {
    it('应该按rank排序', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' },
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-2' },
        { suit: Suit.SPADES, rank: Rank.FOUR, id: 'test-3' }
      ]
      const sorted = sortCards(cards)
      
      expect(sorted[0].rank).toBe(Rank.THREE)
      expect(sorted[1].rank).toBe(Rank.FOUR)
      expect(sorted[2].rank).toBe(Rank.FIVE)
    })
  })
})


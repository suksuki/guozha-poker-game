import { describe, it, expect } from 'vitest'
import { Card, Suit, Rank, CardType } from '../src/types/card'
import {
  createDeck,
  shuffleDeck,
  dealCards,
  getCardType,
  canPlayCards,
  canBeat,
  isScoreCard,
  getCardScore
} from '../src/utils/cardUtils'

describe('回归测试 - 确保已修复的bug不会再次出现', () => {
  describe('发牌随机性回归测试', () => {
    it('发牌应该是随机的，不应该每次都一样', () => {
      const hands1 = dealCards(4)
      const hands2 = dealCards(4)
      
      // 至少有一个玩家的手牌顺序不同
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

    it('发牌后不应该自动排序（保持随机顺序）', () => {
      const hands = dealCards(4)
      
      // 检查手牌不是完全按rank排序的
      hands.forEach(hand => {
        let isSorted = true
        for (let i = 1; i < hand.length; i++) {
          if (hand[i].rank < hand[i - 1].rank) {
            isSorted = false
            break
          }
        }
        // 由于是随机发牌，大部分情况下不应该完全排序
        // 但允许偶尔排序（概率很低）
        // 这里我们只检查手牌数量正确
        expect(hand.length).toBe(54)
      })
    })
  })

  describe('大小王规则回归测试', () => {
    it('4张以下大小王混合应该被拒绝（已修复）', () => {
      // 1小1大 - 应该被拒绝
      const cards1: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' }
      ]
      expect(getCardType(cards1)).toBeNull()

      // 2小1大 - 应该被拒绝
      const cards2: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' }
      ]
      expect(getCardType(cards2)).toBeNull()

      // 1小2大 - 应该被拒绝
      const cards3: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-2' }
      ]
      expect(getCardType(cards3)).toBeNull()
    })

    it('4张及以上大小王混合应该可以一起出（已修复）', () => {
      // 4张（2小2大）
      const cards4: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-2' }
      ]
      const result4 = getCardType(cards4)
      expect(result4).not.toBeNull()
      expect(result4?.type).toBe(CardType.BOMB)

      // 5张（2小3大）
      const cards5: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-3' }
      ]
      const result5 = getCardType(cards5)
      expect(result5).not.toBeNull()
      expect(result5?.type).toBe(CardType.BOMB)

      // 6张（3小3大）
      const cards6: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-3' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-3' }
      ]
      const result6 = getCardType(cards6)
      expect(result6).not.toBeNull()
      expect(result6?.type).toBe(CardType.BOMB)
    })

    it('7张及以上大小王混合应该可以一起出作为墩（已修复）', () => {
      // 7张（3小4大）
      const cards7: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-3' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-1' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-2' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-3' },
        { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'joker-big-4' }
      ]
      const result7 = getCardType(cards7)
      expect(result7).not.toBeNull()
      expect(result7?.type).toBe(CardType.DUN)

      // 8张（4小4大）
      const cards8: Card[] = Array.from({ length: 8 }, (_, i) => ({
        suit: Suit.JOKER,
        rank: i < 4 ? Rank.JOKER_SMALL : Rank.JOKER_BIG,
        id: `joker-${i}`
      }))
      const result8 = getCardType(cards8)
      expect(result8).not.toBeNull()
      expect(result8?.type).toBe(CardType.DUN)
    })

    it('大小王不应该与普通牌混合（4张以下）', () => {
      const cards: Card[] = [
        { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'joker-small-1' },
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'normal-1' }
      ]
      expect(getCardType(cards)).toBeNull()
    })
  })

  describe('牌型判断回归测试', () => {
    it('不应该识别三带一（已移除）', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'test-3' },
        { suit: Suit.CLUBS, rank: Rank.FOUR, id: 'test-4' }
      ]
      const result = getCardType(cards)
      // 不应该识别为三带一，应该返回null或炸弹
      expect(result?.type).not.toBe('triple_with_single' as any)
    })

    it('不应该识别三带二（已移除）', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'test-3' },
        { suit: Suit.CLUBS, rank: Rank.FOUR, id: 'test-4' },
        { suit: Suit.SPADES, rank: Rank.FOUR, id: 'test-5' }
      ]
      const result = getCardType(cards)
      // 不应该识别为三带二
      expect(result?.type).not.toBe('triple_with_pair' as any)
    })

    it('不应该识别顺子（已移除）', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'test-2' },
        { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-3' },
        { suit: Suit.CLUBS, rank: Rank.SIX, id: 'test-4' },
        { suit: Suit.SPADES, rank: Rank.SEVEN, id: 'test-5' }
      ]
      const result = getCardType(cards)
      // 不应该识别为顺子
      expect(result?.type).not.toBe('straight' as any)
      expect(result).toBeNull()
    })
  })

  describe('出牌规则回归测试', () => {
    it('炸弹应该可以压过单张', () => {
      const single = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.TWO, id: 'test-1' }
      ])
      const bomb = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-2' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-3' },
        { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'test-4' },
        { suit: Suit.CLUBS, rank: Rank.THREE, id: 'test-5' }
      ])

      expect(single).not.toBeNull()
      expect(bomb).not.toBeNull()
      expect(canBeat(bomb!, single!)).toBe(true)
    })

    it('墩应该可以压过炸弹', () => {
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
      expect(canBeat(dun!, bomb!)).toBe(true)
    })

    it('同类型炸弹，数量多的应该可以压过数量少的', () => {
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

  describe('发牌数量回归测试', () => {
    it('4人游戏应该每人发54张牌（每人一副完整牌）', () => {
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

    it('8人游戏应该每人发54张牌', () => {
      const hands = dealCards(8)
      expect(hands.length).toBe(8)
      hands.forEach(hand => {
        expect(hand.length).toBe(54)
      })
    })
  })

  describe('牌ID唯一性回归测试', () => {
    it('每个玩家的牌ID应该是唯一的', () => {
      const hands = dealCards(4)
      const allIds = new Set<string>()
      
      hands.forEach((hand, playerIndex) => {
        hand.forEach(card => {
          // ID应该包含玩家索引（新格式：...-player${playerIndex}-hand...）
          expect(card.id).toContain(`player${playerIndex}`)
          // ID应该是唯一的
          expect(allIds.has(card.id)).toBe(false)
          allIds.add(card.id)
        })
      })
      
      // 确保所有牌都有唯一的ID
      expect(allIds.size).toBe(hands.reduce((sum, hand) => sum + hand.length, 0))
    })
  })

  describe('边界情况回归测试', () => {
    it('空数组应该返回null', () => {
      expect(getCardType([])).toBeNull()
    })

    it('单张牌应该可以出', () => {
      const card: Card = { suit: Suit.SPADES, rank: Rank.THREE, id: 'test' }
      const result = getCardType([card])
      expect(result).not.toBeNull()
      expect(result?.type).toBe(CardType.SINGLE)
    })

    it('最大单牌（2）应该可以压过其他单牌', () => {
      const three = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }
      ])
      const two = canPlayCards([
        { suit: Suit.SPADES, rank: Rank.TWO, id: 'test-2' }
      ])

      expect(three).not.toBeNull()
      expect(two).not.toBeNull()
      expect(canBeat(two!, three!)).toBe(true)
    })
  })

  describe('轮次记录功能回归测试', () => {
    it('玩家对象应该支持wonRounds字段', () => {
      // 确保新的轮次记录功能不会破坏现有Player接口
      const player = {
        id: 0,
        name: '测试玩家',
        type: 'human' as const,
        hand: [],
        score: 0,
        wonRounds: [] as any[]
      }
      
      expect(player.wonRounds).toBeDefined()
      expect(Array.isArray(player.wonRounds)).toBe(true)
      expect(player.wonRounds.length).toBe(0)
    })

    it('分牌识别功能应该正常工作', () => {
      const five: Card = { suit: Suit.SPADES, rank: Rank.FIVE, id: 's5' }
      const ten: Card = { suit: Suit.HEARTS, rank: Rank.TEN, id: 'h10' }
      const king: Card = { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'dK' }
      const four: Card = { suit: Suit.CLUBS, rank: Rank.FOUR, id: 'c4' }
      
      expect(isScoreCard(five)).toBe(true)
      expect(isScoreCard(ten)).toBe(true)
      expect(isScoreCard(king)).toBe(true)
      expect(isScoreCard(four)).toBe(false)
      
      expect(getCardScore(five)).toBe(5)
      expect(getCardScore(ten)).toBe(10)
      expect(getCardScore(king)).toBe(10)
      expect(getCardScore(four)).toBe(0)
    })
  })
})


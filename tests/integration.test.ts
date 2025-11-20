import { describe, it, expect } from 'vitest'
import { Card, Suit, Rank, CardType } from '../src/types/card'
import { dealCards, canPlayCards, canBeat } from '../src/utils/cardUtils'

describe('集成测试', () => {
  describe('完整游戏流程', () => {
    it('应该能够完成一轮出牌流程', () => {
      // 模拟4人游戏
      const hands = dealCards(4)
      
      // 每个玩家应该有一副完整的牌
      hands.forEach(hand => {
        expect(hand.length).toBe(54)
      })
      
      // 玩家1出单张
      const player1Card = hands[0][0]
      const play1 = canPlayCards([player1Card])
      expect(play1).not.toBeNull()
      expect(play1?.type).toBe(CardType.SINGLE)
      
      // 玩家2应该可以压过（如果有更大的牌）
      const player2LargerCard = hands[1].find(c => c.rank > player1Card.rank)
      if (player2LargerCard) {
        const play2 = canPlayCards([player2LargerCard])
        expect(play2).not.toBeNull()
        expect(canBeat(play2!, play1!)).toBe(true)
      }
    })

    it('应该正确处理炸弹压过普通牌型', () => {
      const hands = dealCards(4)
      
      // 玩家1出单张
      const single = canPlayCards([hands[0][0]])
      expect(single).not.toBeNull()
      
      // 玩家2出炸弹（如果有4张相同的牌）
      const rankCounts = new Map<Rank, Card[]>()
      hands[1].forEach(card => {
        if (!rankCounts.has(card.rank)) {
          rankCounts.set(card.rank, [])
        }
        rankCounts.get(card.rank)!.push(card)
      })
      
      // 找到有4张或以上的牌
      const bombRank = Array.from(rankCounts.entries()).find(([_, cards]) => cards.length >= 4)?.[0]
      
      if (bombRank) {
        const bombCards = rankCounts.get(bombRank)!.slice(0, 4)
        const bomb = canPlayCards(bombCards)
        
        if (bomb) {
          expect(bomb.type).toBe(CardType.BOMB)
          expect(canBeat(bomb, single!)).toBe(true)
        }
      }
    })
  })

  describe('边界情况测试', () => {
    it('空手牌应该无法出牌', () => {
      const play = canPlayCards([])
      expect(play).toBeNull()
    })

    it('单张牌应该可以出', () => {
      const card: Card = { suit: Suit.SPADES, rank: Rank.THREE, id: 'test' }
      const play = canPlayCards([card])
      expect(play).not.toBeNull()
      expect(play?.type).toBe(CardType.SINGLE)
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
})


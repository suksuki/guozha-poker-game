import { describe, it, expect } from 'vitest'
import { dealCards } from '../src/utils/cardUtils'

describe('游戏状态管理测试', () => {
  it('发牌应该为每个玩家创建正确数量的牌', () => {
    const hands = dealCards(4)
    
    expect(hands.length).toBe(4)
    hands.forEach(hand => {
      expect(hand.length).toBe(54) // 每人一副完整牌
    })
  })

  it('不同玩家数量的发牌测试', () => {
    for (let count = 4; count <= 8; count++) {
      const hands = dealCards(count)
      expect(hands.length).toBe(count)
      hands.forEach(hand => {
        expect(hand.length).toBe(54)
      })
    }
  })

  it('每个玩家的牌应该是唯一的', () => {
    const hands = dealCards(4)
    const allCardIds = new Set<string>()
    
    hands.forEach((hand, playerIndex) => {
      hand.forEach(card => {
        // 检查ID是否包含玩家索引
        expect(card.id).toContain(`player${playerIndex}`)
        // 检查ID是否唯一
        expect(allCardIds.has(card.id)).toBe(false)
        allCardIds.add(card.id)
      })
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

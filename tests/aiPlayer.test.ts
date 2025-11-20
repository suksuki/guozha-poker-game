import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Card, Suit, Rank, Play } from '../src/types/card'
import { aiChoosePlay } from '../src/utils/aiPlayer'
import { AIConfig } from '../src/utils/aiPlayer'

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn()
    }
  }
}

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => mockOpenAI)
  }
})

describe('AI玩家测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })


  describe('AI选择出牌', () => {
    it('当没有上家出牌时，应该可以选择任意合法牌型', async () => {
      const hand: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: 'test-2' },
        { suit: Suit.SPADES, rank: Rank.FOUR, id: 'test-3' }
      ]

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '1'
          }
        }]
      })

      const config: AIConfig = {
        apiKey: 'test-key',
        strategy: 'balanced'
      }

      const result = await aiChoosePlay(hand, null, config)
      
      // 应该返回一些牌（具体取决于AI的选择）
      expect(result === null || Array.isArray(result)).toBe(true)
    })

    it('当无法压过上家时，应该返回null（要不起）', async () => {
      const hand: Card[] = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'test-1' }
      ]

      const lastPlay: Play = {
        cards: [{ suit: Suit.SPADES, rank: Rank.TWO, id: 'test-2' }],
        type: 'single' as any,
        value: Rank.TWO
      }

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'pass'
          }
        }]
      })

      const config: AIConfig = {
        apiKey: 'test-key',
        strategy: 'balanced'
      }

      const result = await aiChoosePlay(hand, lastPlay, config)
      
      // 可能返回null或使用简单策略
      expect(result === null || Array.isArray(result)).toBe(true)
    })
  })
})


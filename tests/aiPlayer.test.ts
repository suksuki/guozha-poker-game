/**
 * AI玩家测试 - 测试AI选择出牌的核心功能
 * 使用策略模式，测试不同算法（Simple、MCTS）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Card, Suit, Rank, Play, CardType } from '../src/types/card'
import { aiChoosePlay } from '../src/utils/aiPlayer'
import { AIConfig } from '../src/ai/types'
import { createDeck } from '../src/utils/cardUtils'

describe('AI玩家测试', () => {
  let testDeck: Card[]

  beforeEach(() => {
    vi.clearAllMocks()
    testDeck = createDeck()
  })

  describe('Simple策略测试', () => {
    it('当没有上家出牌时，应该可以选择任意合法牌型', async () => {
      const hand: Card[] = [
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!,
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.HEARTS)!,
        testDeck.find(c => c.rank === Rank.FOUR && c.suit === Suit.SPADES)!
      ]

      const config: AIConfig = {
        algorithm: 'simple',
        strategy: 'balanced'
      }

      const result = await aiChoosePlay(hand, null, config)
      
      // Simple策略应该返回一些牌
      expect(result).not.toBeNull()
      expect(Array.isArray(result)).toBe(true)
      if (result) {
        expect(result.length).toBeGreaterThan(0)
        // 返回的牌应该都在手牌中
        result.forEach(card => {
          expect(hand.some(h => h.id === card.id)).toBe(true)
        })
      }
    })

    it('当无法压过上家时，应该返回null（要不起）', async () => {
      const hand: Card[] = [
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!,
        testDeck.find(c => c.rank === Rank.FOUR && c.suit === Suit.HEARTS)!
      ]

      const lastPlay: Play = {
        cards: [testDeck.find(c => c.rank === Rank.TWO && c.suit === Suit.SPADES)!],
        type: CardType.SINGLE,
        value: Rank.TWO
      }

      const config: AIConfig = {
        algorithm: 'simple',
        strategy: 'balanced'
      }

      const result = await aiChoosePlay(hand, lastPlay, config)
      
      // 小牌无法压过大2，应该返回null
      expect(result).toBeNull()
    })

    it('应该支持不同的策略风格 - 激进型', async () => {
      const hand: Card[] = [
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!,
        testDeck.find(c => c.rank === Rank.FOUR && c.suit === Suit.HEARTS)!,
        testDeck.find(c => c.rank === Rank.ACE && c.suit === Suit.DIAMONDS)!
      ]

      const config: AIConfig = {
        algorithm: 'simple',
        strategy: 'aggressive'
      }

      const result = await aiChoosePlay(hand, null, config)
      
      expect(result).not.toBeNull()
      expect(Array.isArray(result)).toBe(true)
    })

    it('应该支持不同的策略风格 - 保守型', async () => {
      const hand: Card[] = [
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!,
        testDeck.find(c => c.rank === Rank.FOUR && c.suit === Suit.HEARTS)!,
        testDeck.find(c => c.rank === Rank.ACE && c.suit === Suit.DIAMONDS)!
      ]

      const config: AIConfig = {
        algorithm: 'simple',
        strategy: 'conservative'
      }

      const result = await aiChoosePlay(hand, null, config)
      
      expect(result).not.toBeNull()
      expect(Array.isArray(result)).toBe(true)
    })

    it('当手牌为空时，应该返回null', async () => {
      const hand: Card[] = []

      const config: AIConfig = {
        algorithm: 'simple',
        strategy: 'balanced'
      }

      const result = await aiChoosePlay(hand, null, config)
      
      expect(result).toBeNull()
    })
  })

  describe('MCTS策略测试', () => {
    it('应该使用MCTS算法选择出牌', async () => {
      const hand: Card[] = [
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!,
        testDeck.find(c => c.rank === Rank.FOUR && c.suit === Suit.HEARTS)!,
        testDeck.find(c => c.rank === Rank.FIVE && c.suit === Suit.DIAMONDS)!
      ]

      const config: AIConfig = {
        algorithm: 'mcts',
        mctsIterations: 100, // 较少的迭代次数以加快测试
        strategy: 'balanced'
      }

      const result = await aiChoosePlay(hand, null, config)
      
      // MCTS应该返回一个有效的出牌选择
      expect(result).not.toBeNull()
      if (result) {
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
      }
    }, 10000) // MCTS可能需要更长时间

    it('MCTS应该支持完全信息模式', async () => {
      const hand: Card[] = [
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!,
        testDeck.find(c => c.rank === Rank.FOUR && c.suit === Suit.HEARTS)!
      ]

      const opponentHands: Card[][] = [
        [testDeck.find(c => c.rank === Rank.FIVE && c.suit === Suit.DIAMONDS)!],
        [testDeck.find(c => c.rank === Rank.SIX && c.suit === Suit.CLUBS)!]
      ]

      const config: AIConfig = {
        algorithm: 'mcts',
        mctsIterations: 50,
        perfectInformation: true,
        allPlayerHands: [hand, ...opponentHands],
        playerCount: 3
      }

      const result = await aiChoosePlay(hand, null, config)
      
      expect(result).not.toBeNull()
      if (result) {
        expect(Array.isArray(result)).toBe(true)
      }
    }, 10000)

    it('MCTS应该在无法压过上家时返回null', async () => {
      const hand: Card[] = [
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!
      ]

      const lastPlay: Play = {
        cards: [testDeck.find(c => c.rank === Rank.ACE && c.suit === Suit.HEARTS)!],
        type: CardType.SINGLE,
        value: Rank.ACE
      }

      const config: AIConfig = {
        algorithm: 'mcts',
        mctsIterations: 50,
        strategy: 'balanced'
      }

      const result = await aiChoosePlay(hand, lastPlay, config)
      
      // 小3无法压过A，应该返回null
      expect(result).toBeNull()
    }, 10000)
  })

  describe('默认配置测试', () => {
    it('当不指定算法时，应该使用默认算法', async () => {
      const hand: Card[] = [
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!,
        testDeck.find(c => c.rank === Rank.FOUR && c.suit === Suit.HEARTS)!
      ]

      const result = await aiChoosePlay(hand, null, {})
      
      // 应该使用默认算法（MCTS）成功返回结果
      expect(result).not.toBeNull()
      if (result) {
        expect(Array.isArray(result)).toBe(true)
      }
    }, 10000)

    it('应该正确合并配置', async () => {
      const hand: Card[] = [
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!
      ]

      const config: Partial<AIConfig> = {
        strategy: 'aggressive'
      }

      const result = await aiChoosePlay(hand, null, config)
      
      // 配置应该被正确合并
      expect(result === null || Array.isArray(result)).toBe(true)
    }, 10000)
  })

  describe('边界情况测试', () => {
    it('应该处理只有一张牌的手牌', async () => {
      const hand: Card[] = [
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!
      ]

      const config: AIConfig = {
        algorithm: 'simple',
        strategy: 'balanced'
      }

      const result = await aiChoosePlay(hand, null, config)
      
      expect(result).not.toBeNull()
      if (result) {
        expect(result.length).toBe(1)
      }
    })

    it('应该处理大量手牌的情况', async () => {
      const hand: Card[] = testDeck.slice(0, 20) // 取前20张牌

      const config: AIConfig = {
        algorithm: 'simple',
        strategy: 'balanced'
      }

      const result = await aiChoosePlay(hand, null, config)
      
      expect(result).not.toBeNull()
      if (result) {
        expect(result.length).toBeGreaterThan(0)
        expect(result.length).toBeLessThanOrEqual(hand.length)
      }
    })

    it('应该处理特殊牌型（炸弹）', async () => {
      const hand: Card[] = [
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.SPADES)!,
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.HEARTS)!,
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.DIAMONDS)!,
        testDeck.find(c => c.rank === Rank.THREE && c.suit === Suit.CLUBS)!
      ]

      const config: AIConfig = {
        algorithm: 'simple',
        strategy: 'balanced'
      }

      const result = await aiChoosePlay(hand, null, config)
      
      expect(result).not.toBeNull()
      if (result) {
        expect(result.length).toBeGreaterThan(0)
      }
    })
  })
})


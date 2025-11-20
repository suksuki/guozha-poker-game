import { describe, it, expect, beforeEach } from 'vitest'
import { Card, Suit, Rank, RoundPlayRecord, RoundRecord, Player, PlayerType } from '../src/types/card'
import { isScoreCard, getCardScore, calculateCardsScore } from '../src/utils/cardUtils'

describe('轮次记录功能测试', () => {
  describe('RoundPlayRecord', () => {
    it('应该正确创建出牌记录', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.FIVE, id: 's5-1' },
        { suit: Suit.HEARTS, rank: Rank.TEN, id: 'h10-1' },
        { suit: Suit.CLUBS, rank: Rank.FOUR, id: 'c4-1' }
      ]

      const record: RoundPlayRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards: cards,
        scoreCards: cards.filter(c => isScoreCard(c)),
        score: calculateCardsScore(cards)
      }

      expect(record.playerId).toBe(0)
      expect(record.playerName).toBe('玩家1')
      expect(record.cards.length).toBe(3)
      expect(record.scoreCards.length).toBe(2) // 5和10是分牌
      expect(record.score).toBe(15) // 5 + 10
    })

    it('应该正确识别分牌', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.FIVE, id: 's5-1' },
        { suit: Suit.HEARTS, rank: Rank.KING, id: 'hK-1' },
        { suit: Suit.CLUBS, rank: Rank.TEN, id: 'c10-1' },
        { suit: Suit.DIAMONDS, rank: Rank.FOUR, id: 'd4-1' }
      ]

      const scoreCards = cards.filter(c => isScoreCard(c))
      expect(scoreCards.length).toBe(3) // 5, K, 10
      expect(scoreCards.some(c => c.rank === Rank.FIVE)).toBe(true)
      expect(scoreCards.some(c => c.rank === Rank.KING)).toBe(true)
      expect(scoreCards.some(c => c.rank === Rank.TEN)).toBe(true)
    })

    it('应该正确计算分牌分值', () => {
      const cards: Card[] = [
        { suit: Suit.SPADES, rank: Rank.FIVE, id: 's5-1' }, // 5分
        { suit: Suit.HEARTS, rank: Rank.KING, id: 'hK-1' }, // 10分
        { suit: Suit.CLUBS, rank: Rank.TEN, id: 'c10-1' }, // 10分
        { suit: Suit.DIAMONDS, rank: Rank.FOUR, id: 'd4-1' } // 0分
      ]

      const totalScore = calculateCardsScore(cards)
      expect(totalScore).toBe(25) // 5 + 10 + 10 + 0
    })
  })

  describe('RoundRecord', () => {
    it('应该正确创建轮次记录', () => {
      const plays: RoundPlayRecord[] = [
        {
          playerId: 0,
          playerName: '玩家1',
          cards: [{ suit: Suit.SPADES, rank: Rank.FIVE, id: 's5-1' }],
          scoreCards: [{ suit: Suit.SPADES, rank: Rank.FIVE, id: 's5-1' }],
          score: 5
        },
        {
          playerId: 1,
          playerName: '玩家2',
          cards: [{ suit: Suit.HEARTS, rank: Rank.TEN, id: 'h10-1' }],
          scoreCards: [{ suit: Suit.HEARTS, rank: Rank.TEN, id: 'h10-1' }],
          score: 10
        }
      ]

      const roundRecord: RoundRecord = {
        roundNumber: 1,
        plays: plays,
        totalScore: 15,
        winnerId: 1,
        winnerName: '玩家2'
      }

      expect(roundRecord.roundNumber).toBe(1)
      expect(roundRecord.plays.length).toBe(2)
      expect(roundRecord.totalScore).toBe(15)
      expect(roundRecord.winnerId).toBe(1)
      expect(roundRecord.winnerName).toBe('玩家2')
    })

    it('应该正确计算轮次总分', () => {
      const plays: RoundPlayRecord[] = [
        {
          playerId: 0,
          playerName: '玩家1',
          cards: [{ suit: Suit.SPADES, rank: Rank.FIVE, id: 's5-1' }],
          scoreCards: [{ suit: Suit.SPADES, rank: Rank.FIVE, id: 's5-1' }],
          score: 5
        },
        {
          playerId: 1,
          playerName: '玩家2',
          cards: [{ suit: Suit.HEARTS, rank: Rank.KING, id: 'hK-1' }],
          scoreCards: [{ suit: Suit.HEARTS, rank: Rank.KING, id: 'hK-1' }],
          score: 10
        },
        {
          playerId: 2,
          playerName: '玩家3',
          cards: [{ suit: Suit.CLUBS, rank: Rank.TEN, id: 'c10-1' }],
          scoreCards: [{ suit: Suit.CLUBS, rank: Rank.TEN, id: 'c10-1' }],
          score: 10
        }
      ]

      const totalScore = plays.reduce((sum, play) => sum + play.score, 0)
      expect(totalScore).toBe(25) // 5 + 10 + 10
    })
  })

  describe('Player wonRounds', () => {
    it('玩家应该能够存储赢得的轮次', () => {
      const round1: RoundRecord = {
        roundNumber: 1,
        plays: [],
        totalScore: 15,
        winnerId: 0,
        winnerName: '玩家1'
      }

      const round2: RoundRecord = {
        roundNumber: 2,
        plays: [],
        totalScore: 20,
        winnerId: 0,
        winnerName: '玩家1'
      }

      const player: Player = {
        id: 0,
        name: '玩家1',
        type: PlayerType.HUMAN,
        hand: [],
        score: 35,
        wonRounds: [round1, round2]
      }

      expect(player.wonRounds?.length).toBe(2)
      expect(player.wonRounds?.[0].roundNumber).toBe(1)
      expect(player.wonRounds?.[1].roundNumber).toBe(2)
      expect(player.score).toBe(35) // 15 + 20
    })

    it('应该正确计算玩家总得分', () => {
      const rounds: RoundRecord[] = [
        { roundNumber: 1, plays: [], totalScore: 5, winnerId: 0, winnerName: '玩家1' },
        { roundNumber: 2, plays: [], totalScore: 10, winnerId: 0, winnerName: '玩家1' },
        { roundNumber: 3, plays: [], totalScore: 15, winnerId: 0, winnerName: '玩家1' }
      ]

      const totalScore = rounds.reduce((sum, round) => sum + round.totalScore, 0)
      expect(totalScore).toBe(30) // 5 + 10 + 15
    })
  })

  describe('分牌识别', () => {
    it('5应该是分牌，值5分', () => {
      const card: Card = { suit: Suit.SPADES, rank: Rank.FIVE, id: 's5' }
      expect(isScoreCard(card)).toBe(true)
      expect(getCardScore(card)).toBe(5)
    })

    it('10应该是分牌，值10分', () => {
      const card: Card = { suit: Suit.HEARTS, rank: Rank.TEN, id: 'h10' }
      expect(isScoreCard(card)).toBe(true)
      expect(getCardScore(card)).toBe(10)
    })

    it('K应该是分牌，值10分', () => {
      const card: Card = { suit: Suit.DIAMONDS, rank: Rank.KING, id: 'dK' }
      expect(isScoreCard(card)).toBe(true)
      expect(getCardScore(card)).toBe(10)
    })

    it('非分牌应该返回0分', () => {
      const card: Card = { suit: Suit.CLUBS, rank: Rank.FOUR, id: 'c4' }
      expect(isScoreCard(card)).toBe(false)
      expect(getCardScore(card)).toBe(0)
    })
  })
})


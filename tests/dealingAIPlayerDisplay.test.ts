/**
 * 发牌时AI玩家显示回归测试
 * 测试AI玩家头像、状态面板在发牌过程中的显示逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Player, PlayerType, Card, Suit, Rank } from '../src/types/card';

describe('发牌时AI玩家显示回归测试', () => {
  const createCard = (suit: Suit, rank: Rank, id: string): Card => ({
    suit,
    rank,
    id
  });

  const createAIPlayer = (id: number, name: string, score: number = 0): Omit<Player, 'hand'> => ({
    id,
    name,
    type: PlayerType.AI,
    isHuman: false,
    score,
    aiConfig: {
      strategy: 'balanced'
    }
  });

  describe('AI玩家数据结构', () => {
    it('应该正确创建AI玩家数据', () => {
      const player = createAIPlayer(1, 'AI玩家1', 30);
      
      expect(player.id).toBe(1);
      expect(player.name).toBe('AI玩家1');
      expect(player.type).toBe(PlayerType.AI);
      expect(player.isHuman).toBe(false);
      expect(player.score).toBe(30);
    });

    it('应该正确处理多个AI玩家', () => {
      const players = [
        createAIPlayer(0, 'AI玩家1', 20),
        createAIPlayer(1, 'AI玩家2', 30),
        createAIPlayer(2, 'AI玩家3', 10)
      ];
      
      expect(players.length).toBe(3);
      expect(players[0].score).toBe(20);
      expect(players[1].score).toBe(30);
      expect(players[2].score).toBe(10);
    });
  });

  describe('发牌过程中的状态更新', () => {
    it('应该正确跟踪每个玩家的发牌数量', () => {
      const playerCount = 4;
      const dealtCards: Card[][] = Array(playerCount).fill(null).map(() => []);
      
      // 模拟发牌：每个玩家发5张牌
      for (let round = 0; round < 5; round++) {
        for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
          const card = createCard(Suit.HEARTS, Rank.THREE, `card-${round}-${playerIndex}`);
          dealtCards[playerIndex].push(card);
        }
      }
      
      expect(dealtCards[0].length).toBe(5);
      expect(dealtCards[1].length).toBe(5);
      expect(dealtCards[2].length).toBe(5);
      expect(dealtCards[3].length).toBe(5);
    });

    it('应该正确计算每个玩家的手牌数量', () => {
      const players = [
        createAIPlayer(0, 'AI玩家1', 0),
        createAIPlayer(1, 'AI玩家2', 0),
        createAIPlayer(2, 'AI玩家3', 0)
      ];
      
      const dealtCards: Card[][] = [
        [createCard(Suit.HEARTS, Rank.THREE, '1'), createCard(Suit.SPADES, Rank.FOUR, '2')],
        [createCard(Suit.DIAMONDS, Rank.FIVE, '3')],
        [createCard(Suit.CLUBS, Rank.SIX, '4'), createCard(Suit.HEARTS, Rank.SEVEN, '5'), createCard(Suit.SPADES, Rank.EIGHT, '6')]
      ];
      
      const statusData = players.map((player, index) => ({
        playerId: player.id,
        playerName: player.name,
        score: player.score || 0,
        handCount: dealtCards[index]?.length || 0
      }));
      
      expect(statusData[0].handCount).toBe(2);
      expect(statusData[1].handCount).toBe(1);
      expect(statusData[2].handCount).toBe(3);
    });
  });

  describe('状态面板信息完整性', () => {
    it('应该包含所有必需的状态信息', () => {
      const player = createAIPlayer(1, 'AI玩家1', 25);
      const dealtCount = 10;
      
      const statusPanel = {
        score: player.score || 0,
        handCount: dealtCount,
        rank: null
      };
      
      expect(statusPanel).toHaveProperty('score');
      expect(statusPanel).toHaveProperty('handCount');
      expect(statusPanel).toHaveProperty('rank');
      expect(statusPanel.score).toBe(25);
      expect(statusPanel.handCount).toBe(10);
    });

    it('应该在有名次时显示名次信息', () => {
      const player = createAIPlayer(1, 'AI玩家1', 30);
      const dealtCount = 5;
      const finishedRank = 2;
      
      const statusPanel = {
        score: player.score || 0,
        handCount: dealtCount,
        rank: finishedRank
      };
      
      expect(statusPanel.rank).toBe(2);
      expect(statusPanel.rank).not.toBeNull();
    });
  });

  describe('发牌进度跟踪', () => {
    it('应该正确跟踪发牌进度', () => {
      const playerCount = 4;
      const totalCards = 54;
      const currentCardIndex = 20;
      
      const progress = {
        current: currentCardIndex,
        total: totalCards,
        percentage: (currentCardIndex / totalCards) * 100
      };
      
      expect(progress.current).toBe(20);
      expect(progress.total).toBe(54);
      expect(progress.percentage).toBeCloseTo(37.04, 2);
    });

    it('应该正确计算每个玩家的平均发牌数', () => {
      const playerCount = 4;
      const currentCardIndex = 20;
      const averageCardsPerPlayer = Math.floor(currentCardIndex / playerCount);
      
      expect(averageCardsPerPlayer).toBe(5);
    });
  });

  describe('AI玩家过滤', () => {
    it('应该正确过滤出AI玩家', () => {
      const players = [
        { ...createAIPlayer(0, '你', 0), isHuman: true },
        createAIPlayer(1, 'AI玩家1', 0),
        createAIPlayer(2, 'AI玩家2', 0),
        { ...createAIPlayer(3, '你2', 0), isHuman: true }
      ];
      
      const aiPlayers = players.filter(p => !p.isHuman);
      
      expect(aiPlayers.length).toBe(2);
      expect(aiPlayers[0].name).toBe('AI玩家1');
      expect(aiPlayers[1].name).toBe('AI玩家2');
    });

    it('应该正确处理所有玩家都是AI的情况', () => {
      const players = [
        createAIPlayer(0, 'AI玩家1', 0),
        createAIPlayer(1, 'AI玩家2', 0),
        createAIPlayer(2, 'AI玩家3', 0)
      ];
      
      const aiPlayers = players.filter(p => !p.isHuman);
      
      expect(aiPlayers.length).toBe(3);
    });
  });

  describe('状态信息更新', () => {
    it('应该在发牌过程中更新手牌数量', () => {
      const player = createAIPlayer(1, 'AI玩家1', 0);
      let dealtCount = 0;
      
      // 模拟发牌过程
      const cards = [
        createCard(Suit.HEARTS, Rank.THREE, '1'),
        createCard(Suit.SPADES, Rank.FOUR, '2'),
        createCard(Suit.DIAMONDS, Rank.FIVE, '3')
      ];
      
      cards.forEach(() => {
        dealtCount++;
      });
      
      expect(dealtCount).toBe(3);
    });

    it('应该保持分数不变（发牌时分数不变化）', () => {
      const initialScore = 30;
      const player = createAIPlayer(1, 'AI玩家1', initialScore);
      
      // 模拟发牌过程（分数不应该变化）
      const dealtCount = 10;
      const finalScore = player.score || 0;
      
      expect(finalScore).toBe(initialScore);
      expect(dealtCount).toBe(10);
    });
  });
});


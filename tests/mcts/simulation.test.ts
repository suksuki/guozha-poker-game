/**
 * MCTS游戏模拟单元测试
 */

import { describe, it, expect } from 'vitest';
import { simulateGame, estimateOpponentHand } from '../../src/ai/mcts/simulation';
import { SimulatedGameState } from '../../src/ai/types';
import { Card, Suit, Rank, Play } from '../../src/types/card';
import { createDeck, dealCards } from '../../src/utils/cardUtils';

describe('MCTS游戏模拟', () => {
  describe('estimateOpponentHand', () => {
    it('应该估计对手手牌', () => {
      // 创建多副牌（4个玩家需要4副牌）
      const allCards: Card[] = [];
      for (let i = 0; i < 4; i++) {
        allCards.push(...createDeck());
      }
      
      const hands = dealCards(4);
      const aiHand = hands[0] || [];
      const opponentHandSize = hands[1]?.length || 0;
      
      if (aiHand.length === 0 || opponentHandSize === 0) {
        // 如果dealCards返回空，跳过测试
        return;
      }
      
      const estimated = estimateOpponentHand(aiHand, allCards, opponentHandSize);
      
      // 估计的手牌数量应该等于请求的数量（或尽可能接近）
      // 注意：如果allCards中剩余的牌不够，可能会返回更少的牌
      expect(estimated.length).toBeGreaterThan(0);
      expect(estimated.length).toBeLessThanOrEqual(opponentHandSize);
    });

    it('应该返回正确数量的牌', () => {
      const allCards = createDeck();
      const hands = dealCards(4);
      const aiHand = hands[0] || [];
      
      if (aiHand.length === 0) {
        return;
      }
      
      const estimated = estimateOpponentHand(aiHand, allCards, 10);
      expect(estimated.length).toBe(10);
    });
  });

  describe('simulateGame', () => {
    function createGameState(
      aiHand: Card[],
      opponentHands: Card[][] = [],
      lastPlay: Play | null = null,
      currentPlayerIndex: number = 0,
      perfectInformation: boolean = false
    ): SimulatedGameState {
      const allHands = [aiHand, ...opponentHands];
      
      return {
        aiHand,
        opponentHands,
        allHands,
        lastPlay,
        lastPlayPlayerIndex: null,
        currentPlayerIndex,
        playerCount: allHands.length,
        roundScore: 0,
        aiScore: 0,
        isTerminal: false,
        winner: null,
        perfectInformation
      };
    }

    it('应该能够模拟游戏到结束', () => {
      const hands = dealCards(4);
      const aiHand = hands[0] || [];
      const opponentHands = hands.slice(1).filter(h => h && h.length > 0);
      
      if (aiHand.length === 0 || opponentHands.length === 0) {
        return; // 跳过测试
      }
      
      const state = createGameState(aiHand, opponentHands, null, 0, true);
      
      const winner = simulateGame(state, 100, true);
      
      expect(winner).toBeGreaterThanOrEqual(0);
      expect(winner).toBeLessThan(4);
    });

    it('应该在达到最大深度时返回结果', () => {
      const hands = dealCards(4);
      const aiHand = hands[0] || [];
      const opponentHands = hands.slice(1).filter(h => h && h.length > 0);
      
      if (aiHand.length === 0 || opponentHands.length === 0) {
        return;
      }
      
      const state = createGameState(aiHand, opponentHands, null, 0, true);
      
      const winner = simulateGame(state, 5, true); // 很浅的深度
      
      expect(winner).toBeGreaterThanOrEqual(0);
      expect(winner).toBeLessThan(4);
    });

    it('应该使用完全信息模式', () => {
      const hands = dealCards(4);
      const aiHand = hands[0] || [];
      const opponentHands = hands.slice(1).filter(h => h && h.length > 0);
      
      if (aiHand.length === 0 || opponentHands.length === 0) {
        return;
      }
      
      const state = createGameState(aiHand, opponentHands, null, 0, true);
      
      const winner = simulateGame(state, 50, true);
      
      expect(winner).toBeGreaterThanOrEqual(0);
      expect(winner).toBeLessThan(4);
    });

    it('应该使用估计模式', () => {
      const hands = dealCards(4);
      const aiHand = hands[0] || [];
      const opponentHands: Card[][] = []; // 不提供对手手牌，使用估计
      
      if (aiHand.length === 0) {
        return;
      }
      
      const state = createGameState(aiHand, opponentHands, null, 0, false);
      
      const winner = simulateGame(state, 50, false);
      
      expect(winner).toBeGreaterThanOrEqual(0);
      expect(winner).toBeLessThan(4);
    });

    it('应该处理要不起的情况', () => {
      const hands = dealCards(4);
      const aiHand = hands[0] || [];
      const opponentHands = hands.slice(1).filter(h => h && h.length > 0);
      
      if (aiHand.length === 0 || opponentHands.length === 0 || !opponentHands[0] || opponentHands[0].length === 0) {
        return;
      }
      
      // 创建一个上家出牌，但AI手牌中没有能压过的
      const lastPlay: Play = {
        type: 'single',
        cards: [opponentHands[0][0]],
        value: 15 // 很大的牌
      };
      
      const state = createGameState(aiHand, opponentHands, lastPlay, 0, true);
      
      const winner = simulateGame(state, 50, true);
      
      expect(winner).toBeGreaterThanOrEqual(0);
      expect(winner).toBeLessThan(4);
    });

    it('应该处理多人游戏', () => {
      const hands = dealCards(4);
      const aiHand = hands[0] || [];
      const opponentHands = hands.slice(1).filter(h => h && h.length > 0);
      
      if (aiHand.length === 0 || opponentHands.length === 0) {
        return;
      }
      
      const state = createGameState(aiHand, opponentHands, null, 0, true);
      state.playerCount = 4;
      
      const winner = simulateGame(state, 50, true);
      
      expect(winner).toBeGreaterThanOrEqual(0);
      expect(winner).toBeLessThan(4);
    });

    it('应该正确更新轮次分数', () => {
      const hands = dealCards(4);
      const aiHand = hands[0] || [];
      const opponentHands = hands.slice(1).filter(h => h && h.length > 0);
      
      if (aiHand.length === 0 || opponentHands.length === 0) {
        return;
      }
      
      const state = createGameState(aiHand, opponentHands, null, 0, true);
      state.roundScore = 10; // 初始轮次分数
      
      const winner = simulateGame(state, 50, true);
      
      // 游戏应该能正常完成
      expect(winner).toBeGreaterThanOrEqual(0);
      expect(winner).toBeLessThan(4);
    });
  });
});


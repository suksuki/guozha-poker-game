/**
 * cardUtils 回归测试
 * 
 * 目标：验证新旧实现100%一致
 * 方法：100个随机场景对比
 */

import { describe, it, expect } from 'vitest';
import * as oldCardUtils from '../../../src/utils/cardUtils';
import * as newCardUtils from '../../../src/game-engine/utils/card-utils';
import { Card, Suit, Rank } from '../../../src/types/card';

describe('cardUtils 回归测试', () => {
  
  // ========== 辅助函数：生成随机测试数据 ==========
  
  function generateRandomCard(): Card {
    const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
    const ranks = [
      Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN,
      Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN,
      Rank.KING, Rank.ACE, Rank.TWO
    ];
    
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    
    return {
      suit,
      rank,
      id: `${suit}-${rank}-${Math.random()}`
    };
  }
  
  function generateRandomCards(count: number): Card[] {
    return Array.from({ length: count }, () => generateRandomCard());
  }

  // ========== 分值计算函数回归测试 ==========
  
  describe('isScoreCard - 100场景', () => {
    it('所有场景结果一致', () => {
      const testCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.FIVE, id: '1' },
        { suit: Suit.SPADES, rank: Rank.TEN, id: '2' },
        { suit: Suit.DIAMONDS, rank: Rank.KING, id: '3' },
        { suit: Suit.CLUBS, rank: Rank.ACE, id: '4' },
        { suit: Suit.HEARTS, rank: Rank.THREE, id: '5' },
        ...generateRandomCards(95)
      ];
      
      let matchCount = 0;
      testCards.forEach(card => {
        const oldResult = oldCardUtils.isScoreCard(card);
        const newResult = newCardUtils.isScoreCard(card);
        
        if (oldResult === newResult) {
          matchCount++;
        } else {
          console.error('Mismatch:', { card, old: oldResult, new: newResult });
        }
      });
      
      expect(matchCount).toBe(testCards.length);
    });
  });

  describe('getCardScore - 100场景', () => {
    it('所有场景结果一致', () => {
      const cards = [
        { suit: Suit.HEARTS, rank: Rank.FIVE, id: '1' },  // 5分
        { suit: Suit.SPADES, rank: Rank.TEN, id: '2' },   // 10分
        { suit: Suit.DIAMONDS, rank: Rank.KING, id: '3' }, // 10分
        { suit: Suit.CLUBS, rank: Rank.ACE, id: '4' },     // 0分
        ...generateRandomCards(96)
      ];
      
      cards.forEach(card => {
        const oldScore = oldCardUtils.getCardScore(card);
        const newScore = newCardUtils.getCardScore(card);
        expect(newScore).toBe(oldScore);
      });
    });
  });

  describe('calculateCardsScore - 100场景', () => {
    it('所有场景结果一致', () => {
      // 生成100组随机卡牌组合
      for (let i = 0; i < 100; i++) {
        const cardCount = Math.floor(Math.random() * 13) + 1; // 1-13张
        const cards = generateRandomCards(cardCount);
        
        const oldScore = oldCardUtils.calculateCardsScore(cards);
        const newScore = newCardUtils.calculateCardsScore(cards);
        
        expect(newScore).toBe(oldScore);
      }
    });
  });

  describe('calculateDunCount - 所有可能值', () => {
    it('所有场景结果一致', () => {
      // 测试0-20张牌的所有情况
      for (let cardCount = 0; cardCount <= 20; cardCount++) {
        const oldDun = oldCardUtils.calculateDunCount(cardCount);
        const newDun = newCardUtils.calculateDunCount(cardCount);
        
        expect(newDun).toBe(oldDun);
      }
    });
  });

  // ========== 牌型判断函数回归测试 ==========
  
  describe('canPlayCards - 100场景', () => {
    it('所有场景结果一致', () => {
      // 测试各种组合
      const testCases = [
        // 单张
        [{ suit: Suit.HEARTS, rank: Rank.FIVE, id: '1' }],
        // 对子
        [
          { suit: Suit.HEARTS, rank: Rank.FIVE, id: '1' },
          { suit: Suit.SPADES, rank: Rank.FIVE, id: '2' }
        ],
        // 三张
        [
          { suit: Suit.HEARTS, rank: Rank.FIVE, id: '1' },
          { suit: Suit.SPADES, rank: Rank.FIVE, id: '2' },
          { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: '3' }
        ],
        // 无效组合
        [
          { suit: Suit.HEARTS, rank: Rank.FIVE, id: '1' },
          { suit: Suit.SPADES, rank: Rank.SIX, id: '2' }
        ]
      ];
      
      // 加上随机组合
      for (let i = 0; i < 96; i++) {
        const count = Math.floor(Math.random() * 7) + 1;
        testCases.push(generateRandomCards(count));
      }
      
      testCases.forEach((cards, index) => {
        const oldPlay = oldCardUtils.canPlayCards(cards);
        const newPlay = newCardUtils.canPlayCards(cards);
        
        // 深度比较结果
        if (oldPlay === null && newPlay === null) {
          // 都是null，一致
        } else if (oldPlay && newPlay) {
          expect(newPlay.type).toBe(oldPlay.type);
          expect(newPlay.cards.length).toBe(oldPlay.cards.length);
        } else {
          // 一个null一个不是，不一致
          console.error(`Mismatch at case ${index}:`, { old: oldPlay, new: newPlay });
          expect(newPlay).toBe(oldPlay);
        }
      });
    });
  });

  // ========== 发牌函数回归测试 ==========
  
  describe('dealCards - 一致性测试', () => {
    it('返回的牌数应该一致', () => {
      for (const playerCount of [2, 4, 6]) {
        const oldHands = oldCardUtils.dealCards(playerCount);
        const newHands = newCardUtils.dealCards(playerCount);
        
        // 玩家数一致
        expect(newHands.length).toBe(oldHands.length);
        
        // 每个玩家的牌数一致
        for (let i = 0; i < playerCount; i++) {
          expect(newHands[i].length).toBe(oldHands[i].length);
        }
        
        // 总牌数一致
        const oldTotal = oldHands.reduce((sum, hand) => sum + hand.length, 0);
        const newTotal = newHands.reduce((sum, hand) => sum + hand.length, 0);
        expect(newTotal).toBe(oldTotal);
      }
    });
    
    it('牌的ID格式应该一致', () => {
      const hands = newCardUtils.dealCards(4);
      
      hands.forEach(hand => {
        hand.forEach(card => {
          // ID应该存在且格式正确
          expect(card.id).toBeDefined();
          expect(typeof card.id).toBe('string');
          expect(card.id.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ========== 比较函数回归测试 ==========
  
  describe('compareCards - 100场景', () => {
    it('所有场景结果一致', () => {
      for (let i = 0; i < 100; i++) {
        const card1 = generateRandomCard();
        const card2 = generateRandomCard();
        
        const oldResult = oldCardUtils.compareCards(card1, card2);
        const newResult = newCardUtils.compareCards(card1, card2);
        
        expect(newResult).toBe(oldResult);
      }
    });
  });

  // ========== 工具函数回归测试 ==========
  
  describe('hasPlayableCards - 100场景', () => {
    it('所有场景结果一致', () => {
      for (let i = 0; i < 100; i++) {
        const handSize = Math.floor(Math.random() * 13) + 1;
        const hand = generateRandomCards(handSize);
        const lastPlay = Math.random() > 0.5 ? null : oldCardUtils.canPlayCards(generateRandomCards(2));
        
        const oldResult = oldCardUtils.hasPlayableCards(hand, lastPlay);
        const newResult = newCardUtils.hasPlayableCards(hand, lastPlay);
        
        expect(newResult).toBe(oldResult);
      }
    });
  });

  // ========== 综合测试：完整游戏场景 ==========
  
  describe('综合场景测试', () => {
    it('模拟100局游戏的发牌和计分', () => {
      for (let gameIndex = 0; gameIndex < 100; gameIndex++) {
        const playerCount = [2, 4, 6][Math.floor(Math.random() * 3)];
        
        // 发牌
        const oldHands = oldCardUtils.dealCards(playerCount);
        const newHands = newCardUtils.dealCards(playerCount);
        
        // 验证牌数一致
        expect(newHands.length).toBe(oldHands.length);
        
        // 计算每个玩家的分数
        for (let i = 0; i < playerCount; i++) {
          const oldScore = oldCardUtils.calculateCardsScore(oldHands[i]);
          const newScore = newCardUtils.calculateCardsScore(newHands[i]);
          
          // 分数范围应该合理（不一定完全相等，因为发牌随机）
          expect(newScore).toBeGreaterThanOrEqual(0);
          expect(newScore).toBeLessThanOrEqual(300); // 合理范围（多副牌时可能较高）
        }
      }
    });
  });
});


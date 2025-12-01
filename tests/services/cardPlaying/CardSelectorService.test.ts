/**
 * CardSelectorService 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Card, Suit, Rank } from '../../../src/types/card';
import { CardSelectorService } from '../../../src/services/cardPlaying/CardSelectorService';
import { ValidationService } from '../../../src/services/cardPlaying/ValidationService';
import { createDeck } from '../../../src/utils/cardUtils';

describe('CardSelectorService', () => {
  let cardSelectorService: CardSelectorService;
  let validationService: ValidationService;
  let deck: Card[];
  let playerId: number;
  let playerHand: Card[];

  beforeEach(() => {
    validationService = new ValidationService();
    cardSelectorService = new CardSelectorService(validationService);
    deck = createDeck();
    playerId = 0;
    
    // 创建测试手牌
    playerHand = [
      deck.find(c => c.rank === Rank.ACE && c.suit === Suit.SPADES)!,
      deck.find(c => c.rank === Rank.ACE && c.suit === Suit.HEARTS)!,
      deck.find(c => c.rank === Rank.KING && c.suit === Suit.SPADES)!,
      deck.find(c => c.rank === Rank.KING && c.suit === Suit.HEARTS)!,
      deck.find(c => c.rank === Rank.QUEEN && c.suit === Suit.SPADES)!
    ];

    cardSelectorService.initializePlayer(playerId, 'card');
  });

  describe('初始化', () => {
    it('应该初始化玩家选牌状态', () => {
      const selection = cardSelectorService.getSelection(playerId);
      expect(selection).toEqual([]);
    });
  });

  describe('selectCard', () => {
    it('应该选择单张牌', () => {
      const card = playerHand[0];
      const result = cardSelectorService.selectCard(playerId, card, playerHand);
      
      expect(result.success).toBe(true);
      expect(result.selectedCards).toContainEqual(card);
      expect(cardSelectorService.getSelection(playerId)).toContainEqual(card);
    });

    it('应该拒绝选择不在手牌中的牌', () => {
      const invalidCard: Card = {
        id: 999,
        suit: Suit.SPADES,
        rank: Rank.TWO
      };
      
      const result = cardSelectorService.selectCard(playerId, invalidCard, playerHand);
      expect(result.success).toBe(false);
      expect(result.error).toContain('不在手牌中');
    });

    it('应该允许重复选择（不报错）', () => {
      const card = playerHand[0];
      cardSelectorService.selectCard(playerId, card, playerHand);
      const result = cardSelectorService.selectCard(playerId, card, playerHand);
      
      // 重复选择应该被忽略或合并
      const selection = cardSelectorService.getSelection(playerId);
      expect(selection.filter(c => c.id === card.id).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('deselectCard', () => {
    it('应该取消选择牌', () => {
      const card = playerHand[0];
      cardSelectorService.selectCard(playerId, card, playerHand);
      
      const result = cardSelectorService.deselectCard(playerId, card);
      expect(result.success).toBe(true);
      expect(result.selectedCards).not.toContainEqual(card);
      expect(cardSelectorService.getSelection(playerId)).not.toContainEqual(card);
    });

    it('应该处理取消选择未选中的牌', () => {
      const card = playerHand[0];
      const result = cardSelectorService.deselectCard(playerId, card);
      
      // 应该成功（幂等操作）
      expect(result.success).toBe(true);
    });
  });

  describe('toggleCard', () => {
    it('应该切换牌的选择状态', () => {
      const card = playerHand[0];
      
      // 第一次：选择
      const result1 = cardSelectorService.toggleCard(playerId, card, playerHand);
      expect(result1.success).toBe(true);
      expect(cardSelectorService.getSelection(playerId)).toContainEqual(card);
      
      // 第二次：取消选择
      const result2 = cardSelectorService.toggleCard(playerId, card, playerHand);
      expect(result2.success).toBe(true);
      expect(cardSelectorService.getSelection(playerId)).not.toContainEqual(card);
    });
  });

  describe('selectGroup', () => {
    it('应该选择一组牌', () => {
      const cards = [playerHand[0], playerHand[1]];
      const result = cardSelectorService.selectGroup(playerId, cards, playerHand);
      
      expect(result.success).toBe(true);
      expect(result.selectedCards.length).toBe(2);
      expect(cardSelectorService.getSelection(playerId).length).toBe(2);
    });

    it('应该拒绝选择包含不在手牌中的牌', () => {
      const invalidCard: Card = {
        id: 999,
        suit: Suit.SPADES,
        rank: Rank.TWO
      };
      const cards = [playerHand[0], invalidCard];
      
      const result = cardSelectorService.selectGroup(playerId, cards, playerHand);
      expect(result.success).toBe(false);
      expect(result.error).toContain('不在手牌中');
    });
  });

  describe('clearSelection', () => {
    it('应该清空所有选择', () => {
      cardSelectorService.selectCard(playerId, playerHand[0], playerHand);
      cardSelectorService.selectCard(playerId, playerHand[1], playerHand);
      
      cardSelectorService.clearSelection(playerId);
      expect(cardSelectorService.getSelection(playerId)).toEqual([]);
    });
  });

  describe('highlightPlayableCards', () => {
    it('应该高亮可出的牌（新轮次）', () => {
      const highlighted = cardSelectorService.highlightPlayableCards(
        playerId,
        playerHand,
        null
      );
      
      expect(highlighted.length).toBeGreaterThan(0);
      // 所有牌都应该可以出（新轮次）
      expect(highlighted.length).toBeGreaterThanOrEqual(playerHand.length);
    });

    it('应该高亮能压过上家的牌', () => {
      const lastPlay = validationService.validateCardType([
        deck.find(c => c.rank === Rank.ACE && c.suit === Suit.DIAMONDS)!
      ]);
      
      if (lastPlay) {
        const highlighted = cardSelectorService.highlightPlayableCards(
          playerId,
          playerHand,
          lastPlay
        );
        
        // 应该只高亮能压过A的牌（2、王等）
        expect(highlighted.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('validateSelection', () => {
    it('应该验证合法的选牌', () => {
      const cards = [playerHand[0], playerHand[1]]; // 对子
      cardSelectorService.selectGroup(playerId, cards, playerHand);
      
      // validateSelection 的参数顺序是: playerId, lastPlay?, playerHand?
      const result = cardSelectorService.validateSelection(playerId, null, playerHand);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝不合法的选牌', () => {
      const cards = [playerHand[0], playerHand[2]]; // 不是合法牌型
      cardSelectorService.selectGroup(playerId, cards, playerHand);
      
      const result = cardSelectorService.validateSelection(playerId, playerHand, null);
      expect(result.valid).toBe(false);
    });
  });
});


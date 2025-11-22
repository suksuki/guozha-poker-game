/**
 * MCTS节点扩展单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { expandNode } from '../../src/ai/mcts/expansion';
import { MCTSNode } from '../../src/ai/types';
import { Card, Suit, Rank, Play } from '../../src/types/card';
import { createDeck, dealCards } from '../../src/utils/cardUtils';

describe('MCTS节点扩展', () => {
  let testHand: Card[];
  let testDeck: Card[];

  beforeEach(() => {
    testDeck = createDeck();
    const hands = dealCards(testDeck, 4);
    testHand = hands[0] || [];
    // 确保testHand有牌
    if (testHand.length === 0) {
      // 如果dealCards返回空，手动创建一些测试牌
      testHand = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'hearts-4' },
        { suit: Suit.DIAMONDS, rank: Rank.ACE, id: 'diamonds-14' }
      ];
    }
  });

  function createNode(
    hand: Card[],
    lastPlay: Play | null = null,
    playerToMove: 'ai' | 'opponent' = 'ai',
    untriedActions: Card[][] = []
  ): MCTSNode {
    return {
      hand,
      lastPlay,
      playerToMove,
      visits: 0,
      wins: 0,
      children: [],
      parent: null,
      action: null,
      untriedActions
    };
  }

  it('应该在没有未尝试动作时返回null', () => {
    const node = createNode(testHand, null, 'ai', []);
    const result = expandNode(node, testDeck);
    expect(result).toBeNull();
  });

  it('应该成功扩展节点并创建子节点', () => {
    // 确保testHand有牌
    if (testHand.length === 0) {
      testHand = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'hearts-4' }
      ];
    }
    // 创建一些有效的出牌动作
    const singleCard = [testHand[0]];
    const node = createNode(testHand, null, 'ai', [singleCard]);
    
    const result = expandNode(node, testDeck);
    
    expect(result).not.toBeNull();
    expect(result!.hand.length).toBe(testHand.length - 1);
    expect(node.children.length).toBe(1);
    expect(node.children[0]).toBe(result);
  });

  it('应该从untriedActions中移除已使用的动作', () => {
    // 确保testHand有足够的牌
    if (testHand.length < 2) {
      testHand = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'hearts-4' },
        { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'diamonds-5' }
      ];
    }
    const action1 = [testHand[0]];
    const action2 = [testHand[1]];
    const node = createNode(testHand, null, 'ai', [action1, action2]);
    
    const originalLength = node.untriedActions.length;
    expandNode(node, testDeck);
    
    expect(node.untriedActions.length).toBe(originalLength - 1);
  });

  it('应该切换玩家回合', () => {
    // 确保testHand有牌
    if (testHand.length === 0) {
      testHand = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'hearts-4' }
      ];
    }
    const action = [testHand[0]];
    const node = createNode(testHand, null, 'ai', [action]);
    
    const result = expandNode(node, testDeck);
    
    expect(result).not.toBeNull();
    expect(result!.playerToMove).toBe('opponent');
  });

  it('应该正确设置新节点的lastPlay', () => {
    // 确保testHand有牌
    if (testHand.length === 0) {
      testHand = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'hearts-4' }
      ];
    }
    const action = [testHand[0]];
    const node = createNode(testHand, null, 'ai', [action]);
    
    const result = expandNode(node, testDeck);
    
    expect(result).not.toBeNull();
    expect(result!.lastPlay).not.toBeNull();
    expect(result!.lastPlay!.cards).toEqual(action);
  });

  it('应该正确设置新节点的parent', () => {
    // 确保testHand有牌
    if (testHand.length === 0) {
      testHand = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
        { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'hearts-4' }
      ];
    }
    const action = [testHand[0]];
    const node = createNode(testHand, null, 'ai', [action]);
    
    const result = expandNode(node, testDeck);
    
    expect(result).not.toBeNull();
    expect(result!.parent).toBe(node);
  });

  it('应该拒绝无效的出牌动作', () => {
    // 创建一个无效的动作（空数组）
    const invalidAction: Card[] = [];
    const node = createNode(testHand, null, 'ai', [invalidAction]);
    
    const result = expandNode(node, testDeck);
    
    // 应该返回null，因为无效动作无法扩展
    expect(result).toBeNull();
  });

  it('应该拒绝不能压过上家出牌的动作', () => {
    // 确保testHand有牌
    if (testHand.length === 0) {
      testHand = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts-14' }
      ];
    }
    // 创建一个上家出牌（大牌）
    const aceCard = testHand.find(c => c.rank === Rank.ACE) || testHand[1];
    const lastPlay: Play = {
      type: 'single',
      cards: [aceCard],
      value: 14
    };
    
    // 创建一个不能压过的动作（小牌）
    const smallCard = testHand.find(c => c.rank === Rank.THREE) || testHand[0];
    const action = [smallCard];
    const node = createNode(testHand, lastPlay, 'ai', [action]);
    
    const result = expandNode(node, testDeck);
    
    // 应该返回null，因为不能压过
    expect(result).toBeNull();
  });

  it('应该能够压过上家出牌时成功扩展', () => {
    // 确保testHand有牌
    if (testHand.length === 0) {
      testHand = [
        { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
        { suit: Suit.HEARTS, rank: Rank.ACE, id: 'hearts-14' }
      ];
    }
    // 创建一个上家出牌（小牌）
    const threeCard = testHand.find(c => c.rank === Rank.THREE) || testHand[0];
    const lastPlay: Play = {
      type: 'single',
      cards: [threeCard],
      value: 3
    };
    
    // 创建一个能压过的动作（大牌）
    const bigCard = testHand.find(c => c.rank === Rank.ACE) || testHand[1];
    const action = [bigCard];
    const node = createNode(testHand, lastPlay, 'ai', [action]);
    
    const result = expandNode(node, testDeck);
    
    // 应该成功扩展
    expect(result).not.toBeNull();
  });
});


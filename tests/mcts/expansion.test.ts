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

  it('应该正确处理对子扩展', () => {
    const pairHand = [
      { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
      { suit: Suit.HEARTS, rank: Rank.THREE, id: 'hearts-3' },
      { suit: Suit.DIAMONDS, rank: Rank.FOUR, id: 'diamonds-4' }
    ];
    const action = [pairHand[0], pairHand[1]]; // 对子
    const node = createNode(pairHand, null, 'ai', [action]);
    
    const result = expandNode(node, testDeck);
    
    expect(result).not.toBeNull();
    if (result) {
      expect(result.hand.length).toBe(pairHand.length - 2);
      expect(result.lastPlay).not.toBeNull();
      expect(result.lastPlay!.cards.length).toBe(2);
    }
  });

  it('应该正确处理三张扩展', () => {
    const tripleHand = [
      { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
      { suit: Suit.HEARTS, rank: Rank.THREE, id: 'hearts-3' },
      { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'diamonds-3' },
      { suit: Suit.CLUBS, rank: Rank.FOUR, id: 'clubs-4' }
    ];
    const action = [tripleHand[0], tripleHand[1], tripleHand[2]]; // 三张
    const node = createNode(tripleHand, null, 'ai', [action]);
    
    const result = expandNode(node, testDeck);
    
    expect(result).not.toBeNull();
    if (result) {
      expect(result.hand.length).toBe(tripleHand.length - 3);
      expect(result.lastPlay!.cards.length).toBe(3);
    }
  });

  it('应该正确处理炸弹扩展', () => {
    const bombHand = [
      { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
      { suit: Suit.HEARTS, rank: Rank.THREE, id: 'hearts-3' },
      { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'diamonds-3' },
      { suit: Suit.CLUBS, rank: Rank.THREE, id: 'clubs-3' }
    ];
    const action = bombHand.slice(); // 炸弹
    const node = createNode(bombHand, null, 'ai', [action]);
    
    const result = expandNode(node, testDeck);
    
    expect(result).not.toBeNull();
    if (result) {
      expect(result.hand.length).toBe(0); // 所有牌都出完了
      expect(result.lastPlay!.cards.length).toBe(4);
    }
  });

  it('应该在扩展后正确更新children数组', () => {
    const hand = [
      { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
      { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'hearts-4' }
    ];
    const action1 = [hand[0]];
    const action2 = [hand[1]];
    const node = createNode(hand, null, 'ai', [action1, action2]);
    
    const initialChildrenCount = node.children.length;
    const result = expandNode(node, testDeck);
    
    expect(node.children.length).toBe(initialChildrenCount + 1);
    expect(node.children).toContain(result);
  });

  it('应该在扩展后正确移除untriedAction', () => {
    const hand = [
      { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
      { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'hearts-4' },
      { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'diamonds-5' }
    ];
    const action1 = [hand[0]];
    const action2 = [hand[1]];
    const action3 = [hand[2]];
    const node = createNode(hand, null, 'ai', [action1, action2, action3]);
    
    const initialUntriedCount = node.untriedActions.length;
    expandNode(node, testDeck);
    
    expect(node.untriedActions.length).toBe(initialUntriedCount - 1);
  });

  it('应该在多次扩展后用完所有untried actions', () => {
    const hand = [
      { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
      { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'hearts-4' }
    ];
    const action1 = [hand[0]];
    const action2 = [hand[1]];
    const node = createNode(hand, null, 'ai', [action1, action2]);
    
    expandNode(node, testDeck);
    expandNode(node, testDeck);
    
    expect(node.untriedActions.length).toBe(0);
    expect(node.children.length).toBe(2);
  });

  it('应该在所有actions尝试后返回null', () => {
    const hand = [
      { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' }
    ];
    const action = [hand[0]];
    const node = createNode(hand, null, 'ai', [action]);
    
    // 第一次扩展应该成功
    const result1 = expandNode(node, testDeck);
    expect(result1).not.toBeNull();
    
    // 第二次扩展应该返回null（没有更多actions）
    const result2 = expandNode(node, testDeck);
    expect(result2).toBeNull();
  });

  it('应该正确设置子节点的所有属性', () => {
    const hand = [
      { suit: Suit.SPADES, rank: Rank.THREE, id: 'spades-3' },
      { suit: Suit.HEARTS, rank: Rank.FOUR, id: 'hearts-4' }
    ];
    const action = [hand[0]];
    const node = createNode(hand, null, 'ai', [action]);
    
    const result = expandNode(node, testDeck);
    
    expect(result).not.toBeNull();
    if (result) {
      expect(result.parent).toBe(node);
      expect(result.action).toEqual(action);
      expect(result.visits).toBe(0);
      expect(result.wins).toBe(0);
      expect(result.children).toEqual([]);
      expect(result.playerToMove).toBe('opponent');
    }
  });
});


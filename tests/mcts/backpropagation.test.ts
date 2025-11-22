/**
 * MCTS反向传播单元测试
 */

import { describe, it, expect } from 'vitest';
import { backpropagate } from '../../src/ai/mcts/backpropagation';
import { MCTSNode } from '../../src/ai/types';
import { Card, Suit, Rank } from '../../src/types/card';

describe('MCTS反向传播', () => {
  // 创建测试用的节点树
  function createNodeTree(): MCTSNode {
    const root: MCTSNode = {
      hand: [],
      lastPlay: null,
      playerToMove: 'ai',
      visits: 0,
      wins: 0,
      children: [],
      parent: null,
      action: null,
      untriedActions: []
    };

    const child1: MCTSNode = {
      hand: [],
      lastPlay: null,
      playerToMove: 'opponent',
      visits: 0,
      wins: 0,
      children: [],
      parent: root,
      action: null,
      untriedActions: []
    };

    const child2: MCTSNode = {
      hand: [],
      lastPlay: null,
      playerToMove: 'opponent',
      visits: 0,
      wins: 0,
      children: [],
      parent: root,
      action: null,
      untriedActions: []
    };

    const grandchild: MCTSNode = {
      hand: [],
      lastPlay: null,
      playerToMove: 'ai',
      visits: 0,
      wins: 0,
      children: [],
      parent: child1,
      action: null,
      untriedActions: []
    };

    root.children = [child1, child2];
    child1.children = [grandchild];

    return grandchild; // 返回叶子节点
  }

  it('应该更新节点的访问次数', () => {
    const leaf = createNodeTree();
    const initialVisits = leaf.visits;
    
    backpropagate(leaf, 0);
    
    expect(leaf.visits).toBe(initialVisits + 1);
  });

  it('应该在AI获胜时增加wins', () => {
    const leaf = createNodeTree();
    const initialWins = leaf.wins;
    
    backpropagate(leaf, 0); // 0表示AI获胜
    
    expect(leaf.wins).toBe(initialWins + 1);
  });

  it('应该在对手获胜时不增加wins', () => {
    const leaf = createNodeTree();
    const initialWins = leaf.wins;
    
    backpropagate(leaf, 1); // 1表示对手获胜
    
    expect(leaf.wins).toBe(initialWins); // wins不变
  });

  it('应该向上传播到所有祖先节点', () => {
    const leaf = createNodeTree();
    const parent = leaf.parent!;
    const grandparent = parent.parent!;
    
    backpropagate(leaf, 0);
    
    // 所有节点都应该增加访问次数
    expect(leaf.visits).toBe(1);
    expect(parent.visits).toBe(1);
    expect(grandparent.visits).toBe(1);
    
    // 所有节点都应该增加wins（因为AI获胜）
    expect(leaf.wins).toBe(1);
    expect(parent.wins).toBe(1);
    expect(grandparent.wins).toBe(1);
  });

  it('应该正确处理多个反向传播', () => {
    const leaf = createNodeTree();
    
    backpropagate(leaf, 0); // AI获胜
    backpropagate(leaf, 0); // AI再次获胜
    backpropagate(leaf, 1); // 对手获胜
    
    expect(leaf.visits).toBe(3);
    expect(leaf.wins).toBe(2); // 只有两次AI获胜
  });

  it('应该处理null节点', () => {
    // 不应该抛出错误
    expect(() => backpropagate(null, 0)).not.toThrow();
  });

  it('应该正确处理根节点', () => {
    const root: MCTSNode = {
      hand: [],
      lastPlay: null,
      playerToMove: 'ai',
      visits: 0,
      wins: 0,
      children: [],
      parent: null,
      action: null,
      untriedActions: []
    };
    
    backpropagate(root, 0);
    
    expect(root.visits).toBe(1);
    expect(root.wins).toBe(1);
  });

  it('应该正确处理不同winner值', () => {
    const leaf = createNodeTree();
    
    // 测试不同的winner值
    backpropagate(leaf, 0);  // AI获胜
    backpropagate(leaf, 1);  // 玩家1获胜
    backpropagate(leaf, 2);  // 玩家2获胜
    backpropagate(leaf, 3);  // 玩家3获胜
    
    expect(leaf.visits).toBe(4);
    expect(leaf.wins).toBe(1); // 只有winner=0时增加wins
  });
});


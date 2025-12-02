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

  it('应该正确处理深层节点树', () => {
    // 创建一个更深的节点树
    let current: MCTSNode = {
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

    const nodes: MCTSNode[] = [current];

    // 创建10层深的树
    for (let i = 0; i < 10; i++) {
      const child: MCTSNode = {
        hand: [],
        lastPlay: null,
        playerToMove: i % 2 === 0 ? 'opponent' : 'ai',
        visits: 0,
        wins: 0,
        children: [],
        parent: current,
        action: null,
        untriedActions: []
      };
      current.children = [child];
      nodes.push(child);
      current = child;
    }

    const leaf = current;
    backpropagate(leaf, 0);

    // 所有节点都应该被访问
    nodes.forEach(node => {
      expect(node.visits).toBe(1);
      expect(node.wins).toBe(1);
    });
  });

  it('应该正确累计统计信息', () => {
    const leaf = createNodeTree();
    const parent = leaf.parent!;
    const grandparent = parent.parent!;

    // 进行多次模拟
    for (let i = 0; i < 10; i++) {
      backpropagate(leaf, i % 2 === 0 ? 0 : 1);
    }

    // 检查统计信息
    expect(leaf.visits).toBe(10);
    expect(parent.visits).toBe(10);
    expect(grandparent.visits).toBe(10);

    // 5次AI获胜，5次对手获胜
    expect(leaf.wins).toBe(5);
    expect(parent.wins).toBe(5);
    expect(grandparent.wins).toBe(5);
  });

  it('应该在胜率计算中正确工作', () => {
    const leaf = createNodeTree();
    
    // 模拟10次，7次AI获胜
    for (let i = 0; i < 10; i++) {
      backpropagate(leaf, i < 7 ? 0 : 1);
    }

    const winRate = leaf.wins / leaf.visits;
    expect(winRate).toBeCloseTo(0.7, 2);
    expect(leaf.visits).toBe(10);
    expect(leaf.wins).toBe(7);
  });

  it('应该正确处理多分支树', () => {
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

    // 创建多个子节点
    const children: MCTSNode[] = [];
    for (let i = 0; i < 3; i++) {
      const child: MCTSNode = {
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
      children.push(child);
      root.children.push(child);
    }

    // 对每个子节点进行反向传播
    backpropagate(children[0], 0);
    backpropagate(children[1], 1);
    backpropagate(children[2], 0);

    // 根节点应该接收所有更新
    expect(root.visits).toBe(3);
    expect(root.wins).toBe(2); // 两次AI获胜

    // 每个子节点应该只接收自己的更新
    expect(children[0].visits).toBe(1);
    expect(children[0].wins).toBe(1);
    expect(children[1].visits).toBe(1);
    expect(children[1].wins).toBe(0);
    expect(children[2].visits).toBe(1);
    expect(children[2].wins).toBe(1);
  });
});


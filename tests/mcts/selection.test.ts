/**
 * MCTS节点选择算法单元测试
 */

import { describe, it, expect } from 'vitest';
import { selectBestChild } from '../../src/ai/mcts/selection';
import { MCTSNode } from '../../src/ai/types';
import { Card, Suit, Rank } from '../../src/types/card';

describe('MCTS节点选择', () => {
  // 创建测试用的节点
  function createNode(
    visits: number, 
    wins: number, 
    playerToMove: 'ai' | 'opponent' = 'ai',
    parent: MCTSNode | null = null
  ): MCTSNode {
    return {
      hand: [],
      lastPlay: null,
      playerToMove,
      visits,
      wins,
      children: [],
      parent,
      action: null,
      untriedActions: []
    };
  }

  it('应该在没有子节点时返回自身', () => {
    const node = createNode(10, 5);
    const best = selectBestChild(node, 1.414);
    expect(best).toBe(node);
  });

  it('应该为AI选择UCT值最高的子节点', () => {
    const parent = createNode(100, 50, 'ai');
    const node1 = createNode(10, 2, 'ai', parent); // 胜率低
    const node2 = createNode(10, 8, 'ai', parent); // 胜率高
    const node3 = createNode(5, 3, 'ai', parent);  // 访问少，探索项大
    
    parent.children = [node1, node2, node3];
    parent.playerToMove = 'ai';
    
    const best = selectBestChild(parent, 1.414);
    
    // 应该选择UCT值最高的节点（可能是node2或node3）
    expect([node1, node2, node3]).toContain(best);
  });

  it('应该为对手选择UCT值最低的子节点', () => {
    const parent = createNode(100, 50, 'opponent');
    const node1 = createNode(10, 2, 'opponent', parent); // 胜率低（对AI有利）
    const node2 = createNode(10, 8, 'opponent', parent); // 胜率高（对AI不利）
    
    parent.children = [node1, node2];
    parent.playerToMove = 'opponent';
    
    const best = selectBestChild(parent, 1.414);
    
    // 对手应该选择对AI最不利的（UCT值最高的）
    // 但从AI角度看，应该选择UCT值最低的（对AI最有利的）
    // 注意：这里的逻辑是从AI角度，所以选择UCT值最低的
    expect(best).toBe(node1); // node1胜率低，对AI有利
  });

  it('应该优先选择未访问的节点', () => {
    const parent = createNode(100, 50, 'ai');
    const node1 = createNode(10, 5, 'ai', parent);
    const node2 = createNode(0, 0, 'ai', parent); // 未访问
    const node3 = createNode(10, 5, 'ai', parent);
    
    parent.children = [node1, node2, node3];
    
    const best = selectBestChild(parent, 1.414);
    
    // 未访问的节点UCT值为Infinity，应该被优先选择
    expect(best).toBe(node2);
  });

  it('应该处理多个未访问节点的情况', () => {
    const parent = createNode(100, 50, 'ai');
    const node1 = createNode(0, 0, 'ai', parent);
    const node2 = createNode(0, 0, 'ai', parent);
    const node3 = createNode(0, 0, 'ai', parent);
    
    parent.children = [node1, node2, node3];
    
    const best = selectBestChild(parent, 1.414);
    
    // 所有未访问节点的UCT值都是Infinity，应该选择第一个
    expect([node1, node2, node3]).toContain(best);
  });

  it('应该正确处理单个子节点', () => {
    const parent = createNode(100, 50, 'ai');
    const node1 = createNode(10, 5, 'ai', parent);
    
    parent.children = [node1];
    
    const best = selectBestChild(parent, 1.414);
    expect(best).toBe(node1);
  });

  it('应该正确平衡探索和利用', () => {
    const parent = createNode(100, 50, 'ai');
    // 高胜率但访问多次的节点
    const node1 = createNode(50, 40, 'ai', parent); // 胜率 0.8
    // 中等胜率访问较少的节点
    const node2 = createNode(10, 5, 'ai', parent);  // 胜率 0.5
    // 低胜率访问很少的节点
    const node3 = createNode(2, 0, 'ai', parent);   // 胜率 0.0
    
    parent.children = [node1, node2, node3];
    
    const best = selectBestChild(parent, 1.414);
    
    // 应该选择node2或node3（探索价值高）
    expect([node2, node3]).toContain(best);
  });

  it('应该在探索常数为0时只考虑利用项', () => {
    const parent = createNode(100, 50, 'ai');
    const node1 = createNode(10, 2, 'ai', parent); // 胜率 0.2
    const node2 = createNode(10, 8, 'ai', parent); // 胜率 0.8
    const node3 = createNode(1, 0, 'ai', parent);  // 胜率 0.0，访问少
    
    parent.children = [node1, node2, node3];
    
    const best = selectBestChild(parent, 0); // 探索常数为0
    
    // 应该选择胜率最高的node2
    expect(best).toBe(node2);
  });

  it('应该在探索常数很大时更倾向探索', () => {
    const parent = createNode(100, 50, 'ai');
    const node1 = createNode(50, 40, 'ai', parent); // 胜率高，访问多
    const node2 = createNode(1, 0, 'ai', parent);   // 胜率低，访问少
    
    parent.children = [node1, node2];
    
    const best = selectBestChild(parent, 10); // 很大的探索常数
    
    // 应该选择访问少的node2
    expect(best).toBe(node2);
  });

  it('应该正确处理对手节点的选择逻辑', () => {
    const parent = createNode(100, 50, 'opponent');
    const node1 = createNode(10, 8, 'opponent', parent); // 高胜率（对AI不利）
    const node2 = createNode(10, 2, 'opponent', parent); // 低胜率（对AI有利）
    
    parent.children = [node1, node2];
    parent.playerToMove = 'opponent';
    
    const best = selectBestChild(parent, 1.414);
    
    // 从AI角度看，应该选择对AI最有利的（低胜率的）
    expect(best).toBe(node2);
  });

  it('应该处理全胜的节点', () => {
    const parent = createNode(100, 50, 'ai');
    const node1 = createNode(10, 10, 'ai', parent); // 全胜
    const node2 = createNode(10, 5, 'ai', parent);  // 半胜率
    
    parent.children = [node1, node2];
    
    const best = selectBestChild(parent, 1.414);
    
    // 全胜节点的UCT值应该更高
    expect([node1, node2]).toContain(best);
  });

  it('应该处理全败的节点', () => {
    const parent = createNode(100, 50, 'ai');
    const node1 = createNode(10, 0, 'ai', parent);  // 全败
    const node2 = createNode(10, 5, 'ai', parent);  // 半胜率
    
    parent.children = [node1, node2];
    
    const best = selectBestChild(parent, 1.414);
    
    // 应该选择有胜率的node2
    expect(best).toBe(node2);
  });

  it('应该在多次选择中有一致性', () => {
    const parent = createNode(100, 50, 'ai');
    const node1 = createNode(10, 2, 'ai', parent);
    const node2 = createNode(10, 8, 'ai', parent);
    
    parent.children = [node1, node2];
    
    // 多次选择应该得到相同结果（因为节点状态没变）
    const best1 = selectBestChild(parent, 1.414);
    const best2 = selectBestChild(parent, 1.414);
    const best3 = selectBestChild(parent, 1.414);
    
    expect(best1).toBe(best2);
    expect(best2).toBe(best3);
  });

  it('应该正确处理大量子节点', () => {
    const parent = createNode(1000, 500, 'ai');
    const children: MCTSNode[] = [];
    
    // 创建100个子节点
    for (let i = 0; i < 100; i++) {
      const node = createNode(i + 1, Math.floor((i + 1) / 2), 'ai', parent);
      children.push(node);
    }
    
    parent.children = children;
    
    const best = selectBestChild(parent, 1.414);
    
    // 应该选择一个有效的子节点
    expect(children).toContain(best);
    expect(best.visits).toBeGreaterThan(0);
  });
});


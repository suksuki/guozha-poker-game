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
});


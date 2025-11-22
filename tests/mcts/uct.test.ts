/**
 * UCT算法单元测试
 */

import { describe, it, expect } from 'vitest';
import { uctValue } from '../../src/ai/mcts/uct';
import { MCTSNode } from '../../src/ai/types';
import { Card, Suit, Rank } from '../../src/types/card';

describe('UCT算法', () => {
  // 创建测试用的节点
  function createNode(visits: number, wins: number, parent: MCTSNode | null = null): MCTSNode {
    return {
      hand: [],
      lastPlay: null,
      playerToMove: 'ai',
      visits,
      wins,
      children: [],
      parent,
      action: null,
      untriedActions: []
    };
  }

  it('应该为未访问的节点返回Infinity', () => {
    const node = createNode(0, 0);
    const value = uctValue(node, 1.414);
    expect(value).toBe(Infinity);
  });

  it('应该正确计算UCT值', () => {
    const parent = createNode(100, 50);
    const node = createNode(10, 5, parent);
    
    const value = uctValue(node, 1.414);
    
    // UCT = wins/visits + C * sqrt(ln(parent.visits) / visits)
    // = 5/10 + 1.414 * sqrt(ln(100) / 10)
    // = 0.5 + 1.414 * sqrt(4.605 / 10)
    // = 0.5 + 1.414 * sqrt(0.4605)
    // = 0.5 + 1.414 * 0.6786
    // ≈ 0.5 + 0.96
    // ≈ 1.46
    
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(10);
    expect(value).toBeCloseTo(0.5 + 1.414 * Math.sqrt(Math.log(100) / 10), 2);
  });

  it('应该随着访问次数增加而降低探索项', () => {
    const parent = createNode(100, 50);
    const node1 = createNode(5, 2, parent);
    const node2 = createNode(20, 8, parent);
    
    const value1 = uctValue(node1, 1.414);
    const value2 = uctValue(node2, 1.414);
    
    // 两个节点的利用项应该接近（都是0.4左右）
    // 但node1的探索项应该更大（因为访问次数少）
    expect(value1).toBeGreaterThan(value2);
  });

  it('应该随着胜率增加而增加利用项', () => {
    const parent = createNode(100, 50);
    const node1 = createNode(10, 2, parent); // 胜率 0.2
    const node2 = createNode(10, 8, parent);  // 胜率 0.8
    
    const value1 = uctValue(node1, 1.414);
    const value2 = uctValue(node2, 1.414);
    
    // node2的利用项更高，所以UCT值应该更高
    expect(value2).toBeGreaterThan(value1);
  });

  it('应该正确处理不同的探索常数', () => {
    const parent = createNode(100, 50);
    const node = createNode(10, 5, parent);
    
    const value1 = uctValue(node, 1.0);
    const value2 = uctValue(node, 2.0);
    
    // 探索常数越大，探索项越大
    expect(value2).toBeGreaterThan(value1);
  });

  it('应该处理父节点为null的情况', () => {
    const node = createNode(10, 5, null);
    
    // 当parent为null时，应该使用1作为默认值
    const value = uctValue(node, 1.414);
    
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(10);
    // UCT = 5/10 + 1.414 * sqrt(ln(1) / 10) = 0.5 + 0 = 0.5
    expect(value).toBeCloseTo(0.5, 2);
  });
});


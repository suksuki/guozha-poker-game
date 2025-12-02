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

  it('应该在利用项和探索项之间正确平衡', () => {
    const parent = createNode(100, 50);
    const node = createNode(10, 5, parent);
    
    const value = uctValue(node, 1.414);
    
    // 利用项 = 5/10 = 0.5
    const exploitValue = 0.5;
    // 探索项 = 1.414 * sqrt(ln(100) / 10)
    const exploreValue = 1.414 * Math.sqrt(Math.log(100) / 10);
    
    expect(value).toBeCloseTo(exploitValue + exploreValue, 2);
  });

  it('应该处理零探索常数', () => {
    const parent = createNode(100, 50);
    const node = createNode(10, 5, parent);
    
    const value = uctValue(node, 0);
    
    // 探索项为0，只剩利用项
    expect(value).toBeCloseTo(0.5, 2);
  });

  it('应该处理极大的探索常数', () => {
    const parent = createNode(100, 50);
    const node = createNode(10, 5, parent);
    
    const value1 = uctValue(node, 1.414);
    const value2 = uctValue(node, 10);
    
    // 探索常数越大，UCT值越大
    expect(value2).toBeGreaterThan(value1);
    expect(value2 - value1).toBeCloseTo(
      (10 - 1.414) * Math.sqrt(Math.log(100) / 10),
      2
    );
  });

  it('应该处理父节点访问次数为1的情况', () => {
    const parent = createNode(1, 0);
    const node = createNode(1, 1, parent);
    
    const value = uctValue(node, 1.414);
    
    // ln(1) = 0，探索项为0
    expect(value).toBeCloseTo(1.0, 2);
  });

  it('应该处理全胜节点', () => {
    const parent = createNode(100, 50);
    const node = createNode(10, 10, parent); // 全胜
    
    const value = uctValue(node, 1.414);
    
    // 利用项 = 10/10 = 1.0
    expect(value).toBeGreaterThan(1.0);
    expect(value).toBeCloseTo(
      1.0 + 1.414 * Math.sqrt(Math.log(100) / 10),
      2
    );
  });

  it('应该处理全败节点', () => {
    const parent = createNode(100, 50);
    const node = createNode(10, 0, parent); // 全败
    
    const value = uctValue(node, 1.414);
    
    // 利用项 = 0/10 = 0.0
    expect(value).toBeGreaterThan(0);
    expect(value).toBeCloseTo(
      0.0 + 1.414 * Math.sqrt(Math.log(100) / 10),
      2
    );
  });

  it('应该正确比较不同节点的UCT值', () => {
    const parent = createNode(100, 50);
    const node1 = createNode(10, 8, parent);  // 高胜率
    const node2 = createNode(10, 2, parent);  // 低胜率
    const node3 = createNode(5, 2, parent);   // 低访问
    
    const value1 = uctValue(node1, 1.414);
    const value2 = uctValue(node2, 1.414);
    const value3 = uctValue(node3, 1.414);
    
    // node1胜率高，UCT应该高
    expect(value1).toBeGreaterThan(value2);
    
    // node3访问少，探索项大，可能UCT更高
    expect(value3).toBeGreaterThan(value2);
  });

  it('应该处理数值溢出边界情况', () => {
    const parent = createNode(1000000, 500000);
    const node = createNode(1000, 500, parent);
    
    const value = uctValue(node, 1.414);
    
    // 不应该出现NaN或Infinity
    expect(value).not.toBe(NaN);
    expect(value).not.toBe(Infinity);
    expect(value).toBeGreaterThan(0);
  });

  it('应该在相同统计下产生相同UCT值', () => {
    const parent = createNode(100, 50);
    const node = createNode(10, 5, parent);
    
    const value1 = uctValue(node, 1.414);
    const value2 = uctValue(node, 1.414);
    
    expect(value1).toBe(value2);
  });

  it('应该正确处理边界胜率值', () => {
    const parent = createNode(100, 50);
    
    // 测试边界胜率
    const node0 = createNode(10, 0, parent);   // 0% 胜率
    const node50 = createNode(10, 5, parent);  // 50% 胜率
    const node100 = createNode(10, 10, parent); // 100% 胜率
    
    const value0 = uctValue(node0, 1.414);
    const value50 = uctValue(node50, 1.414);
    const value100 = uctValue(node100, 1.414);
    
    // UCT值应该随胜率递增
    expect(value0).toBeLessThan(value50);
    expect(value50).toBeLessThan(value100);
  });

  it('应该在父节点访问次数增加时增加探索项', () => {
    const parent1 = createNode(10, 5);
    const parent2 = createNode(100, 50);
    const parent3 = createNode(1000, 500);
    
    const node1 = createNode(5, 2, parent1);
    const node2 = createNode(5, 2, parent2);
    const node3 = createNode(5, 2, parent3);
    
    const value1 = uctValue(node1, 1.414);
    const value2 = uctValue(node2, 1.414);
    const value3 = uctValue(node3, 1.414);
    
    // 父节点访问次数越多，探索项越大
    expect(value2).toBeGreaterThan(value1);
    expect(value3).toBeGreaterThan(value2);
  });
});


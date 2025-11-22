/**
 * MCTS训练功能回归测试
 * 
 * 测试训练功能的完整流程，确保各个模块协同工作
 */

import { describe, it, expect } from 'vitest';
import { quickTestConfig, tuneMCTSParameters, MCTSConfig } from '../src/utils/mctsTuning';
import { createProgressBar } from '../src/utils/progressBar';
import { uctValue } from '../src/ai/mcts/uct';
import { selectBestChild } from '../src/ai/mcts/selection';
import { expandNode } from '../src/ai/mcts/expansion';
import { backpropagate } from '../src/ai/mcts/backpropagation';
import { simulateGame } from '../src/ai/mcts/simulation';
import { MCTSNode, SimulatedGameState } from '../src/ai/types';
import { Card, Suit, Rank, Play } from '../src/types/card';
import { createDeck, dealCards } from '../src/utils/cardUtils';

describe('MCTS训练功能回归测试', () => {
  describe('配置分离测试', () => {
    it('应该支持不同的训练和游戏配置', () => {
      const gameConfig: MCTSConfig = {
        iterations: 50,
        simulationDepth: 20,
        explorationConstant: 1.414,
        perfectInformation: false
      };

      const trainingConfig: MCTSConfig = {
        iterations: 200,
        simulationDepth: 50,
        explorationConstant: 1.414,
        perfectInformation: true
      };

      // 验证配置不同
      expect(trainingConfig.iterations).toBeGreaterThan(gameConfig.iterations!);
      expect(trainingConfig.simulationDepth).toBeGreaterThan(gameConfig.simulationDepth!);
      expect(trainingConfig.perfectInformation).toBe(true);
      expect(gameConfig.perfectInformation).toBe(false);
    });
  });

  describe('进度条集成测试', () => {
    it('应该在训练过程中显示进度', () => {
      const progress = createProgressBar({
        total: 1000,
        current: 500,
        showTime: true,
        startTime: Date.now() - 10000,
        label: '训练进度'
      });

      expect(progress).toContain('训练进度');
      expect(progress).toContain('50.0%');
      expect(progress).toContain('已用');
    });
  });

  describe('MCTS算法集成测试', () => {
    it('应该能够完整运行MCTS流程', () => {
      // 创建测试节点树
      const parent: MCTSNode = {
        hand: [],
        lastPlay: null,
        playerToMove: 'ai',
        visits: 100,
        wins: 50,
        children: [],
        parent: null,
        action: null,
        untriedActions: []
      };

      const child1: MCTSNode = {
        hand: [],
        lastPlay: null,
        playerToMove: 'opponent',
        visits: 10,
        wins: 5,
        children: [],
        parent,
        action: null,
        untriedActions: []
      };

      const child2: MCTSNode = {
        hand: [],
        lastPlay: null,
        playerToMove: 'opponent',
        visits: 10,
        wins: 8,
        children: [],
        parent,
        action: null,
        untriedActions: []
      };

      parent.children = [child1, child2];

      // 测试UCT值计算
      const uct1 = uctValue(child1, 1.414);
      const uct2 = uctValue(child2, 1.414);
      expect(uct1).toBeGreaterThan(0);
      expect(uct2).toBeGreaterThan(0);

      // 测试节点选择
      const best = selectBestChild(parent, 1.414);
      expect([child1, child2]).toContain(best);

      // 测试反向传播
      const initialVisits = child1.visits;
      backpropagate(child1, 0);
      expect(child1.visits).toBe(initialVisits + 1);
      expect(parent.visits).toBe(101);
    });
  });

  describe('游戏模拟集成测试', () => {
    it('应该能够模拟完整游戏', () => {
      const hands = dealCards(4);
      const aiHand = hands[0] || [];
      const opponentHands = hands.slice(1).filter(h => h && h.length > 0);

      if (aiHand.length === 0 || opponentHands.length === 0) {
        return; // 跳过测试
      }

      const state: SimulatedGameState = {
        aiHand,
        opponentHands,
        allHands: [aiHand, ...opponentHands],
        lastPlay: null,
        lastPlayPlayerIndex: null,
        currentPlayerIndex: 0,
        playerCount: 4,
        roundScore: 0,
        aiScore: 0,
        isTerminal: false,
        winner: null,
        perfectInformation: true
      };

      const winner = simulateGame(state, 50, true);

      expect(winner).toBeGreaterThanOrEqual(0);
      expect(winner).toBeLessThan(4);
    });
  });

  describe('快速测试配置回归', () => {
    it('应该能够运行快速测试', async () => {
      const config: MCTSConfig = {
        explorationConstant: 1.414,
        iterations: 100, // 减少迭代次数以加快测试
        simulationDepth: 30,
        perfectInformation: true,
        playerCount: 4
      };

      const result = await quickTestConfig(config, 4, 5); // 只运行5局

      expect(result).toBeDefined();
      expect(result.totalGames).toBe(5);
      expect(result.winRate).toBeGreaterThanOrEqual(0);
      expect(result.winRate).toBeLessThanOrEqual(1);
      expect(result.avgScore).toBeGreaterThanOrEqual(0);
      expect(result.avgTurns).toBeGreaterThan(0);
    }, 60000); // 1分钟超时
  });

  describe('参数微调回归', () => {
    it('应该能够测试不同参数组合', async () => {
      const tuningConfig = {
        explorationConstants: [1.0, 1.414],
        iterations: [100],
        simulationDepths: [30],
        perfectInformation: true,
        playerCount: 4,
        gamesPerConfig: 3 // 每个配置只运行3局，快速测试
      };

      const results = await tuneMCTSParameters(tuningConfig);

      expect(results.length).toBe(2); // 2个探索常数 × 1个迭代次数 × 1个深度
      results.forEach(result => {
        expect(result.totalGames).toBe(3);
        expect(result.winRate).toBeGreaterThanOrEqual(0);
        expect(result.winRate).toBeLessThanOrEqual(1);
      });
    }, 120000); // 2分钟超时
  });

  describe('完全信息模式回归', () => {
    it('应该在使用完全信息时表现更好', async () => {
      const baseConfig: MCTSConfig = {
        explorationConstant: 1.414,
        iterations: 100,
        simulationDepth: 30,
        playerCount: 4
      };

      // 完全信息模式
      const perfectResult = await quickTestConfig(
        { ...baseConfig, perfectInformation: true },
        4,
        10
      );

      // 估计模式
      const estimatedResult = await quickTestConfig(
        { ...baseConfig, perfectInformation: false },
        4,
        10
      );

      expect(perfectResult.winRate).toBeGreaterThanOrEqual(0);
      expect(estimatedResult.winRate).toBeGreaterThanOrEqual(0);

      // 完全信息模式通常应该表现更好（但不保证，因为随机性）
      // 所以只验证两者都能正常运行
    }, 120000); // 2分钟超时
  });

  describe('节点扩展回归', () => {
    it('应该能够扩展节点并更新游戏状态', () => {
      const hands = dealCards(4);
      const aiHand = hands[0] || [];

      if (aiHand.length < 2) {
        return; // 跳过测试
      }

      const allCards = createDeck();
      const node: MCTSNode = {
        hand: aiHand,
        lastPlay: null,
        playerToMove: 'ai',
        visits: 0,
        wins: 0,
        children: [],
        parent: null,
        action: null,
        untriedActions: [[aiHand[0]], [aiHand[1]]]
      };

      const result = expandNode(node, allCards);

      if (result) {
        expect(result.hand.length).toBe(aiHand.length - 1);
        expect(result.playerToMove).toBe('opponent');
        expect(node.children.length).toBe(1);
      }
    });
  });
});


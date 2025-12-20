// @ts-nocheck
/**
 * MCTS模块集成测试
 * 测试MCTS模块是否能正确集成到AI Brain框架
 */

import { AIBrain } from './core/AIBrain';
import { MCTSDecisionModule } from './modules/mcts/MCTSDecisionModule';
import { GameState } from './core/types';
import { Card, Suit, Rank } from '../../../types/card';

/**
 * 创建测试用的手牌
 */
function createTestHand(): Card[] {
  return [
    { suit: Suit.HEARTS, rank: Rank.THREE, id: 'h-3-1' },
    { suit: Suit.DIAMONDS, rank: Rank.THREE, id: 'd-3-1' },
    { suit: Suit.CLUBS, rank: Rank.FOUR, id: 'c-4-1' },
    { suit: Suit.SPADES, rank: Rank.FIVE, id: 's-5-1' },
    { suit: Suit.HEARTS, rank: Rank.SIX, id: 'h-6-1' },
    { suit: Suit.DIAMONDS, rank: Rank.SEVEN, id: 'd-7-1' },
    { suit: Suit.CLUBS, rank: Rank.EIGHT, id: 'c-8-1' },
    { suit: Suit.SPADES, rank: Rank.NINE, id: 's-9-1' },
    { suit: Suit.HEARTS, rank: Rank.TEN, id: 'h-10-1' },
  ];
}

/**
 * 创建测试用的游戏状态
 */
function createTestGameState(hand: Card[]): GameState {
  return {
    myHand: hand,
    myPosition: 0,
    playerCount: 4,
    lastPlay: null,
    lastPlayerId: null,
    currentPlayerId: 0,
    playHistory: [],
    roundNumber: 1,
    opponentHandSizes: [13, 13, 13],
    teamMode: false,
    currentRoundScore: 0,
    cumulativeScores: new Map(),
    phase: 'early'
  };
}

/**
 * 测试1: MCTS模块基础功能
 */
async function testMCTSModuleBasic() {
  
  try {
    // 创建模块
    const mctsModule = new MCTSDecisionModule();
    
    // 初始化
    await mctsModule.initialize({
      enabled: true,
      baseWeight: 0.8,
      options: {
        iterations: 500  // 较少的迭代次数用于快速测试
      }
    });
    
    
    // 健康检查
    const isHealthy = await mctsModule.healthCheck();
    
    // 测试分析功能
    const testHand = createTestHand();
    const gameState = createTestGameState(testHand);
    
    
    const startTime = Date.now();
    const analysis = await mctsModule.analyze(gameState);
    const analyzeTime = Date.now() - startTime;
    
    
    if (analysis.suggestions.length > 0) {
      const bestSuggestion = analysis.suggestions[0];
      
      if (bestSuggestion.action.type === 'play') {
      }
    }
    
    // 关闭模块
    await mctsModule.shutdown();
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 测试2: AIBrain集成MCTS模块
 */
async function testBrainWithMCTS() {
  
  try {
    // 创建Brain
    const brain = new AIBrain({
      personality: {
        preset: 'balanced'
      },
      modules: {
        mcts: {
          enabled: true,
          baseWeight: 0.8,
          options: {
            iterations: 500
          }
        }
      },
      performance: {
        enableCache: false,
        enablePrediction: false,
        asyncMode: true,
        timeout: 5000,
        fallbackModule: 'mcts'
      }
    });
    
    
    // 注册MCTS模块
    brain.registerModule('mcts', new MCTSDecisionModule());
    
    // 初始化
    await brain.initialize();
    
    // 查看状态
    const state = brain.getState();
    
    // 做决策
    const testHand = createTestHand();
    const gameState = createTestGameState(testHand);
    
    
    const startTime = Date.now();
    const decision = await brain.makeDecision(gameState);
    const decisionTime = Date.now() - startTime;
    
    
    if (decision.action.type === 'play') {
    }
    
    // 查看指标
    const metrics = brain.getMetrics();
    
    // 关闭
    await brain.shutdown();
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
    }
    return false;
  }
}

/**
 * 测试3: 多轮决策测试
 */
async function testMultipleDecisions() {
  
  try {
    const brain = new AIBrain({
      personality: { preset: 'balanced' },
      modules: {
        mcts: {
          enabled: true,
          baseWeight: 0.8,
          options: { iterations: 300 }
        }
      }
    });
    
    brain.registerModule('mcts', new MCTSDecisionModule());
    await brain.initialize();
    
    
    // 模拟5轮决策
    const rounds = 5;
    const times: number[] = [];
    
    for (let i = 0; i < rounds; i++) {
      const testHand = createTestHand();
      const gameState = createTestGameState(testHand);
      
      const startTime = Date.now();
      const decision = await brain.makeDecision(gameState);
      const time = Date.now() - startTime;
      
      times.push(time);
      
    }
    
    // 统计
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    
    await brain.shutdown();
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 测试4: 不同配置测试
 */
async function testDifferentConfigs() {
  
  const configs = [
    { name: '激进型', preset: 'aggressive' as const, iterations: 300 },
    { name: '保守型', preset: 'conservative' as const, iterations: 500 },
    { name: '平衡型', preset: 'balanced' as const, iterations: 400 }
  ];
  
  try {
    for (const config of configs) {
      
      const brain = new AIBrain({
        personality: { preset: config.preset },
        modules: {
          mcts: {
            enabled: true,
            baseWeight: 0.8,
            options: { iterations: config.iterations }
          }
        }
      });
      
      brain.registerModule('mcts', new MCTSDecisionModule());
      await brain.initialize();
      
      const testHand = createTestHand();
      const gameState = createTestGameState(testHand);
      
      const startTime = Date.now();
      const decision = await brain.makeDecision(gameState);
      const time = Date.now() - startTime;
      
      
      await brain.shutdown();
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  
  const results: boolean[] = [];
  
  // 运行所有测试
  results.push(await testMCTSModuleBasic());
  results.push(await testBrainWithMCTS());
  results.push(await testMultipleDecisions());
  results.push(await testDifferentConfigs());
  
  // 总结
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  
  if (passed === total) {
  } else {
  }
  
  return passed === total;
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      process.exit(1);
    });
}

// 导出测试函数
export {
  runAllTests,
  testMCTSModuleBasic,
  testBrainWithMCTS,
  testMultipleDecisions,
  testDifferentConfigs
};
// @ts-nocheck

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
  console.log('\n=== 测试1: MCTS模块基础功能 ===\n');
  
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
    
    console.log('✓ MCTS模块初始化成功');
    
    // 健康检查
    const isHealthy = await mctsModule.healthCheck();
    console.log(`✓ 健康检查: ${isHealthy ? '通过' : '失败'}`);
    
    // 测试分析功能
    const testHand = createTestHand();
    const gameState = createTestGameState(testHand);
    
    console.log(`\n测试手牌: ${testHand.length}张`);
    console.log('开始分析...');
    
    const startTime = Date.now();
    const analysis = await mctsModule.analyze(gameState);
    const analyzeTime = Date.now() - startTime;
    
    console.log(`\n✓ 分析完成 (耗时: ${analyzeTime}ms)`);
    console.log(`  - 建议数量: ${analysis.suggestions.length}`);
    console.log(`  - 置信度: ${(analysis.confidence * 100).toFixed(1)}%`);
    console.log(`  - 推理: ${analysis.reasoning}`);
    
    if (analysis.suggestions.length > 0) {
      const bestSuggestion = analysis.suggestions[0];
      console.log(`\n最佳建议:`);
      console.log(`  - 动作类型: ${bestSuggestion.action.type}`);
      console.log(`  - 评分: ${bestSuggestion.score}`);
      console.log(`  - 置信度: ${(bestSuggestion.confidence * 100).toFixed(1)}%`);
      console.log(`  - 推理: ${bestSuggestion.reasoning}`);
      
      if (bestSuggestion.action.type === 'play') {
        console.log(`  - 出牌数量: ${bestSuggestion.action.cards.length}张`);
      }
    }
    
    // 关闭模块
    await mctsModule.shutdown();
    console.log('\n✓ MCTS模块关闭成功');
    
    return true;
  } catch (error) {
    console.error('✗ 测试失败:', error);
    return false;
  }
}

/**
 * 测试2: AIBrain集成MCTS模块
 */
async function testBrainWithMCTS() {
  console.log('\n=== 测试2: AIBrain集成MCTS模块 ===\n');
  
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
    
    console.log('✓ AIBrain创建成功');
    
    // 注册MCTS模块
    brain.registerModule('mcts', new MCTSDecisionModule());
    console.log('✓ MCTS模块注册成功');
    
    // 初始化
    await brain.initialize();
    console.log('✓ AIBrain初始化成功');
    
    // 查看状态
    const state = brain.getState();
    console.log(`\n当前状态:`);
    console.log(`  - 已初始化: ${state.initialized}`);
    console.log(`  - 激活: ${state.active}`);
    console.log(`  - 已注册模块: ${Array.from(state.modules.keys()).join(', ')}`);
    
    // 做决策
    const testHand = createTestHand();
    const gameState = createTestGameState(testHand);
    
    console.log(`\n测试手牌: ${testHand.length}张`);
    console.log('AI开始决策...');
    
    const startTime = Date.now();
    const decision = await brain.makeDecision(gameState);
    const decisionTime = Date.now() - startTime;
    
    console.log(`\n✓ 决策完成 (耗时: ${decisionTime}ms)`);
    console.log(`\n决策详情:`);
    console.log(`  - 动作类型: ${decision.action.type}`);
    console.log(`  - 置信度: ${(decision.confidence * 100).toFixed(1)}%`);
    console.log(`  - 风险等级: ${decision.riskLevel}`);
    console.log(`  - 融合方法: ${decision.fusionMethod}`);
    console.log(`  - 参与模块: ${decision.sources.map(s => s.moduleName).join(', ')}`);
    console.log(`  - 推理: ${decision.reasoning}`);
    
    if (decision.action.type === 'play') {
      console.log(`  - 出牌数量: ${decision.action.cards.length}张`);
    }
    
    // 查看指标
    const metrics = brain.getMetrics();
    console.log(`\n性能指标:`);
    console.log(`  - 总决策次数: ${metrics.totalDecisions}`);
    console.log(`  - 平均决策时间: ${metrics.avgDecisionTime.toFixed(2)}ms`);
    
    // 关闭
    await brain.shutdown();
    console.log('\n✓ AIBrain关闭成功');
    
    return true;
  } catch (error) {
    console.error('✗ 测试失败:', error);
    if (error instanceof Error) {
      console.error('错误堆栈:', error.stack);
    }
    return false;
  }
}

/**
 * 测试3: 多轮决策测试
 */
async function testMultipleDecisions() {
  console.log('\n=== 测试3: 多轮决策测试 ===\n');
  
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
    
    console.log('✓ AIBrain初始化成功');
    
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
      
      console.log(`\n第${i + 1}轮:`);
      console.log(`  - 耗时: ${time}ms`);
      console.log(`  - 动作: ${decision.action.type}`);
      console.log(`  - 置信度: ${(decision.confidence * 100).toFixed(1)}%`);
    }
    
    // 统计
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`\n性能统计:`);
    console.log(`  - 平均耗时: ${avgTime.toFixed(2)}ms`);
    console.log(`  - 最小耗时: ${minTime}ms`);
    console.log(`  - 最大耗时: ${maxTime}ms`);
    
    await brain.shutdown();
    console.log('\n✓ 测试完成');
    
    return true;
  } catch (error) {
    console.error('✗ 测试失败:', error);
    return false;
  }
}

/**
 * 测试4: 不同配置测试
 */
async function testDifferentConfigs() {
  console.log('\n=== 测试4: 不同配置测试 ===\n');
  
  const configs = [
    { name: '激进型', preset: 'aggressive' as const, iterations: 300 },
    { name: '保守型', preset: 'conservative' as const, iterations: 500 },
    { name: '平衡型', preset: 'balanced' as const, iterations: 400 }
  ];
  
  try {
    for (const config of configs) {
      console.log(`\n测试 ${config.name}...`);
      
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
      
      console.log(`  ✓ ${config.name} - 耗时: ${time}ms, 置信度: ${(decision.confidence * 100).toFixed(1)}%`);
      
      await brain.shutdown();
    }
    
    console.log('\n✓ 所有配置测试通过');
    return true;
  } catch (error) {
    console.error('✗ 测试失败:', error);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('┌─────────────────────────────────────────┐');
  console.log('│   AI Brain - MCTS模块集成测试           │');
  console.log('└─────────────────────────────────────────┘');
  
  const results: boolean[] = [];
  
  // 运行所有测试
  results.push(await testMCTSModuleBasic());
  results.push(await testBrainWithMCTS());
  results.push(await testMultipleDecisions());
  results.push(await testDifferentConfigs());
  
  // 总结
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│              测试总结                    │');
  console.log('└─────────────────────────────────────────┘');
  console.log(`\n通过: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 所有测试通过！MCTS模块集成成功！');
  } else {
    console.log('\n⚠️  部分测试失败，请检查错误信息');
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
      console.error('测试运行失败:', error);
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

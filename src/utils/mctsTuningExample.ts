/**
 * MCTS微调工具使用示例
 * 
 * 这个文件展示了如何使用微调工具来优化MCTS参数
 */

import { tuneMCTSParameters, quickTestConfig, MCTSConfig } from './mctsTuning';

// 示例1: 快速测试单个配置
export async function exampleQuickTest() {
  console.log('=== 示例1: 快速测试单个配置 ===\n');
  
  const config: MCTSConfig = {
    explorationConstant: 1.414,  // UCT探索常数（√2）
    iterations: 1000,             // MCTS迭代次数
    simulationDepth: 100,         // 模拟深度
    perfectInformation: true,     // 使用完全信息模式
    playerCount: 4                // 4人游戏
  };
  
  const result = await quickTestConfig(config, 4, 100);
  
  console.log('\n测试结果:');
  console.log(`  胜率: ${(result.winRate * 100).toFixed(2)}%`);
  console.log(`  平均分数: ${result.avgScore.toFixed(2)}`);
  console.log(`  平均回合数: ${result.avgTurns.toFixed(1)}`);
}

// 示例2: 完整参数微调（测试多个参数组合）
export async function exampleFullTuning() {
  console.log('\n=== 示例2: 完整参数微调 ===\n');
  
  // 定义要测试的参数范围
  const tuningConfig = {
    explorationConstants: [1.0, 1.414, 2.0],  // 测试3个探索常数
    iterations: [500, 1000, 2000],            // 测试3个迭代次数
    simulationDepths: [50, 100, 200],          // 测试3个模拟深度
    perfectInformation: true,                  // 使用完全信息模式
    playerCount: 4,                            // 4人游戏
    gamesPerConfig: 50                         // 每个配置运行50局（可以增加到100或更多）
  };
  
  // 总配置数 = 3 × 3 × 3 = 27个配置
  // 总对局数 = 27 × 50 = 1350局
  
  const results = await tuneMCTSParameters(tuningConfig);
  
  // 显示前5个最佳配置
  console.log('\n=== 前5个最佳配置 ===');
  results.slice(0, 5).forEach((result, index) => {
    console.log(`\n${index + 1}. 配置:`);
    console.log(`   探索常数: ${result.config.explorationConstant}`);
    console.log(`   迭代次数: ${result.config.iterations}`);
    console.log(`   模拟深度: ${result.config.simulationDepth}`);
    console.log(`   胜率: ${(result.winRate * 100).toFixed(2)}%`);
    console.log(`   平均分数: ${result.avgScore.toFixed(2)}`);
  });
}

// 示例3: 针对性微调（只测试探索常数）
export async function exampleExplorationTuning() {
  console.log('\n=== 示例3: 针对性微调（探索常数）===\n');
  
  const baseConfig: MCTSConfig = {
    iterations: 1000,
    simulationDepth: 100,
    perfectInformation: true,
    playerCount: 4
  };
  
  // 只测试不同的探索常数
  const explorationConstants = [0.5, 1.0, 1.414, 2.0, 3.0];
  const results = [];
  
  for (const ec of explorationConstants) {
    const config: MCTSConfig = {
      ...baseConfig,
      explorationConstant: ec
    };
    
    console.log(`测试探索常数: ${ec}`);
    const result = await quickTestConfig(config, 4, 100);
    results.push({ explorationConstant: ec, ...result });
  }
  
  // 找出最佳探索常数
  results.sort((a, b) => b.winRate - a.winRate);
  console.log(`\n最佳探索常数: ${results[0].explorationConstant}`);
  console.log(`胜率: ${(results[0].winRate * 100).toFixed(2)}%`);
}

// 示例4: 对比完全信息模式 vs 估计模式
export async function examplePerfectInfoComparison() {
  console.log('\n=== 示例4: 对比完全信息模式 vs 估计模式 ===\n');
  
  const baseConfig: MCTSConfig = {
    explorationConstant: 1.414,
    iterations: 1000,
    simulationDepth: 100,
    playerCount: 4
  };
  
  // 测试完全信息模式
  console.log('测试完全信息模式...');
  const perfectInfoResult = await quickTestConfig(
    { ...baseConfig, perfectInformation: true },
    4,
    100
  );
  
  // 测试估计模式
  console.log('\n测试估计模式...');
  const estimatedResult = await quickTestConfig(
    { ...baseConfig, perfectInformation: false },
    4,
    100
  );
  
  console.log('\n=== 对比结果 ===');
  console.log('完全信息模式:');
  console.log(`  胜率: ${(perfectInfoResult.winRate * 100).toFixed(2)}%`);
  console.log(`  平均分数: ${perfectInfoResult.avgScore.toFixed(2)}`);
  console.log('\n估计模式:');
  console.log(`  胜率: ${(estimatedResult.winRate * 100).toFixed(2)}%`);
  console.log(`  平均分数: ${estimatedResult.avgScore.toFixed(2)}`);
  
  const improvement = perfectInfoResult.winRate - estimatedResult.winRate;
  console.log(`\n完全信息模式提升: ${(improvement * 100).toFixed(2)}%`);
}

// 运行所有示例（取消注释以运行）
// exampleQuickTest();
// exampleFullTuning();
// exampleExplorationTuning();
// examplePerfectInfoComparison();


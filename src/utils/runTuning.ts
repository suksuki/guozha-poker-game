/**
 * 运行MCTS微调测试
 * 
 * 使用方法：
 * 1. 在Node.js环境中运行：npx tsx src/utils/runTuning.ts
 * 2. 或者在浏览器控制台中导入并调用
 */

import { quickTestConfig, tuneMCTSParameters, MCTSConfig } from './mctsTuning';

// 快速测试：对比不同探索常数
async function quickExplorationTest() {
  console.log('=== 快速测试：探索常数对性能的影响 ===\n');
  
  const baseConfig: MCTSConfig = {
    iterations: 1000,
    simulationDepth: 100,
    perfectInformation: true,
    playerCount: 4
  };
  
  const explorationConstants = [0.5, 1.0, 1.414, 2.0, 3.0];
  const results = [];
  
  for (const ec of explorationConstants) {
    const config: MCTSConfig = {
      ...baseConfig,
      explorationConstant: ec
    };
    
    console.log(`\n测试探索常数: ${ec}`);
    const result = await quickTestConfig(config, 4, 50); // 每个配置50局，快速测试
    results.push({ explorationConstant: ec, ...result });
  }
  
  // 按胜率排序
  results.sort((a, b) => b.winRate - a.winRate);
  
  console.log('\n=== 测试结果（按胜率排序）===');
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. 探索常数: ${result.explorationConstant}`);
    console.log(`   胜率: ${(result.winRate * 100).toFixed(2)}%`);
    console.log(`   平均分数: ${result.avgScore.toFixed(2)}`);
    console.log(`   平均回合数: ${result.avgTurns.toFixed(1)}`);
  });
  
  console.log(`\n最佳探索常数: ${results[0].explorationConstant}`);
  return results;
}

// 完整微调：测试多个参数组合
async function fullTuning() {
  console.log('\n=== 完整参数微调 ===\n');
  
  const tuningConfig = {
    explorationConstants: [1.0, 1.414, 2.0],  // 3个探索常数
    iterations: [500, 1000],                  // 2个迭代次数（减少以加快速度）
    simulationDepths: [50, 100],              // 2个模拟深度（减少以加快速度）
    perfectInformation: true,
    playerCount: 4,
    gamesPerConfig: 50  // 每个配置50局（可以增加到100+获得更准确的结果）
  };
  
  // 总配置数 = 3 × 2 × 2 = 12个
  // 总对局数 = 12 × 50 = 600局
  
  console.log(`将测试 ${3 * 2 * 2} 个配置，每个配置 ${tuningConfig.gamesPerConfig} 局`);
  console.log(`总对局数: ${3 * 2 * 2 * tuningConfig.gamesPerConfig} 局\n`);
  
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
    console.log(`   平均回合数: ${result.avgTurns.toFixed(1)}`);
  });
  
  return results;
}

// 对比完全信息模式 vs 估计模式
async function compareModes() {
  console.log('\n=== 对比完全信息模式 vs 估计模式 ===\n');
  
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
  console.log(`  平均回合数: ${perfectInfoResult.avgTurns.toFixed(1)}`);
  console.log('\n估计模式:');
  console.log(`  胜率: ${(estimatedResult.winRate * 100).toFixed(2)}%`);
  console.log(`  平均分数: ${estimatedResult.avgScore.toFixed(2)}`);
  console.log(`  平均回合数: ${estimatedResult.avgTurns.toFixed(1)}`);
  
  const improvement = perfectInfoResult.winRate - estimatedResult.winRate;
  const scoreImprovement = perfectInfoResult.avgScore - estimatedResult.avgScore;
  
  console.log(`\n完全信息模式提升:`);
  console.log(`  胜率提升: ${(improvement * 100).toFixed(2)}%`);
  console.log(`  分数提升: ${scoreImprovement.toFixed(2)}`);
  
  return { perfectInfoResult, estimatedResult };
}

// 主函数：运行所有测试
async function main() {
  console.log('🚀 开始MCTS微调测试\n');
  console.log('注意：这可能需要几分钟时间，请耐心等待...\n');
  
  try {
    // 1. 快速测试探索常数
    await quickExplorationTest();
    
    // 2. 对比完全信息模式
    await compareModes();
    
    // 3. 完整微调（可选，耗时较长）
    // await fullTuning();
    
    console.log('\n✅ 所有测试完成！');
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main().catch(console.error);
}

// 导出函数供外部调用
export { quickExplorationTest, fullTuning, compareModes, main };


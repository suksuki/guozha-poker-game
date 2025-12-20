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
    
    const result = await quickTestConfig(config, 4, 50); // 每个配置50局，快速测试
    results.push({ explorationConstant: ec, ...result });
  }
  
  // 按胜率排序
  results.sort((a, b) => b.winRate - a.winRate);
  
  results.forEach((result, index) => {  });
  
  return results;
}

// 完整微调：测试多个参数组合
async function fullTuning() {
  
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
  
  
  const results = await tuneMCTSParameters(tuningConfig);
  
  // 显示前5个最佳配置
  results.slice(0, 5).forEach((result, index) => {  });
  
  return results;
}

// 对比完全信息模式 vs 估计模式
async function compareModes() {
  
  const baseConfig: MCTSConfig = {
    explorationConstant: 1.414,
    iterations: 1000,
    simulationDepth: 100,
    playerCount: 4
  };
  
  // 测试完全信息模式
  const perfectInfoResult = await quickTestConfig(
    { ...baseConfig, perfectInformation: true },
    4,
    100
  );
  
  // 测试估计模式
  const estimatedResult = await quickTestConfig(
    { ...baseConfig, perfectInformation: false },
    4,
    100
  );  
  const improvement = perfectInfoResult.winRate - estimatedResult.winRate;
  const scoreImprovement = perfectInfoResult.avgScore - estimatedResult.avgScore;  
  return { perfectInfoResult, estimatedResult };
}

// 主函数：运行所有测试
async function main() {
  
  try {
    // 1. 快速测试探索常数
    await quickExplorationTest();
    
    // 2. 对比完全信息模式
    await compareModes();
    
    // 3. 完整微调（可选，耗时较长）
    // await fullTuning();
    
  } catch (error) {
    throw error;
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main().catch(() => {});
}

// 导出函数供外部调用
export { quickExplorationTest, fullTuning, compareModes, main };


/**
 * 快速微调脚本
 * 
 * 这是一个快速微调示例，测试不同探索常数
 * 预计耗时：约30-40分钟
 * 
 * 使用方法：
 * 1. 在Node.js环境中：npx tsx src/utils/runQuickTuning.ts
 * 2. 或者在测试中导入并调用
 */

import { quickTestConfig, tuneMCTSParameters, MCTSConfig } from './mctsTuning';

/**
 * 快速微调：只测试探索常数
 * 预计时间：约30-40分钟
 */
export async function quickExplorationTuning() {
  
  const baseConfig: MCTSConfig = {
    iterations: 500,      // 中等迭代次数
    simulationDepth: 50,   // 中等模拟深度
    perfectInformation: true,
    playerCount: 4
  };
  
  // 测试5个不同的探索常数
  const explorationConstants = [0.5, 1.0, 1.414, 2.0, 3.0];  
  // 估算时间
  const estimatedTime = explorationConstants.length * 20 * 25; // 每局约25秒
  const estimatedMinutes = Math.floor(estimatedTime / 60);
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < explorationConstants.length; i++) {
    const ec = explorationConstants[i];
    const config: MCTSConfig = {
      ...baseConfig,
      explorationConstant: ec
    };
    
    const result = await quickTestConfig(config, 4, 20);
    results.push({ explorationConstant: ec, ...result });
  }
  
  const totalTime = Date.now() - startTime;
  
  // 按胜率排序
  results.sort((a, b) => b.winRate - a.winRate);  
  results.forEach((result, index) => {  });  
  return results;
}

/**
 * 中等规模微调：测试探索常数和迭代次数
 * 预计时间：约2-3小时
 */
export async function mediumTuning() {
  
  const tuningConfig = {
    explorationConstants: [1.0, 1.414, 2.0],  // 3个探索常数
    iterations: [500, 1000],                  // 2个迭代次数
    simulationDepths: [50],                   // 固定模拟深度
    perfectInformation: true,
    playerCount: 4,
    gamesPerConfig: 30                        // 每个配置30局
  };
  
  // 总配置数 = 3 × 2 × 1 = 6个
  // 总对局数 = 6 × 30 = 180局
  // 预计时间 = 180 × 30秒 = 5400秒 ≈ 90分钟  
  const estimatedTime = 3 * 2 * 1 * tuningConfig.gamesPerConfig * 30;
  const estimatedMinutes = Math.floor(estimatedTime / 60);  
  const results = await tuneMCTSParameters(tuningConfig);
  
  return results;
}

// 如果直接运行此文件
if (require.main === module) {
  quickExplorationTuning().catch(() => {});
}


/**
 * MCTS微调测试（带进度条）
 * 
 * 运行: npm test -- mctsTuningWithProgress.test.ts --run
 */

import { describe, it, expect } from 'vitest';
import { quickTestConfig, tuneMCTSParameters, MCTSConfig } from '../src/utils/mctsTuning';

// @slow - 慢测试（MCTS微调，耗时约5分钟），平时可以跳过
describe('MCTS微调测试（带进度条）', () => {
  // 测试进度条显示
  it('应该能够显示进度条和时间估算', async () => {
    const config: MCTSConfig = {
      explorationConstant: 1.414,
      iterations: 500,
      simulationDepth: 50,
      perfectInformation: true,
      playerCount: 4
    };
    
    console.log('\n开始测试进度条显示（10局游戏）...');
    const result = await quickTestConfig(config, 4, 10);
    
    expect(result).toBeDefined();
    expect(result.totalGames).toBe(10);
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(1);
    
    console.log(`\n测试完成: 胜率=${(result.winRate * 100).toFixed(2)}%`);
  }, 120000);

  // 测试完整微调（小规模，带进度条）
  it('应该能够运行完整微调并显示进度', async () => {
    const tuningConfig = {
      explorationConstants: [1.0, 1.414],  // 2个探索常数
      iterations: [500],                     // 1个迭代次数
      simulationDepths: [50],                // 1个模拟深度
      perfectInformation: true,
      playerCount: 4,
      gamesPerConfig: 10  // 每个配置10局，快速测试
    };
    
    // 总配置数 = 2 × 1 × 1 = 2个
    // 总对局数 = 2 × 10 = 20局
    // 预计时间 = 20 × 8秒 = 160秒 ≈ 2-3分钟
    
    console.log('\n开始完整微调测试（小规模）...');
    console.log('这将测试进度条和时间估算功能');
    
    const results = await tuneMCTSParameters(tuningConfig);
    
    expect(results.length).toBe(2);
    expect(results[0].totalGames).toBe(10);
    
    // 显示结果
    console.log('\n=== 所有配置结果 ===');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. 配置:`);
      console.log(`   探索常数: ${result.config.explorationConstant}`);
      console.log(`   迭代次数: ${result.config.iterations}`);
      console.log(`   模拟深度: ${result.config.simulationDepth}`);
      console.log(`   胜率: ${(result.winRate * 100).toFixed(2)}%`);
      console.log(`   平均分数: ${result.avgScore.toFixed(2)}`);
    });
  }, 300000); // 5分钟超时
});


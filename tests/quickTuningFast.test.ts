/**
 * 超快速微调测试（用于演示）
 * 只测试2个探索常数，每个5局，快速看到结果
 * 
 * 运行: npm test -- quickTuningFast.test.ts --run
 */

import { describe, it, expect } from 'vitest';
import { quickTestConfig, MCTSConfig } from '../src/utils/mctsTuning';

// @slow - 慢测试（MCTS微调，耗时约5分钟），平时可以跳过
describe('超快速微调测试（演示用）', () => {
  it('应该能够快速测试2个探索常数', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 超快速微调测试（演示用）');
    console.log('测试2个探索常数，每个配置5局');
    console.log('预计耗时：约2-3分钟');
    console.log('='.repeat(60) + '\n');
    
    const baseConfig: MCTSConfig = {
      iterations: 200,      // 减少迭代次数，加快速度
      simulationDepth: 30,   // 减少模拟深度，加快速度
      perfectInformation: true,
      playerCount: 4
    };
    
    // 只测试2个探索常数
    const explorationConstants = [1.0, 1.414];
    const results = [];
    const startTime = Date.now();
    
    for (let i = 0; i < explorationConstants.length; i++) {
      const ec = explorationConstants[i];
      const config: MCTSConfig = {
        ...baseConfig,
        explorationConstant: ec
      };
      
      console.log(`\n[${i + 1}/${explorationConstants.length}] 测试探索常数: ${ec}`);
      console.log(`  迭代次数: ${config.iterations}, 模拟深度: ${config.simulationDepth}`);
      
      // 只运行5局，快速看到结果
      const result = await quickTestConfig(config, 4, 5);
      results.push({ explorationConstant: ec, ...result });
    }
    
    const totalTime = Date.now() - startTime;
    
    // 按胜率排序
    results.sort((a, b) => b.winRate - a.winRate);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 快速测试完成！');
    console.log(`⏱️  总耗时: ${(totalTime / 1000).toFixed(1)}秒 (约${(totalTime / 1000 / 60).toFixed(1)}分钟)`);
    console.log('='.repeat(60));
    
    console.log('\n📊 结果对比:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. 探索常数: ${result.explorationConstant}`);
      console.log(`   胜率: ${(result.winRate * 100).toFixed(2)}%`);
      console.log(`   平均分数: ${result.avgScore.toFixed(2)}`);
      console.log(`   平均回合数: ${result.avgTurns.toFixed(1)}`);
    });
    
    console.log(`\n🏆 最佳探索常数: ${results[0].explorationConstant}`);
    console.log(`   胜率: ${(results[0].winRate * 100).toFixed(2)}%`);
    
    console.log('\n💡 提示: 这只是快速演示，要获得准确结果，建议：');
    console.log('   - 增加对局数到20-50局');
    console.log('   - 增加迭代次数到500-1000');
    console.log('   - 增加模拟深度到50-100');
    
    // 验证结果
    expect(results.length).toBe(2);
    expect(results[0].totalGames).toBe(5);
  }, 300000); // 5分钟超时
});


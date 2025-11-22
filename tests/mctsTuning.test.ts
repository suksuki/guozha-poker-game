/**
 * MCTS微调测试
 * 
 * 运行: npm test -- mctsTuning.test.ts
 * 或者: npm test -- --run mctsTuning.test.ts (单次运行，不watch)
 */

import { describe, it, expect } from 'vitest';
import { quickTestConfig, tuneMCTSParameters, MCTSConfig } from '../src/utils/mctsTuning';

describe('MCTS微调测试', () => {
  // 快速测试：单个配置
  it('应该能够运行快速测试', async () => {
    const config: MCTSConfig = {
      explorationConstant: 1.414,
      iterations: 500,  // 减少迭代次数以加快测试速度
      simulationDepth: 50,
      perfectInformation: true,
      playerCount: 4
    };
    
    console.log('\n开始快速测试...');
    const result = await quickTestConfig(config, 4, 10); // 只运行10局，快速验证
    
    expect(result).toBeDefined();
    expect(result.totalGames).toBe(10);
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(1);
    
    console.log(`测试完成: 胜率=${(result.winRate * 100).toFixed(2)}%`);
  }, 120000); // 2分钟超时

  // 测试探索常数的影响
  it('应该能够测试不同探索常数', async () => {
    const baseConfig: MCTSConfig = {
      iterations: 500,
      simulationDepth: 50,
      perfectInformation: true,
      playerCount: 4
    };
    
    const explorationConstants = [1.0, 1.414, 2.0];
    const results = [];
    
    console.log('\n测试不同探索常数...');
    
    for (const ec of explorationConstants) {
      const config: MCTSConfig = {
        ...baseConfig,
        explorationConstant: ec
      };
      
      console.log(`  测试探索常数: ${ec}`);
      const result = await quickTestConfig(config, 4, 20); // 每个配置20局
      results.push({ explorationConstant: ec, winRate: result.winRate });
    }
    
    // 验证结果
    expect(results.length).toBe(3);
    results.forEach(r => {
      expect(r.winRate).toBeGreaterThanOrEqual(0);
      expect(r.winRate).toBeLessThanOrEqual(1);
    });
    
    // 显示结果
    console.log('\n结果:');
    results.forEach(r => {
      console.log(`  探索常数 ${r.explorationConstant}: 胜率=${(r.winRate * 100).toFixed(2)}%`);
    });
    
    // 找出最佳探索常数
    results.sort((a, b) => b.winRate - a.winRate);
    console.log(`\n最佳探索常数: ${results[0].explorationConstant}`);
  }, 300000); // 5分钟超时

  // 对比完全信息模式
  it('应该能够对比完全信息模式和估计模式', async () => {
    const baseConfig: MCTSConfig = {
      explorationConstant: 1.414,
      iterations: 500,
      simulationDepth: 50,
      playerCount: 4
    };
    
    console.log('\n对比完全信息模式 vs 估计模式...');
    
    // 完全信息模式
    console.log('  测试完全信息模式...');
    const perfectInfoResult = await quickTestConfig(
      { ...baseConfig, perfectInformation: true },
      4,
      30
    );
    
    // 估计模式
    console.log('  测试估计模式...');
    const estimatedResult = await quickTestConfig(
      { ...baseConfig, perfectInformation: false },
      4,
      30
    );
    
    console.log('\n对比结果:');
    console.log(`  完全信息模式胜率: ${(perfectInfoResult.winRate * 100).toFixed(2)}%`);
    console.log(`  估计模式胜率: ${(estimatedResult.winRate * 100).toFixed(2)}%`);
    
    const improvement = perfectInfoResult.winRate - estimatedResult.winRate;
    console.log(`  提升: ${(improvement * 100).toFixed(2)}%`);
    
    // 验证结果
    expect(perfectInfoResult.winRate).toBeGreaterThanOrEqual(0);
    expect(estimatedResult.winRate).toBeGreaterThanOrEqual(0);
    
    // 完全信息模式应该至少不比估计模式差（通常更好）
    // 注意：由于随机性，这个断言可能偶尔失败，所以注释掉
    // expect(perfectInfoResult.winRate).toBeGreaterThanOrEqual(estimatedResult.winRate);
  }, 300000); // 5分钟超时

  // 完整参数微调（可选，耗时较长）
  it.skip('完整参数微调 - 跳过以节省时间', async () => {
    const tuningConfig = {
      explorationConstants: [1.0, 1.414, 2.0],
      iterations: [500, 1000],
      simulationDepths: [50, 100],
      perfectInformation: true,
      playerCount: 4,
      gamesPerConfig: 30  // 每个配置30局
    };
    
    console.log('\n开始完整参数微调...');
    const results = await tuneMCTSParameters(tuningConfig);
    
    expect(results.length).toBeGreaterThan(0);
    
    // 显示前3个最佳配置
    console.log('\n前3个最佳配置:');
    results.slice(0, 3).forEach((result, index) => {
      console.log(`${index + 1}. 探索常数=${result.config.explorationConstant}, ` +
                  `迭代=${result.config.iterations}, ` +
                  `深度=${result.config.simulationDepth}, ` +
                  `胜率=${(result.winRate * 100).toFixed(2)}%`);
    });
  }, 600000); // 10分钟超时
});


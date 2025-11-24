/**
 * MCTS微调快速验证测试
 * 只运行少量对局来验证工具是否正常工作
 */

import { describe, it, expect } from 'vitest';
import { quickTestConfig, MCTSConfig } from '../src/utils/mctsTuning';

// @slow - 慢测试（MCTS微调，耗时1-2分钟），平时可以跳过
describe('MCTS微调快速验证', () => {
  it('应该能够运行单局测试', async () => {
    const config: MCTSConfig = {
      explorationConstant: 1.414,
      iterations: 100,  // 很少的迭代次数，快速测试
      simulationDepth: 20,  // 很浅的模拟深度
      perfectInformation: true,
      playerCount: 4
    };
    
    console.log('\n开始快速验证测试（1局游戏）...');
    const startTime = Date.now();
    
    const result = await quickTestConfig(config, 4, 1); // 只运行1局
    
    const duration = Date.now() - startTime;
    console.log(`测试完成，耗时: ${(duration / 1000).toFixed(2)}秒`);
    
    expect(result).toBeDefined();
    expect(result.totalGames).toBe(1);
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(1);
    
    console.log(`结果: 胜率=${(result.winRate * 100).toFixed(2)}%, 分数=${result.avgScore}, 回合数=${result.avgTurns.toFixed(1)}`);
  }, 60000); // 1分钟超时

  it('应该能够运行少量对局测试', async () => {
    const config: MCTSConfig = {
      explorationConstant: 1.414,
      iterations: 200,
      simulationDepth: 30,
      perfectInformation: true,
      playerCount: 4
    };
    
    console.log('\n开始少量对局测试（5局游戏）...');
    const startTime = Date.now();
    
    const result = await quickTestConfig(config, 4, 5); // 运行5局
    
    const duration = Date.now() - startTime;
    console.log(`测试完成，耗时: ${(duration / 1000).toFixed(2)}秒`);
    console.log(`平均每局耗时: ${(duration / 5 / 1000).toFixed(2)}秒`);
    
    expect(result).toBeDefined();
    expect(result.totalGames).toBe(5);
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(1);
    
    console.log(`结果: 胜率=${(result.winRate * 100).toFixed(2)}%, 平均分数=${result.avgScore.toFixed(2)}, 平均回合数=${result.avgTurns.toFixed(1)}`);
  }, 120000); // 2分钟超时
});


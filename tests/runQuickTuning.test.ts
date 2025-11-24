/**
 * 运行快速微调测试
 * 
 * 运行: npm test -- runQuickTuning.test.ts --run
 */

import { describe, it } from 'vitest';
import { quickExplorationTuning } from '../src/utils/runQuickTuning';

// @slow - 极慢测试（MCTS微调，耗时30-40分钟），平时必须跳过
describe('快速微调测试', () => {
  it('应该能够运行快速探索常数微调', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('开始快速微调：测试探索常数对性能的影响');
    console.log('这将测试5个不同的探索常数，每个配置20局');
    console.log('预计耗时：30-40分钟');
    console.log('='.repeat(60) + '\n');
    
    const results = await quickExplorationTuning();
    
    console.log('\n✅ 快速微调完成！');
    console.log('你可以根据结果选择最佳探索常数，然后进行更详细的微调。');
    
    // 验证结果
    if (results && results.length > 0) {
      console.log(`\n最佳探索常数: ${results[0].explorationConstant}`);
      console.log(`胜率: ${(results[0].winRate * 100).toFixed(2)}%`);
    }
  }, 3600000); // 1小时超时（实际约30-40分钟）
});


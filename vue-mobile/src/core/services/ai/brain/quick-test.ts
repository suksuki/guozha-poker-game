/**
 * AI Brain 快速测试
 * 简单验证框架是否能正常工作
 */

import { AIBrain } from './core/AIBrain';
import { MCTSDecisionModule } from './modules/mcts/MCTSDecisionModule';

async function quickTest() {
  try {
    
    // 1. 创建Brain
    const brain = new AIBrain({
      personality: { preset: 'balanced' }
    });
    
    // 2. 注册模块
    brain.registerModule('mcts', new MCTSDecisionModule());
    
    // 3. 初始化
    await brain.initialize();
    
    // 4. 查看状态
    const state = brain.getState();
    
    // 5. 关闭
    await brain.shutdown();
    
    
    
  } catch (error) {
    if (error instanceof Error) {
    }
    process.exit(1);
  }
}

quickTest();


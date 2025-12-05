/**
 * AI Brain 快速测试
 * 简单验证框架是否能正常工作
 */

import { AIBrain } from './core/AIBrain';
import { MCTSDecisionModule } from './modules/mcts/MCTSDecisionModule';

async function quickTest() {
  try {
    console.log('AI Brain 快速测试');
    console.log('==================\n');
    
    // 1. 创建Brain
    console.log('1. 创建AI Brain...');
    const brain = new AIBrain({
      personality: { preset: 'balanced' }
    });
    console.log('   ✓ 创建成功\n');
    
    // 2. 注册模块
    console.log('2. 注册MCTS模块...');
    brain.registerModule('mcts', new MCTSDecisionModule());
    console.log('   ✓ 注册成功\n');
    
    // 3. 初始化
    console.log('3. 初始化...');
    await brain.initialize();
    console.log('   ✓ 初始化成功\n');
    
    // 4. 查看状态
    console.log('4. 查看状态...');
    const state = brain.getState();
    console.log(`   - 已初始化: ${state.initialized}`);
    console.log(`   - 激活状态: ${state.active}`);
    console.log(`   - 注册模块: ${state.modules.size}个`);
    console.log(`   - 版本: ${state.version}\n`);
    
    // 5. 关闭
    console.log('5. 关闭...');
    await brain.shutdown();
    console.log('   ✓ 关闭成功\n');
    
    console.log('==================');
    console.log('✅ 所有测试通过！');
    console.log('==================\n');
    
    console.log('AI Brain框架运行正常！');
    console.log('\n下一步可以：');
    console.log('1. 运行完整测试: npm run test:ai-brain');
    console.log('2. 查看集成指南: src/services/ai/brain/INTEGRATION_GUIDE.md');
    console.log('3. 开始集成到游戏中');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('\n错误详情:', error.message);
      console.error('\n堆栈:', error.stack);
    }
    process.exit(1);
  }
}

quickTest();


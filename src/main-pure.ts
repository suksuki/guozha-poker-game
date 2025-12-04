/**
 * 主入口 - 纯TypeScript版本
 * 
 * 这是整个应用的启动点
 * 超级简单，只有几行代码！
 * 
 * 不依赖React，完全纯净
 */

import { GameEngine } from './engine/GameEngine';
import { DOMRenderer } from './renderer/DOMRenderer';
import './styles/game.css';  // 游戏样式

/**
 * 主函数 - 应用启动入口
 * 
 * 流程：
 * 1. 创建渲染器
 * 2. 创建游戏引擎
 * 3. 初始化
 * 4. 开始游戏
 */
async function main() {
  console.log('🎮 扑克游戏启动中...\n');
  
  try {
    // 步骤1: 创建渲染器
    console.log('步骤1: 创建渲染器...');
    const renderer = new DOMRenderer('game-root');
    console.log('✓ 渲染器创建完成\n');
    
    // 步骤2: 创建游戏引擎
    console.log('步骤2: 创建游戏引擎...');
    const engine = new GameEngine({
      renderer,
      playerCount: 4,
      aiPlayerIds: [1, 2, 3],  // 玩家1、2、3是AI
      playerNames: ['你', 'AI-激进', 'AI-保守', 'AI-平衡'],
      aiConfig: {
        personalities: ['aggressive', 'conservative', 'balanced'],
        enableLLM: false,  // 先不启用LLM
        enableDataCollection: true  // 启用数据收集
      }
    });
    console.log('✓ 游戏引擎创建完成\n');
    
    // 步骤3: 初始化
    console.log('步骤3: 初始化游戏引擎...');
    await engine.initialize();
    
    // 步骤4: 监听游戏事件
    console.log('步骤4: 设置游戏事件监听...');
    setupGameEvents(engine);
    console.log('✓ 事件监听设置完成\n');
    
    // 步骤5: 开始游戏
    console.log('步骤5: 开始游戏！\n');
    engine.start();
    
    // 暴露到全局（方便调试）
    (window as any).gameEngine = engine;
    (window as any).exportData = () => {
      const data = engine.exportTrainingData();
      downloadTrainingData(data);
    };
    (window as any).printState = () => {
      (engine as any).printState();
    };
    
    console.log('💡 调试命令:');
    console.log('   gameEngine - 访问游戏引擎');
    console.log('   exportData() - 导出训练数据');
    console.log('   printState() - 打印当前状态');
    
  } catch (error) {
    console.error('❌ 游戏启动失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message);
      console.error('堆栈:', error.stack);
    }
  }
}

/**
 * 设置游戏事件监听
 */
function setupGameEvents(engine: GameEngine): void {
  // 游戏开始
  engine.on('game:start', () => {
    console.log('🎮 游戏开始！');
  });
  
  // 游戏结束
  engine.on('game:end', (data: any) => {
    console.log('🏆 游戏结束！');
    console.log(`   获胜者: 玩家${data.winnerId}`);
    
    // 自动导出训练数据
    if (data.trainingData) {
      console.log('📊 自动导出训练数据...');
      downloadTrainingData(data.trainingData);
    }
    
    // 显示统计
    const stats = engine.getStatistics();
    console.log('\n📈 游戏统计:', stats);
  });
  
  // 回合开始
  engine.on('round:start', (data: any) => {
    console.log(`🔄 回合${data.roundNumber}开始`);
  });
  
  // 玩家回合
  engine.on('turn:start', (data: any) => {
    console.log(`👤 玩家${data.playerId}的回合`);
  });
}

/**
 * 下载训练数据
 */
function downloadTrainingData(data: string): void {
  const blob = new Blob([data], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `poker-training-${Date.now()}.jsonl`;
  a.click();
  URL.revokeObjectURL(url);
  
  const lines = data.split('\n').filter(l => l.trim());
  console.log(`✓ 训练数据已下载: ${lines.length}个样本`);
}

// ==================== 启动应用 ====================

// 页面加载完成后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}


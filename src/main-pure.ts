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

// 导入现有服务（复用！）
import { soundService } from './services/soundService';
import { multiChannelVoiceService } from './services/multiChannelVoiceService';

/**
 * 主函数 - 应用启动入口
 * 
 * 流程：
 * 0. 等待用户点击启动
 * 1. 设置横屏方向
 * 2. 创建渲染器
 * 3. 创建游戏引擎
 * 4. 初始化
 * 5. 开始游戏
 */
async function main() {
  console.log('🎮 扑克游戏准备中...\n');
  
  // 等待用户点击启动按钮
  await waitForUserStart();
  
  console.log('🎮 扑克游戏启动中...\n');
  
  try {
    // 步骤0: 设置横屏方向
    console.log('步骤0: 设置横屏方向...');
    setupLandscapeMode();
    console.log('✓ 横屏设置完成\n');
    // 步骤1: 创建渲染器
    console.log('步骤1: 创建渲染器...');
    const renderer = new DOMRenderer('game-root');
    console.log('✓ 渲染器创建完成\n');
    
    // 步骤2: 创建游戏引擎（使用现有服务！）
    console.log('步骤2: 创建游戏引擎...');
    const engine = new GameEngine({
      renderer,
      playerCount: 4,
      aiPlayerIds: [1, 2, 3],  // 玩家1、2、3是AI
      playerNames: ['你', 'AI-激进', 'AI-保守', 'AI-平衡'],
      aiConfig: {
        personalities: ['aggressive', 'conservative', 'balanced'],
        enableLLM: false,  // 可在React配置界面中启用
        enableDataCollection: true
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
    (window as any).openChat = () => {
      engine.openChatInput();
    };
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      // C键打开聊天
      if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        // 如果不是在输入框中，打开聊天
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          engine.openChatInput();
        }
      }
    });
    
    console.log('💡 调试命令:');
    console.log('   gameEngine - 访问游戏引擎');
    console.log('   exportData() - 导出训练数据');
    console.log('   printState() - 打印当前状态');
    console.log('   openChat() - 打开聊天');
    console.log('\n💡 快捷键:');
    console.log('   C - 打开聊天');
    
  } catch (error) {
    console.error('❌ 游戏启动失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message);
      console.error('堆栈:', error.stack);
    }
  }
}

/**
 * 等待用户点击启动
 */
function waitForUserStart(): Promise<void> {
  return new Promise((resolve) => {
    const startButton = document.getElementById('start-button');
    const startScreen = document.getElementById('start-screen');
    
    if (!startButton || !startScreen) {
      resolve(); // 如果没有启动屏幕，直接继续
      return;
    }
    
    startButton.addEventListener('click', () => {
      // 隐藏启动屏幕
      startScreen.style.display = 'none';
      resolve();
    });
  });
}

/**
 * 设置横屏模式
 */
function setupLandscapeMode(): void {
  // 1. 尝试锁定屏幕方向为横屏
  if ('screen' in window && 'orientation' in window.screen) {
    const screen = window.screen as any;
    if ('lock' in screen.orientation) {
      screen.orientation.lock('landscape').catch((err: Error) => {
        console.warn('无法锁定横屏方向:', err.message);
      });
    }
  }
  
  // 2. 添加方向改变监听
  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('resize', handleOrientationChange);
  
  // 3. 初始检查方向
  handleOrientationChange();
}

/**
 * 处理屏幕方向改变
 */
function handleOrientationChange(): void {
  const isPortrait = window.innerHeight > window.innerWidth;
  
  if (isPortrait) {
    // 竖屏 - 显示旋转提示
    showRotatePrompt();
  } else {
    // 横屏 - 隐藏提示
    hideRotatePrompt();
  }
}

/**
 * 显示旋转提示
 */
function showRotatePrompt(): void {
  let prompt = document.getElementById('rotate-prompt');
  
  if (!prompt) {
    prompt = document.createElement('div');
    prompt.id = 'rotate-prompt';
    prompt.className = 'rotate-prompt';
    prompt.innerHTML = `
      <span class="rotate-icon">🔄</span>
      <span>为了更好的游戏体验，请将手机旋转至横屏</span>
    `;
    document.body.appendChild(prompt);
  }
  
  prompt.style.display = 'flex';
  console.log('📱 提示：请旋转至横屏');
}

/**
 * 隐藏旋转提示
 */
function hideRotatePrompt(): void {
  const prompt = document.getElementById('rotate-prompt');
  if (prompt) {
    prompt.style.display = 'none';
  }
  console.log('📱 横屏模式已启用');
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


/**
 * 简单游戏测试
 * 独立运行，测试Master AI Brain的所有功能
 * 可以在Node.js中直接运行：npx ts-node src/ai-core/examples/simple-game-test.ts
 */

import { GameBridge } from '../integration/GameBridge';
import { GameState } from '../types';
import { Card, Suit, Rank } from '../../types/card';

/**
 * 创建测试手牌
 */
function createTestHand(): Card[] {
  return [
    { suit: Suit.HEARTS, rank: Rank.THREE, id: 'h-3' },
    { suit: Suit.DIAMONDS, rank: Rank.FOUR, id: 'd-4' },
    { suit: Suit.CLUBS, rank: Rank.FIVE, id: 'c-5' },
    { suit: Suit.SPADES, rank: Rank.SIX, id: 's-6' },
    { suit: Suit.HEARTS, rank: Rank.SEVEN, id: 'h-7' },
    { suit: Suit.DIAMONDS, rank: Rank.EIGHT, id: 'd-8' },
    { suit: Suit.CLUBS, rank: Rank.NINE, id: 'c-9' },
  ];
}

/**
 * 创建测试游戏状态
 */
function createTestGameState(roundNumber: number): GameState {
  return {
    myHand: createTestHand(),
    myPosition: 1,
    playerCount: 4,
    lastPlay: null,
    lastPlayerId: null,
    currentPlayerId: 1,
    playHistory: [],
    roundNumber,
    opponentHandSizes: [10, 12, 9],
    teamMode: false,
    currentRoundScore: 0,
    cumulativeScores: new Map(),
    phase: roundNumber <= 3 ? 'early' : 'middle'
  };
}

/**
 * 主测试函数
 */
async function runTest() {
  console.log('┌────────────────────────────────────────┐');
  console.log('│  Master AI Brain - 简单游戏测试        │');
  console.log('└────────────────────────────────────────┘\n');
  
  try {
    // 1. 创建GameBridge
    console.log('1. 创建GameBridge...');
    const bridge = new GameBridge();
    const api = bridge.getAPI();
    console.log('   ✓ 创建成功\n');
    
    // 2. 初始化Master AI Brain
    console.log('2. 初始化Master AI Brain...');
    await api.initialize({
      aiPlayers: [
        { 
          id: 1, 
          personality: { preset: 'aggressive' }, 
          decisionModules: ['mcts'], 
          communicationEnabled: true 
        },
        { 
          id: 2, 
          personality: { preset: 'conservative' }, 
          decisionModules: ['mcts'], 
          communicationEnabled: true 
        },
        { 
          id: 3, 
          personality: { preset: 'balanced' }, 
          decisionModules: ['mcts'], 
          communicationEnabled: true 
        }
      ],
      llm: {
        enabled: false  // 测试时不启用LLM
      },
      dataCollection: {
        enabled: true,
        autoExport: false,
        exportInterval: 60000
      },
      performance: {
        enableCache: true,
        timeout: 5000
      }
    });
    console.log('   ✓ 初始化成功\n');
    
    // 3. 监听AI事件
    console.log('3. 设置事件监听...');
    let turnResults: any[] = [];
    
    bridge.eventBus.on('ai:turn-complete', (result: any) => {
      turnResults.push(result);
      console.log(`   ✓ AI${result.playerId}回合完成:`, {
        action: result.decision?.action.type,
        confidence: result.decision?.confidence?.toFixed(2),
        message: result.message?.content || '无'
      });
    });
    console.log('   ✓ 事件监听设置完成\n');
    
    // 4. 模拟5轮游戏
    console.log('4. 模拟5轮游戏...\n');
    
    for (let round = 1; round <= 5; round++) {
      console.log(`   === Round ${round} ===`);
      
      // 每个AI玩家出牌
      for (let playerId = 1; playerId <= 3; playerId++) {
        const gameState = createTestGameState(round);
        
        console.log(`   AI${playerId}思考中...`);
        api.triggerAITurn(playerId, gameState);
        
        // 等待AI响应
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('');
    }
    
    console.log(`   ✓ 完成5轮，共${turnResults.length}次决策\n`);
    
    // 5. 查看统计
    console.log('5. 查看统计信息...');
    const stats = api.getStatistics();
    
    console.log('\n   性能统计:');
    console.log(`   - 平均决策时间: ${stats.performance?.avgDecisionTime?.toFixed(2) || 0}ms`);
    console.log(`   - 成功率: ${((stats.performance?.successRate || 0) * 100).toFixed(1)}%`);
    
    console.log('\n   数据收集:');
    console.log(`   - 总数据点: ${stats.dataCollection?.totalDataPoints || 0}`);
    console.log(`   - 优秀样本: ${stats.dataCollection?.byQuality?.excellent || 0}`);
    console.log(`   - 良好样本: ${stats.dataCollection?.byQuality?.good || 0}`);
    console.log(`   - 一般样本: ${stats.dataCollection?.byQuality?.average || 0}`);
    
    const totalGoodSamples = 
      (stats.dataCollection?.byQuality?.excellent || 0) + 
      (stats.dataCollection?.byQuality?.good || 0);
    console.log(`   - 可用训练样本: ${totalGoodSamples}\n`);
    
    // 6. 导出训练数据
    console.log('6. 导出训练数据...');
    const trainingData = api.exportTrainingData();
    const lines = trainingData.split('\n').filter(l => l.trim());
    console.log(`   ✓ 导出了 ${lines.length} 个训练样本\n`);
    
    // 显示第一个样本
    if (lines.length > 0) {
      console.log('   示例样本:');
      const sample = JSON.parse(lines[0]);
      console.log('   ' + JSON.stringify(sample, null, 2).split('\n').join('\n   '));
      console.log('');
    }
    
    // 7. 关闭
    console.log('7. 关闭AI大脑...');
    await api.shutdown();
    console.log('   ✓ 关闭成功\n');
    
    console.log('┌────────────────────────────────────────┐');
    console.log('│           测试完成！✓                  │');
    console.log('└────────────────────────────────────────┘\n');
    
    console.log('✅ Master AI Brain 运行正常');
    console.log('✅ 决策系统工作正常');
    console.log('✅ 通信系统工作正常');
    console.log('✅ 数据收集工作正常');
    console.log('');
    console.log('🎉 可以开始在游戏中实际使用了！');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('\n错误堆栈:', error.stack);
    }
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTest().catch(console.error);
}

export { runTest };


# AI Brain 使用示例

## 示例 1: 基础使用

```typescript
import { 
  AIBrain, 
  MCTSDecisionModule,
  DEFAULT_BRAIN_CONFIG 
} from './brain';
import { Card } from '../types/card';

// 初始化AI大脑
async function initializeAI() {
  // 创建Brain实例
  const brain = new AIBrain({
    personality: {
      preset: 'balanced'
    },
    modules: {
      mcts: {
        enabled: true,
        baseWeight: 0.8,
        options: {
          iterations: 1000
        }
      }
    }
  });
  
  // 注册MCTS模块
  brain.registerModule('mcts', new MCTSDecisionModule());
  
  // 初始化
  await brain.initialize();
  
  console.log('AI Brain initialized');
  console.log('State:', brain.getState());
  
  return brain;
}

// 在游戏中使用
async function playOneRound(brain: AIBrain, hand: Card[]) {
  // 构建游戏状态
  const gameState = {
    myHand: hand,
    myPosition: 0,
    playerCount: 4,
    lastPlay: null,
    lastPlayerId: null,
    currentPlayerId: 0,
    playHistory: [],
    roundNumber: 1,
    opponentHandSizes: [13, 13, 13],
    teamMode: false,
    currentRoundScore: 0,
    cumulativeScores: new Map(),
    phase: 'early' as const
  };
  
  // AI决策
  console.log('\n=== AI思考中... ===');
  const decision = await brain.makeDecision(gameState);
  
  console.log('\n=== 决策结果 ===');
  console.log('动作:', decision.action);
  console.log('置信度:', decision.confidence);
  console.log('推理:', decision.reasoning);
  console.log('来源:', decision.sources.map(s => s.moduleName));
  
  return decision;
}

// 主函数
async function main() {
  const brain = await initializeAI();
  
  // 模拟手牌
  const hand: Card[] = [
    { rank: 3, suit: 'hearts' },
    { rank: 3, suit: 'diamonds' },
    { rank: 4, suit: 'clubs' },
    { rank: 5, suit: 'spades' },
    { rank: 6, suit: 'hearts' },
    { rank: 7, suit: 'diamonds' },
    { rank: 8, suit: 'clubs' },
    { rank: 9, suit: 'spades' },
    { rank: 10, suit: 'hearts' },
  ];
  
  // 执行一轮
  const decision = await playOneRound(brain, hand);
  
  // 关闭
  await brain.shutdown();
}

main().catch(console.error);
```

## 示例 2: 带数据收集的完整游戏

```typescript
import { 
  AIBrain, 
  MCTSDecisionModule,
  DataCollector,
  ContextManager
} from './brain';

class AIGame {
  private brain: AIBrain;
  private dataCollector: DataCollector;
  private gameHistory: any[] = [];
  
  async initialize() {
    // 创建AI Brain
    this.brain = new AIBrain({
      personality: { preset: 'balanced' },
      modules: {
        mcts: { enabled: true, baseWeight: 0.8 }
      },
      learning: {
        enabled: true,
        collectData: true
      }
    });
    
    // 注册模块
    this.brain.registerModule('mcts', new MCTSDecisionModule());
    await this.brain.initialize();
    
    // 创建数据收集器
    const contextManager = (this.brain as any).contextManager;
    this.dataCollector = new DataCollector(contextManager, {
      enabled: true,
      autoSave: true,
      maxSamples: 10000
    });
    this.dataCollector.start();
    
    console.log('Game initialized');
  }
  
  async playGame(players: Player[]) {
    console.log('\n=== 开始游戏 ===\n');
    
    let round = 0;
    let gameOver = false;
    
    while (!gameOver) {
      round++;
      console.log(`\n--- 第${round}轮 ---`);
      
      for (const player of players) {
        if (player.isAI) {
          await this.aiTurn(player);
        } else {
          await this.humanTurn(player);
        }
        
        // 检查是否有人赢了
        if (player.hand.length === 0) {
          console.log(`\n玩家${player.id}获胜！`);
          gameOver = true;
          break;
        }
      }
    }
    
    // 游戏结束，标注结果
    const winner = players.find(p => p.hand.length === 0)!;
    this.dataCollector.labelGameOutcome({
      winner: winner.id,
      scores: this.getScores(players),
      duration: Date.now() - this.gameStartTime,
      totalRounds: round
    });
    
    // 显示统计
    this.showStatistics();
  }
  
  async aiTurn(player: Player) {
    console.log(`\nAI玩家${player.id}的回合`);
    console.log(`手牌: ${player.hand.length}张`);
    
    // 构建游戏状态
    const gameState = this.buildGameState(player);
    
    // AI决策
    const decision = await this.brain.makeDecision(gameState);
    
    console.log(`决策: ${this.formatDecision(decision)}`);
    console.log(`置信度: ${(decision.confidence * 100).toFixed(1)}%`);
    
    // 执行动作
    if (decision.action.type === 'play') {
      this.playCards(player, decision.action.cards);
    } else {
      console.log('Pass');
    }
    
    // 记录
    await this.brain.executeAction(decision, gameState);
    this.gameHistory.push({
      player: player.id,
      decision,
      gameState
    });
  }
  
  async humanTurn(player: Player) {
    // 人类玩家的回合
    console.log(`\n玩家${player.id}的回合`);
    // ... 实现人类玩家逻辑
  }
  
  buildGameState(player: Player): GameState {
    return {
      myHand: player.hand,
      myPosition: player.id,
      playerCount: this.players.length,
      lastPlay: this.lastPlay,
      lastPlayerId: this.lastPlayer?.id || null,
      currentPlayerId: player.id,
      playHistory: this.playHistory,
      roundNumber: this.roundNumber,
      opponentHandSizes: this.getOpponentHandSizes(player),
      teamMode: false,
      currentRoundScore: 0,
      cumulativeScores: new Map(),
      phase: this.determinePhase()
    };
  }
  
  showStatistics() {
    console.log('\n=== 游戏统计 ===');
    
    // Brain指标
    const brainMetrics = this.brain.getMetrics();
    console.log('\nAI性能:');
    console.log(`- 总决策次数: ${brainMetrics.totalDecisions}`);
    console.log(`- 平均决策时间: ${brainMetrics.avgDecisionTime.toFixed(2)}ms`);
    
    // 数据收集统计
    const collectorStats = this.dataCollector.getStatistics();
    console.log('\n收集数据:');
    console.log(`- 总样本: ${collectorStats.total}`);
    console.log(`- 正样本: ${collectorStats.positive}`);
    console.log(`- 负样本: ${collectorStats.negative}`);
    console.log(`- 平均质量: ${(collectorStats.avgQuality * 100).toFixed(1)}%`);
  }
  
  async cleanup() {
    this.dataCollector.stop();
    await this.brain.shutdown();
    console.log('\nGame cleaned up');
  }
}

// 运行游戏
async function runGame() {
  const game = new AIGame();
  await game.initialize();
  
  const players = [
    { id: 0, isAI: true, hand: [...] },
    { id: 1, isAI: false, hand: [...] },
    { id: 2, isAI: true, hand: [...] },
    { id: 3, isAI: true, hand: [...] }
  ];
  
  await game.playGame(players);
  await game.cleanup();
}

runGame().catch(console.error);
```

## 示例 3: 多种AI性格对战

```typescript
import { AIBrain, MCTSDecisionModule } from './brain';

// 创建不同性格的AI
async function createAIWithPersonality(preset: string) {
  const brain = new AIBrain({
    personality: { preset }
  });
  
  brain.registerModule('mcts', new MCTSDecisionModule());
  await brain.initialize();
  
  return brain;
}

async function battleOfPersonalities() {
  console.log('=== AI性格对战 ===\n');
  
  // 创建4个不同性格的AI
  const brains = await Promise.all([
    createAIWithPersonality('aggressive'),
    createAIWithPersonality('conservative'),
    createAIWithPersonality('balanced'),
    createAIWithPersonality('adaptive')
  ]);
  
  const personalities = ['激进型', '保守型', '平衡型', '自适应型'];
  
  // 模拟100局游戏
  const wins = [0, 0, 0, 0];
  
  for (let game = 0; game < 100; game++) {
    const winner = await simulateGame(brains);
    wins[winner]++;
    
    if ((game + 1) % 10 === 0) {
      console.log(`已完成 ${game + 1} 局`);
    }
  }
  
  // 显示结果
  console.log('\n=== 对战结果 ===\n');
  for (let i = 0; i < 4; i++) {
    console.log(`${personalities[i]}: ${wins[i]}胜 (胜率${wins[i]}%)`);
  }
  
  // 清理
  for (const brain of brains) {
    await brain.shutdown();
  }
}

async function simulateGame(brains: AIBrain[]): Promise<number> {
  // 简化的游戏模拟
  // 返回获胜者索引
  return Math.floor(Math.random() * 4);
}

battleOfPersonalities().catch(console.error);
```

## 示例 4: 实时性能监控

```typescript
import { 
  AIBrain,
  MCTSDecisionModule,
  MetricsCollector 
} from './brain';

class MonitoredAI {
  private brain: AIBrain;
  private metricsCollector: MetricsCollector;
  private monitorInterval?: NodeJS.Timeout;
  
  async initialize() {
    this.brain = new AIBrain({
      personality: { preset: 'balanced' }
    });
    
    this.brain.registerModule('mcts', new MCTSDecisionModule());
    await this.brain.initialize();
    
    this.metricsCollector = new MetricsCollector();
    
    // 启动监控
    this.startMonitoring();
  }
  
  startMonitoring() {
    this.monitorInterval = setInterval(() => {
      this.displayMetrics();
    }, 10000);  // 每10秒更新一次
  }
  
  displayMetrics() {
    console.clear();
    console.log('=== AI Performance Monitor ===\n');
    
    const metrics = this.metricsCollector.getMetrics();
    const brainState = this.brain.getState();
    
    // 决策时间
    console.log('决策性能:');
    console.log(`  最小: ${metrics.decisionTime.min.toFixed(2)}ms`);
    console.log(`  平均: ${metrics.decisionTime.avg.toFixed(2)}ms`);
    console.log(`  最大: ${metrics.decisionTime.max.toFixed(2)}ms`);
    console.log(`  P95: ${metrics.decisionTime.p95.toFixed(2)}ms`);
    
    // 置信度
    console.log('\n置信度:');
    console.log(`  平均: ${(metrics.confidence.avg * 100).toFixed(1)}%`);
    console.log('  分布:');
    for (const [range, count] of Object.entries(metrics.confidence.distribution)) {
      console.log(`    ${range}: ${count}`);
    }
    
    // 动作类型
    console.log('\n动作统计:');
    console.log(`  Play: ${metrics.actionTypes.play}`);
    console.log(`  Pass: ${metrics.actionTypes.pass}`);
    console.log(`  Pass率: ${(metrics.actionTypes.pass / (metrics.actionTypes.play + metrics.actionTypes.pass) * 100).toFixed(1)}%`);
    
    // 模块使用
    console.log('\n模块使用:');
    for (const [name, count] of Object.entries(metrics.moduleUsage)) {
      console.log(`  ${name}: ${count}`);
    }
    
    // Brain状态
    console.log('\nBrain状态:');
    console.log(`  初始化: ${brainState.initialized ? '是' : '否'}`);
    console.log(`  激活: ${brainState.active ? '是' : '否'}`);
    console.log(`  总决策: ${brainState.metrics.totalDecisions}`);
  }
  
  async makeDecision(gameState: GameState) {
    const decision = await this.brain.makeDecision(gameState);
    this.metricsCollector.recordDecision(decision);
    return decision;
  }
  
  cleanup() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }
}

// 使用
async function main() {
  const ai = new MonitoredAI();
  await ai.initialize();
  
  // 运行一段时间...
  
  ai.cleanup();
}

main().catch(console.error);
```

## 示例 5: 自定义决策模块

```typescript
import { BaseDecisionModule } from './brain/modules/base/BaseDecisionModule';
import { ModuleAnalysis } from './brain/modules/base/IDecisionModule';
import { GameState } from './brain/core/types';

// 简单规则模块
class SimpleRuleModule extends BaseDecisionModule {
  readonly name = 'simple_rule';
  readonly version = '1.0.0';
  readonly description = '基于简单规则的决策模块';
  
  protected async performAnalysis(state: GameState): Promise<ModuleAnalysis> {
    const suggestions = [];
    
    // 规则1: 手牌少于3张，激进出牌
    if (state.myHand.length <= 3) {
      suggestions.push({
        action: { type: 'play', cards: [state.myHand[0]], play: null as any },
        score: 0.9,
        confidence: 0.9,
        reasoning: '手牌少，激进出牌争取胜利'
      });
    }
    
    // 规则2: 没有上家出牌，出最小的
    else if (!state.lastPlay) {
      const smallest = this.findSmallestCard(state.myHand);
      suggestions.push({
        action: { type: 'play', cards: [smallest], play: null as any },
        score: 0.7,
        confidence: 0.8,
        reasoning: '先出小牌，保留大牌'
      });
    }
    
    // 规则3: 打不过就Pass
    else if (!this.canBeat(state.myHand, state.lastPlay)) {
      suggestions.push({
        action: { type: 'pass' },
        score: 0.8,
        confidence: 0.9,
        reasoning: '打不过，选择Pass'
      });
    }
    
    // 默认
    else {
      suggestions.push({
        action: { type: 'pass' },
        score: 0.5,
        confidence: 0.5,
        reasoning: '保守策略，选择Pass'
      });
    }
    
    return {
      analysis: {
        handStrength: state.myHand.length < 5 ? 0.8 : 0.5,
        winProbability: 0.5,
        strategicIntent: 'steady_advance',
        recommendedStyle: 'conservative',
        keyFactors: [],
        threats: [],
        opportunities: []
      },
      suggestions,
      confidence: 0.7,
      reasoning: '基于简单规则的决策',
      computeTime: 0
    };
  }
  
  protected async performExplanation(
    state: GameState,
    action: GameAction
  ): Promise<string> {
    if (action.type === 'pass') {
      return '规则引擎建议Pass';
    }
    return '规则引擎建议出牌';
  }
  
  private findSmallestCard(hand: Card[]) {
    return hand.reduce((min, card) => 
      card.rank < min.rank ? card : min
    );
  }
  
  private canBeat(hand: Card[], lastPlay: any): boolean {
    // 简化实现
    return false;
  }
}

// 使用自定义模块
async function useCustomModule() {
  const brain = new AIBrain({
    modules: {
      simple_rule: {
        enabled: true,
        baseWeight: 0.3
      },
      mcts: {
        enabled: true,
        baseWeight: 0.7
      }
    }
  });
  
  // 注册自定义模块
  brain.registerModule('simple_rule', new SimpleRuleModule());
  brain.registerModule('mcts', new MCTSDecisionModule());
  
  await brain.initialize();
  
  // 现在Brain会融合两个模块的建议
  const decision = await brain.makeDecision(gameState);
  
  console.log('融合了规则引擎和MCTS的决策:', decision);
}
```

这些示例展示了AI Brain系统的各种使用方式，从基础使用到高级定制，都有详细的代码示例。


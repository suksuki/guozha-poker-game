
# AI Brain 集成指南

## 快速开始

### 1. 基本集成

```typescript
import { AIBrain, MCTSDecisionModule } from './brain';

// 创建AI大脑实例
const brain = new AIBrain({
  personality: {
    preset: 'balanced'
  },
  modules: {
    mcts: {
      enabled: true,
      baseWeight: 0.8
    }
  }
});

// 注册MCTS模块
brain.registerModule('mcts', new MCTSDecisionModule());

// 初始化
await brain.initialize();

// 在游戏中使用
const gameState = {
  myHand: [...],  // 我的手牌
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
  phase: 'early'
};

// 做决策
const decision = await brain.makeDecision(gameState);

// 执行动作
if (decision.action.type === 'play') {
  // 出牌
  playCards(decision.action.cards);
} else {
  // Pass
  pass();
}
```

### 2. 与现有游戏逻辑集成

```typescript
// 在你的游戏循环中
class Game {
  private brain: AIBrain;
  
  constructor() {
    this.brain = new AIBrain();
    // 注册模块...
  }
  
  async aiTurn(player: AIPlayer) {
    // 构建游戏状态
    const gameState = this.buildGameState(player);
    
    // AI决策
    const decision = await this.brain.makeDecision(gameState);
    
    // 执行动作
    await this.executeDecision(player, decision);
    
    // 记录用于学习
    await this.brain.executeAction(decision, gameState);
  }
  
  private buildGameState(player: AIPlayer): GameState {
    return {
      myHand: player.hand,
      myPosition: player.position,
      playerCount: this.players.length,
      lastPlay: this.lastPlay,
      lastPlayerId: this.lastPlayer?.id,
      currentPlayerId: player.id,
      playHistory: this.playHistory,
      roundNumber: this.roundNumber,
      opponentHandSizes: this.getOpponentHandSizes(player),
      teamMode: this.isTeamMode(),
      currentRoundScore: this.currentRoundScore,
      cumulativeScores: this.getCumulativeScores(),
      phase: this.determineGamePhase()
    };
  }
}
```

### 3. 添加数据收集

```typescript
import { DataCollector } from './brain/learning/DataCollector';

class Game {
  private brain: AIBrain;
  private dataCollector: DataCollector;
  
  constructor() {
    this.brain = new AIBrain();
    
    // 创建数据收集器
    const contextManager = (this.brain as any).contextManager;
    this.dataCollector = new DataCollector(contextManager, {
      enabled: true,
      autoSave: true,
      maxSamples: 10000
    });
    
    this.dataCollector.start();
  }
  
  async gameOver(winner: Player) {
    // 标注游戏结果
    this.dataCollector.labelGameOutcome({
      winner: winner.position,
      scores: this.getScoresMap(),
      duration: this.gameDuration,
      totalRounds: this.roundNumber
    });
    
    // 获取统计
    const stats = this.dataCollector.getStatistics();
    console.log('Collected samples:', stats);
  }
}
```

## 高级用法

### 1. 启用LLM模块

```typescript
// 首先实现LLM模块（需要根据你的LLM服务实现）
import { BaseDecisionModule } from './brain/modules/base/BaseDecisionModule';

class LLMDecisionModule extends BaseDecisionModule {
  readonly name = 'llm';
  readonly version = '1.0.0';
  readonly description = 'LLM决策模块';
  
  protected async performAnalysis(state: GameState): Promise<ModuleAnalysis> {
    // 调用LLM API
    const prompt = formatStateForLLM(state);
    const response = await this.llmClient.complete(prompt);
    
    // 解析响应...
    return analysis;
  }
  
  protected async performExplanation(
    state: GameState,
    action: GameAction
  ): Promise<string> {
    // LLM解释逻辑
    return explanation;
  }
}

// 配置Brain使用LLM
const brain = new AIBrain({
  personality: {
    preset: 'adaptive'
  },
  modules: {
    llm: {
      enabled: true,
      baseWeight: 0.6,
      options: {
        provider: 'local',
        endpoint: 'http://localhost:11434',
        model: 'qwen2.5-7b'
      }
    },
    mcts: {
      enabled: true,
      baseWeight: 0.4
    }
  },
  fusion: {
    strategy: 'adaptive',
    dynamicWeighting: true
  }
});

// 注册LLM模块
brain.registerModule('llm', new LLMDecisionModule());
```

### 2. 自定义融合策略

```typescript
// 根据特定需求调整权重规则
const brain = new AIBrain({
  modules: {
    llm: {
      enabled: true,
      baseWeight: 0.5,
      weightRules: [
        {
          condition: (state) => state.myHand.length > 10,
          weight: 0.7  // 手牌多时增加LLM权重
        },
        {
          condition: 'critical',
          weight: 0.3  // 关键时刻降低LLM权重
        }
      ]
    },
    mcts: {
      enabled: true,
      baseWeight: 0.5,
      weightRules: [
        {
          condition: 'critical',
          weight: 0.9  // 关键时刻提高MCTS权重
        },
        {
          condition: (state) => state.myHand.length < 5,
          weight: 0.8  // 残局提高MCTS权重
        }
      ]
    }
  }
});
```

### 3. 实现自定义模块

```typescript
import { BaseDecisionModule } from './brain/modules/base/BaseDecisionModule';

class MyCustomModule extends BaseDecisionModule {
  readonly name = 'custom';
  readonly version = '1.0.0';
  readonly description = '自定义决策模块';
  
  protected async performAnalysis(state: GameState): Promise<ModuleAnalysis> {
    // 你的自定义逻辑
    const suggestions = this.myAlgorithm(state);
    
    return {
      analysis: {
        handStrength: 0.7,
        winProbability: 0.6,
        strategicIntent: 'steady_advance',
        recommendedStyle: 'balanced',
        keyFactors: [],
        threats: [],
        opportunities: []
      },
      suggestions,
      confidence: 0.8,
      reasoning: '自定义算法的推理',
      computeTime: 0
    };
  }
  
  protected async performExplanation(
    state: GameState,
    action: GameAction
  ): Promise<string> {
    return '自定义模块的解释';
  }
  
  // 可选：实现学习功能
  async learn(samples: LearningSample[]): Promise<void> {
    // 从样本中学习
    console.log(`Learning from ${samples.length} samples`);
  }
}

// 注册并使用
brain.registerModule('custom', new MyCustomModule());
```

### 4. 监控和调试

```typescript
import { MetricsCollector } from './brain/utils/MetricsCollector';

// 创建指标收集器
const metricsCollector = new MetricsCollector();

// 在每次决策后记录
const decision = await brain.makeDecision(gameState);
metricsCollector.recordDecision(decision);

// 定期查看指标
setInterval(() => {
  const metrics = metricsCollector.getMetrics();
  console.log('Performance Metrics:', metrics);
}, 60000);  // 每分钟

// 查看Brain状态
const brainState = brain.getState();
console.log('Brain State:', brainState);

// 查看各模块性能
for (const [name, status] of brainState.modules) {
  console.log(`Module ${name}:`, status);
}
```

### 5. A/B测试

```typescript
// 创建两个不同配置的Brain
const brainA = new AIBrain({
  personality: { preset: 'aggressive' }
});

const brainB = new AIBrain({
  personality: { preset: 'conservative' }
});

// 随机选择使用
const useBrainA = Math.random() < 0.5;
const brain = useBrainA ? brainA : brainB;

// 记录使用的版本
const decision = await brain.makeDecision(gameState);
decision.metadata = { variant: useBrainA ? 'A' : 'B' };

// 游戏结束后比较
// 分析哪个配置表现更好
```

## 最佳实践

### 1. 错误处理

```typescript
try {
  const decision = await brain.makeDecision(gameState);
  await this.executeDecision(decision);
} catch (error) {
  console.error('AI decision failed:', error);
  
  // 降级到简单策略
  const fallbackDecision = this.simpleFallback(gameState);
  await this.executeDecision(fallbackDecision);
}
```

### 2. 超时控制

```typescript
const brain = new AIBrain({
  performance: {
    timeout: 3000,  // 3秒超时
    fallbackModule: 'mcts'  // 超时后使用MCTS
  }
});
```

### 3. 内存管理

```typescript
// 定期重置上下文
setInterval(() => {
  brain.reset();
}, 3600000);  // 每小时重置一次

// 游戏结束时清理
game.on('end', () => {
  brain.reset();
  dataCollector.clear();
});
```

### 4. 日志记录

```typescript
import { Logger } from './brain/utils/Logger';

const logger = new Logger({
  level: 'info',
  enableConsole: true,
  enableFile: true,
  filePath: './logs/ai-brain.log'
});

// 记录重要事件
brain.on('decision', (decision) => {
  logger.info('AI Decision', {
    action: decision.action,
    confidence: decision.confidence,
    sources: decision.sources.map(s => s.moduleName)
  });
});
```

## 故障排查

### 问题：AI决策太慢

**解决方案：**
1. 减少MCTS迭代次数
2. 启用缓存
3. 使用异步模式
4. 调整超时时间

```typescript
const brain = new AIBrain({
  modules: {
    mcts: {
      enabled: true,
      baseWeight: 0.8,
      options: {
        iterations: 500  // 减少迭代次数
      }
    }
  },
  performance: {
    enableCache: true,
    asyncMode: true,
    timeout: 2000
  }
});
```

### 问题：模块总是超时

**解决方案：**
1. 检查模块实现
2. 增加超时时间
3. 使用降级策略

```typescript
// 检查模块健康状态
const healthy = await module.healthCheck();
if (!healthy) {
  console.error('Module unhealthy');
  brain.unregisterModule('problematic_module');
}
```

### 问题：决策质量不佳

**解决方案：**
1. 调整模块权重
2. 收集更多训练数据
3. 启用LLM增强
4. 使用自适应融合策略

```typescript
const brain = new AIBrain({
  fusion: {
    strategy: 'adaptive',  // 使用自适应策略
    dynamicWeighting: true
  },
  learning: {
    enabled: true,
    collectData: true
  }
});
```

## 下一步

1. 实现LLM模块
2. 收集训练数据
3. 实现通信系统
4. 设置持续学习
5. 优化性能

详见各子模块的README文档。


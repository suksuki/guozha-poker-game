# AI Brain 设计文档

## 设计理念

### 核心原则

1. **模块化**：每个决策算法都是独立的模块，可以单独开发、测试和优化
2. **可扩展**：通过统一接口，随时添加新的决策模块或融合策略
3. **智能融合**：多个模块的建议不是简单相加，而是智能地融合
4. **持续进化**：系统可以从数据中学习，不断优化决策质量
5. **高性能**：异步架构、缓存机制、降级策略确保实时响应

### 架构分层

```
┌─────────────────────────────────────────────┐
│           应用层 (Game Logic)                │
│          游戏循环、UI、玩家交互               │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         AI Brain Core (决策中枢)             │
│  ┌──────────────────────────────────────┐   │
│  │      Cognitive Layer (认知层)        │   │
│  │      - 局面理解                       │   │
│  │      - 战略判断                       │   │
│  └──────────────────────────────────────┘   │
│                   ↓                          │
│  ┌──────────────────────────────────────┐   │
│  │   Fusion Layer (决策融合层)          │   │
│  │   - 多源决策整合                      │   │
│  │   - 动态权重调整                      │   │
│  └──────────────────────────────────────┘   │
└─────────────┬───────────────────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
┌────────┐          ┌────────┐
│ MCTS   │          │  LLM   │    ...更多模块
│ 模块   │          │  模块  │
└────────┘          └────────┘
```

## 关键组件设计

### 1. Decision Module (决策模块)

**接口定义：** `IDecisionModule`

**核心方法：**
- `analyze()`: 分析局面，返回完整分析结果
- `suggest()`: 给出动作建议
- `evaluate()`: 评估某个动作的质量
- `explain()`: 解释决策推理过程
- `isApplicable()`: 判断是否适用当前局面
- `getRecommendedWeight()`: 建议自己的权重

**设计特点：**
- 统一接口确保所有模块可互换
- 每个模块独立负责一种决策算法
- 模块可以自己建议权重（自适应）
- 支持可选的学习功能 `learn()`

**扩展点：**
```typescript
// 添加新模块只需3步：

// 1. 继承基类
class NewModule extends BaseDecisionModule {
  readonly name = 'new_module';
  
  // 2. 实现核心方法
  protected async performAnalysis(state: GameState) {
    // 你的算法
  }
  
  protected async performExplanation(state, action) {
    // 解释逻辑
  }
}

// 3. 注册
brain.registerModule('new_module', new NewModule());
```

### 2. Fusion Layer (融合层)

**职责：**
- 收集所有模块的建议
- 根据配置和局面动态调整权重
- 选择最终决策
- 生成综合推理说明

**融合策略：**

1. **加权平均 (Weighted Average)**
   - 根据模块权重和置信度加权
   - 适合各模块互补的情况

2. **投票 (Voting)**
   - 统计各模块的建议，取多数
   - 适合模块建议分歧大的情况

3. **级联 (Cascade)**
   - 按优先级依次选择
   - 适合有明确主次关系的情况

4. **自适应 (Adaptive)**
   - 根据局面复杂度动态选择策略
   - 最智能但计算开销稍大

**权重动态调整：**
```typescript
// 权重规则系统
{
  llm: {
    baseWeight: 0.5,
    weightRules: [
      {
        condition: 'complex_situation',  // 复杂局面
        weight: 0.7  // 提高LLM权重
      },
      {
        condition: 'critical',  // 关键时刻
        weight: 0.3  // 降低LLM权重（不够稳定）
      },
      {
        condition: (state) => state.myHand.length > 10,
        weight: 0.6  // 自定义条件
      }
    ]
  }
}
```

### 3. Context Manager (上下文管理)

**职责：**
- 维护游戏历史
- 记录决策历史
- 生成训练数据
- 提供上下文信息给决策模块

**数据流：**
```
游戏进行 → 更新状态 → 做决策 → 记录决策 → 执行动作 → 记录结果
    ↑                                                      ↓
    └──────────────── 用于学习和分析 ─────────────────────┘
```

### 4. Cognitive Layer (认知层)

**职责：**
- 高层次的局面理解
- 战略意图判断
- 识别威胁和机会
- 团队协作分析（团队模式）

**输出：**
- 手牌强度评估
- 胜率估计
- 战略意图（进攻/防守/配合等）
- 推荐打法风格
- 关键因素列表

**设计意图：**
认知层提供"人类视角"的局面理解，帮助模块做出更符合直觉的决策。

#### 意图识别 (Intent Recognition)
- 识别用户消息中的战术指令（如：“等我”、“保我”、“我有大牌”）
- 将自然语言映射为结构化的 `StrategicAction`
- 为 MCTS 提供动态权重调整信号

## 扩展点设计

### 1. 新决策模块

**扩展难度：** ⭐ (简单)

**步骤：**
1. 继承 `BaseDecisionModule`
2. 实现 `performAnalysis()` 和 `performExplanation()`
3. 可选实现 `learn()` 支持在线学习
4. 注册到Brain

**示例：**
```typescript
class ReinforcementLearningModule extends BaseDecisionModule {
  private model: RLModel;
  
  protected async performAnalysis(state: GameState) {
    const action = this.model.predict(state);
    return {
      analysis: {...},
      suggestions: [{ action, score: 0.8, confidence: 0.9, reasoning: 'RL模型预测' }],
      confidence: 0.9,
      reasoning: '强化学习模型',
      computeTime: 0
    };
  }
  
  async learn(samples: LearningSample[]) {
    // 在线学习
    await this.model.update(samples);
  }
}
```

### 2. 新融合策略

**扩展难度：** ⭐⭐ (中等)

**步骤：**
1. 在 `FusionLayer` 中添加新策略方法
2. 在配置中支持新策略名称

**示例：**
```typescript
// 在FusionLayer中添加
private expertSystemFusion(sources: DecisionSource[]) {
  // 专家系统融合：基于规则选择
  const rules = [
    { condition: (s) => s.moduleName === 'mcts' && s.confidence > 0.9, priority: 1 },
    { condition: (s) => s.moduleName === 'llm' && s.confidence > 0.8, priority: 2 }
  ];
  
  // 应用规则选择最佳建议
  // ...
}
```

### 3. LLM集成

**扩展难度：** ⭐⭐⭐ (较复杂)

**需要实现：**

1. **LLM客户端抽象**
```typescript
interface ILLMClient {
  complete(prompt: string): Promise<string>;
  embed(text: string): Promise<number[]>;
}
```

2. **Prompt工程**
```typescript
class PromptManager {
  buildDecisionPrompt(state: GameState): string {
    // 将游戏状态转换为LLM友好的提示词
    return formatStateForLLM(state) + '\n请分析局面并建议出牌。';
  }
  
  parseResponse(response: string): ActionSuggestion {
    // 解析LLM的响应
  }
}
```

3. **LLM决策模块**
```typescript
class LLMDecisionModule extends BaseDecisionModule {
  private client: ILLMClient;
  private promptManager: PromptManager;
  
  protected async performAnalysis(state: GameState) {
    const prompt = this.promptManager.buildDecisionPrompt(state);
    const response = await this.client.complete(prompt);
    const suggestion = this.promptManager.parseResponse(response);
    
    return {
      analysis: {...},
      suggestions: [suggestion],
      confidence: 0.7,
      reasoning: response,
      computeTime: 0
    };
  }
}
```

**优化考虑：**
- 异步调用，不阻塞游戏
- 缓存相似局面的响应
- 超时和降级策略
- 响应质量评估

### 4. 训练系统

**扩展难度：** ⭐⭐⭐⭐ (复杂)

**组件：**

1. **数据生成器**
```typescript
class TrainingDataGenerator {
  // 从自我对弈生成数据
  async generateSelfPlayData(numGames: number): Promise<TrainingSample[]>;
  
  // 从专家对局生成数据
  async generateExpertData(games: Game[]): Promise<TrainingSample[]>;
  
  // 数据增强
  augmentData(samples: TrainingSample[]): TrainingSample[];
}
```

2. **标注器**
```typescript
class DataAnnotator {
  // 用MCTS标注决策质量
  async annotateBest action(sample: TrainingSample): Promise<TrainingSample>;
  
  // 用专家知识标注
  async annotateWithExpert(sample: TrainingSample): Promise<TrainingSample>;
}
```

3. **训练器**
```typescript
class ModelTrainer {
  // 监督学习
  async supervisedTrain(samples: TrainingSample[]): Promise<void>;
  
  // 强化学习
  async reinforcementTrain(rewardFunction: RewardFunction): Promise<void>;
  
  // 在线学习
  async onlineTrain(recentSamples: TrainingSample[]): Promise<void>;
}
```

### 5. 通信系统

**扩展难度：** ⭐⭐⭐ (较复杂)

**组件：**

1. **战术通信与意图解析**
```typescript
class TacticalCommunication {
  // 注入用户意图：MasterAIBrain 接收用户消息并调用 SharedCognitiveLayer.addIntent
  // 解析用户意图：IntentAnalyzer 基于关键词/LLM 解析指令
  // 战术建议：将解析出的 Intent 注入 HybridStrategy
}
```

2. **社交聊天与上下文历史 (Delta Buffer)**
- **Bidirectional Communication**: AI 不仅能说话，还能“听”并记住用户的每一句话。
- **Context Buffering**: `CommunicationScheduler` 维护 15 条历史记录，确保聊天连贯。
- **Personality Driven**: 生成的回应严格遵循玩家性格预设。

## 性能优化

### 1. 缓存机制

```typescript
class DecisionCache {
  private cache: LRUCache<string, Decision>;
  
  get(state: GameState): Decision | null {
    const key = this.stateToKey(state);
    return this.cache.get(key) || null;
  }
  
  set(state: GameState, decision: Decision): void {
    const key = this.stateToKey(state);
    this.cache.set(key, decision);
  }
}
```

### 2. 预判系统

```typescript
class PredictionSystem {
  // 在对手思考时预先分析可能的局面
  async predictNextStates(currentState: GameState): Promise<Map<string, Decision>> {
    const possibleActions = this.enumeratePossibleActions(currentState);
    const predictions = new Map();
    
    for (const action of possibleActions) {
      const nextState = this.simulate(currentState, action);
      const decision = await this.brain.makeDecision(nextState);
      predictions.set(this.stateToKey(nextState), decision);
    }
    
    return predictions;
  }
}
```

### 3. 异步架构

```typescript
// 所有耗时操作都是异步的
async makeDecision(state: GameState): Promise<Decision> {
  // 并行调用所有模块
  const moduleTasks = this.modules.map(m => m.analyze(state));
  const results = await Promise.all(moduleTasks);
  
  // 融合决策
  return this.fuse(results);
}
```

## 测试策略

### 1. 单元测试

```typescript
describe('MCTSDecisionModule', () => {
  it('should suggest valid actions', async () => {
    const module = new MCTSDecisionModule();
    await module.initialize({ enabled: true, baseWeight: 0.8 });
    
    const result = await module.analyze(testGameState);
    
    expect(result.suggestions).toHaveLength(greaterThan(0));
    expect(result.confidence).toBeGreaterThan(0);
  });
});
```

### 2. 集成测试

```typescript
describe('AIBrain', () => {
  it('should fuse multiple module suggestions', async () => {
    const brain = new AIBrain();
    brain.registerModule('mcts', new MCTSModule());
    brain.registerModule('rule', new RuleModule());
    await brain.initialize();
    
    const decision = await brain.makeDecision(testState);
    
    expect(decision.sources).toHaveLength(2);
    expect(decision.fusionMethod).toBeDefined();
  });
});
```

### 3. 自我对弈测试

```typescript
async function selfPlayTest() {
  const brain1 = new AIBrain({ personality: { preset: 'aggressive' } });
  const brain2 = new AIBrain({ personality: { preset: 'conservative' } });
  
  const results = await runGames(brain1, brain2, 1000);
  
  // 评估胜率、决策质量等
  expect(results.brain1WinRate).toBeCloseTo(0.5, 0.1);
}
```

## 未来扩展方向

### 短期 (1-3个月)

1. **完善LLM集成**
   - 实现本地模型客户端
   - Prompt优化
   - 响应解析

2. **训练系统**
   - 数据收集管道
   - 标注工具
   - 基础训练

3. **通信系统**
   - 战术信号
   - 基础聊天

### 中期 (3-6个月)

1. **强化学习**
   - 自我对弈
   - 奖励函数设计
   - PPO/DQN算法

2. **在线学习**
   - 增量更新
   - A/B测试
   - 模型版本管理

3. **高级通信**
   - LLM生成自然语言
   - 情感表达
   - 个性化

### 长期 (6个月+)

1. **持续进化**
   - 自动发现弱点
   - 自动生成修复
   - 自主优化

2. **多智能体**
   - 团队协作学习
   - 对手建模
   - 元策略

3. **通用化**
   - 适配其他扑克游戏
   - 适配其他卡牌游戏
   - AI框架通用化

## 总结

AI Brain是一个**模块化、可扩展、智能融合**的AI决策框架。

**核心优势：**
- ✅ 统一接口，易于扩展
- ✅ 智能融合，发挥各算法优势
- ✅ 持续学习，不断进化
- ✅ 高性能，实时响应
- ✅ 可解释，便于调试

**扩展性设计：**
- 🔌 插件式模块系统
- ⚙️ 灵活的配置管理
- 📊 完善的数据收集
- 🔄 持续学习机制
- 🎯 多种融合策略

这个框架为实现"AI专家+AI社交"的愿景打下了坚实基础！


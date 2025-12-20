# AI中枢大脑系统 (AI Brain System)

## 概述

AI Brain是整个游戏AI的核心决策系统，采用**分层混合架构**，整合多种决策模块（LLM、MCTS、规则引擎等），通过智能融合实现专家级游戏能力和自然的交互体验。

## 架构设计

```
┌────────────────────────────────────────────────────────┐
│                  AI Brain Core                          │
│                  (决策中枢)                              │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Cognitive Layer (认知层)                        │   │
│  │  - 局面理解与评估                                 │   │
│  │  - 战略意图生成                                   │   │
│  │  - 上下文管理                                     │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↓↑                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Decision Fusion Layer (决策融合层)              │   │
│  │  - 多源决策整合                                   │   │
│  │  - 动态权重调整                                   │   │
│  │  - 最终决策仲裁                                   │   │
│  └─────────────────────────────────────────────────┘   │
│           ↙        ↓        ↓        ↘                 │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐      │
│  │LLM模块 │  │MCTS模块│  │规则引擎│  │经验库  │      │
│  │        │  │        │  │        │  │        │      │
│  └────────┘  └────────┘  └────────┘  └────────┘      │
│                                                          │
└────────────────────────────────────────────────────────┘
         ↓                                    ↓
┌──────────────────┐              ┌──────────────────┐
│  执行层           │              │  通信层           │
│  - 出牌动作       │              │  - 战术通信       │
│  - 时机控制       │              │  - 社交互动       │
└──────────────────┘              └──────────────────┘
```

## 核心特性

### 1. 模块化设计
- 所有决策模块实现统一接口 `IDecisionModule`
- 支持热插拔，随时添加/替换模块
- 每个模块独立可测试

### 2. 智能融合
- 动态权重系统根据局面自动调整各模块权重
- 多种融合策略：加权平均、投票、级联等
- 置信度评估，选择最可靠的决策

### 3. 持续进化
- 实时数据收集
- 在线学习与模型更新
- A/B测试与灰度发布
- 版本管理与回滚

### 4. LLM集成
- 支持本地模型（Qwen、Llama等）
- 支持云端API（OpenAI、Claude等）
- 异步推理，不阻塞游戏流程
- 缓存与预判优化

### 5. 多维决策
- 游戏层：出牌决策
- 战略层：长期规划
- 社交层：聊天与沟通
- 情感层：个性化表达

## 目录结构

```
brain/
├── README.md                 # 本文档
├── core/                     # 核心系统
│   ├── AIBrain.ts           # AI大脑主类
│   ├── CognitiveLayer.ts    # 认知层
│   ├── FusionLayer.ts       # 决策融合层
│   ├── ContextManager.ts    # 上下文管理
│   └── types.ts             # 核心类型定义
├── modules/                  # 决策模块
│   ├── base/
│   │   ├── IDecisionModule.ts    # 模块接口
│   │   └── BaseModule.ts         # 模块基类
│   ├── llm/
│   │   ├── LLMDecisionModule.ts  # LLM决策模块
│   │   ├── LLMClient.ts          # LLM客户端抽象
│   │   ├── LocalLLMClient.ts     # 本地模型客户端
│   │   ├── CloudLLMClient.ts     # 云端API客户端
│   │   └── PromptManager.ts      # 提示词管理
│   ├── mcts/
│   │   └── MCTSDecisionModule.ts # MCTS决策模块
│   ├── rule/
│   │   └── RuleBasedModule.ts    # 规则引擎模块
│   ├── pattern/
│   │   └── PatternModule.ts      # 模式匹配模块
│   └── experience/
│       └── ExperienceModule.ts   # 经验库模块
├── fusion/                   # 决策融合
│   ├── WeightManager.ts     # 权重管理器
│   ├── strategies/          # 融合策略
│   │   ├── WeightedAverage.ts
│   │   ├── Voting.ts
│   │   └── Cascade.ts
│   └── ConfidenceEvaluator.ts
├── communication/            # 通信系统
│   ├── TacticalComm.ts      # 战术通信
│   ├── SocialComm.ts        # 社交聊天
│   ├── MessageGenerator.ts  # 消息生成器
│   └── IntentParser.ts      # 意图解析
├── learning/                 # 学习系统
│   ├── DataCollector.ts     # 数据收集器
│   ├── ExperienceBuffer.ts  # 经验回放池
│   ├── OnlineLearner.ts     # 在线学习
│   ├── ModelUpdater.ts      # 模型更新器
│   └── ABTester.ts          # A/B测试
├── evolution/                # 进化系统
│   ├── EvolutionEngine.ts   # 进化引擎
│   ├── PatternAnalyzer.ts   # 模式分析
│   ├── KnowledgeExtractor.ts # 知识提取
│   └── DeploymentManager.ts  # 部署管理
├── training/                 # 训练系统
│   ├── DataGenerator.ts     # 数据生成器
│   ├── Annotator.ts         # 数据标注
│   ├── Trainer.ts           # 训练器
│   └── Evaluator.ts         # 评估器
├── config/                   # 配置管理
│   ├── BrainConfig.ts       # 大脑配置
│   ├── ModuleConfig.ts      # 模块配置
│   └── presets/             # 预设配置
│       ├── aggressive.ts
│       ├── conservative.ts
│       └── balanced.ts
├── utils/                    # 工具函数
│   ├── StateFormatter.ts    # 状态格式化
│   ├── MetricsCollector.ts  # 指标收集
│   └── Logger.ts            # 日志系统
└── index.ts                  # 统一导出

integration/                  # 与现有系统集成
├── GameIntegration.ts       # 游戏集成适配器
└── LegacyBridge.ts          # 兼容旧代码
```

## 使用示例

### 基本使用

```typescript
import { AIBrain } from './brain';

// 创建AI大脑实例
const brain = new AIBrain({
  personality: 'balanced',
  modules: {
    llm: { enabled: true, weight: 0.5 },
    mcts: { enabled: true, weight: 0.5 },
    rule: { enabled: true, weight: 0.1 }
  }
});

// 初始化
await brain.initialize();

// 做决策
const decision = await brain.makeDecision(gameState);

// 执行动作
await brain.executeAction(decision);

// 生成聊天消息
const message = await brain.generateMessage(context);
```

### 添加自定义模块

```typescript
import { BaseDecisionModule } from './brain/modules/base';

class MyCustomModule extends BaseDecisionModule {
  async analyze(gameState) {
    // 自定义分析逻辑
    return {
      suggestion: myLogic(gameState),
      confidence: 0.8
    };
  }
}

// 注册模块
brain.registerModule('custom', new MyCustomModule());
```

### 训练与进化

```typescript
// 收集训练数据
const collector = brain.getDataCollector();
collector.startCollection();

// 触发模型更新
const updater = brain.getModelUpdater();
await updater.update({
  dataSource: 'recent_games',
  updateStrategy: 'incremental'
});

// 启动持续进化
const evolution = brain.getEvolutionEngine();
evolution.start({
  checkInterval: '1h',
  deployStrategy: 'gradual'
});
```

## 配置说明

### AI性格配置

```typescript
{
  personality: 'aggressive',  // 激进型
  // 或
  personality: 'conservative', // 保守型
  // 或
  personality: 'balanced',    // 平衡型
  // 或
  personality: {              // 自定义
    aggression: 0.7,
    cooperation: 0.8,
    risk_tolerance: 0.6,
    chattiness: 0.5
  }
}
```

### 模块权重配置

```typescript
{
  modules: {
    llm: {
      enabled: true,
      baseWeight: 0.5,
      // 动态调整规则
      weightRules: [
        { condition: 'complex_situation', weight: 0.7 },
        { condition: 'endgame', weight: 0.3 }
      ]
    },
    mcts: {
      enabled: true,
      baseWeight: 0.5,
      weightRules: [
        { condition: 'simple_decision', weight: 0.9 },
        { condition: 'time_pressure', weight: 0.8 }
      ]
    }
  }
}
```

### LLM配置

```typescript
{
  llm: {
    provider: 'local',  // 'local' | 'openai' | 'claude'
    model: 'qwen2.5-7b',
    endpoint: 'http://0.13:11434',
    
    // 推理参数
    temperature: 0.7,
    max_tokens: 500,
    
    // 优化选项
    enableCache: true,
    enablePredict: true,
    asyncMode: true,
    
    // 训练选项
    enableOnlineLearning: true,
    updateInterval: '24h'
  }
}
```

## 扩展指南

### 添加新的决策模块

1. 继承 `BaseDecisionModule` 或实现 `IDecisionModule`
2. 实现必要方法：`analyze()`, `suggest()`, `explain()`
3. 注册到 Brain：`brain.registerModule(name, module)`

### 添加新的融合策略

1. 实现 `IFusionStrategy` 接口
2. 在 `FusionLayer` 中注册策略

### 添加新的学习算法

1. 实现 `ILearningAlgorithm` 接口
2. 在 `OnlineLearner` 中集成

## 性能考虑

- **异步优先**：所有耗时操作异步执行
- **缓存机制**：相似局面复用决策
- **预判系统**：提前分析可能局面
- **降级策略**：LLM失败时回退到MCTS

## 测试策略

- **单元测试**：每个模块独立测试
- **集成测试**：模块协作测试
- **自我对弈**：AI vs AI评估
- **人机测试**：真实玩家反馈

## 开发路线图

### Phase 1: 核心框架 (Week 1-2)
- [x] 设计架构
- [ ] 实现 AIBrain 核心
- [ ] 实现模块接口
- [ ] 基础集成

### Phase 2: 决策模块 (Week 3-4)
- [ ] MCTS模块（复用现有）
- [ ] 规则引擎模块
- [ ] LLM模块基础版

### Phase 3: LLM集成 (Week 5-8)
- [ ] Prompt工程
- [ ] 本地模型集成
- [ ] 训练数据收集
- [ ] 基础训练

### Phase 4: 通信系统 (Week 9-10)
- [ ] 战术通信
- [ ] 社交聊天
- [ ] 个性化表达

### Phase 5: 学习系统 (Week 11-14)
- [ ] 数据收集管道
- [ ] 在线学习
- [ ] 持续进化
- [ ] A/B测试

### Phase 6: 优化与扩展 (Week 15+)
- [ ] 性能优化
- [ ] 新算法集成
- [ ] 高级功能

## 贡献指南

欢迎贡献新的决策模块、融合策略或学习算法！

## 许可

与项目主许可一致


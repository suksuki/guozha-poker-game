# AI Core - 统一AI核心系统

## 🎯 设计理念

**一个大脑，统一调度所有AI**

- ✅ 完全独立，不依赖React或任何UI框架
- ✅ 纯TypeScript实现，可独立运行和测试
- ✅ 通过事件总线与游戏引擎通信，完全解耦
- ✅ 自动收集训练数据，每个决策和通信都记录

## 📁 目录结构

```
ai-core/
├── master-brain/              # 主大脑
│   ├── MasterAIBrain.ts      # 统一管理所有AI玩家
│   └── types.ts
│
├── orchestrator/              # 调度系统
│   ├── AIOrchestrator.ts     # AI行为调度
│   ├── CommunicationScheduler.ts  # 通信调度
│   └── RoundController.ts    # Round流程控制
│
├── players/                   # AI玩家
│   └── AIPlayer.ts           # 单个AI玩家实例
│
├── cognitive/                 # 认知层
│   └── SharedCognitiveLayer.ts    # 共享的局面理解
│
├── infrastructure/            # 基础设施
│   ├── monitoring/
│   │   └── PerformanceMonitor.ts  # 性能监控
│   ├── knowledge/
│   │   └── GameKnowledgeBase.ts   # 游戏知识库
│   ├── data-collection/
│   │   └── MasterDataCollector.ts # 训练数据收集
│   └── llm/
│       └── UnifiedLLMService.ts   # 统一LLM服务
│
├── integration/               # 集成层
│   ├── GameBridge.ts         # 游戏桥接（唯一对外接口）
│   └── EventBus.ts           # 事件总线
│
├── types.ts                   # 统一类型定义
├── index.ts                   # 主导出
└── README.md                  # 本文档
```

## 🧠 核心架构

```
┌────────────────────────────────────────────┐
│         游戏引擎 (Game Engine)              │
│         完全独立，可以是任何实现             │
└──────────────┬─────────────────────────────┘
               │ (事件总线)
               ↓
┌────────────────────────────────────────────┐
│           Game Bridge (桥接层)              │
│           唯一的对外接口                    │
└──────────────┬─────────────────────────────┘
               ↓
┌────────────────────────────────────────────┐
│      Master AI Brain (统一大脑)             │
│                                             │
│  ┌──────────────────────────────────────┐ │
│  │  调度中心 (Orchestrator)              │ │
│  │  - AI行为调度                         │ │
│  │  - 通信序列调度                       │ │
│  │  - Round流程控制                      │ │
│  └──────────────────────────────────────┘ │
│               ↓                            │
│  ┌─────────┬─────────┬─────────┬────────┐ │
│  │ AI角色1 │ AI角色2 │ AI角色3 │AI角色4│ │
│  │(激进型) │(保守型) │(平衡型) │(自适应)│ │
│  └─────────┴─────────┴─────────┴────────┘ │
│               ↓                            │
│  ┌──────────────────────────────────────┐ │
│  │  共享资源层                           │ │
│  │  - 共享认知（局面分析）               │ │
│  │  - 知识库（策略库）                   │ │
│  │  - LLM服务（统一调用）                │ │
│  │  - 数据收集器（训练素材）             │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

## 🚀 使用方式

### 方式1: 通过GameBridge（推荐）

```typescript
import { GameBridge } from './ai-core';

// 1. 创建桥接
const bridge = new GameBridge();
const api = bridge.getAPI();

// 2. 初始化AI大脑
await api.initialize({
  aiPlayers: [
    { id: 1, personality: { preset: 'aggressive' }, decisionModules: ['mcts'], communicationEnabled: true },
    { id: 2, personality: { preset: 'conservative' }, decisionModules: ['mcts'], communicationEnabled: true },
    { id: 3, personality: { preset: 'balanced' }, decisionModules: ['mcts'], communicationEnabled: true }
  ],
  llm: {
    enabled: true,
    endpoint: 'http://localhost:11434/api/chat',
    model: 'qwen2.5:3b'
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

// 3. 在游戏循环中使用
function aiPlayerTurn(playerId: number) {
  const gameState = getCurrentGameState();
  
  // 触发AI回合
  api.triggerAITurn(playerId, gameState);
}

// 4. 监听AI响应
bridge.eventBus.on('ai:turn-complete', (result) => {
  const { playerId, decision, message } = result;
  
  // 执行决策
  if (decision.action.type === 'play') {
    executePlay(playerId, decision.action.cards);
  }
  
  // 显示消息
  if (message) {
    showMessage(playerId, message.content);
  }
});

// 5. 游戏结束时导出训练数据
gameOver(() => {
  const trainingData = api.exportTrainingData();
  saveToFile('training-data.jsonl', trainingData);
});
```

### 方式2: 直接使用MasterAIBrain

```typescript
import { MasterAIBrain } from './ai-core';

const brain = new MasterAIBrain(config);
await brain.initialize();

// AI回合
const result = await brain.handleTurn(playerId, gameState);
```

## 📊 自动数据收集

### 自动收集内容

每次AI行为都会自动记录：

```typescript
{
  // 输入
  input: {
    gameState: {...},      // 完整游戏状态
    cognitive: {...},      // AI的认知分析
    context: {...}         // 上下文信息
  },
  
  // 输出
  output: {
    decision: {            // 如果是决策
      action: {...},
      reasoning: "...",
      confidence: 0.85
    },
    communication: {       // 如果是通信
      message: "...",
      intent: "...",
      emotion: "..."
    }
  },
  
  // 自动标注
  annotation: {
    quality: "good",       // 自动评估质量
    category: [...],       // 自动分类
    tags: [...]           // 自动打标签
  }
}
```

### 导出训练数据

```typescript
// 导出JSONL格式（适合LLM训练）
const trainingData = api.exportTrainingData();

// 格式示例
/*
{"messages":[{"role":"system","content":"你是一个激进型AI玩家"},{"role":"user","content":"游戏状态：..."},{"role":"assistant","content":"出牌：..."}],"metadata":{"quality":"good","tags":["decision","aggressive"]}}
{"messages":[{"role":"system","content":"你是一个保守型AI玩家"},{"role":"user","content":"当前局面：..."},{"role":"assistant","content":"我先保留大牌"}],"metadata":{"quality":"excellent","tags":["communication","tactical"]}}
...
*/

// 可直接用于LLM微调
```

### 查看统计

```typescript
const stats = api.getStatistics();

console.log(`
训练数据统计：
- 总数据点: ${stats.dataCollection.totalDataPoints}
- 高质量: ${stats.dataCollection.byQuality.excellent}
- 良好: ${stats.dataCollection.byQuality.good}
- 平均: ${stats.dataCollection.byQuality.average}

可用训练样本: ${stats.dataCollection.byQuality.excellent + stats.dataCollection.byQuality.good}
`);
```

## 🎮 完整示例

```typescript
// game.ts - 游戏主逻辑（完全独立于AI）

import { GameBridge } from './ai-core';

class Game {
  private bridge: GameBridge;
  private api: GameBridgeAPI;
  
  async initialize() {
    // 创建桥接
    this.bridge = new GameBridge();
    this.api = this.bridge.getAPI();
    
    // 初始化AI
    await this.api.initialize({
      aiPlayers: [
        { id: 1, personality: { preset: 'aggressive' }, decisionModules: ['mcts'], communicationEnabled: true },
        { id: 2, personality: { preset: 'conservative' }, decisionModules: ['mcts'], communicationEnabled: true },
        { id: 3, personality: { preset: 'balanced' }, decisionModules: ['mcts'], communicationEnabled: true }
      ],
      llm: { enabled: false },  // 先不启用LLM
      dataCollection: { enabled: true, autoExport: false, exportInterval: 60000 },
      performance: { enableCache: true, timeout: 5000 }
    });
    
    // 监听AI事件
    this.setupAIEventListeners();
  }
  
  setupAIEventListeners() {
    this.bridge.eventBus.on('ai:turn-complete', (result) => {
      this.handleAITurnComplete(result);
    });
  }
  
  async playGame() {
    while (!this.isGameOver()) {
      const currentPlayer = this.getCurrentPlayer();
      
      if (currentPlayer.isAI) {
        // AI回合
        await this.aiTurn(currentPlayer.id);
      } else {
        // 人类回合
        await this.humanTurn();
      }
    }
    
    // 游戏结束，导出数据
    await this.onGameEnd();
  }
  
  async aiTurn(playerId: number) {
    const gameState = this.buildGameState();
    this.api.triggerAITurn(playerId, gameState);
  }
  
  async onGameEnd() {
    // 导出训练数据
    const data = this.api.exportTrainingData();
    await this.saveTrainingData(data);
    
    // 查看统计
    const stats = this.api.getStatistics();
    console.log('AI统计:', stats);
  }
}
```

## ⚡ 性能特点

### 1. 共享认知，效率提升
```
传统方式：4个AI × 各自分析 = 4次重复计算
新方式：1次共享分析 → 4个AI使用 = 75%效率提升
```

### 2. 统一LLM调用
```
传统方式：决策调LLM + 聊天调LLM = 2次调用
新方式：统一调度 + 缓存 = 减少50%调用
```

### 3. 智能缓存
```
相似局面 → 复用结果
相似对话 → 复用生成
```

## 🎓 训练数据质量

### 自动标注机制

每个数据点都会自动评估质量：

- **Excellent**: 高置信度 + 战略一致 + 结果良好
- **Good**: 置信度良好 + 逻辑合理
- **Average**: 基本可用
- **Poor**: 低置信度或逻辑错误

### 数据增强

自动生成：
- 反事实样本（"如果这么做会怎样"）
- 对比样本（好决策 vs 坏决策）
- 解释样本（为什么这么做）

## 🔌 与游戏引擎集成

### 最小化集成

只需3步：

```typescript
// 1. 创建桥接
const bridge = new GameBridge();

// 2. 初始化
await bridge.getAPI().initialize(config);

// 3. 使用
bridge.getAPI().triggerAITurn(playerId, gameState);
```

### 零UI依赖

- ❌ 不import任何React组件
- ❌ 不使用React hooks
- ❌ 不依赖浏览器DOM API
- ✅ 纯逻辑，可在Node.js运行

## 🧪 测试

### 独立测试（无需UI）

```typescript
// test.ts
import { MasterAIBrain } from './ai-core';

async function test() {
  const brain = new MasterAIBrain({...});
  await brain.initialize();
  
  const result = await brain.handleTurn(1, mockGameState);
  console.log('AI决策:', result.decision);
  
  const data = brain.exportTrainingData();
  console.log('收集了', data.split('\n').length, '个训练样本');
}

// 在Node.js中直接运行
test();
```

## 📝 总结

### 核心优势

1. **独立性** - 完全不依赖UI框架
2. **可调试** - 每个模块可独立测试
3. **高效** - 共享认知，统一调度
4. **智能** - 自动收集训练数据
5. **扩展** - 易于添加新功能

### 与旧系统对比

| 特性 | 旧系统 | 新AI Core |
|------|--------|-----------|
| 架构 | 分散在各处 | 统一大脑 |
| 调度 | 各自为战 | 统一调度 |
| 数据收集 | 手动 | 自动 |
| 与React耦合 | 紧密 | 完全解耦 |
| 可测试性 | 困难 | 容易 |
| 训练素材 | 无 | 自动收集 |

### 未来扩展

- [ ] 实现完整的Round控制
- [ ] 增强共享认知
- [ ] 实现战术通信
- [ ] 在线学习系统
- [ ] 持续进化机制

---

**这个AI Core是一个完全独立、可复用的AI系统框架！**


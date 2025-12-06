# 👨‍💻 开发者指南

**欢迎加入锅炸扑克v2.0开发！**

---

## 📋 目录

- [新人入门](#新人入门)
- [项目结构](#项目结构)
- [核心概念](#核心概念)
- [开发工作流](#开发工作流)
- [常见任务](#常见任务)
- [调试技巧](#调试技巧)
- [最佳实践](#最佳实践)

---

## 🎓 新人入门

### 第一天：环境搭建 (2小时)

```bash
# 1. 克隆项目
git clone <repo-url>
cd guozha-poker-game

# 2. 安装依赖
npm install
cd vue-mobile && npm install && cd ..

# 3. 运行测试
npm run test:new

# 4. 启动开发服务器
npm run dev
```

### 第一周：理解架构 (8小时)

**必读文档:**
1. [README.md](../README.md) - 15分钟
2. [QUICK_START.md](../QUICK_START.md) - 30分钟
3. [MIGRATION_ARCHITECTURE.md](migration/MIGRATION_ARCHITECTURE.md) - 2小时
4. [API_REFERENCE.md](API_REFERENCE.md) - 2小时
5. [测试报告](migration/FINAL_TEST_REPORT.md) - 1小时

**实践任务:**
- [ ] 运行所有测试并理解测试结构
- [ ] 修改一个简单组件
- [ ] 添加一个单元测试
- [ ] 提交第一个PR

### 第一个月：熟悉系统 (40小时)

**学习路径:**
1. 深入理解GameState和StateManager
2. 掌握纯函数业务模块
3. 了解异步管理系统
4. 熟悉Vue组件开发
5. 参与代码审查

---

## 📁 项目结构

```
guozha-poker-game/
│
├── src/                          # 源代码
│   ├── game-engine/              # 🎮 游戏引擎层
│   │   ├── state/                # 状态管理
│   │   │   ├── GameState.ts      # 不可变状态容器
│   │   │   └── StateManager.ts   # 状态管理器
│   │   ├── round/                # 回合逻辑
│   │   │   ├── RoundData.ts      # 回合数据
│   │   │   └── RoundModule.ts    # 回合业务逻辑
│   │   ├── modules/              # 业务模块
│   │   │   ├── ScoreModule.ts    # 分数计算
│   │   │   ├── DealingModule.ts  # 发牌逻辑
│   │   │   ├── GameFlowModule.ts # 游戏流程
│   │   │   ├── RankingModule.ts  # 排名逻辑
│   │   │   └── TeamModule.ts     # 团队逻辑
│   │   └── index.ts              # 统一导出
│   │
│   ├── central-brain/            # 🧠 中央大脑
│   │   ├── infrastructure/       # 基础设施
│   │   │   └── async/            # 异步管理
│   │   │       ├── AsyncTaskManager.ts
│   │   │       └── ServiceHealthChecker.ts
│   │   ├── scheduler/            # 调度系统
│   │   │   ├── TaskQueue.ts
│   │   │   └── ScheduleManager.ts
│   │   └── services/             # 服务封装
│   │       ├── LLMServiceWrapper.ts
│   │       └── TTSServiceWrapper.ts
│   │
│   ├── utils/                    # 🔧 工具函数
│   │   ├── cardUtils.ts          # 卡牌工具
│   │   ├── gameRules.ts          # 游戏规则
│   │   └── teamManager.ts        # 团队管理
│   │
│   └── types/                    # 📝 类型定义
│       └── card.ts               # 卡牌类型
│
├── vue-mobile/                   # 📱 Vue移动端
│   ├── src/
│   │   ├── components/           # Vue组件
│   │   │   ├── HandCards.vue
│   │   │   ├── CardView.vue
│   │   │   ├── PlayArea.vue
│   │   │   ├── PlayerInfo.vue
│   │   │   ├── ActionButtons.vue
│   │   │   └── GameBoard.vue
│   │   ├── stores/               # Pinia Store
│   │   │   └── gameStore.ts
│   │   └── styles/               # 样式
│   │       └── mobile-adaptive.css
│   └── package.json
│
├── tests/                        # 🧪 测试
│   ├── unit/                     # 单元测试
│   │   ├── async/                # 异步管理测试
│   │   ├── state/                # 状态管理测试
│   │   ├── round/                # Round测试
│   │   ├── scheduler/            # 调度测试
│   │   ├── modules/              # 模块测试
│   │   └── services/             # 服务测试
│   ├── integration/              # 集成测试
│   ├── regression/               # 回归测试
│   └── e2e/                      # E2E测试
│
├── docs/                         # 📚 文档
│   ├── migration/                # 迁移文档
│   ├── API_REFERENCE.md          # API文档
│   ├── DEPLOYMENT_GUIDE.md       # 部署指南
│   ├── PRODUCTION_CHECKLIST.md   # 生产清单
│   ├── OPTIMIZATION_GUIDE.md     # 优化指南
│   └── DEVELOPER_GUIDE.md        # 本文件
│
├── scripts/                      # 🔧 脚本
│   └── performance-monitor.ts    # 性能监控
│
├── .github/workflows/            # ⚙️ GitHub Actions
│   ├── ci.yml                    # CI工作流
│   └── deploy.yml                # 部署工作流
│
├── README.md                     # 主README
├── QUICK_START.md                # 快速开始
├── CHANGELOG.md                  # 更新日志
├── CONTRIBUTING.md               # 贡献指南
└── package.json                  # 依赖配置
```

---

## 🎯 核心概念

### 1. 单一数据源 (Single Source of Truth)

**原则:** GameState是唯一的状态来源

```typescript
// ✅ 好 - 从GameState读取
const currentPlayer = gameState.players[gameState.currentPlayerIndex];

// ❌ 差 - 维护多个状态副本
let currentPlayerCache = player; // 容易不一致
```

### 2. 单向数据流 (Unidirectional Data Flow)

**原则:** 数据只能从上往下流动

```
用户操作 → Action → StateManager → 
新GameState → 模块处理 → 新State → UI更新
```

```typescript
// ✅ 好 - 单向流动
await stateManager.executeAction({
  type: 'PLAY_CARDS',
  payload: { cards }
});

// ❌ 差 - 双向绑定
gameState.players[0].hand = newHand; // 直接修改
```

### 3. 不可变状态 (Immutable State)

**原则:** 状态更新返回新对象，不修改原对象

```typescript
// ✅ 好 - 返回新状态
updatePlayer(index: number, updates: Partial<Player>): GameState {
  const newPlayers = [...this.players];
  newPlayers[index] = { ...this.players[index], ...updates };
  return new GameState({ ...this, players: newPlayers });
}

// ❌ 差 - 修改原状态
updatePlayer(index: number, updates: Partial<Player>): void {
  this.players[index] = { ...this.players[index], ...updates };
}
```

### 4. 纯函数设计 (Pure Functions)

**原则:** 函数没有副作用，相同输入总是相同输出

```typescript
// ✅ 好 - 纯函数
function calculateScore(player: Player): number {
  return player.hand.reduce((sum, card) => sum + card.value, 0);
}

// ❌ 差 - 有副作用
function calculateScore(player: Player): number {
  player.lastCalculatedScore = score; // 修改输入
  return score;
}
```

---

## 🔄 开发工作流

### 标准工作流

```bash
# 1. 创建特性分支
git checkout -b feature/your-feature

# 2. 开发 + TDD
# 先写测试
npm test -- --watch tests/unit/your-module.test.ts

# 再写实现
# 编辑 src/game-engine/modules/YourModule.ts

# 3. 运行测试
npm run test:new

# 4. Lint检查
npm run lint

# 5. 提交
git add .
git commit -m "feat(module): add your feature"

# 6. 推送并创建PR
git push origin feature/your-feature
```

### TDD工作流

```typescript
// 1. 写失败的测试
describe('YourModule', () => {
  it('should do something', () => {
    const result = YourModule.doSomething(input);
    expect(result).toBe(expected);
  });
});

// 2. 运行测试 - 应该失败
npm test YourModule.test.ts

// 3. 写最简实现让测试通过
export class YourModule {
  static doSomething(input) {
    return expected; // 最简实现
  }
}

// 4. 运行测试 - 应该通过
npm test YourModule.test.ts

// 5. 重构代码
// 改进实现，保持测试通过
```

---

## 📝 常见任务

### 任务1: 添加新的业务模块

```typescript
// 1. 创建模块文件
// src/game-engine/modules/NewModule.ts

export class NewModule {
  /**
   * 纯函数 - 无副作用
   */
  static processData(
    state: GameState,
    input: any
  ): GameState {
    // 处理逻辑
    return state.updateSomething(result);
  }
}

// 2. 创建测试文件
// tests/unit/modules/NewModule.test.ts

describe('NewModule', () => {
  describe('processData', () => {
    it('should process data correctly', () => {
      const state = createTestState();
      const result = NewModule.processData(state, input);
      expect(result).toBeDefined();
    });
  });
});

// 3. 在index.ts中导出
export { NewModule } from './modules/NewModule';
```

### 任务2: 添加新的Vue组件

```vue
<!-- vue-mobile/src/components/NewComponent.vue -->
<template>
  <div class="new-component">
    <van-cell :title="title" :value="value" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { Cell } from 'vant';

interface Props {
  title: string;
}

const props = defineProps<Props>();
const gameStore = useGameStore();

const value = computed(() => {
  // 从store计算值
  return gameStore.someValue;
});
</script>

<style scoped>
.new-component {
  padding: 16px;
}
</style>
```

### 任务3: 添加新的Action

```typescript
// 1. 在StateManager中注册handler
stateManager.registerHandler('NEW_ACTION', (state, payload) => {
  // 处理逻辑
  return state.updateSomething(payload);
});

// 2. 在组件中使用
await stateManager.executeAction({
  type: 'NEW_ACTION',
  payload: { data: 'value' }
});

// 3. 添加测试
it('should handle NEW_ACTION', async () => {
  await stateManager.executeAction({
    type: 'NEW_ACTION',
    payload: {}
  });
  
  const state = stateManager.getState();
  expect(state.something).toBeDefined();
});
```

---

## 🐛 调试技巧

### 1. 状态调试

```typescript
// 启用状态监听
stateManager.on('stateChanged', ({ oldState, newState, action }) => {
  console.log('Action:', action.type);
  console.log('Old State:', oldState);
  console.log('New State:', newState);
});

// 查看状态历史
const stats = stateManager.getStats();
console.log('Total actions:', stats.actionCount);

// 撤销到之前的状态
if (stateManager.canUndo()) {
  stateManager.undo();
}
```

### 2. 异步任务调试

```typescript
// 启用任务监控
const asyncManager = new AsyncTaskManager({
  enableMetrics: true,
  maxHistorySize: 100
});

// 执行任务
const result = await asyncManager.execute(taskFn, config);

// 查看指标
const metrics = asyncManager.getMetrics();
console.log('Avg duration:', metrics.avgDuration);
console.log('Success rate:', metrics.successRate);

// 查看历史
const history = asyncManager.getTaskHistory();
console.log('Last 10 tasks:', history.slice(-10));
```

### 3. 性能调试

```typescript
// 使用性能监控脚本
import { PerformanceMonitor } from '../scripts/performance-monitor';

const monitor = new PerformanceMonitor();

// 记录操作耗时
const start = performance.now();
doSomething();
const end = performance.now();

monitor.record('operation-name', end - start);

// 生成报告
monitor.printReport();
```

### 4. Vue组件调试

```vue
<script setup lang="ts">
import { watch } from 'vue';
import { useGameStore } from '@/stores/gameStore';

const gameStore = useGameStore();

// 监听状态变化
watch(
  () => gameStore.status,
  (newStatus, oldStatus) => {
    console.log('Status changed:', oldStatus, '->', newStatus);
  }
);

// 调试计算属性
const debugValue = computed(() => {
  const value = someComputation();
  console.log('Computed:', value);
  return value;
});
</script>
```

---

## 💡 最佳实践

### 代码组织

#### ✅ 好的模块结构

```typescript
// YourModule.ts
/**
 * YourModule - 简短描述
 * 
 * 职责：
 * - 职责1
 * - 职责2
 */

import { GameState } from '../state/GameState';

export class YourModule {
  /**
   * 函数说明
   * 
   * @param state - 游戏状态
   * @param input - 输入参数
   * @returns 新的状态
   */
  static processData(
    state: GameState,
    input: Input
  ): GameState {
    // 1. 验证输入
    if (!isValid(input)) {
      throw new Error('Invalid input');
    }
    
    // 2. 处理逻辑
    const result = process(input);
    
    // 3. 更新状态
    return state.updateSomething(result);
  }
}
```

#### ❌ 避免的做法

```typescript
// ❌ 职责不清
export class MessyModule {
  private state: any; // 持有状态
  
  doEverything() {
    // 做太多事情
    this.updateState();
    this.callAPI();
    this.updateUI();
  }
}

// ❌ 副作用
export function impureFunction(input) {
  globalState.value = input; // 修改全局状态
  return input * 2;
}
```

### 状态管理

#### ✅ 正确的状态更新

```typescript
// 通过StateManager
await stateManager.executeAction({
  type: 'UPDATE_PLAYER',
  payload: { index: 0, score: 100 }
});

// 或通过GameState方法
const newState = state.updatePlayer(0, { score: 100 });
```

#### ❌ 错误的状态修改

```typescript
// ❌ 直接修改
state.players[0].score = 100;

// ❌ 绕过管理器
gameState._players[0] = newPlayer;
```

### 测试编写

#### ✅ 好的测试

```typescript
describe('ScoreModule', () => {
  describe('calculateScore', () => {
    it('should calculate score correctly', () => {
      // Arrange
      const player = createTestPlayer();
      
      // Act
      const score = ScoreModule.calculateScore(player);
      
      // Assert
      expect(score).toBe(100);
    });
    
    it('should handle empty hand', () => {
      const player = { ...testPlayer, hand: [] };
      const score = ScoreModule.calculateScore(player);
      expect(score).toBe(0);
    });
    
    it('should throw on invalid player', () => {
      expect(() => {
        ScoreModule.calculateScore(null);
      }).toThrow();
    });
  });
});
```

#### ❌ 差的测试

```typescript
// ❌ 测试名称不清晰
it('test 1', () => {});

// ❌ 测试多个功能
it('should do everything', () => {
  doThing1();
  doThing2();
  doThing3();
});

// ❌ 没有断言
it('should work', () => {
  doSomething();
  // 没有expect
});
```

---

## 🔧 常用命令

### 开发

```bash
# 启动开发服务器
npm run dev

# 启动Vue移动端
cd vue-mobile && npm run dev

# 监听测试
npm test -- --watch

# Lint修复
npm run lint:fix
```

### 测试

```bash
# 新架构测试（快速）
npm run test:new

# 单元测试
npm run test:unit

# E2E测试
npm run test:e2e

# 覆盖率
npm run test:coverage

# 特定文件
npm test tests/unit/state/GameState.test.ts
```

### 构建

```bash
# 构建主项目
npm run build

# 构建Vue移动端
cd vue-mobile && npm run build

# 预览构建结果
npm run preview
```

### Git

```bash
# 创建分支
git checkout -b feature/your-feature

# 查看状态
git status

# 提交
git add .
git commit -m "feat: your feature"

# 推送
git push origin feature/your-feature
```

---

## 📚 学习资源

### 官方文档

- [Vue 3文档](https://vuejs.org/)
- [Vant文档](https://vant-ui.github.io/)
- [Pinia文档](https://pinia.vuejs.org/)
- [Vitest文档](https://vitest.dev/)
- [TypeScript文档](https://www.typescriptlang.org/)

### 项目文档

- [架构设计](migration/MIGRATION_ARCHITECTURE.md)
- [测试策略](migration/TESTING_STRATEGY.md)
- [API参考](API_REFERENCE.md)
- [快速参考](migration/QUICK_REFERENCE.md)

### 推荐阅读

- 《Clean Code》 - Robert C. Martin
- 《Refactoring》 - Martin Fowler
- 《Design Patterns》 - Gang of Four

---

## 🎯 进阶指南

### 成为核心贡献者

1. **深入理解架构** (1个月)
   - 阅读所有技术文档
   - 研究核心模块实现
   - 参与代码审查

2. **主导功能开发** (2个月)
   - 独立开发新功能
   - 编写完整测试
   - 撰写技术文档

3. **优化与重构** (3个月)
   - 性能优化
   - 代码重构
   - 架构改进

---

## 💬 获取帮助

### 遇到问题？

1. **查看文档** - docs/ 目录
2. **搜索Issues** - 可能已有答案
3. **运行测试** - 找到失败原因
4. **查看日志** - 错误信息
5. **提问题** - GitHub Issues

### 联系方式

- **GitHub Issues** - 技术问题
- **GitHub Discussions** - 功能讨论
- **Email** - your-email@example.com

---

## 🎉 欢迎

欢迎来到锅炸扑克v2.0开发团队！

这是一个高质量、高性能、易维护的项目。
我们期待你的贡献！

**Happy Coding!** 🚀

---

**文档版本:** v1.0  
**最后更新:** 2024-12-05  
**维护者:** Dev Team


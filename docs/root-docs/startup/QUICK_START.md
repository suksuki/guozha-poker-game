# 🚀 快速开始指南

5分钟上手新架构！

---

## 📦 安装

```bash
# 克隆项目
git clone https://github.com/your-username/guozha-poker-game.git
cd guozha-poker-game

# 安装依赖
npm install

# 安装Vue移动端依赖
cd vue-mobile && npm install && cd ..
```

---

## ✅ 运行测试

```bash
# 运行新架构测试（快速）
npm test tests/unit/async/ tests/unit/state/ tests/unit/round/ tests/unit/scheduler/ tests/unit/modules/

# 运行所有测试（需时17分钟）
npm test
```

---

## 🎮 使用新架构

### 1. 创建游戏状态

```typescript
import { GameState } from './src/game-engine';

const config = {
  playerCount: 4,
  humanPlayerIndex: 0,
  teamMode: false
};

const gameState = new GameState(config);
```

### 2. 初始化玩家

```typescript
import { PlayerType } from './src/types/card';

const players = [0, 1, 2, 3].map(id => ({
  id,
  name: `玩家${id}`,
  type: id === 0 ? PlayerType.HUMAN : PlayerType.AI,
  hand: [],
  score: 0,
  isHuman: id === 0,
  finishedRank: null,
  dunCount: 0
}));

let state = gameState.initializePlayers(players);
```

### 3. 发牌

```typescript
import { DealingModule, dealCards } from './src/game-engine';

const hands = dealCards(4);
state = DealingModule.assignHandsToPlayers(state, hands);
```

### 4. 开始游戏

```typescript
import { GameFlowModule } from './src/game-engine';

state = GameFlowModule.startGame(state);
console.log('游戏状态:', state.status); // 'PLAYING'
```

### 5. 处理回合

```typescript
import { RoundModule, RoundData } from './src/game-engine';

// 创建新回合
const round = new RoundData(1);

// 处理出牌
const play = {
  cards: [state.players[0].hand[0]],
  type: PlayType.SINGLE,
  value: state.players[0].hand[0].value
};

const result = RoundModule.processPlay(round, 0, play);
console.log('出牌结果:', result.isValid);
```

---

## 📱 使用Vue移动端

### 1. 启动开发服务器

```bash
cd vue-mobile
npm run dev
```

访问: `http://localhost:8080`

### 2. 在组件中使用

```vue
<template>
  <div>
    <GameBoard />
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore';
import GameBoard from '@/components/GameBoard.vue';

const gameStore = useGameStore();

// 开始游戏
const startGame = async () => {
  await gameStore.startGame();
};

// 出牌
const playCards = async (cards) => {
  await gameStore.playCards(cards);
};
</script>
```

---

## ⚡ 使用异步管理

### AsyncTaskManager

```typescript
import { AsyncTaskManager } from './src/central-brain/infrastructure/async';

const asyncManager = new AsyncTaskManager({
  enableMetrics: true
});

// 执行异步任务
const result = await asyncManager.execute(
  async () => {
    // 你的异步任务
    return await fetchData();
  },
  {
    timeout: 5000,      // 5秒超时
    retryCount: 3,      // 重试3次
    retryDelay: 1000,   // 延迟1秒
    fallback: async () => defaultValue
  }
);

if (result.success) {
  console.log('成功:', result.data);
} else {
  console.error('失败:', result.error);
}
```

### ServiceHealthChecker

```typescript
import { ServiceHealthChecker } from './src/central-brain/infrastructure/async';

const healthChecker = new ServiceHealthChecker();

// 注册服务
healthChecker.registerService(
  'my-service',
  async () => {
    const response = await fetch('http://api/health');
    return response.ok;
  },
  30000 // 每30秒检查
);

// 获取状态
const status = healthChecker.getServiceStatus('my-service');
// 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE'
```

---

## 🎯 常用API

### 状态管理

```typescript
import { StateManager } from './src/game-engine';

const stateManager = new StateManager(config);

// 获取状态
const state = stateManager.getState();

// 执行动作
await stateManager.executeAction({
  type: 'INIT_GAME',
  payload: { players }
});

// 撤销/重做
if (stateManager.canUndo()) {
  stateManager.undo();
}

if (stateManager.canRedo()) {
  stateManager.redo();
}

// 获取统计
const stats = stateManager.getStats();
console.log('动作数:', stats.actionCount);
```

### 分数计算

```typescript
import { ScoreModule } from './src/game-engine';

// 分配回合分数
const scores = ScoreModule.allocateRoundScore(100, 0, 4);

// 计算玩家总分
const totalScore = ScoreModule.calculatePlayerTotalScore(0, rounds);

// 更新玩家分数
state = ScoreModule.updatePlayerScore(state, 0, 50);
```

---

## 📖 文档导航

### 必读文档
1. **README_MIGRATION.md** - 项目概览
2. **QUICK_START.md** - 快速开始（本文件）
3. **docs/migration/QUICK_REFERENCE.md** - 快速参考
4. **docs/API_REFERENCE.md** - API文档

### 深入学习
5. **docs/migration/MIGRATION_ARCHITECTURE.md** - 架构详解
6. **docs/migration/TESTING_STRATEGY.md** - 测试策略
7. **CHANGELOG.md** - 更新日志
8. **CONTRIBUTING.md** - 贡献指南

### 部署运维
9. **docs/DEPLOYMENT_GUIDE.md** - 部署指南
10. **PROJECT_STATUS.md** - 项目状态

### 测试报告
11. **docs/migration/FINAL_TEST_REPORT.md** - 最终测试报告
12. **docs/migration/COMPLETE_TEST_SUMMARY.md** - 完整测试总结

---

## 🧪 测试命令

```bash
# 快速测试（新架构）
npm test tests/unit/async/ tests/unit/state/ tests/unit/modules/

# 回归测试
npm test tests/regression/

# E2E测试
npm test tests/e2e/

# 性能测试
npm test tests/e2e/performance-benchmark.test.ts

# 覆盖率
npm run test:coverage
```

---

## 🛠️ 开发命令

```bash
# 开发模式（旧React版本）
npm run dev

# 开发模式（新Vue版本）
cd vue-mobile && npm run dev

# 构建
npm run build

# 启动Piper TTS
./start-app-and-piper.sh

# Linter
npm run lint
```

---

## 💡 常见问题

### Q: 新旧系统如何共存？

A: 当前两套系统并存：
- 旧系统: `src/utils/Game.ts`, `src/components/` (React)
- 新系统: `src/game-engine/`, `vue-mobile/` (Vue)

可以通过导入路径区分。

### Q: 如何迁移到新架构？

A: 参考文档：
1. `docs/migration/MIGRATION_ARCHITECTURE.md` - 了解架构
2. `docs/API_REFERENCE.md` - 学习API
3. `QUICK_START.md` - 快速上手

### Q: 测试怎么运行这么慢？

A: 因为包含旧系统的1290个测试。只运行新架构测试：
```bash
npm test tests/unit/async/ tests/unit/state/ tests/unit/modules/
```

### Q: Vue应用如何连接到GameEngine？

A: 通过Pinia Store：
```typescript
// vue-mobile/src/stores/gameStore.ts
import { GameState, StateManager } from '../../../src/game-engine';
```

---

## 🎯 下一步

### 学习路径

1. **阅读架构文档** (15分钟)
   - `docs/migration/MIGRATION_ARCHITECTURE.md`

2. **查看API文档** (20分钟)
   - `docs/API_REFERENCE.md`

3. **运行测试** (5分钟)
   - `npm test tests/unit/state/`

4. **尝试示例** (30分钟)
   - 创建GameState
   - 初始化玩家
   - 发牌并开始游戏

5. **开发Vue应用** (1小时)
   - `cd vue-mobile && npm run dev`
   - 修改组件
   - 查看效果

### 推荐资源

- [Vue 3文档](https://vuejs.org/)
- [Vant文档](https://vant-ui.github.io/)
- [Pinia文档](https://pinia.vuejs.org/)
- [Vitest文档](https://vitest.dev/)

---

## 📞 获取帮助

- **GitHub Issues** - 报告问题
- **GitHub Discussions** - 讨论想法
- **文档** - 查看docs目录

---

**开始你的新架构之旅吧！** 🚀

**文档版本:** v1.0  
**最后更新:** 2024-12-05


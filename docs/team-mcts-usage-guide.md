# 团队MCTS使用指南

## 📖 概述

团队MCTS是针对团队作战模式设计的蒙特卡洛树搜索算法，支持**主动要不起**策略和**团队配合**优化。

---

## 🚀 快速开始

### 1. 基本使用

```typescript
import { teamMCTS } from '../ai/mcts/teamMCTS';
import { TeamConfig } from '../types/team';
import { MCTSTeamConfig, TeamSimulatedGameState } from '../ai/types';

// 1. 配置团队信息
const teamConfig: TeamConfig = {
  enabled: true,
  mode: 'fixed_2v2',
  teams: [
    { id: 0, name: '团队A', players: [0, 2], score: 0 },
    { id: 1, name: '团队B', players: [1, 3], score: 0 }
  ]
};

// 2. 配置MCTS参数
const config: MCTSTeamConfig = {
  teamMode: true,
  teamConfig,
  strategicPassEnabled: true,      // 启用主动要不起
  teamScoreWeight: 2.0,            // 团队得分权重
  cooperationWeight: 1.0,          // 团队配合权重
  strategicPassWeight: 1.0,        // 主动要不起权重
  bigCardPreservationBonus: 30,   // 保留大牌奖励
  teammateSupportBonus: 50,        // 支持队友奖励
  longTermStrategyWeight: 0.5,    // 长期策略权重
  iterations: 100,                 // MCTS迭代次数
  explorationConstant: 1.414       // UCT探索常数
};

// 3. 构建游戏状态
const state: TeamSimulatedGameState = {
  // ... 游戏状态字段
  teamConfig,
  teamScores: new Map([[0, 0], [1, 0]]),
  playerTeams: new Map([[0, 0], [1, 1], [2, 0], [3, 1]]),
  canPass: true,
  roundContext: {
    roundNumber: 1,
    roundScore: 15,  // 当前轮次分数
    expectedTeamBenefit: 0,
    strategicPassOpportunity: true
  }
  // ... 其他字段
};

// 4. 执行团队MCTS决策
const action = teamMCTS(hand, state, config);

if (action) {
  if (action.type === 'play') {
    console.log(`AI决定出${action.cards.length}张牌`);
  } else if (action.type === 'pass' && action.strategic) {
    console.log('AI决定主动要不起（让队友出牌）');
  }
}
```

---

## 🎯 高级功能

### 生成多个候选建议

```typescript
import { teamMCTSChooseMultiplePlays } from '../ai/mcts/teamMCTS';

// 生成前3个最佳动作
const suggestions = teamMCTSChooseMultiplePlays(
  hand, 
  state, 
  config, 
  3  // 返回前3个建议
);

suggestions.forEach((suggestion, index) => {
  console.log(`建议${index + 1}:`, suggestion.explanation);
  console.log(`  得分: ${suggestion.score.toFixed(2)}`);
  console.log(`  动作类型: ${suggestion.action.type}`);
});

// 输出示例：
// 建议1: 出2张牌，预期团队得分25.3，胜率68.5%
//   得分: 84.23
//   动作类型: play
// 建议2: 主动要不起，让队友出牌，预期团队收益18.7
//   得分: 72.15
//   动作类型: pass
```

---

## 🏋️ 训练和调优

### 快速测试配置

```typescript
import { quickTestTeamConfig } from '../utils/teamMCTSTraining';

const config: MCTSTeamConfig = {
  teamMode: true,
  strategicPassEnabled: true,
  teamScoreWeight: 2.0,
  cooperationWeight: 1.0,
  strategicPassWeight: 1.0,
  bigCardPreservationBonus: 30,
  teammateSupportBonus: 50,
  longTermStrategyWeight: 0.5,
  iterations: 100
};

// 快速测试10局游戏
const result = quickTestTeamConfig(config, 10, 4);

console.log(`团队胜率: ${(result.teamWinRate * 100).toFixed(1)}%`);
console.log(`平均团队得分: ${result.avgTeamScore.toFixed(1)}`);
console.log(`主动要不起成功率: ${(result.strategicPassSuccessRate * 100).toFixed(1)}%`);
console.log(`平均回合数: ${result.avgTurns.toFixed(1)}`);
```

### 批量训练多个配置

```typescript
import { trainTeamMCTS } from '../utils/teamMCTSTraining';

const teamConfig: TeamConfig = {
  enabled: true,
  mode: 'fixed_2v2',
  teams: [
    { id: 0, name: '团队A', players: [0, 2], score: 0 },
    { id: 1, name: '团队B', players: [1, 3], score: 0 }
  ]
};

// 定义多个候选配置
const configs: MCTSTeamConfig[] = [
  {
    teamMode: true,
    teamConfig,
    strategicPassEnabled: true,
    teamScoreWeight: 2.0,
    cooperationWeight: 1.0,
    strategicPassWeight: 1.0,
    bigCardPreservationBonus: 30,
    teammateSupportBonus: 50,
    longTermStrategyWeight: 0.5,
    iterations: 100
  },
  {
    teamMode: true,
    teamConfig,
    strategicPassEnabled: true,
    teamScoreWeight: 2.5,  // 更高的团队得分权重
    cooperationWeight: 1.5, // 更高的配合权重
    strategicPassWeight: 1.0,
    bigCardPreservationBonus: 30,
    teammateSupportBonus: 50,
    longTermStrategyWeight: 0.5,
    iterations: 100
  },
  // 添加更多配置...
];

// 训练：每个配置运行50局游戏
const results = await trainTeamMCTS(
  configs, 
  50,  // 每个配置50局
  4,   // 4人游戏
  teamConfig,
  (progress, current, total) => {
    console.log(`训练进度: ${(progress * 100).toFixed(1)}% (${current}/${total})`);
  }
);

// 结果已按综合得分排序，第一个是最优配置
const bestConfig = results[0];
console.log('最优配置:', bestConfig.config);
console.log(`团队胜率: ${(bestConfig.teamWinRate * 100).toFixed(1)}%`);
console.log(`平均团队得分: ${bestConfig.avgTeamScore.toFixed(1)}`);
```

---

## 🔧 参数调优指南

### 权重参数说明

| 参数 | 默认值 | 说明 | 调优建议 |
|------|--------|------|----------|
| `teamScoreWeight` | 2.0 | 团队得分权重 | 提高此值强调团队得分，降低强调个人策略 |
| `cooperationWeight` | 1.0 | 团队配合权重 | 提高此值鼓励更多配合行为 |
| `strategicPassWeight` | 1.0 | 主动要不起权重 | 提高此值鼓励更多主动要不起 |
| `bigCardPreservationBonus` | 30 | 保留大牌奖励 | 影响主动要不起时保留大牌的价值 |
| `teammateSupportBonus` | 50 | 支持队友奖励 | 影响让队友出牌的价值 |
| `longTermStrategyWeight` | 0.5 | 长期策略权重 | 提高此值强调长期收益 |

### 场景化调优

#### 进攻型配置（激进）
```typescript
{
  teamScoreWeight: 2.5,           // 更注重得分
  cooperationWeight: 0.8,         // 降低配合
  strategicPassWeight: 0.6,       // 减少主动要不起
  bigCardPreservationBonus: 20,  // 降低保留大牌价值
  teammateSupportBonus: 30,
  longTermStrategyWeight: 0.3,   // 降低长期考虑
  iterations: 100
}
```

#### 防守型配置（保守）
```typescript
{
  teamScoreWeight: 1.5,           // 降低得分权重
  cooperationWeight: 1.5,         // 提高配合
  strategicPassWeight: 1.5,       // 更多主动要不起
  bigCardPreservationBonus: 40,  // 提高保留大牌价值
  teammateSupportBonus: 60,
  longTermStrategyWeight: 0.8,   // 更注重长期
  iterations: 100
}
```

#### 平衡型配置（推荐）
```typescript
{
  teamScoreWeight: 2.0,
  cooperationWeight: 1.0,
  strategicPassWeight: 1.0,
  bigCardPreservationBonus: 30,
  teammateSupportBonus: 50,
  longTermStrategyWeight: 0.5,
  iterations: 100
}
```

---

## 📊 性能优化

### 调整迭代次数

```typescript
// 快速模式（适合实时游戏）
config.iterations = 50;  // ~1-2秒

// 标准模式（推荐）
config.iterations = 100;  // ~2-3秒

// 深度思考模式（适合训练）
config.iterations = 200;  // ~4-6秒
```

### 使用完全信息模式（作弊模式，仅用于测试）

```typescript
config.perfectInformation = true;
config.allPlayerHands = [hand0, hand1, hand2, hand3];
```

---

## 🧪 测试

### 运行集成测试

```bash
# 运行所有团队MCTS测试
npm test tests/teamMCTS.test.ts

# 运行特定测试
npm test tests/teamMCTS.test.ts -t "应该能做出团队决策"
```

### 自定义测试场景

```typescript
import { runTeamGame } from '../utils/teamMCTSTraining';

// 自定义测试场景
const result = runTeamGame(config, 4, teamConfig);

console.log('获胜团队:', result.winningTeam);
console.log('最终得分:', result.finalTeamScores);
console.log('主动要不起次数:', result.strategicPassEvents.length);
console.log('团队配合事件:', result.cooperationEvents.length);
```

---

## 💡 最佳实践

### 1. 根据游戏阶段调整策略

```typescript
// 游戏早期：保守策略
if (roundNumber <= 3) {
  config.longTermStrategyWeight = 0.8;
  config.bigCardPreservationBonus = 40;
}

// 游戏中期：平衡策略
if (roundNumber > 3 && roundNumber <= 7) {
  config.teamScoreWeight = 2.0;
  config.cooperationWeight = 1.0;
}

// 游戏后期：激进策略
if (roundNumber > 7) {
  config.teamScoreWeight = 2.5;
  config.strategicPassWeight = 0.6;
}
```

### 2. 根据团队分数差距调整

```typescript
const scoreDiff = myTeamScore - opponentTeamScore;

if (scoreDiff > 50) {
  // 领先很多，采用防守策略
  config.strategicPassWeight = 1.5;
  config.longTermStrategyWeight = 0.8;
} else if (scoreDiff < -50) {
  // 落后很多，采用激进策略
  config.teamScoreWeight = 2.5;
  config.strategicPassWeight = 0.6;
}
```

### 3. 监控和日志

```typescript
// 启用详细日志（设置较高的迭代次数）
config.iterations = 100;

// MCTS会自动打印前3个候选动作
const action = teamMCTS(hand, state, config);

// 输出示例：
// Top 3 team actions:
//   1. 出牌 2张 - 得分:84.2, 访问:45, 胜率:68.5%, 平均分:25.3
//   2. 要不起 (主动) - 得分:72.1, 访问:38, 胜率:55.2%, 平均分:18.7
//   3. 出牌 1张 - 得分:65.8, 访问:17, 胜率:52.1%, 平均分:15.2
```

---

## 🐛 故障排查

### 问题1：MCTS返回null

**原因**：没有可用动作

**解决**：
```typescript
if (!action) {
  console.log('无可用动作，应该被动要不起');
  // 处理被动要不起逻辑
}
```

### 问题2：决策时间过长

**原因**：迭代次数过高

**解决**：
```typescript
// 降低迭代次数
config.iterations = 50;  // 从100降到50

// 或设置超时保护（已内置3秒超时）
```

### 问题3：主动要不起使用不合理

**原因**：权重配置不当

**解决**：
```typescript
// 调整相关权重
config.strategicPassWeight = 1.2;  // 提高主动要不起权重
config.teammateSupportBonus = 60;  // 提高支持队友奖励
```

---

## 📚 相关文档

- [MCTS团队重构设计](./team-cooperation-mcts-training-redesign.md)
- [MCTS团队重构进度](./mcts-team-refactor-progress.md)
- [团队作战系统设计](../review/team-scoring-and-chat-redesign.md)

---

**最后更新**：2025-12-03


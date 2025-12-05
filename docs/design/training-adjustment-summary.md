# MCTS训练系统调整 - 快速总结

## 🎯 核心问题

现有训练系统只支持**个人竞争模式**，需要调整为**团队合作模式**并支持**主动要不起**。

---

## ❌ 现有系统的问题

### 1. 只评估个人，不评估团队

```typescript
// 现有：只返回个人结果
return { 
  winner: number;      // 个人获胜者
  aiScore: number;     // AI个人得分
};

// 现有：只统计个人指标
let aiWins = 0;        // AI个人获胜
let totalScore = 0;    // AI个人得分
const winRate = aiWins / games;  // 个人胜率
```

### 2. 不支持主动要不起

```typescript
// 现有：只能被动要不起（没有能打过的牌）
if (!aiPlay || aiPlay.length === 0) {
  // 要不起
}
```

### 3. 不考虑团队配合

- ❌ 不分配分数到团队
- ❌ 不考虑队友情况
- ❌ 不评估团队配合效果

---

## ✅ 调整方案

### 1. 游戏结果改为团队结果

```typescript
// 新：返回团队结果
interface TeamGameResult {
  winningTeam: number;              // 获胜团队
  finalTeamScores: Map<number, number>;  // 团队得分
  strategicPassEvents: StrategicPassEvent[];  // 主动要不起事件
  cooperationEvents: CooperationEvent[];      // 团队配合事件
}
```

### 2. 训练指标改为团队指标

```typescript
// 新：统计团队指标
let teamWins = 0;                    // 团队获胜次数
let totalTeamScore = 0;              // 团队总得分
let strategicPassCount = 0;          // 主动要不起次数
let strategicPassSuccess = 0;        // 主动要不起成功次数
let cooperationScore = 0;            // 团队配合得分

const teamWinRate = teamWins / games;
const avgTeamScore = totalTeamScore / games;
const strategicPassSuccessRate = strategicPassSuccess / strategicPassCount;
```

### 3. 支持主动要不起

```typescript
// 新：生成动作时包含主动要不起
function generateTeamActions(...): TeamAction[] {
  const actions: TeamAction[] = [];
  
  // 1. 所有可出牌动作
  actions.push(...playableCards.map(cards => ({ type: 'play', cards })));
  
  // 2. 主动要不起（即使能打过）
  if (config.strategicPassEnabled && state.canPass) {
    actions.push({ type: 'pass', strategic: true });
  }
  
  return actions;
}
```

### 4. 评估函数改为团队评估

```typescript
// 新：综合评估团队配置
function evaluateTeamConfig(result: TeamGameResult): number {
  return 
    + result.teamWinRate * 0.4              // 团队胜率（40%）
    + normalizedTeamScore * 0.3             // 团队得分（30%）
    + result.strategicPassSuccessRate * 0.15 // 主动要不起成功率（15%）
    + normalizedCooperation * 0.1            // 团队配合（10%）
    + efficiency * 0.05;                     // 效率（5%）
}
```

---

## 📋 需要修改的文件

### 1. `src/utils/mctsTuning.ts` ⚠️ **核心**

- ✅ `GameResult` → `TeamGameResult`
- ✅ `runSingleGame` → `runTeamGame`
- ✅ 统计改为团队指标

### 2. `src/components/game/TrainingRunner.tsx` ⚠️

- ✅ 使用 `runTeamGame`
- ✅ 显示团队指标

### 3. `src/utils/mctsAI.ts` ⚠️

- ✅ 支持团队模式和主动要不起

### 4. `src/components/game/TrainingConfigPanel.tsx` ⚠️

- ✅ 添加团队模式选项
- ✅ 添加主动要不起开关

---

## 🚀 实施步骤

1. **阶段1（1-2天）**：数据结构调整
2. **阶段2（3-5天）**：游戏模拟重构
3. **阶段3（2-3天）**：训练统计调整
4. **阶段4（2-3天）**：UI调整
5. **阶段5（2-3天）**：测试验证

---

## 📊 关键变化对比

| 项目 | 现有（个人模式） | 新（团队模式） |
|------|----------------|--------------|
| 游戏结果 | `{ winner, aiScore }` | `{ winningTeam, teamScores, strategicPassEvents }` |
| 训练指标 | 个人胜率、个人得分 | 团队胜率、团队得分、主动要不起成功率 |
| 动作空间 | 只有出牌 | 出牌 + 主动要不起 |
| 评估目标 | 个人得分最大化 | 团队得分 + 团队配合 |

---

## 💡 向后兼容

保留原有函数，添加新函数：

```typescript
// 保留原有
export function runSingleGame(...) { }

// 添加新的
export function runTeamGame(...) { }

// 统一入口
export function runGame(config) {
  return config.teamMode 
    ? runTeamGame(config) 
    : runSingleGame(config);
}
```

---

## 📚 相关文档

- 完整调整方案：`docs/design/mcts-training-adjustment-for-team-mode.md`
- 整体设计方案：`docs/design/team-cooperation-mcts-training-redesign.md`


# 策略模式重构：游戏模式架构优化

## 修复日期
2025-12-03

## 问题背景

### 原有问题
1. **判断逻辑不统一**：有的用 `config.teamMode`，有的用 `teamConfig !== null`
2. **逻辑分散**：团队/个人模式的 if-else 分支散落在各个文件中
3. **重复代码**：每个地方都要重复写判断逻辑
4. **职责不清**：GameController 也在判断游戏模式
5. **难以维护**：添加新模式（如 3v3）需要修改多个文件

### 触发问题
接风轮询时 `teamConfig` 变成 `null`，导致队友接风逻辑失效。

---

## 解决方案：策略模式 (Strategy Pattern)

### 核心思想

将团队模式和个人模式的差异逻辑封装到独立的策略类中，Game 类通过策略对象调用相应的逻辑。

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                      Game 类                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │   modeStrategy: IGameModeStrategy                 │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                │
│     调用策略方法：                                       │
│     - shouldGameEnd()                                   │
│     - calculateFinalScores()                            │
│     - findNextPlayerForNewRound()                       │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ↓                           ↓
┌──────────────────┐       ┌──────────────────┐
│ IndividualMode   │       │   TeamMode       │
│    Strategy      │       │   Strategy       │
├──────────────────┤       ├──────────────────┤
│ shouldGameEnd()  │       │ shouldGameEnd()  │
│ - 只剩1人有牌    │       │ - 关单/关双      │
│                  │       │                  │
│ calculateFinal   │       │ calculateFinal   │
│ Scores()         │       │ Scores()         │
│ - 个人排名规则   │       │ - 团队排名规则   │
│                  │       │ - 分数转移       │
│                  │       │                  │
│ findNextPlayer   │       │ findNextPlayer   │
│ ForNewRound()    │       │ ForNewRound()    │
│ - 顺时针下一个   │       │ - 队友优先       │
└──────────────────┘       └──────────────────┘
```

---

## 实现细节

### 1. 策略接口

**文件**: `src/utils/gameMode/IGameModeStrategy.ts`

```typescript
export interface IGameModeStrategy {
  getModeName(): string;
  
  shouldGameEnd(
    players: Player[],
    finishOrder: number[],
    teamConfig?: TeamConfig | null
  ): GameEndCheckResult;
  
  calculateFinalScores(
    players: Player[],
    finishOrder: number[],
    teamConfig?: TeamConfig | null
  ): FinalScoreResult;
  
  findNextPlayerForNewRound(
    winnerIndex: number | null,
    players: Player[],
    playerCount: number,
    teamConfig?: TeamConfig | null
  ): number | null;
  
  getResultScreenType(): 'team' | 'individual';
}
```

### 2. 个人模式策略

**文件**: `src/utils/gameMode/IndividualModeStrategy.ts`

- ✅ 游戏结束判断：只剩1人有牌
- ✅ 分数计算：使用 `applyFinalGameRules`
- ✅ 接风逻辑：简单顺时针
- ✅ 结果界面：`GameResultScreen`

### 3. 团队模式策略

**文件**: `src/utils/gameMode/TeamModeStrategy.ts`

- ✅ 游戏结束判断：某个团队全部出完（关单/关双）
- ✅ 分数计算：使用 `applyTeamFinalRules`，包含分数转移和清算
- ✅ 接风逻辑：**队友优先**
- ✅ 结果界面：`TeamResultScreen`

### 4. 工厂方法

**文件**: `src/utils/gameMode/GameModeFactory.ts`

```typescript
export function createGameModeStrategy(
  config: GameSetupConfig
): IGameModeStrategy {
  const isTeamMode = config.teamMode === true && 
                     (config.playerCount === 4 || config.playerCount === 6);
  
  return isTeamMode 
    ? new TeamModeStrategy() 
    : new IndividualModeStrategy();
}
```

---

## 修改的文件

### 核心文件

1. **`src/utils/gameMode/`** (新增)
   - `IGameModeStrategy.ts` - 策略接口
   - `IndividualModeStrategy.ts` - 个人模式实现
   - `TeamModeStrategy.ts` - 团队模式实现
   - `GameModeFactory.ts` - 工厂方法
   - `index.ts` - 导出

2. **`src/utils/Game.ts`** (重构)
   - 添加 `modeStrategy: IGameModeStrategy` 属性
   - 构造函数中创建策略：`this.modeStrategy = createGameModeStrategy(config)`
   - 重构 `findNextPlayerForNewRound()` 委托给策略
   - 添加 `shouldGameEnd()` 使用策略
   - 添加 `getModeStrategy()` getter
   - 简化游戏结束判断逻辑

3. **`src/utils/gameController.ts`** (重构)
   - 重构 `calculateFinalScoresAndRankings()` 使用策略
   - 保留旧方法作为兼容性备份

---

## 优点

### ✅ 统一的模式判断
- 只需在一个地方判断：`createGameModeStrategy(config)`
- 所有逻辑通过策略对象调用
- 不再有散落的 if-else 分支

### ✅ 清晰的职责分离
- `Game` 类：管理游戏状态
- 策略类：封装模式差异逻辑
- `GameController`：协调控制

### ✅ 易于扩展
- 添加新模式（如 3v3、自由组队）：
  1. 创建新策略类实现接口
  2. 在工厂方法中添加判断
  3. 完成！

### ✅ 易于测试
- 每个策略类可以独立测试
- Mock 策略对象测试 Game 类
- 单元测试覆盖率提升

### ✅ 避免了 teamConfig null 问题
- 策略在构造函数中创建，不会变成 null
- 即使 teamConfig 为 null，策略类也能正确处理（降级为个人模式）

---

## 调用流程对比

### 之前（分散的 if-else）

```typescript
// Game.ts
if (this.teamConfig) {
  // 团队模式逻辑
  for (const team of this.teamConfig.teams) {
    const teamAllFinished = team.players.every(...);
    if (teamAllFinished) {
      shouldEndGame = true;
      break;
    }
  }
} else {
  // 个人模式逻辑
  const remainingPlayers = this.players.filter(...);
  if (remainingPlayers.length === 1) {
    shouldEndGame = true;
  }
}

// GameController.ts
const isTeamMode = this.game.teamConfig !== null && ...;
if (isTeamMode) {
  // 团队模式计算
  const teamResult = applyTeamFinalRules(...);
} else {
  // 个人模式计算
  const result = applyFinalGameRules(...);
}

// ... 其他文件也有类似的 if-else
```

### 现在（策略模式）

```typescript
// Game.ts
const shouldEndGame = this.shouldGameEnd();
// 内部调用: this.modeStrategy.shouldGameEnd(...)

// GameController.ts
const result = this.game.getModeStrategy().calculateFinalScores(...);
// 策略自动选择团队或个人逻辑

// 统一、清晰、无重复！
```

---

## 向后兼容性

- ✅ 保留了旧方法（标记为 `@deprecated`）
- ✅ `teamConfig` 仍然存在，用于传递给策略
- ✅ 所有现有 API 保持不变
- ✅ UI 组件无需修改

---

## 测试建议

### 单元测试

1. **IndividualModeStrategy**
   - 测试游戏结束判断（1人剩余）
   - 测试分数计算
   - 测试接风逻辑

2. **TeamModeStrategy**
   - 测试游戏结束判断（关单/关双）
   - 测试分数计算和转移
   - 测试队友优先接风

3. **GameModeFactory**
   - 测试正确创建策略类型

### 集成测试

1. **个人模式游戏**
   - 完整游戏流程
   - 验证排名和分数

2. **团队模式游戏**
   - 完整游戏流程
   - 验证团队排名和分数
   - 验证队友接风

---

## 后续改进建议

1. **删除旧代码**：确认稳定后，删除标记为 `@deprecated` 的方法

2. **扩展策略**：
   - 添加 `3v3` 模式
   - 添加自由组队模式
   - 添加练习模式（无分数计算）

3. **优化日志**：
   - 策略类可以添加详细的调试日志
   - 方便追踪模式切换和逻辑执行

4. **性能优化**：
   - 策略对象可以考虑单例模式
   - 避免频繁创建策略实例

---

## 相关问题

本次重构同时解决了：
- ✅ 接风轮询时 `teamConfig` 为 null 的问题
- ✅ 团队分数不显示的问题
- ✅ 判断逻辑不统一的问题
- ✅ 代码维护困难的问题

---

## 总结

通过策略模式重构，我们：

1. **解决了眼前的 Bug**：接风轮询 teamConfig null 问题
2. **改善了代码架构**：清晰的职责分离，统一的模式判断
3. **提升了可维护性**：易于扩展、测试和理解
4. **保持了兼容性**：不破坏现有功能

这是一个典型的**架构优化 + Bug 修复**的案例，既解决了当前问题，又为未来扩展打下基础。


# 轮次调度器逻辑详解

## 📋 概述

本文档详细说明正常轮（Normal Round）和接风轮（Takeover Round）的调度逻辑，以及Round调度器的职责。

## 🎮 正常轮（Normal Round）

### 流程

1. **玩家出牌后**
   - `Game.playCards()` 完成 → 调用 `scheduler.onPlayCompleted()`
   
2. **Round调度器处理** (`onPlayCompleted`)
   - 如果当前在接风轮询中 → 结束接风轮询（玩家出牌了）
   - 计算下一个玩家：`findNextActivePlayer(currentPlayer, players, count)`
   - 更新状态（只更新 rounds）
   - 调用 `onNextTurnCallback(nextPlayerIndex)` → `Game.playNextTurn(nextPlayerIndex)`

3. **下一个玩家**
   - 如果是AI → 自动判定（要得起/要不起）→ 继续
   - 如果是真实玩家 → 等待操作

### Round调度器的职责（正常轮）

- ✅ 计算下一个玩家
- ✅ 更新状态（rounds）
- ✅ 调用 `onNextTurnCallback` 继续流程
- ❌ 不检查接风（接风在 `onPassCompleted` 中处理）
- ❌ 不检查轮次结束（轮次结束在 `onPassCompleted` 中处理）

## 🔄 接风轮（Takeover Round）

### 流程

1. **玩家要不起后**
   - `Game.passCards()` 完成 → 调用 `scheduler.onPassCompleted()`
   
2. **Round调度器开始接风轮询** (`onPassCompleted`)
   - **立即标记为接风轮**：`round.startTakeoverRound(passPlayerIndex, lastPlayPlayerIndex)`
   - 起点：刚要不起的玩家
   - 终点：出牌玩家（lastPlayPlayerIndex）
   - 遍历顺序：从起点按顺序到终点

3. **接风轮询遍历过程**
   - 通过 `onNextTurnCallback` 逐个轮询玩家
   - 每个玩家判断：
     - **要得起** → 出牌 → 结束接风轮询 → 继续正常流程
     - **要不起** → 继续接风轮询下一个玩家

4. **接风轮询完成**
   - 如果回到出牌玩家 → 接风轮询完成
   - 判断接风 → 本轮结束 → 出牌玩家最大 → 开始新轮次（由接风玩家开始）

### 接风轮询的遍历示例

**场景：玩家1出了8个6，玩家2要不起，开始接风轮询**

```
玩家1出牌（8个6）
  ↓
玩家2要不起 → 接风轮询开始
  ↓
接风轮询遍历：玩家2 → 玩家3 → 玩家4 → 玩家1（终点）
  ↓
- 如果玩家3要得起 → 接风轮询结束 → 玩家3出牌 → 正常流程
- 如果玩家3也要不起 → 继续检查玩家4
  - 如果玩家4要得起 → 接风轮询结束 → 玩家4出牌 → 正常流程
  - 如果玩家4也要不起 → 继续检查玩家1
    - 回到玩家1（出牌玩家）→ 接风轮询完成 → 判断接风 → 本轮结束 → 新轮次开始
```

### Round调度器的职责（接风轮）

- ✅ 标记当前 round 为接风轮
- ✅ 管理接风轮询的遍历（起点、终点、当前玩家）
- ✅ 通过 `onNextTurnCallback` 逐个轮询玩家
- ✅ 判断接风轮询是否完成（回到出牌玩家）
- ✅ 完成后判断接风，结束本轮，开始新轮次

## 🔑 关键概念

### 1. Round标记

**Round类需要标记接风轮还是正常轮**：

```typescript
// Round类中的标记
private isTakeoverRound: boolean = false;
private takeoverStartPlayerIndex: number | null = null; // 接风轮询起点
private takeoverEndPlayerIndex: number | null = null; // 接风轮询终点

// 相关方法
startTakeoverRound(startPlayerIndex: number, endPlayerIndex: number): void
endTakeoverRound(): void
isTakeoverRoundActive(): boolean
isTakeoverPollingComplete(currentPlayerIndex: number): boolean
```

### 2. 接风轮询的开始

**任何玩家要不起后，立即开始接风轮询**：

- 不等待所有玩家都操作完
- 不等到"轮完一圈"才判断
- 立即标记为接风轮，开始遍历

### 3. 接风轮询的结束条件

- **提前结束**：中途有玩家要得起 → 结束接风轮询，继续正常流程
- **正常结束**：回到出牌玩家 → 接风轮询完成，判断接风

### 4. 真实玩家的处理

在接风轮询中，真实玩家需要：
- 等待真实玩家操作（要得起/要不起）
- 按钮应该可用（"出牌"、"要不起"）
- 高亮应该显示可出牌（如果有）

## 📊 对比表

| 项目 | 正常轮 | 接风轮 |
|------|--------|--------|
| **触发时机** | 玩家出牌后 | 玩家要不起后 |
| **Round标记** | 正常轮（默认） | **标记为接风轮** |
| **调度逻辑** | 直接下一个玩家 | **遍历所有玩家到出牌玩家** |
| **结束条件** | 下一个玩家继续 | **回到出牌玩家或中途有玩家要得起** |
| **完成后的处理** | 继续正常流程 | **判断接风 → 结束本轮 → 新轮次** |

## 🔄 完整流程对比

### 正常轮流程

```
玩家A出牌
  ↓
onPlayCompleted
  ↓
计算下一个玩家B
  ↓
更新状态（rounds）
  ↓
onNextTurnCallback(B)
  ↓
playNextTurn(B)
  ↓
玩家B继续（AI自动/真实玩家等待）
```

### 接风轮流程

```
玩家A出牌（8个6）
  ↓
玩家B要不起
  ↓
onPassCompleted(B)
  ↓
开始接风轮询（标记为接风轮）
  ↓
onNextTurnCallback(C) → playNextTurn(C)
  ↓
玩家C判断：
  - 要得起 → 出牌 → 结束接风轮询 → 正常流程
  - 要不起 → 继续接风轮询
    ↓
    onNextTurnCallback(D) → playNextTurn(D)
    ↓
    玩家D判断...（重复）
    ↓
    回到玩家A（出牌玩家）
      ↓
      接风轮询完成
      ↓
      判断接风 → 本轮结束 → 新轮次开始
```

## 💡 实现要点

### Round类的接风轮标记

```typescript
// 标记为接风轮
round.startTakeoverRound(passPlayerIndex, lastPlayPlayerIndex);

// 检查是否在接风轮询中
if (round.isTakeoverRoundActive()) {
  // 处理接风轮询逻辑
}

// 检查接风轮询是否完成
if (round.isTakeoverPollingComplete(currentPlayerIndex)) {
  // 接风轮询完成，判断接风
}

// 结束接风轮询（如果有玩家要得起）
round.endTakeoverRound();
```

### Round调度器的接风轮询管理

```typescript
// 在 onPassCompleted 中
if (!latestRound.isTakeoverRoundActive()) {
  // 开始接风轮询
  latestRound.startTakeoverRound(playerIndex, lastPlayPlayerIndex);
  // 继续下一个玩家
  await this.onNextTurnCallback(nextPlayerIndex, state);
} else {
  // 已经在接风轮询中
  if (latestRound.isTakeoverPollingComplete(playerIndex)) {
    // 接风轮询完成，判断接风
  } else {
    // 继续接风轮询下一个玩家
    await this.onNextTurnCallback(nextPlayerIndex, state);
  }
}

// 在 onPlayCompleted 中
if (latestRound.isTakeoverRoundActive()) {
  // 玩家出牌了，结束接风轮询
  latestRound.endTakeoverRound();
}
```

## 📝 注意事项

1. **接风轮询必须遍历所有玩家**：不能跳过任何玩家
2. **接风轮询可以提前结束**：如果中途有玩家要得起
3. **Round标记是必须的**：用于区分正常轮和接风轮
4. **真实玩家需要等待**：在接风轮询中也要等待真实玩家操作
5. **Round调度器可以调用Game方法**：比如 `update` 等方法

## 🎯 总结

- **正常轮**：玩家出牌后，直接到下一个玩家
- **接风轮**：玩家要不起后，立即开始接风轮询，遍历所有玩家到出牌玩家
- **Round标记**：区分正常轮和接风轮，记录接风轮询的起点和终点
- **调度器职责**：调度正常的打牌顺序，处理接风轮询，可以调用Game的方法


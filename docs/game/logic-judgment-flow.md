# 游戏逻辑判断流程详解

## 📋 当前游戏逻辑如何判断的？

### 1. 玩家出完牌的判断

**触发位置**：`src/hooks/useMultiPlayerGame.ts:638`

**判断条件**：
```typescript
if (updatedPlayer.hand.length === 0) {
  // 玩家出完牌了
}
```

**判断时机**：
- 在玩家出牌完成后
- 检查更新后的玩家手牌数量是否为0

**处理逻辑**：
1. 立即记录到 `finishOrder`
2. 设置 `finishedRank`（名次）
3. **不分配轮次分数**（轮次还没结束）

---

### 2. 接风判断

**触发位置**：`src/utils/roundScheduler.ts:430-443`

**判断条件**：
```typescript
// 正常情况：轮完一圈
const isNormalTakeover = nextPlayerIndex === lastPlayPlayerIndex;

// 特殊情况：出牌玩家已出完牌，且所有剩余玩家都要不起
const lastPlayPlayerFinished = lastPlayPlayer && lastPlayPlayer.hand.length === 0;
const shouldTakeover = latestRound.shouldTakeover(players, nextPlayerIndex);
const isSpecialTakeover = lastPlayPlayerFinished && shouldTakeover;

// 两种情况都触发接风判断
if (isNormalTakeover || isSpecialTakeover) {
  // 接风逻辑
}
```

**判断时机**：
- 在玩家要不起后（`onPassCompleted`）
- 两种情况：
  1. **正常情况**：下一个玩家就是最后出牌的玩家（`nextPlayerIndex === lastPlayPlayerIndex`）
  2. **特殊情况**：出牌玩家已经出完牌，且所有剩余玩家都要不起

**判断逻辑**：
1. **正常情况（轮完一圈）**：
   - 条件：`nextPlayerIndex === lastPlayPlayerIndex`
   - 说明从出牌玩家开始，轮询了一圈，所有其他玩家都要不起
   
2. **特殊情况（出牌玩家已出完牌）**：
   - 条件：`lastPlayPlayerFinished && shouldTakeover`
   - 原因：`findNextActivePlayer` 会跳过已出完的玩家，所以 `nextPlayerIndex` 永远不会等于 `lastPlayPlayerIndex`
   - 使用 `Round.shouldTakeover()` 检查所有剩余玩家是否都要不起
   - 如果所有剩余玩家都要不起，也应该判断接风

3. **确定接风玩家**：
   - 接风玩家 = 出牌玩家（`lastPlayPlayerIndex`）
   - 检查接风玩家是否已出完牌：
     - 如果还有手牌 → 接风玩家就是出牌玩家
     - 如果已出完 → 接风玩家 = 下一个还在游戏中的玩家（`findNextActivePlayer`）

4. **执行接风**：
   - 结束本轮（分配分数给接风玩家）
   - 开启新轮次（由接风玩家开始）

---

### 3. 轮次结束判断

**触发位置**：
- `src/utils/roundScheduler.ts:589`（在 `onPassCompleted` 中）
- `src/utils/Round.ts:791`（`shouldEnd` 方法）

**判断条件**：
```typescript
const shouldEndRound = latestRound.shouldEnd(nextPlayerIndex);
```

**`shouldEnd` 方法的判断逻辑**（`src/utils/Round.ts:791`）：
```typescript
shouldEnd(nextPlayerIndex: number): boolean {
  // 1. 检查轮次是否已结束
  if (this.isFinished) return false;
  
  // 2. 检查是否有最后出牌的人
  if (this.lastPlayPlayerIndex === null) return false;
  
  // 3. 检查是否有正在处理的出牌
  if (this.hasProcessingPlay()) return false;
  
  // 4. 关键判断：下一个玩家就是最后出牌的人
  const shouldEnd = nextPlayerIndex === this.lastPlayPlayerIndex;
  
  // 5. 防止新轮次刚开始就结束
  if (shouldEnd && this.plays.length <= 1) return false;
  
  return shouldEnd;
}
```

**判断时机**：
1. 在玩家出牌后（`onPlayCompleted`）
2. 在玩家要不起后（`onPassCompleted`）

**关键判断**：
- `nextPlayerIndex === this.lastPlayPlayerIndex`
- 说明轮完一圈，所有其他玩家都要不起

**注意**：
- 在接风的情况下，接风已经处理了，不会走到这个判断
- 这个判断主要用于非接风的情况（所有人都要不起）

---

### 4. 游戏结束判断

**触发位置**：`src/utils/gameStateUtils.ts:107`

**判断条件**：
```typescript
const allFinished = newPlayers.every(player => player.hand.length === 0);
if (allFinished) {
  // 游戏结束
}
```

**判断时机**：
- 在轮次结束时（`handleRoundEnd`）
- 检查是否所有玩家都出完牌了

**处理逻辑**：
1. 应用最终规则（头名+30分，末游-30分等）
2. 计算最终排名
3. 设置游戏状态为 `FINISHED`

---

## 🔄 完整的判断流程

### 流程1：玩家出牌后

```
玩家出牌
  ↓
检查是否出完牌？
  ├─ 是 → 记录到 finishOrder，设置 finishedRank
  └─ 否 → 继续
  ↓
计算下一个玩家
  ↓
调用 onPlayCompleted
  ├─ 更新状态
  ├─ 检查轮次是否结束？
  │   ├─ 是 → 结束本轮，开启新轮次
  │   └─ 否 → 继续下一家
  └─ 继续游戏
```

### 流程2：玩家要不起后

```
玩家要不起
  ↓
记录要不起
  ↓
计算下一个玩家
  ↓
调用 onPassCompleted
  ├─ 检查是否应该接风？
  │   ├─ 正常情况：nextPlayerIndex === lastPlayPlayerIndex（轮完一圈）
  │   ├─ 特殊情况：出牌玩家已出完 && 所有剩余玩家都要不起
  │   │
  │   ├─ 是 → 判断接风
  │   │   ├─ 确定接风玩家（lastPlayPlayerIndex）
  │   │   ├─ 检查接风玩家是否已出完？
  │   │   │   ├─ 是 → 接风给下一个玩家（findNextActivePlayer）
  │   │   │   └─ 否 → 接风玩家就是出牌玩家
  │   │   ├─ 结束本轮（分配分数给接风玩家）
  │   │   └─ 开启新轮次（由接风玩家开始）
  │   └─ 否 → 继续
  ├─ 更新状态
  ├─ 检查轮次是否结束？
  │   ├─ 是 → 结束本轮，开启新轮次
  │   └─ 否 → 继续下一家
  └─ 继续游戏
```

### 流程3：轮次结束

```
判断轮次结束
  ↓
调用 Round.end()
  ├─ 分配轮次分数给 lastPlayPlayerIndex（接风玩家）
  ├─ 创建轮次记录
  └─ 确定下一轮开始的玩家
      ├─ 如果接风玩家还有手牌 → 由接风玩家开始
      └─ 如果接风玩家已出完 → 由下一个玩家开始
  ↓
检查游戏是否结束？
  ├─ 是 → 应用最终规则，结束游戏
  └─ 否 → 创建新轮次，继续游戏
```

---

## 🎯 关键判断点总结

### 1. 出完牌判断

**位置**：`useMultiPlayerGame.ts:639`
**判断**：`hand.length === 0`
**作用**：标记玩家已出完，记录 `finishOrder`

### 2. 接风判断

**位置**：`roundScheduler.ts:430-443`
**判断**：
- 正常情况：`nextPlayerIndex === lastPlayPlayerIndex`（轮完一圈）
- 特殊情况：`lastPlayPlayerFinished && shouldTakeover`（出牌玩家已出完，且所有剩余玩家都要不起）
**作用**：确认轮完一圈或特殊情况，所有其他玩家都要不起，触发接风

### 3. 轮次结束判断

**位置**：`Round.ts:791`
**判断**：`nextPlayerIndex === lastPlayPlayerIndex`
**作用**：确认所有人都要不起，应该结束轮次

### 4. 游戏结束判断

**位置**：`gameStateUtils.ts:113`
**判断**：`allPlayers.every(p => p.hand.length === 0)`
**作用**：确认所有玩家都出完牌了

---

## ⚠️ 需要注意的细节

### 1. 接风 vs 轮次结束

- **接风**：在 `onPassCompleted` 中判断，轮完一圈后立即处理
- **轮次结束**：也在 `onPassCompleted` 中判断，但接风情况已经处理并return了

### 2. 接风玩家已出完的处理

- **finishOrder**：已在出完牌时记录，接风时不需要再次处理
- **轮次分数**：在轮次结束时分配给接风玩家（即使已出完）
- **下一轮开始**：由下一个玩家开始（不是接风玩家）

### 3. 特殊情况：出牌玩家已出完时的接风判断

**问题场景**：
- 玩家A出完最后一手牌（已出完）
- 玩家B、C、D都要不起
- 因为 `findNextActivePlayer` 会跳过已出完的玩家A，所以 `nextPlayerIndex` 永远不会等于 `lastPlayPlayerIndex`（玩家A）
- 导致正常接风判断无法触发

**解决方案**：
- 添加特殊情况判断：如果出牌玩家已经出完牌（`lastPlayPlayerFinished`），且所有剩余玩家都要不起（`shouldTakeover`），也应该判断接风
- 使用 `Round.shouldTakeover()` 方法检查所有剩余玩家是否都要不起
- 这样可以避免死循环，确保接风逻辑正确执行

### 3. 轮次分数分配时机

- **不在出完牌时分配**：因为轮次还没结束
- **在轮次结束时分配**：在 `Round.end()` 中分配

---

## 📝 下一步Review建议

1. **检查接风判断逻辑**：
   - 是否真的轮完了一圈？
   - 是否所有玩家都已操作（包括真实玩家的超时处理）？

2. **检查轮次分数分配**：
   - 是否在正确的时机分配？
   - 是否分配给正确的玩家？

3. **检查游戏流程**：
   - 接风后是否正确开启新轮次？
   - 新轮次第一个玩家是否正确？


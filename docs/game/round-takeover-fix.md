# 轮次接风问题修复

## 🐛 问题描述

1. 出牌轮次乱套了，没法下家出牌
2. 轮次已结束，无法处理玩家出牌（"轮次 3 已结束，无法处理玩家 2 的出牌"）

## 🔍 问题分析

### 根本原因

接风后，不应该检查轮次结束。接风是继续游戏的一种方式，不应该结束轮次。

### 问题场景

1. 玩家出牌后，检查是否需要接风
2. 如果需要接风，调用 `round.takeover()`，清空 `lastPlayPlayerIndex`
3. 然后检查 `shouldEnd`，但是接风后应该继续游戏，不应该结束轮次
4. 如果错误地检查了 `shouldEnd`，可能会导致轮次被错误地结束

## ✅ 修复方案

### 修复 `playerPlayAsync` 中的轮次结束检查

**文件**: `src/hooks/useMultiPlayerGame.ts`

**修复**:
- 如果接风了（`didTakeover = true`），不应该检查轮次结束
- 因为接风后应该继续游戏，而不是结束轮次

```typescript
// 如果接风了，不应该检查轮次结束
if (!didTakeover && finalNextPlayerIndex !== null && finalRound && finalRound.shouldEnd(finalNextPlayerIndex)) {
  // 结束轮次
}
```

## 📝 修复后的流程

1. **玩家出牌后**
   - 计算下一个玩家
   - 检查是否需要接风
   - 如果需要接风，调用 `round.takeover()`，清空 `lastPlayPlayerIndex`

2. **更新状态**
   - 同步 Round 对象的状态
   - 更新 `currentPlayerIndex`

3. **检查是否结束轮次**
   - **如果接风了，不检查轮次结束，直接继续游戏**
   - 如果没有接风，检查是否应该结束轮次

## ✅ 预期效果

修复后，应该：
- ✅ 接风后不会错误地结束轮次
- ✅ 接风后可以继续游戏
- ✅ 轮次结束判断更准确

## 🔧 其他相关修复

1. **异步处理中的轮次状态检查**
   - 在 `processPlayAsync` 开始时检查轮次状态
   - 如果轮次已结束，立即返回失败结果

2. **等待过程中的轮次状态检查**
   - 在 `waitForPlayProcess` 中，每100ms检查一次轮次状态
   - 如果轮次已结束，立即返回，不等待超时

3. **TTS 超时保护**
   - 为 `announcePlay` 添加10秒超时保护
   - 如果 TTS 失败，记录警告但不阻止游戏继续


# 游戏逻辑修复总结

## ✅ 已完成的修复

### 1. 修复 `findNextActivePlayer` 函数
- **位置**: `src/utils/gameStateUtils.ts`
- **修复内容**: 
  - 当所有玩家都出完时，返回 `null` 而不是 `startIndex`
  - 调用者需要检查 `null` 并结束游戏

### 2. 添加 `checkAllRemainingPlayersPassed` 函数
- **位置**: `src/utils/gameStateUtils.ts`
- **功能**: 检测所有剩余玩家是否都要不起（用于接风状态下的死循环检测）

### 3. 修复接风状态下的"要不起"处理
- **位置**: `src/hooks/useMultiPlayerGame.ts:494-521`
- **修复内容**: 
  - 在接风状态下，如果所有剩余玩家都要不起，强制开始新轮次
  - 由当前玩家开始新轮次，避免无限循环

### 4. 修复部分 `findNextActivePlayer` 调用
- **位置**: `src/hooks/useMultiPlayerGame.ts`
- **修复内容**: 
  - 在多个地方添加了 `null` 检查
  - 当 `nextPlayerIndex` 为 `null` 时，结束游戏

## ⚠️ 需要修复的类型错误

由于 `findNextActivePlayer` 现在返回 `number | null`，但 `MultiPlayerGameState.currentPlayerIndex` 的类型是 `number`，导致类型错误。

### 解决方案

所有使用 `findNextActivePlayer` 的地方都需要：
1. 检查返回值是否为 `null`
2. 如果为 `null`，结束游戏（而不是设置 `currentPlayerIndex` 为 `null`）
3. 如果不为 `null`，才能使用它作为数组索引

### 需要修复的位置

1. **Line 403, 427, 503, 685, 926, 953, 1025, 1245, 1277, 1482, 1562, 1640, 1647, 1679**: 
   - 这些地方使用了 `nextPlayerIndex` 作为数组索引
   - 需要在使用前检查是否为 `null`

2. **Line 252, 441, 605, 711, 963, 1164, 1544**: 
   - 这些地方返回的状态对象中 `currentPlayerIndex` 可能是 `null`
   - 需要确保 `currentPlayerIndex` 始终是 `number`

## 🔧 修复模式

### 模式1: 检查并结束游戏
```typescript
const nextPlayerIndex = findNextActivePlayer(...);
if (nextPlayerIndex === null) {
  // 所有玩家都出完了，结束游戏
  const allFinished = players.every(p => p.hand.length === 0);
  if (allFinished) {
    return {
      ...prev,
      status: GameStatus.FINISHED,
      // ... 结束游戏的状态
    };
  }
  return prev; // 不应该发生，但作为保护
}
// 现在可以安全使用 nextPlayerIndex
```

### 模式2: 使用前检查
```typescript
const nextPlayerIndex = findNextActivePlayer(...);
if (nextPlayerIndex === null) {
  // 处理 null 情况
  return prev;
}
// 现在可以安全使用 nextPlayerIndex 作为数组索引
if (players[nextPlayerIndex].type === PlayerType.AI) {
  // ...
}
```

## 📝 下一步

1. 修复所有类型错误（按照上述模式）
2. 测试修复后的游戏逻辑
3. 确保游戏能正常结束，不会出现死循环

## ✅ 修复验证

修复完成后，需要验证：
- [ ] 接风状态下，所有玩家都要不起时，能正确开始新轮次
- [ ] 所有玩家都出完时，能正确结束游戏
- [ ] 没有类型错误
- [ ] 游戏能正常完成，不会出现死循环


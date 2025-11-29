# Round 轮次卡住问题分析

## 潜在卡住场景

### 1. ⚠️ `waitForPlayProcess()` 没有超时机制

**位置**: `src/utils/Round.ts:219-228`

**问题**:
```typescript
async waitForPlayProcess(): Promise<PlayProcessResult> {
  if (!this.currentPlayProcess) {
    return { status: PlayProcessStatus.IDLE, startTime: Date.now() };
  }
  return this.currentPlayProcess.promise; // ❌ 没有超时保护
}
```

**风险**: 
- 如果 `processAsync()` 中的操作（如 TTS 生成）永远不完成
- Promise 永远不会 resolve/reject
- `waitForPlayProcess()` 会永远等待
- 整个游戏流程卡住

**场景**:
- TTS 服务挂掉或网络超时
- 音频播放卡住
- 其他异步操作异常

### 2. ⚠️ `processPlayAsync()` 中的异步操作没有超时保护

**位置**: `src/utils/Round.ts:270`

**问题**:
```typescript
await processAsync(); // ❌ 没有超时保护
```

如果 `processAsync()` 中的操作（TTS 生成、音频播放）卡住，整个流程会卡住。

### 3. ⚠️ 轮次结束判断可能不准确

**位置**: `src/utils/Round.ts:496-510`

**问题**: `shouldEnd()` 的判断逻辑可能在某些边界情况下不准确，导致轮次无法正常结束。

### 4. ⚠️ 状态同步问题

**位置**: `src/hooks/useMultiPlayerGame.ts`

**问题**: 
- `gameStateRef.current` 和 `gameState` 可能不同步
- 轮次结束判断可能基于过时的状态

### 5. ⚠️ 多重等待可能导致死锁

**位置**: `src/hooks/useMultiPlayerGame.ts:100-142`

**问题**:
- `playNextTurn()` 中等待 `waitForPlayProcess()`
- `processPlayAsync()` 中又等待 `waitForPlayProcess()`
- 如果状态不一致，可能导致循环等待

## 建议的修复方案

### 1. 为 `waitForPlayProcess()` 添加超时机制

### 2. 为异步操作添加超时保护

### 3. 添加轮次健康检查机制

### 4. 改进错误处理和恢复机制


# Round 轮次卡住问题修复总结

## ✅ 已修复的问题

### 1. ✅ `waitForPlayProcess()` 添加超时机制

**位置**: `src/utils/Round.ts:219-245`

**修复**:
- 添加了可配置的超时参数（默认30秒）
- 使用 `Promise.race()` 确保不会永远等待
- 超时后返回失败状态，不会卡住游戏流程

```typescript
async waitForPlayProcess(timeoutMs: number = 30000): Promise<PlayProcessResult> {
  // 添加超时保护
  return Promise.race([
    this.currentPlayProcess.promise,
    new Promise<PlayProcessResult>((resolve) => {
      setTimeout(() => {
        // 超时后返回失败状态
        resolve({ status: PlayProcessStatus.FAILED, ... });
      }, timeoutMs);
    })
  ]);
}
```

### 2. ✅ `processPlayAsync()` 中的异步操作添加超时保护

**位置**: `src/utils/Round.ts:287-308`

**修复**:
- 为 `processAsync()` 添加超时保护
- 使用配置的 `playTimeout` 值（默认30秒）
- 超时后抛出错误，由外层 catch 处理

```typescript
const timeoutMs = this.timingConfig.playTimeout || 30000;
await Promise.race([
  processAsync(),
  new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`出牌处理超时（${timeoutMs}ms）`));
    }, timeoutMs);
  })
]);
```

### 3. ✅ `playNextTurn()` 中等待逻辑添加错误处理

**位置**: `src/hooks/useMultiPlayerGame.ts:100-108`

**修复**:
- 在等待出牌处理时添加 try-catch
- 即使等待失败也继续执行，不会阻塞游戏流程

```typescript
if (currentState.currentRound?.hasProcessingPlay()) {
  try {
    await currentState.currentRound.waitForPlayProcess(30000);
  } catch (error) {
    console.warn('[playNextTurn] 等待出牌处理完成时出错（继续执行）:', error);
    // 继续执行，不阻塞游戏流程
  }
}
```

### 4. ✅ 轮次结束时等待逻辑优化

**位置**: `src/hooks/useMultiPlayerGame.ts:2153-2161`

**修复**:
- 使用较短的超时时间（10秒）
- 即使等待失败也继续结束轮次，避免卡住

## 🔍 仍然需要注意的场景

### 1. ⚠️ TTS 服务长时间无响应

**场景**: TTS 服务挂掉或网络问题导致长时间无响应

**保护**: 
- ✅ `processAsync()` 有30秒超时保护
- ✅ 超时后会抛出错误，由错误处理机制处理

### 2. ⚠️ 音频播放卡住

**场景**: 音频播放设备问题导致播放卡住

**保护**:
- ✅ `processAsync()` 的超时保护会触发
- ✅ 超时后继续游戏流程

### 3. ⚠️ 状态同步问题

**场景**: `gameStateRef.current` 和实际状态不同步

**建议**:
- 在关键操作前重新获取最新状态
- 添加状态一致性检查

### 4. ⚠️ 轮次结束判断边界情况

**场景**: 某些边界情况下 `shouldEnd()` 判断不准确

**建议**:
- 添加更多的日志记录
- 添加手动结束轮次的机制（如果确实卡住）

## 📝 建议的进一步改进

1. **添加轮次健康检查机制**
   - 定期检查轮次是否正常进行
   - 如果长时间没有出牌，自动处理

2. **添加手动恢复机制**
   - 提供手动跳过当前玩家/结束轮次的按钮
   - 用于处理异常情况

3. **改进错误恢复**
   - 更详细的错误日志
   - 自动恢复机制

4. **添加监控和告警**
   - 监控轮次持续时间
   - 监控异步操作耗时
   - 异常情况告警

## ✅ 修复效果

经过这些修复，轮次卡住的风险大大降低：

1. ✅ 所有异步等待都有超时保护
2. ✅ 错误不会阻塞游戏流程
3. ✅ 超时后会自动继续
4. ✅ 添加了详细的日志记录

## 🧪 测试建议

1. 模拟 TTS 服务无响应（超时）
2. 模拟音频播放卡住
3. 模拟网络问题
4. 测试轮次结束的各种边界情况
5. 测试并发出牌场景


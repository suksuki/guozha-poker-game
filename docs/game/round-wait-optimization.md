# Round 等待逻辑优化

## 🐛 问题描述

1. 等待出牌处理超时（30秒），强制继续
2. 等待过程中轮次已结束，无法处理玩家出牌

## 🔍 问题分析

### 根本原因

1. **`waitForPlayProcess` 没有轮次状态检查**
   - 在等待过程中，如果轮次被结束，等待仍然会继续直到超时
   - 30秒的超时时间太长，导致响应慢

2. **TTS 生成或播放可能卡住**
   - `announcePlay` 是异步的，如果 TTS 服务无响应，会导致整个异步处理卡住
   - 没有超时保护

3. **异步处理过程中没有检查轮次状态**
   - 在 TTS 生成和播放过程中，如果轮次被结束，处理仍然会继续

## ✅ 修复方案

### 1. 优化 `waitForPlayProcess` 方法

**文件**: `src/utils/Round.ts`

**修复**:
- 添加轮次状态检查（每100ms检查一次）
- 如果轮次已结束，立即返回，不等待超时
- 减少默认超时时间（从30秒减少到15秒）
- 确保在所有情况下都能正确清理定时器

```typescript
async waitForPlayProcess(timeoutMs: number = 30000): Promise<PlayProcessResult> {
  // 如果轮次已结束，立即返回
  if (this.isFinished) {
    return { status: PlayProcessStatus.FAILED, ... };
  }

  // 添加轮次状态检查（每100ms检查一次）
  const checkInterval = setInterval(() => {
    if (this.isFinished) {
      // 立即返回，不等待超时
      resolve({ status: PlayProcessStatus.FAILED, ... });
    }
  }, 100);
  
  // ...
}
```

### 2. 为 TTS 添加超时保护

**文件**: `src/utils/asyncPlayHandler.ts`

**修复**:
- 为 `announcePlay` 添加10秒超时保护
- 如果 TTS 失败，记录警告但不阻止游戏继续
- 在 TTS 生成前检查轮次状态

```typescript
// 如果轮次已结束，跳过 TTS
if (!round.isEnded()) {
  try {
    await Promise.race([
      announcePlay(play, player.voiceConfig),
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('TTS 超时')), 10000);
      })
    ]);
  } catch (error) {
    console.warn('TTS 失败，继续游戏');
  }
}
```

### 3. 优化超时时间

**文件**: `src/hooks/useMultiPlayerGame.ts`

**修复**:
- 将 `waitForPlayProcess` 的超时时间从30秒减少到15秒
- 因为轮次状态检查会每100ms检查一次，所以不需要太长的超时时间

### 4. 在异步处理过程中检查轮次状态

**文件**: `src/utils/asyncPlayHandler.ts`

**修复**:
- 在 TTS 生成前检查轮次状态
- 在状态更新前检查轮次状态
- 如果轮次已结束，跳过相关操作

## 📝 修复后的流程

1. **等待出牌处理**
   - 每100ms检查一次轮次状态
   - 如果轮次已结束，立即返回（不等待超时）
   - 如果等待超时（15秒），返回失败结果

2. **TTS 生成和播放**
   - 在生成前检查轮次状态
   - 添加10秒超时保护
   - 如果失败，记录警告但不阻止游戏

3. **状态更新**
   - 在更新前检查轮次状态
   - 如果轮次已结束，跳过更新

## ✅ 预期效果

修复后，应该：
- ✅ 在轮次结束时，等待会立即返回（最多100ms延迟）
- ✅ TTS 超时不会导致整个游戏卡住
- ✅ 异步处理过程中会检查轮次状态
- ✅ 减少不必要的等待时间

## 🧪 测试建议

1. 测试轮次结束时的等待逻辑
2. 测试 TTS 服务无响应的情况
3. 测试异步处理过程中的轮次结束
4. 查看控制台日志，确认逻辑正确


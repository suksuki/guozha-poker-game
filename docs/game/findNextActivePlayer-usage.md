# findNextActivePlayer 使用情况分析

## 函数功能

```typescript
findNextActivePlayer(
  startIndex: number,
  players: Player[],
  playerCount: number
): number | null
```

**功能**：找到下一个还在游戏中的玩家（跳过已出完牌的玩家）

## 当前使用情况（非 backup 文件）

### 1. **src/utils/roundScheduler.ts** - 3处使用 ✅

- **第 337 行** (`onPlayCompleted`): 找下一个玩家，继续轮询
- **第 460 行** (`onPassCompleted`): 找下一个玩家，用于判断接风
- **第 507 行** (`onPassCompleted`): 如果接风玩家已出完，找下一个玩家开始新轮次

### 2. **src/utils/Round.ts** - 1处使用 ✅

- **第 976 行** (`Round.end()`): 如果接风玩家已出完，找下一个玩家开始新轮次

### 3. **src/hooks/useMultiPlayerGame.ts** - 1处使用 ✅

- **第 298 行** (`playNextTurnInternal`): 跳过已出完牌的玩家

### 4. **src/utils/asyncPlayHandler.ts** - 导入但可能未使用 ⚠️

- 导入了但没有直接使用

### 5. **其他文件（可能已废弃）** ⚠️

- `src/utils/roundManager.ts` - 使用
- `src/utils/gameFinishManager.ts` - 使用

## 结论

**`findNextActivePlayer` 仍然有用，不是老的设计遗留**

### 使用场景：

1. **跳过已出完牌的玩家**：当玩家出完牌后，需要找到下一个还在游戏中的玩家继续游戏
2. **轮次结束时确定下一轮开始玩家**：如果接风玩家已出完，需要找下一个玩家开始新轮次
3. **轮询过程中的玩家选择**：在轮询其他玩家时，需要跳过已出完牌的玩家

### 在新设计中的必要性：

- ✅ **RoundScheduler** 需要用它来找下一个玩家
- ✅ **Round.end()** 需要用它来确定下一轮开始的玩家
- ✅ **playNextTurnInternal** 需要用它来跳过已出完牌的玩家

### 建议：

这个函数在新设计中仍然是必要的工具函数，不需要删除。它的功能简单明确：跳过已出完牌的玩家，找到下一个还在游戏中的玩家。


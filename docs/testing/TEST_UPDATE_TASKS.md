# 测试更新任务清单

**创建日期**: 2024年（当前）
**状态**: 进行中

## 📊 搜索结果总结

### ✅ 好消息
- **没有测试文件引用已删除的接口** - 所有已删除的回调接口（`playCallbacks`, `setPlayCallbacks`, `moduleCallbacks` 等）都没有在测试中被引用
- **现有测试文件安全** - `refactorRegression.test.ts` 测试的是其他 hooks，不依赖已删除的接口

### ⚠️ 需要处理
- **缺失关键测试文件** - `useMultiPlayerGame.test.ts` 不存在，需要创建
- **Game 类方法测试不足** - `gameState.test.ts` 只测试了 `dealCards`，没有测试 Game 类的新方法
- **audioModule.test.ts** - 需要确认是否正确测试了新的服务调用方式

---

## 📋 详细任务清单

### 阶段 1: 创建缺失的测试文件（高优先级）

#### 任务 1.1: 创建 `useMultiPlayerGame.test.ts`
**文件**: `tests/useMultiPlayerGame.test.ts`  
**状态**: ❌ 不存在，需要创建  
**优先级**: 🔴 高

**需要测试的内容**:
- [ ] `startGame` - 调用 `Game.startGameWithDealing()`
- [ ] `resetGame` - 调用 `Game.reset()`
- [ ] `toggleAutoPlay` - 调用 `Game.toggleAutoPlay()`
- [ ] `handleDealingComplete` - 调用 `Game.handleDealingComplete()`
- [ ] `handleDealingCancel` - 调用 `Game.handleDealingCancel()`
- [ ] React 状态管理（`isDealing`, `pendingGameConfig`）
- [ ] `createAndSetupGame` 辅助函数
- [ ] `onUpdate` 回调设置

**标记**: 如果测试异步操作，添加 `@async` 标签

---

### 阶段 2: 更新现有测试文件（高优先级）

#### 任务 2.1: 更新 `gameState.test.ts`
**文件**: `tests/gameState.test.ts`  
**状态**: ✅ 存在，但测试覆盖不足  
**优先级**: 🔴 高

**当前测试内容**:
- ✅ `dealCards` 函数测试

**需要添加的测试**:
- [ ] `Game.createAndStartNewGame()` 静态方法
  - [ ] 应该创建新游戏实例
  - [ ] 应该初始化追踪模块（如果启用）
  - [ ] 应该保持托管状态
  - [ ] 应该正确设置游戏配置
  
- [ ] `Game.startGameWithDealing()` 静态方法
  - [ ] 应该自动发牌
  - [ ] 应该创建并开始新游戏
  - [ ] 应该初始化追踪模块
  
- [ ] `Game.handleDealingComplete()` 静态方法
  - [ ] 应该使用指定手牌创建游戏
  - [ ] 应该保持托管状态
  
- [ ] `Game.handleDealingCancel()` 静态方法
  - [ ] 应该是占位方法（不执行任何操作）
  
- [ ] `Game.reset()` 实例方法
  - [ ] 应该重置游戏状态
  - [ ] 应该清除聊天消息（调用 `clearChatMessages()`）
  - [ ] 应该触发更新回调
  
- [ ] `Game.toggleAutoPlay()` 实例方法
  - [ ] 应该切换托管状态
  - [ ] 应该更新调度器配置
  - [ ] 应该触发自动出牌（如果开启托管且轮到人类玩家）
  - [ ] 应该触发更新回调
  
- [ ] `Game.initializeTracking()` 实例方法
  - [ ] 应该初始化追踪模块（如果启用）
  - [ ] 应该检查配置（localStorage）
  - [ ] 应该处理初始化错误

**标记**: 
- 测试 `reset()` 和 `initializeTracking()` 需要标记 `@async`（调用异步服务）

---

### 阶段 3: 审查和验证现有测试（中优先级）

#### 任务 3.1: 审查 `system/audioModule.test.ts`
**文件**: `tests/system/audioModule.test.ts`  
**状态**: ✅ 存在，需要验证  
**优先级**: 🟡 中

**当前测试内容**:
- ✅ `announcePlay` 测试
- ✅ `announcePass` 测试

**需要验证**:
- [ ] Mock 是否正确设置（`systemAnnouncementService`）
- [ ] 测试是否验证了直接服务调用
- [ ] 是否标记了 `@async`（TTS 调用是异步的）

**检查结果**: ✅ 测试看起来正确，Mock 了 `systemAnnouncementService.announcePlay` 和 `announcePass`，符合新的实现方式。

**建议**: 
- 添加 `@async` 标签（如果还没有）
- 可以添加更详细的断言，验证服务被正确调用

---

#### 任务 3.2: 审查 `refactorRegression.test.ts`
**文件**: `tests/refactorRegression.test.ts`  
**状态**: ✅ 存在，安全  
**优先级**: 🟢 低

**检查结果**: ✅ 这个文件测试的是其他 hooks（`useGameConfig`, `usePlayerHand`, `useChatBubbles`, `useGameActions`），不依赖已删除的回调接口，不需要更新。

---

### 阶段 4: 标记和分类（低优先级）

#### 任务 4.1: 标记异步测试
**状态**: ⏳ 待处理  
**优先级**: 🟡 中

**需要标记的文件**:
- [ ] `tests/useMultiPlayerGame.test.ts` (新建) - 如果测试异步操作
- [ ] `tests/gameState.test.ts` - 测试 `reset()` 和 `initializeTracking()` 的用例
- [ ] `tests/system/audioModule.test.ts` - 测试 `announcePlay` 和 `announcePass` 的用例

**标记方式**:
```typescript
/**
 * @async
 */
describe('Game.reset', () => {
  // ...
})
```

---

#### 任务 4.2: 更新 `TEST_CATEGORIES.md`
**文件**: `tests/TEST_CATEGORIES.md`  
**状态**: ⏳ 待处理  
**优先级**: 🟢 低

**需要更新的内容**:
- [ ] 添加 `useMultiPlayerGame.test.ts` 到相应分类
- [ ] 更新 `gameState.test.ts` 的说明（添加 Game 类方法测试）
- [ ] 更新测试统计

---

## 📈 进度跟踪

### 阶段 1: 创建缺失的测试文件
- [ ] 任务 1.1: 创建 `useMultiPlayerGame.test.ts`

### 阶段 2: 更新现有测试文件
- [ ] 任务 2.1: 更新 `gameState.test.ts`

### 阶段 3: 审查和验证现有测试
- [x] 任务 3.1: 审查 `system/audioModule.test.ts` ✅ 通过
- [x] 任务 3.2: 审查 `refactorRegression.test.ts` ✅ 通过

### 阶段 4: 标记和分类
- [ ] 任务 4.1: 标记异步测试
- [ ] 任务 4.2: 更新 `TEST_CATEGORIES.md`

---

## 🎯 下一步行动

### 立即开始（高优先级）

1. **创建 `useMultiPlayerGame.test.ts`**
   - 这是最关键的缺失测试
   - Hook 是核心接口，必须有完整测试覆盖

2. **更新 `gameState.test.ts`**
   - 添加 Game 类静态和实例方法测试
   - 确保新方法有测试覆盖

### 后续处理（中低优先级）

3. 标记异步测试
4. 更新测试文档

---

## 📝 注意事项

1. **测试隔离** - 确保新测试不依赖其他测试的状态
2. **Mock 服务** - 正确 Mock 所有外部服务调用（`clearChatMessages`, `cardTracker`, `announcePass` 等）
3. **异步测试** - 正确使用 `@async` 标签
4. **React Hook 测试** - 使用 `@testing-library/react` 的 `renderHook`
5. **静态方法测试** - 直接测试 `Game.createAndStartNewGame()` 等静态方法

---

## 🔗 相关文档

- `docs/testing/TEST_REVIEW_2024_REFACTOR.md` - 详细审查报告
- `docs/testing/TEST_WORKFLOW_EXECUTION_PLAN.md` - 工作流执行计划
- `tests/TEST_CATEGORIES.md` - 测试分类


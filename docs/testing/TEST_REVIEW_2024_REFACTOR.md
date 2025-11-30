# 测试用例审查报告 - 2024年重构版本

## 📋 审查概述

**审查日期**: 2024年（当前）
**审查范围**: 所有单元测试和回归测试
**审查原因**: 代码重构，大量接口和方法迁移到 `Game` 类

## 🔄 今天的主要代码变更

### 1. `useMultiPlayerGame.ts` 重构
- **移除的方法/逻辑**:
  - `startGameInternal` - 已移到 `Game.createAndStartNewGame`
  - `resetGame` 逻辑 - 已移到 `Game.reset()`
  - `toggleAutoPlay` 逻辑 - 已移到 `Game.toggleAutoPlay()`
  - `startGame` 逻辑 - 已移到 `Game.startGameWithDealing()`
  - 追踪模块初始化 - 已移到 `Game.initializeTracking()`
  - `subscribeControllerCallbacks` - 已移到 `Game` 构造函数
  - `playCallbacks` (`onPlay`, `onPass`, `isAutoPlay`, `checkVoiceSpeaking`, `waitForVoice`) - **已删除**

- **新增的静态方法**:
  - `Game.createAndStartNewGame()` - 创建并开始新游戏
  - `Game.startGameWithDealing()` - 自动发牌并开始游戏
  - `Game.handleDealingComplete()` - 处理发牌完成
  - `Game.handleDealingCancel()` - 处理发牌取消

- **新增的实例方法**:
  - `Game.reset()` - 重置游戏（包含 `clearChatMessages()`）
  - `Game.toggleAutoPlay()` - 切换托管状态
  - `Game.initializeTracking()` - 初始化追踪模块

### 2. `Game.ts` 变更
- **直接导入的服务**:
  - `announcePass` - 从 `systemAnnouncementService` 直接导入
  - `cardTracker` - 从 `cardTrackerService` 直接导入
  - `voiceService` - 用于 `checkVoiceSpeaking` 和 `waitForVoice`
  - `clearChatMessages` - 从 `chatService` 直接导入

- **移除的回调接口**:
  - `playCallbacks` - 完全删除
  - `moduleCallbacks.announcePassAudio` - 删除
  - `moduleCallbacks.recordTrackingPlay` - 删除
  - `moduleCallbacks.announcePlayAudio` - 删除

### 3. `asyncPlayHandler.ts` 变更
- **移除的参数**:
  - `moduleCallbacks` - 不再需要，直接使用 `cardTracker` 和 `announcePlay`

## 📊 测试用例分类和状态

### ✅ 需要更新的测试

#### 1. 直接测试 `useMultiPlayerGame` 的测试
**状态**: 🔴 **需要创建或更新**

**缺失的测试文件**:
- `tests/useMultiPlayerGame.test.ts` - **不存在，需要创建**

**需要测试的内容**:
- ✅ `startGame` - 调用 `Game.startGameWithDealing()`
- ✅ `resetGame` - 调用 `Game.reset()`
- ✅ `toggleAutoPlay` - 调用 `Game.toggleAutoPlay()`
- ✅ `handleDealingComplete` - 调用 `Game.handleDealingComplete()`
- ✅ `handleDealingCancel` - 调用 `Game.handleDealingCancel()`
- ✅ React 状态管理（`isDealing`, `pendingGameConfig`）
- ✅ `createAndSetupGame` 辅助函数

#### 2. 测试 `Game` 类的测试
**状态**: 🟡 **部分需要更新**

**现有测试文件**:
- `tests/gameState.test.ts` - 基础游戏状态测试
- `tests/gameLogic.test.ts` - 游戏逻辑测试
- `tests/gameController.test.ts` - 游戏控制器测试

**需要更新的内容**:
- ✅ 测试 `Game.createAndStartNewGame()` 静态方法
- ✅ 测试 `Game.startGameWithDealing()` 静态方法
- ✅ 测试 `Game.handleDealingComplete()` 静态方法
- ✅ 测试 `Game.handleDealingCancel()` 静态方法
- ✅ 测试 `Game.reset()` 方法（包含 `clearChatMessages`）
- ✅ 测试 `Game.toggleAutoPlay()` 方法
- ✅ 测试 `Game.initializeTracking()` 方法
- ✅ 测试 `Game` 构造函数中的 `controller.subscribe({})` 初始化

#### 3. 测试回调接口的测试
**状态**: 🔴 **需要删除或更新**

**受影响的测试**:
- 任何测试 `playCallbacks` 的测试 - **需要删除**
- 任何测试 `moduleCallbacks` 的测试 - **需要更新为直接测试服务调用**

**需要检查的文件**:
- `tests/system/audioModule.test.ts` - 测试 `announcePlay` 和 `announcePass`
- `tests/refactorRegression.test.ts` - 可能包含回调测试

### ⚠️ 需要标记为废弃的测试

#### 1. 测试已删除的回调接口
**状态**: 🔴 **标记为废弃或删除**

**需要标记的测试**:
- 任何测试 `playCallbacks.onPlay` 的测试
- 任何测试 `playCallbacks.onPass` 的测试
- 任何测试 `playCallbacks.isAutoPlay` 的测试
- 任何测试 `playCallbacks.checkVoiceSpeaking` 的测试
- 任何测试 `playCallbacks.waitForVoice` 的测试

### 🔄 需要标记为异步的测试

#### 1. 涉及服务调用的测试
**状态**: 🟡 **需要标记 `@async`**

**需要标记的测试**:
- 测试 `Game.reset()` 的测试（调用 `clearChatMessages()`）
- 测试 `Game.initializeTracking()` 的测试（调用 `cardTracker.initialize()`）
- 测试 `announcePass` 的测试（TTS 异步调用）
- 测试 `announcePlay` 的测试（TTS 异步调用）

### 📝 需要新增的测试

#### 1. `Game` 类静态方法测试
**文件**: `tests/gameStaticMethods.test.ts` (新建)

**测试内容**:
```typescript
describe('Game 静态方法', () => {
  describe('createAndStartNewGame', () => {
    // 测试创建新游戏
    // 测试追踪模块初始化
    // 测试托管状态保持
  })
  
  describe('startGameWithDealing', () => {
    // 测试自动发牌
    // 测试游戏初始化
  })
  
  describe('handleDealingComplete', () => {
    // 测试发牌完成处理
  })
  
  describe('handleDealingCancel', () => {
    // 测试发牌取消处理（占位方法）
  })
})
```

#### 2. `Game` 类实例方法测试
**文件**: `tests/gameInstanceMethods.test.ts` (新建) 或更新 `tests/gameState.test.ts`

**测试内容**:
```typescript
describe('Game 实例方法', () => {
  describe('reset', () => {
    // 测试重置游戏状态
    // 测试清除聊天消息
    // 测试触发更新
  })
  
  describe('toggleAutoPlay', () => {
    // 测试切换托管状态
    // 测试调度器更新
    // 测试自动出牌触发
  })
  
  describe('initializeTracking', () => {
    // 测试追踪模块初始化
    // 测试配置检查
  })
})
```

#### 3. `useMultiPlayerGame` Hook 测试
**文件**: `tests/useMultiPlayerGame.test.ts` (新建)

**测试内容**:
```typescript
describe('useMultiPlayerGame Hook', () => {
  describe('startGame', () => {
    // 测试调用 Game.startGameWithDealing
    // 测试 React 状态更新
    // 测试更新回调设置
  })
  
  describe('resetGame', () => {
    // 测试调用 Game.reset
  })
  
  describe('toggleAutoPlay', () => {
    // 测试调用 Game.toggleAutoPlay
  })
  
  describe('handleDealingComplete', () => {
    // 测试调用 Game.handleDealingComplete
    // 测试 React 状态管理
  })
  
  describe('handleDealingCancel', () => {
    // 测试调用 Game.handleDealingCancel
    // 测试 React 状态管理
  })
})
```

## 🗂️ 测试文件详细审查清单

### 核心游戏逻辑测试

| 测试文件 | 状态 | 需要操作 | 优先级 |
|---------|------|---------|--------|
| `gameState.test.ts` | ✅ 存在 | 更新：添加 `Game` 静态和实例方法测试 | 高 |
| `gameLogic.test.ts` | ✅ 存在 | 检查：确保不依赖已删除的回调 | 中 |
| `gameController.test.ts` | ✅ 存在 | 更新：测试 `controller.subscribe({})` 初始化 | 中 |
| `useMultiPlayerGame.test.ts` | ❌ **不存在** | **创建**：完整的 Hook 测试 | **高** |

### 系统模块测试

| 测试文件 | 状态 | 需要操作 | 优先级 |
|---------|------|---------|--------|
| `system/audioModule.test.ts` | ✅ 存在 | 更新：`announcePass` 现在直接调用服务 | 中 |
| `system/trackingModule.test.ts` | ✅ 存在 | 检查：确保测试 `cardTracker` 直接调用 | 中 |

### 回归测试

| 测试文件 | 状态 | 需要操作 | 优先级 |
|---------|------|---------|--------|
| `refactorRegression.test.ts` | ✅ 存在 | **审查**：检查是否测试已删除的回调 | **高** |
| `regression.test.ts` | ✅ 存在 | 检查：确保不依赖已删除的回调 | 中 |
| `regressionAllFeatures.test.ts` | ✅ 存在 | 检查：确保不依赖已删除的回调 | 中 |

### 异步测试标记

| 测试文件 | 当前标记 | 需要标记 | 原因 |
|---------|---------|---------|------|
| `system/audioModule.test.ts` | `@async` | ✅ 保持 | 测试 TTS 服务 |
| `gameState.test.ts` | 无 | 🟡 **添加 `@async`** | 如果测试 `reset()` 或 `initializeTracking()` |
| `useMultiPlayerGame.test.ts` | 无 | 🟡 **添加 `@async`** | 如果测试异步方法 |

## 🔍 详细审查步骤

### 步骤 1: 搜索已删除的接口

**需要搜索的模式**:
```bash
# 在 tests 目录中搜索
grep -r "playCallbacks" tests/
grep -r "setPlayCallbacks" tests/
grep -r "moduleCallbacks" tests/
grep -r "announcePassAudio" tests/
grep -r "recordTrackingPlay" tests/
grep -r "announcePlayAudio" tests/
grep -r "isAutoPlay.*callback" tests/
grep -r "checkVoiceSpeaking.*callback" tests/
grep -r "waitForVoice.*callback" tests/
```

### 步骤 2: 检查测试覆盖

**需要检查的方法**:
- ✅ `Game.createAndStartNewGame()` - 是否有测试？
- ✅ `Game.startGameWithDealing()` - 是否有测试？
- ✅ `Game.handleDealingComplete()` - 是否有测试？
- ✅ `Game.handleDealingCancel()` - 是否有测试？
- ✅ `Game.reset()` - 是否有测试？
- ✅ `Game.toggleAutoPlay()` - 是否有测试？
- ✅ `Game.initializeTracking()` - 是否有测试？
- ✅ `useMultiPlayerGame` Hook - 是否有测试？

### 步骤 3: 标记测试

**标记规则**:
- `@async` - 涉及异步服务调用（TTS、追踪模块等）
- `@broken` - 测试已删除的接口
- `@deprecated` - 测试已废弃但保留的方法
- `@ui` - React Hook 测试（如果涉及 UI 渲染）

## 📋 工作流

### 阶段 1: 审查和标记（当前阶段）

1. ✅ 识别所有受影响的测试文件
2. ✅ 标记需要删除的测试
3. ✅ 标记需要更新的测试
4. ✅ 标记需要新增的测试
5. ✅ 标记异步测试

### 阶段 2: 删除废弃测试

1. 删除测试 `playCallbacks` 的测试用例
2. 删除测试已删除回调接口的测试用例
3. 更新 `BROKEN_TESTS.md`

### 阶段 3: 更新现有测试

1. 更新 `gameState.test.ts` - 添加 `Game` 方法测试
2. 更新 `system/audioModule.test.ts` - 更新服务调用测试
3. 更新 `refactorRegression.test.ts` - 移除回调测试
4. 更新所有依赖已删除接口的测试

### 阶段 4: 创建新测试

1. 创建 `useMultiPlayerGame.test.ts` - Hook 完整测试
2. 创建或更新 `Game` 静态方法测试
3. 创建或更新 `Game` 实例方法测试

### 阶段 5: 验证和文档

1. 运行所有测试，确保通过
2. 更新 `TEST_CATEGORIES.md`
3. 更新测试文档

## 🎯 优先级排序

### 高优先级（立即处理）

1. **创建 `useMultiPlayerGame.test.ts`** - Hook 是核心接口
2. **审查 `refactorRegression.test.ts`** - 可能包含已删除的回调测试
3. **更新 `gameState.test.ts`** - 添加 `Game` 方法测试

### 中优先级（尽快处理）

1. 更新 `system/audioModule.test.ts` - 服务调用变更
2. 检查所有回归测试 - 确保不依赖已删除的回调
3. 标记异步测试

### 低优先级（后续处理）

1. 优化测试性能
2. 添加边界情况测试
3. 完善测试文档

## 📝 注意事项

1. **不要删除测试文件** - 只删除或更新测试用例
2. **保留测试历史** - 使用 `@deprecated` 标记而不是立即删除
3. **异步测试** - 确保正确标记 `@async`，避免在快速测试中运行
4. **Mock 服务** - 更新 Mock 以反映新的直接服务调用
5. **测试隔离** - 确保测试不依赖其他测试的状态

## 🔗 相关文档

- `tests/TEST_CATEGORIES.md` - 测试分类
- `tests/BROKEN_TESTS.md` - 失败的测试
- `tests/ASYNC_TIMEOUT_TESTING_GUIDE.md` - 异步测试指南
- `docs/testing/` - 测试文档目录


# 测试用例更新工作流执行计划

## 📋 执行概览

本文档提供了详细的测试用例更新工作流，按照优先级和依赖关系组织。

## 🎯 执行阶段

### 阶段 0: 准备工作（当前阶段）

**目标**: 完成审查和规划

**任务清单**:
- [x] ✅ 完成代码变更分析
- [x] ✅ 完成测试用例审查报告
- [x] ✅ 创建工作流执行计划
- [ ] ⏳ 搜索所有受影响的测试用例
- [ ] ⏳ 创建测试更新任务清单

**输出**:
- `TEST_REVIEW_2024_REFACTOR.md` - 审查报告
- `TEST_WORKFLOW_EXECUTION_PLAN.md` - 本文件
- 受影响测试文件列表

---

### 阶段 1: 搜索和标记（1-2小时）

**目标**: 找出所有需要更新的测试用例

#### 任务 1.1: 搜索已删除的接口引用

**命令**:
```bash
# 在 tests 目录中搜索已删除的接口
cd tests
grep -r "playCallbacks" . > ../docs/testing/affected_tests_playCallbacks.txt
grep -r "setPlayCallbacks" . > ../docs/testing/affected_tests_setPlayCallbacks.txt
grep -r "moduleCallbacks" . > ../docs/testing/affected_tests_moduleCallbacks.txt
grep -r "announcePassAudio" . > ../docs/testing/affected_tests_announcePassAudio.txt
grep -r "recordTrackingPlay" . > ../docs/testing/affected_tests_recordTrackingPlay.txt
grep -r "announcePlayAudio" . > ../docs/testing/affected_tests_announcePlayAudio.txt
grep -r "isAutoPlay.*callback\|callback.*isAutoPlay" . > ../docs/testing/affected_tests_isAutoPlay.txt
grep -r "checkVoiceSpeaking.*callback\|callback.*checkVoiceSpeaking" . > ../docs/testing/affected_tests_checkVoiceSpeaking.txt
grep -r "waitForVoice.*callback\|callback.*waitForVoice" . > ../docs/testing/affected_tests_waitForVoice.txt
```

**输出**: 生成受影响测试文件列表

#### 任务 1.2: 搜索需要新增测试的方法

**命令**:
```bash
# 搜索是否已有测试覆盖新方法
grep -r "createAndStartNewGame\|startGameWithDealing\|handleDealingComplete\|handleDealingCancel" .
grep -r "Game\.reset\|game\.reset" .
grep -r "Game\.toggleAutoPlay\|game\.toggleAutoPlay" .
grep -r "initializeTracking" .
grep -r "useMultiPlayerGame" .
```

**输出**: 识别缺失的测试覆盖

#### 任务 1.3: 创建测试更新任务清单

**文件**: `docs/testing/TEST_UPDATE_TASKS.md`

**内容结构**:
```markdown
# 测试更新任务清单

## 需要删除的测试用例
- [ ] 文件: `tests/xxx.test.ts`
  - [ ] 测试用例: "测试 playCallbacks.onPlay"
  - [ ] 原因: playCallbacks 已删除

## 需要更新的测试用例
- [ ] 文件: `tests/xxx.test.ts`
  - [ ] 测试用例: "测试 announcePassAudio"
  - [ ] 更新为: 直接测试 `announcePass` 服务调用

## 需要新增的测试用例
- [ ] 文件: `tests/useMultiPlayerGame.test.ts` (新建)
  - [ ] 测试用例: "测试 startGame 调用 Game.startGameWithDealing"
```

**输出**: 详细的任务清单

---

### 阶段 2: 删除废弃测试（30分钟）

**目标**: 清理已删除接口的测试

#### 任务 2.1: 删除 playCallbacks 相关测试

**文件**: 根据阶段 1 的搜索结果

**操作**:
1. 打开每个受影响的测试文件
2. 删除或注释掉测试 `playCallbacks` 的测试用例
3. 添加注释说明删除原因

**示例**:
```typescript
// ❌ 已删除：playCallbacks 接口已从 Game 类中移除
// describe('playCallbacks', () => {
//   it('应该设置 playCallbacks', () => {
//     // ...
//   })
// })
```

#### 任务 2.2: 更新 BROKEN_TESTS.md

**操作**:
1. 添加新章节："已删除接口的测试"
2. 列出所有删除的测试用例
3. 说明删除原因

---

### 阶段 3: 更新现有测试（2-3小时）

**目标**: 更新受影响的现有测试

#### 任务 3.1: 更新 gameState.test.ts

**需要添加的测试**:
```typescript
describe('Game 静态方法', () => {
  describe('createAndStartNewGame', () => {
    it('应该创建新游戏并初始化追踪模块', async () => {
      // 测试逻辑
    })
  })
  
  describe('startGameWithDealing', () => {
    it('应该自动发牌并开始游戏', () => {
      // 测试逻辑
    })
  })
  
  describe('handleDealingComplete', () => {
    it('应该使用指定手牌创建游戏', () => {
      // 测试逻辑
    })
  })
  
  describe('handleDealingCancel', () => {
    it('应该是占位方法', () => {
      // 测试逻辑
    })
  })
})

describe('Game 实例方法', () => {
  describe('reset', () => {
    it('应该重置游戏状态并清除聊天消息', async () => {
      // 测试逻辑
    })
  })
  
  describe('toggleAutoPlay', () => {
    it('应该切换托管状态', () => {
      // 测试逻辑
    })
  })
  
  describe('initializeTracking', () => {
    it('应该初始化追踪模块', () => {
      // 测试逻辑
    })
  })
})
```

**标记**: 如果测试异步操作，添加 `@async` 标签

#### 任务 3.2: 更新 system/audioModule.test.ts

**需要更新的测试**:
- `announcePlay` 测试 - 确保测试直接服务调用
- `announcePass` 测试 - 确保测试直接服务调用

**检查点**:
- ✅ Mock 是否正确设置
- ✅ 是否测试了直接服务调用
- ✅ 是否标记了 `@async`

#### 任务 3.3: 更新 refactorRegression.test.ts

**需要检查**:
- 是否测试了已删除的回调接口
- 是否测试了新的静态方法
- 是否测试了新的实例方法

**操作**:
1. 删除测试已删除接口的测试用例
2. 添加测试新方法的测试用例

---

### 阶段 4: 创建新测试（3-4小时）

**目标**: 创建缺失的测试文件

#### 任务 4.1: 创建 useMultiPlayerGame.test.ts

**文件位置**: `tests/useMultiPlayerGame.test.ts`

**测试内容**:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMultiPlayerGame } from '../src/hooks/useMultiPlayerGame'
import { Game } from '../src/utils/Game'

// Mock Game 类
vi.mock('../src/utils/Game', () => ({
  Game: {
    startGameWithDealing: vi.fn(),
    handleDealingComplete: vi.fn(),
    handleDealingCancel: vi.fn(),
  }
}))

describe('useMultiPlayerGame Hook', () => {
  // 测试 startGame
  // 测试 resetGame
  // 测试 toggleAutoPlay
  // 测试 handleDealingComplete
  // 测试 handleDealingCancel
  // 测试 React 状态管理
})
```

**标记**: 如果测试异步操作，添加 `@async` 标签

#### 任务 4.2: 创建或更新 Game 静态方法测试

**选项 A**: 在 `gameState.test.ts` 中添加
**选项 B**: 创建新文件 `tests/gameStaticMethods.test.ts`

**建议**: 选项 A（保持测试集中）

#### 任务 4.3: 创建或更新 Game 实例方法测试

**选项 A**: 在 `gameState.test.ts` 中添加
**选项 B**: 创建新文件 `tests/gameInstanceMethods.test.ts`

**建议**: 选项 A（保持测试集中）

---

### 阶段 5: 标记和分类（30分钟）

**目标**: 正确标记所有测试

#### 任务 5.1: 标记异步测试

**规则**:
- 测试 `Game.reset()` - 标记 `@async`（调用 `clearChatMessages()`）
- 测试 `Game.initializeTracking()` - 标记 `@async`（调用 `cardTracker.initialize()`）
- 测试 `announcePass` / `announcePlay` - 标记 `@async`（TTS 调用）
- 测试 `useMultiPlayerGame` Hook - 如果测试异步操作，标记 `@async`

**操作**:
在每个测试文件顶部或测试用例中添加标签：
```typescript
/**
 * @async
 */
describe('Game.reset', () => {
  // ...
})
```

#### 任务 5.2: 更新 TEST_CATEGORIES.md

**操作**:
1. 添加新测试文件到相应分类
2. 更新测试统计
3. 标记新增的异步测试

---

### 阶段 6: 验证和文档（1小时）

**目标**: 确保所有测试通过并更新文档

#### 任务 6.1: 运行测试

**命令**:
```bash
# 运行快速测试（跳过慢测试）
npm run test:fast

# 运行所有测试
npm run test:realtime
```

**检查点**:
- ✅ 所有新测试通过
- ✅ 所有更新的测试通过
- ✅ 没有新的失败测试

#### 任务 6.2: 更新文档

**需要更新的文档**:
- `tests/TEST_CATEGORIES.md` - 添加新测试文件
- `tests/BROKEN_TESTS.md` - 更新删除的测试列表
- `docs/testing/TEST_REVIEW_2024_REFACTOR.md` - 标记完成的任务

#### 任务 6.3: 创建测试总结

**文件**: `docs/testing/TEST_UPDATE_SUMMARY.md`

**内容**:
- 更新的测试文件列表
- 新增的测试文件列表
- 删除的测试用例列表
- 测试覆盖率变化
- 已知问题

---

## 📊 进度跟踪

### 任务完成检查清单

#### 阶段 0: 准备工作
- [x] 完成代码变更分析
- [x] 完成测试用例审查报告
- [x] 创建工作流执行计划
- [ ] 搜索所有受影响的测试用例
- [ ] 创建测试更新任务清单

#### 阶段 1: 搜索和标记
- [ ] 搜索已删除的接口引用
- [ ] 搜索需要新增测试的方法
- [ ] 创建测试更新任务清单

#### 阶段 2: 删除废弃测试
- [ ] 删除 playCallbacks 相关测试
- [ ] 更新 BROKEN_TESTS.md

#### 阶段 3: 更新现有测试
- [ ] 更新 gameState.test.ts
- [ ] 更新 system/audioModule.test.ts
- [ ] 更新 refactorRegression.test.ts

#### 阶段 4: 创建新测试
- [ ] 创建 useMultiPlayerGame.test.ts
- [ ] 创建或更新 Game 静态方法测试
- [ ] 创建或更新 Game 实例方法测试

#### 阶段 5: 标记和分类
- [ ] 标记异步测试
- [ ] 更新 TEST_CATEGORIES.md

#### 阶段 6: 验证和文档
- [ ] 运行测试并验证通过
- [ ] 更新文档
- [ ] 创建测试总结

---

## 🎯 优先级矩阵

| 任务 | 优先级 | 预计时间 | 依赖 |
|------|--------|---------|------|
| 搜索受影响的测试 | 高 | 30分钟 | 无 |
| 创建 useMultiPlayerGame.test.ts | 高 | 2小时 | 阶段 1 |
| 更新 gameState.test.ts | 高 | 1.5小时 | 阶段 1 |
| 更新 refactorRegression.test.ts | 中 | 1小时 | 阶段 1 |
| 删除废弃测试 | 中 | 30分钟 | 阶段 1 |
| 更新 system/audioModule.test.ts | 中 | 1小时 | 阶段 1 |
| 标记异步测试 | 低 | 30分钟 | 阶段 4 |
| 更新文档 | 低 | 30分钟 | 阶段 6 |

---

## 📝 注意事项

1. **不要破坏现有测试** - 在删除或修改测试前，确保理解其目的
2. **保持测试隔离** - 确保新测试不依赖其他测试的状态
3. **Mock 服务** - 正确 Mock 所有外部服务调用
4. **异步测试** - 正确使用 `@async` 标签，避免在快速测试中运行
5. **测试覆盖** - 确保新方法有足够的测试覆盖
6. **文档同步** - 及时更新测试文档

---

## 🔗 相关资源

- `docs/testing/TEST_REVIEW_2024_REFACTOR.md` - 详细审查报告
- `tests/TEST_CATEGORIES.md` - 测试分类
- `tests/BROKEN_TESTS.md` - 失败的测试
- `tests/ASYNC_TIMEOUT_TESTING_GUIDE.md` - 异步测试指南


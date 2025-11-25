# 测试分类快速参考

## 🏷️ 测试标签说明

测试文件已添加标签，方便分类和筛选：

- `@ui` - 界面交互测试（UI 组件渲染、DOM 操作）
- `@async` - 异步调用测试（Promise、定时器、外部服务）
- `@slow` - 慢测试（MCTS 微调、训练，耗时 1-40 分钟）
- `@broken` - 失败的测试（需要修复，已从快速测试中排除）

## 📋 测试文件分类

### 界面交互测试 (@ui)

| 测试文件 | 说明 | 优化状态 |
|---------|------|---------|
| `dealingAnimation.test.ts` | 发牌动画组件 | ✅ 已优化（30s → <1s） |
| `useChatBubbles.test.ts` | 聊天气泡 Hook | ✅ 正常 |
| `compactHandCards.test.tsx` | 紧凑型手牌组件 | ✅ 新增 |

### 异步调用测试 (@async)

| 测试文件 | 说明 | 优化状态 |
|---------|------|---------|
| `speechIntegration.test.ts` | 语音功能集成测试 | ✅ 已优化（减少等待时间） |
| `speechUtils.test.ts` | 语音工具测试 | ✅ 已优化（减少等待时间） |
| `chatAndVoiceRegression.test.ts` | 聊天和语音回归测试 | ✅ 正常 |
| `chatServiceRegression.test.ts` | 聊天服务回归测试 | ✅ 正常 |
| `i18n.test.ts` | 多语言功能测试 | ✅ 已优化（减少等待时间） |
| `serialVoicePlayback.test.ts` | 串行播放单元测试 | ✅ 新增 |
| `serialVoicePlaybackRegression.test.ts` | 串行播放回归测试 | ✅ 新增 |
| `voiceServiceCleanup.test.ts` | 清理后功能验证测试 | ✅ 新增 |
| `chatSceneProcessors.test.ts` | 聊天场景处理器单元测试 | ✅ 新增 |
| `chatSceneFactory.test.ts` | 聊天场景工厂测试 | ✅ 新增 |
| `chatSceneRegression.test.ts` | 聊天场景化系统回归测试 | ✅ 新增 |
| `chatReply.test.ts` | 聊天回复功能单元测试 | ✅ 新增 |
| `chatReplyRegression.test.ts` | 聊天回复功能回归测试 | ✅ 新增 |

### 慢测试 (@slow)

| 测试文件 | 说明 | 预计耗时 | 优化状态 |
|---------|------|---------|---------|
| `mctsTuning.test.ts` | MCTS 微调测试 | 2-10 分钟 | ⚠️ 需要长时间运行 |
| `mctsTrainingRegression.test.ts` | MCTS 训练回归测试 | 1-2 分钟 | ⚠️ 需要长时间运行 |
| `mctsTuningWithProgress.test.ts` | MCTS 微调（带进度条） | ~5 分钟 | ⚠️ 需要长时间运行 |
| `mctsTuningQuick.test.ts` | MCTS 微调快速验证 | 1-2 分钟 | ⚠️ 需要长时间运行 |
| `quickTuningFast.test.ts` | 超快速微调测试 | ~5 分钟 | ⚠️ 需要长时间运行 |
| `runQuickTuning.test.ts` | 快速微调测试 | 30-40 分钟 | ⚠️ 极慢，必须跳过 |

### 失败的测试 (@broken)

| 测试文件 | 说明 | 问题 | 状态 |
|---------|------|------|------|
| `chatService.test.ts` | 聊天服务测试 | 2个测试失败（异步问题） | 🔴 需要修复 |
| `chatSystem.test.ts` | 聊天系统测试 | 10个测试失败（异步问题） | 🔴 需要修复 |
| `dealingManualMode.test.ts` | 手动发牌模式测试 | 4个测试超时（30秒） | 🔴 需要修复 |

## 🚀 快速命令

### ⚠️ 重要提示：实时输出

**所有测试命令都配置为实时输出，请直接运行，不要使用 `tail`、`head` 等会缓冲输出的命令。**

```bash
# ✅ 正确：直接运行，实时查看输出
npm run test:fast

# ❌ 错误：使用 tail 会缓冲输出，看不到实时信息
npm run test:fast | tail -50
```

### 日常开发（推荐）

```bash
# 最快：跳过所有慢测试（实时输出）
npm run test:fast
```

### 选择性运行

```bash
# 跳过 UI 测试
npm run test:no-ui

# 跳过异步测试
npm run test:no-async

# 只运行 UI 测试
npm run test:ui-only

# 只运行异步测试
npm run test:async-only

# 只运行慢测试（MCTS 微调相关）
npm run test:slow-only
```

### 完整测试

```bash
# 运行所有测试（包括慢测试）
npm run test:realtime
```

## ⚡ 性能对比

| 测试模式 | 包含测试 | 预计耗时 |
|---------|---------|---------|
| `test:fast` | 核心逻辑测试（跳过 UI、异步、慢测试） | ~2-5 分钟 |
| `test:no-ui` | 核心 + 异步测试 | ~3-6 分钟 |
| `test:no-async` | 核心 + UI 测试 | ~2-4 分钟 |
| `test:slow-only` | 只运行 MCTS 微调相关慢测试 | ~30-60 分钟 |
| `test:realtime` | 所有测试（包括慢测试） | ~35-70 分钟 |

*实际耗时取决于测试数量和机器性能*

## 📝 优化记录

### dealingAnimation.test.ts

**优化前：**
- 等待时间：35000ms（4 玩家 × 54 张牌 × 150ms）
- 总耗时：~30 秒

**优化后：**
- 使用 `dealingSpeed={1}` 参数
- 使用 fake timers 快速推进时间
- 总耗时：<1 秒

### 异步测试

**优化前：**
- `setTimeout(resolve, 10)` 或更长
- 多个测试累积等待时间较长

**优化后：**
- `setTimeout(resolve, 1)` 
- 减少不必要的等待
- 总耗时减少约 50-70%

## 💡 使用建议

1. **日常开发**：使用 `npm run test:fast` 快速验证（推荐）
2. **提交前**：运行 `npm run test:realtime` 确保所有测试通过
3. **调试 UI**：使用 `npm run test:ui-only` 专注 UI 测试
4. **调试异步**：使用 `npm run test:async-only` 专注异步测试
5. **MCTS 微调**：使用 `npm run test:slow-only` 运行 MCTS 相关测试（需要较长时间）
6. **⚠️ 注意**：`runQuickTuning.test.ts` 需要 30-40 分钟，平时必须跳过

## 📖 测试最佳实践

### 异步和超时测试

如果遇到异步操作或超时问题，请参考：

- **`ASYNC_TIMEOUT_TESTING_GUIDE.md`** - 异步和超时测试完整指南
  - ✅ 使用 `vi.useFakeTimers()` 和 `vi.advanceTimersByTimeAsync()`
  - ✅ 使用 `findBy*` 替代 `getBy*` + `waitFor`
  - ✅ 使用 `act()` 包装状态更新
  - ✅ Mock 复杂的异步依赖
  - ❌ 避免使用 `vi.runAllTimersAsync()`（可能导致无限循环）

### UI 测试

参考 `UI_TESTING_GUIDE.md` 了解 UI 组件测试的最佳实践。


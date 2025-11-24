# 测试策略文档

## 📋 测试运行配置

### ⚠️ 重要提示：实时输出

**所有测试命令都配置为实时输出模式，请直接运行命令，不要使用 `tail`、`head` 等会缓冲输出的命令。**

**为什么需要实时输出？**
- 可以实时看到测试进度，判断测试是否正常运行
- 可以及时发现测试卡住或死机的情况
- 可以实时查看测试输出和错误信息

**❌ 错误用法（会缓冲输出，看不到实时信息）：**
```bash
npm run test:fast | tail -50  # ❌ 看不到实时输出
npm run test:fast | head -100 # ❌ 看不到实时输出
```

**✅ 正确用法（实时输出）：**
```bash
npm run test:fast  # ✅ 直接运行，实时查看输出
```

### 实时输出配置

为了获得最佳的测试实时输出体验，项目已配置以下设置：

#### 1. Vitest 配置文件 (`vitest.config.ts`)

关键配置项：

```typescript
// 实时输出关键配置
sequence: {
  shuffle: false,
  concurrent: false, // 串行执行确保实时输出，避免输出混乱
  hooks: 'stack' // 串行执行 hooks
},
// 使用 verbose 报告器显示详细实时输出
reporters: ['verbose', SimpleProgressReporter],
// 确保所有输出都显示（包括 console.log, stdout, stderr）
silent: false
```

**配置说明：**
- `concurrent: false` - 串行执行测试，确保输出不会混乱，可以实时看到每个测试的进度
- `reporters: ['verbose']` - 使用详细报告器，显示每个测试的实时状态
- `silent: false` - 确保所有输出（包括 console.log）都能实时显示

#### 2. 测试脚本命令

**实时输出测试命令：**

```bash
# 方式1：使用 npm 脚本（推荐）
npm run test:realtime

# 方式2：直接使用 vitest 命令
npm test -- --run --reporter=verbose --no-coverage

# 方式3：使用 verbose 脚本（与 realtime 相同）
npm run test:verbose
```

**命令参数说明：**
- `--run` - 运行一次测试后退出（非 watch 模式）
- `--reporter=verbose` - 使用详细报告器，显示实时测试进度
- `--no-coverage` - 不生成覆盖率报告，加快测试速度

#### 3. 其他测试脚本

项目还提供了其他测试脚本，位于 `package.json`：

```json
{
  "test": "vitest",                    // 默认测试（watch 模式）
  "test:ui": "vitest --ui",            // UI 模式
  "test:coverage": "vitest --coverage", // 带覆盖率
  "test:quick": "vitest --run --no-coverage", // 快速测试
  "test:verbose": "vitest --run --reporter=verbose --no-coverage", // 详细输出
  "test:realtime": "vitest --run --reporter=verbose --no-coverage" // 实时输出（推荐）
}
```

## 🎯 测试最佳实践

### 实时输出使用场景

**推荐使用实时输出的场景：**
1. ✅ 调试失败的测试 - 可以看到详细的错误信息和执行流程
2. ✅ 长时间运行的测试 - 可以实时看到进度，了解测试状态
3. ✅ 性能测试 - 可以看到每个测试的耗时
4. ✅ 集成测试 - 可以看到完整的测试流程

**不推荐使用实时输出的场景：**
1. ❌ CI/CD 环境 - 使用默认报告器即可
2. ❌ 快速验证 - 使用 `test:quick` 脚本
3. ❌ 需要覆盖率报告时 - 使用 `test:coverage` 脚本

### 测试输出示例

使用实时输出时，你会看到类似这样的输出：

```
✓ tests/chatContent.test.ts (7) 128ms
  ✓ chatContent (7) 120ms
    ✓ 应该返回好牌反应（普通话）
    ✓ 应该返回好牌反应（粤语）
    ✓ 应该返回对骂内容（普通话）
    ...

✓ tests/usePlayerHand.test.ts (9) 823ms
  ✓ usePlayerHand (9) 818ms
    ✓ 应该能够清空选中的牌
    ✓ 应该按点数正确分组手牌
    ...
```

每个测试都会实时显示：
- ✅ 测试名称
- ⏱️ 执行时间
- 📊 测试套件结构
- 🔍 详细的测试结果

## 🔧 配置维护

### 如何修改实时输出配置

1. **修改默认报告器：**
   编辑 `vitest.config.ts` 中的 `reporters` 配置

2. **修改并发设置：**
   编辑 `vitest.config.ts` 中的 `sequence.concurrent` 配置

3. **添加新的测试脚本：**
   在 `package.json` 的 `scripts` 部分添加新命令

### 注意事项

⚠️ **重要提示：**
- **所有测试命令都使用实时输出模式**，不要使用 `tail`、`head` 等会缓冲输出的命令
- 实时输出可以让你判断测试是否正常运行，及时发现卡住或死机的情况
- 实时输出会增加测试执行时间（因为串行执行）
- 在 CI 环境中，建议使用默认报告器以提高速度
- 如果测试输出混乱，检查 `sequence.concurrent` 是否为 `false`

## 🏷️ 测试分类和标签

### 测试分类

为了优化测试执行速度，我们将测试分为以下几类：

#### 1. 界面交互测试 (@ui)

这些测试涉及 UI 组件渲染和用户交互，通常较慢：

- `tests/dealingAnimation.test.ts` - 发牌动画组件（已优化：从 30s 降至 <1s）
- `tests/useChatBubbles.test.ts` - 聊天气泡 Hook

**特点：**
- 需要渲染 React 组件
- 涉及 DOM 操作和动画
- 执行时间较长

#### 2. 异步调用测试 (@async)

这些测试涉及异步操作和外部服务调用：

- `tests/speechIntegration.test.ts` - 语音功能集成测试
- `tests/speechUtils.test.ts` - 语音工具测试
- `tests/chatAndVoiceRegression.test.ts` - 聊天和语音回归测试
- `tests/chatServiceRegression.test.ts` - 聊天服务回归测试
- `tests/i18n.test.ts` - 多语言功能测试（已优化：减少等待时间）

**特点：**
- 涉及 Promise 和异步等待
- 需要模拟外部服务（如语音合成）
- 包含网络请求或定时器
- 语言切换是异步操作，需要等待资源加载

#### 3. 慢测试 (@slow)

这些测试涉及 MCTS 算法微调和训练，需要长时间运行：

- `tests/mctsTuning.test.ts` - MCTS 微调测试（2-10 分钟）
- `tests/mctsTrainingRegression.test.ts` - MCTS 训练回归测试（1-2 分钟）
- `tests/mctsTuningWithProgress.test.ts` - MCTS 微调（带进度条，~5 分钟）
- `tests/mctsTuningQuick.test.ts` - MCTS 微调快速验证（1-2 分钟）
- `tests/quickTuningFast.test.ts` - 超快速微调测试（~5 分钟）
- `tests/runQuickTuning.test.ts` - 快速微调测试（30-40 分钟）⚠️ 极慢

**特点：**
- 需要运行大量游戏对局
- 涉及 MCTS 算法参数优化
- 执行时间从 1 分钟到 40 分钟不等

### 跳过慢测试

**日常开发推荐使用：**

```bash
# 跳过所有 UI、异步和慢测试（最快，日常开发推荐）
npm run test:fast

# 只跳过 UI 测试
npm run test:no-ui

# 只跳过异步测试
npm run test:no-async

# 只运行慢测试（MCTS 微调相关）
npm run test:slow-only
```

**运行特定类型的测试：**

```bash
# 只运行 UI 测试
npm run test:ui-only

# 只运行异步测试
npm run test:async-only
```

### 测试优化

已优化的测试：

1. **dealingAnimation.test.ts**
   - 优化前：30+ 秒（等待 35000ms 动画）
   - 优化后：<1 秒（使用 1ms 发牌速度 + fake timers）
   - 优化方法：在测试中传入 `dealingSpeed={1}` 参数

2. **异步测试等待时间**
   - 优化前：`setTimeout(resolve, 10)` 或更长
   - 优化后：`setTimeout(resolve, 1)` 
   - 优化方法：减少不必要的等待时间

### 测试脚本说明

```json
{
  "test:fast": "跳过所有 UI 和异步测试，快速运行核心测试",
  "test:no-ui": "跳过 UI 测试，保留异步测试",
  "test:no-async": "跳过异步测试，保留 UI 测试",
  "test:ui-only": "只运行 UI 相关测试",
  "test:async-only": "只运行异步相关测试",
  "test:realtime": "实时输出所有测试（包括慢测试）",
  "test:verbose": "详细输出所有测试"
}
```

## 📝 更新记录

- **2024-XX-XX**: 添加实时输出配置到测试策略文档
- 配置了 `test:realtime` 和 `test:verbose` 脚本
- 在 `vitest.config.ts` 中添加了实时输出相关注释
- **2024-XX-XX**: 添加测试分类和跳过慢测试功能
- 优化了 `dealingAnimation.test.ts`（从 30s 降至 <1s）
- 优化了异步测试的等待时间
- 添加了 `test:fast`, `test:no-ui`, `test:no-async` 等脚本


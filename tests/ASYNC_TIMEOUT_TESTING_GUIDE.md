# 异步和超时测试最佳实践指南

## 📚 概述

本指南总结了项目中处理异步操作和超时测试的最佳实践，基于已有的成功测试案例和失败测试的分析。

## ✅ 成功案例参考

以下测试文件展示了正确的异步和超时测试方法：

1. **`dealingAnimation.test.ts`** - 使用 fake timers 优化测试（30s → <1s）
2. **`serialVoicePlayback.test.ts`** - 异步语音播放测试
3. **`i18n.test.ts`** - 异步语言切换测试（已优化等待时间）

## 🎯 核心原则

### 1. 使用 Fake Timers（推荐）

✅ **正确做法**：
```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('应该处理异步操作', async () => {
  // 执行异步操作
  const promise = someAsyncFunction();
  
  // 精确推进时间，只推进需要的时长
  await vi.advanceTimersByTimeAsync(100); // 100ms
  
  // 等待 Promise 完成
  await promise;
});
```

❌ **错误做法**：
```typescript
// 不要使用 runAllTimersAsync()，会导致无限循环
await vi.runAllTimersAsync(); // ❌ 可能导致无限循环

// 不要推进太长时间
await vi.advanceTimersByTimeAsync(10000); // ❌ 可能触发太多定时器
```

### 2. 使用 `findBy*` 自动等待

✅ **正确做法**：
```typescript
import { screen } from '@testing-library/react';

// findBy* 会自动等待元素出现，最多等待 1 秒（默认）
const button = await screen.findByText(/切换到手动/, {}, { timeout: 2000 });
expect(button).toBeInTheDocument();
```

❌ **错误做法**：
```typescript
// getBy* 不会等待，如果元素不存在会立即失败
const button = screen.getByText(/切换到手动/); // ❌ 可能失败

// 手动使用 waitFor 更复杂
await waitFor(() => {
  expect(screen.getByText(/切换到手动/)).toBeInTheDocument();
}, { timeout: 2000 }); // ❌ 更复杂，容易出错
```

### 3. 使用 `act()` 包装状态更新

✅ **正确做法**：
```typescript
import { act } from '@testing-library/react';

await act(async () => {
  fireEvent.click(button);
  await vi.advanceTimersByTimeAsync(50); // 只推进必要的时长
});
```

### 4. Mock 复杂的异步依赖

✅ **正确做法**：
```typescript
// Mock 异步服务
vi.mock('../src/services/chatService', () => ({
  triggerRandomChat: vi.fn().mockResolvedValue({
    playerId: 0,
    playerName: '测试',
    content: '测试消息',
    timestamp: Date.now(),
    type: 'random'
  }),
  getChatMessages: vi.fn().mockReturnValue([])
}));

// Mock 语音服务
vi.mock('../src/services/voiceService', () => ({
  voiceService: {
    speak: vi.fn(() => Promise.resolve()),
    waitForVoices: vi.fn((callback) => callback())
  }
}));
```

### 5. 简化测试，只测试关键行为

✅ **正确做法**：
```typescript
it('应该能够触发聊天', async () => {
  // 只测试关键行为：触发聊天后，消息是否被添加
  const message = await triggerRandomChat(player, 1.0);
  expect(message).not.toBeNull();
  expect(message?.playerId).toBe(player.id);
});
```

❌ **错误做法**：
```typescript
it('应该能够触发聊天', async () => {
  // ❌ 测试太多细节：UI更新、语音播放、状态变化等
  // 这些应该分开测试
});
```

## 🔧 常见问题解决方案

### 问题1：Promise 未正确等待

**症状**：测试失败，提示 `expected undefined to be ...`

**解决方案**：
```typescript
// ✅ 确保所有异步函数都使用 await
const message = await triggerRandomChat(player, 1.0);

// ❌ 忘记 await
const message = triggerRandomChat(player, 1.0); // Promise 对象，不是结果
```

### 问题2：定时器无限循环

**症状**：测试超时或卡死

**解决方案**：
```typescript
// ✅ 精确控制时间
await vi.advanceTimersByTimeAsync(100); // 只推进 100ms

// ❌ 使用 runAllTimersAsync 可能导致无限循环
await vi.runAllTimersAsync(); // 不要使用
```

### 问题3：React 状态更新未等待

**症状**：断言失败，元素未找到

**解决方案**：
```typescript
// ✅ 使用 findBy* 自动等待
const element = await screen.findByText(/文本/, {}, { timeout: 2000 });

// ✅ 或使用 act + waitFor
await act(async () => {
  fireEvent.click(button);
  await vi.advanceTimersByTimeAsync(50);
});
await waitFor(() => {
  expect(screen.getByText(/文本/)).toBeInTheDocument();
});
```

### 问题4：Mock 配置不完整

**症状**：测试失败，提示函数未定义或返回 undefined

**解决方案**：
```typescript
// ✅ 确保所有需要的方法都被 mock
vi.mock('../src/services/chatService', () => ({
  triggerRandomChat: vi.fn().mockResolvedValue(mockMessage),
  triggerEventChat: vi.fn().mockResolvedValue(mockMessage),
  getChatMessages: vi.fn().mockReturnValue([]),
  clearChatMessages: vi.fn(),
  // ... 所有需要的方法
}));
```

### 问题5：i18n 语言设置

**症状**：`playToSpeechText` 返回英文而不是中文

**解决方案**：
```typescript
beforeEach(async () => {
  // 设置 i18n 为中文
  if (!i18n.isInitialized) {
    await i18n.init();
  }
  await i18n.changeLanguage('zh-CN');
  await new Promise(resolve => setTimeout(resolve, 20));
});
```

## 📋 测试模板

### 异步函数测试模板

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('异步函数测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock 依赖
    vi.mock('../src/services/someService', () => ({
      someAsyncFunction: vi.fn().mockResolvedValue(mockData)
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('应该正确处理异步操作', async () => {
    // 执行异步操作
    const promise = someAsyncFunction();
    
    // 推进时间
    await vi.advanceTimersByTimeAsync(100);
    
    // 等待完成
    const result = await promise;
    
    // 断言
    expect(result).toBeDefined();
  });
});
```

### UI 组件异步测试模板

```typescript
import { render, screen, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

describe('UI 组件异步测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('应该处理异步状态更新', async () => {
    render(<MyComponent />);

    // 使用 findBy* 自动等待
    const button = await screen.findByText(/按钮/, {}, { timeout: 2000 });
    
    // 使用 act 包装状态更新
    await act(async () => {
      fireEvent.click(button);
      await vi.advanceTimersByTimeAsync(50);
    });

    // 等待结果出现
    const result = await screen.findByText(/结果/, {}, { timeout: 1000 });
    expect(result).toBeInTheDocument();
  });
});
```

## 🚨 常见错误模式

### 错误1：忘记 await

```typescript
// ❌ 错误
const message = triggerRandomChat(player); // 返回 Promise
expect(message.playerId).toBe(0); // 失败：message 是 Promise

// ✅ 正确
const message = await triggerRandomChat(player);
expect(message?.playerId).toBe(0);
```

### 错误2：使用 runAllTimersAsync

```typescript
// ❌ 错误：可能导致无限循环
await vi.runAllTimersAsync();

// ✅ 正确：精确控制时间
await vi.advanceTimersByTimeAsync(100);
```

### 错误3：推进时间过长

```typescript
// ❌ 错误：可能触发太多定时器
await vi.advanceTimersByTimeAsync(10000);

// ✅ 正确：只推进必要的时长
await vi.advanceTimersByTimeAsync(100);
```

### 错误4：未等待 React 状态更新

```typescript
// ❌ 错误：状态可能还未更新
fireEvent.click(button);
expect(screen.getByText(/结果/)).toBeInTheDocument(); // 可能失败

// ✅ 正确：使用 findBy* 或 waitFor
const result = await screen.findByText(/结果/);
expect(result).toBeInTheDocument();
```

## 📊 性能优化技巧

### 1. 减少等待时间

```typescript
// ❌ 等待时间过长
await new Promise(resolve => setTimeout(resolve, 1000));

// ✅ 使用最小等待时间
await new Promise(resolve => setTimeout(resolve, 1)); // 1ms 足够
```

### 2. 使用 fake timers 加速

```typescript
// ❌ 真实等待 30 秒
await new Promise(resolve => setTimeout(resolve, 30000));

// ✅ 使用 fake timers，瞬间完成
vi.useFakeTimers();
await vi.advanceTimersByTimeAsync(30000); // 瞬间完成
```

### 3. Mock 耗时操作

```typescript
// ❌ 实际执行耗时操作
const result = await expensiveOperation();

// ✅ Mock 耗时操作
vi.mock('../src/utils/expensiveOperation', () => ({
  expensiveOperation: vi.fn().mockResolvedValue(mockResult)
}));
```

## 🎓 学习资源

参考以下成功的测试文件学习最佳实践：

1. **`tests/dealingAnimation.test.ts`** - UI 组件异步测试（已优化）
2. **`tests/serialVoicePlayback.test.ts`** - 异步语音播放测试
3. **`tests/i18n.test.ts`** - 异步语言切换测试（已优化）
4. **`tests/chatReply.test.ts`** - 异步聊天回复测试（新增）

## 📝 检查清单

在编写异步测试时，确保：

- [ ] 使用 `vi.useFakeTimers()` 和 `vi.advanceTimersByTimeAsync()`
- [ ] 避免使用 `vi.runAllTimersAsync()`
- [ ] 所有异步函数都使用 `await`
- [ ] 使用 `findBy*` 替代 `getBy*` + `waitFor`
- [ ] 使用 `act()` 包装状态更新
- [ ] Mock 所有复杂的异步依赖
- [ ] 只测试关键行为，不要测试所有细节
- [ ] 设置 i18n 语言（如果需要）
- [ ] 在 `afterEach` 中清理（`vi.useRealTimers()`, `vi.restoreAllMocks()`）

## 🔗 相关文档

- `tests/UI_TESTING_GUIDE.md` - UI 测试最佳实践
- `tests/DEALING_TEST_ANALYSIS.md` - 手动抓牌测试分析
- `tests/BROKEN_TESTS.md` - 失败测试列表和修复建议


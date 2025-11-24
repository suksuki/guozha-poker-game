# UI 测试最佳实践指南

## 问题分析

当前 `dealingManualMode.test.ts` 测试失败的主要原因：

1. **无限定时器循环**：`vi.runAllTimersAsync()` 会尝试运行所有定时器，但组件中有很多 `setInterval` 和 `setTimeout`，导致无限循环
2. **复杂的状态管理**：组件有多个 `useEffect` 和状态更新，需要精确控制时间
3. **异步操作未正确等待**：DOM 更新和状态更新是异步的，需要正确等待

## 解决方案

### 1. 避免使用 `vi.runAllTimersAsync()`

❌ **错误做法**：
```typescript
await vi.runAllTimersAsync(); // 会导致无限循环
```

✅ **正确做法**：
```typescript
// 精确控制时间，只推进需要的时长
await vi.advanceTimersByTimeAsync(100);
```

### 2. 使用 `findBy*` 替代 `getBy*` + `waitFor`

❌ **错误做法**：
```typescript
const button = screen.getByText(/切换到手动/);
await waitFor(() => {
  expect(button).toBeInTheDocument();
});
```

✅ **正确做法**：
```typescript
// findBy* 会自动等待元素出现
const button = await screen.findByText(/切换到手动/, {}, { timeout: 2000 });
```

### 3. 简化测试，只测试关键行为

❌ **错误做法**：测试所有细节，包括动画、定时器等
```typescript
it('应该能够切换到手动模式', async () => {
  // 测试完整的组件渲染、状态更新、DOM变化等
});
```

✅ **正确做法**：只测试关键的用户可见行为
```typescript
it('应该能够切换到手动模式', async () => {
  // 只测试：点击按钮后，UI 是否显示手动模式提示
  const button = await screen.findByText(/切换到手动/);
  await act(async () => {
    fireEvent.click(button);
    await vi.advanceTimersByTimeAsync(50); // 只推进必要的时长
  });
  
  // 检查关键UI元素
  const hint = await screen.findByText(/点击抓牌/, {}, { timeout: 1000 });
  expect(hint).toBeInTheDocument();
});
```

### 4. Mock 复杂的依赖

```typescript
// Mock voiceService（避免异步语音播放影响测试）
vi.mock('../src/services/voiceService', () => ({
  voiceService: {
    speak: vi.fn(() => Promise.resolve()),
    waitForVoices: vi.fn((callback) => callback())
  }
}));

// Mock i18n（避免国际化加载影响测试）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() }
  })
}));
```

### 5. 使用 `act` 包装状态更新

```typescript
await act(async () => {
  fireEvent.click(button);
  await vi.advanceTimersByTimeAsync(50);
});
```

### 6. 限制定时器推进时间

```typescript
// 不要推进太长时间，避免触发太多定时器
await vi.advanceTimersByTimeAsync(50); // 50ms 足够大多数状态更新

// 如果需要等待特定操作，使用精确的时间
await vi.advanceTimersByTimeAsync(dealingSpeed || 150);
```

### 7. 使用 `screen.debug()` 调试

```typescript
// 在测试中添加调试输出
screen.debug(); // 打印当前 DOM 结构
screen.debug(button); // 打印特定元素
```

### 8. 测试策略：分层测试

- **单元测试**：测试纯函数和逻辑
- **集成测试**：测试组件交互（简化版）
- **E2E 测试**：测试完整流程（使用 Playwright/Cypress）

对于复杂的 UI 组件，建议：
- 将复杂组件拆分成更小的组件
- 测试小组件而不是大组件
- 使用快照测试（snapshot testing）捕获 UI 变化

## 改进后的测试示例

```typescript
it('应该能够切换到手动模式', async () => {
  render(
    <DealingAnimation
      playerCount={2}
      humanPlayerIndex={0}
      players={mockPlayers}
      dealingConfig={mockDealingConfig}
      onComplete={mockOnComplete}
      dealingSpeed={1}
    />
  );

  // 等待组件初始化（精确控制时间）
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });

  // 使用 findBy* 自动等待按钮出现
  const modeButton = await screen.findByText(/切换到手动/, {}, { timeout: 1000 });
  
  // 点击按钮并推进时间
  await act(async () => {
    fireEvent.click(modeButton);
    await vi.advanceTimersByTimeAsync(50); // 只推进必要的时长
  });

  // 等待手动模式提示出现
  const hint = await screen.findByText(/点击抓牌/, {}, { timeout: 1000 });
  expect(hint).toBeInTheDocument();
}, 5000); // 减少超时时间
```

## 推荐的测试工具

1. **@testing-library/react** - React 组件测试
2. **@testing-library/user-event** - 更真实的用户交互模拟
3. **@testing-library/jest-dom** - 额外的断言
4. **Playwright** - E2E 测试（对于复杂 UI 流程）

## 总结

UI 测试的关键原则：
1. ✅ 精确控制时间，避免无限循环
2. ✅ 使用 `findBy*` 自动等待
3. ✅ 简化测试，只测试关键行为
4. ✅ Mock 复杂依赖
5. ✅ 使用 `act` 包装状态更新
6. ✅ 限制定时器推进时间
7. ✅ 使用调试工具排查问题

## 对于复杂 UI 组件的建议

如果组件非常复杂（如 DealingAnimation），建议：

### 方案 1：保持排除，使用 E2E 测试
- 在快速测试中排除复杂的 UI 测试
- 使用 Playwright 或 Cypress 进行 E2E 测试
- E2E 测试在真实浏览器环境中运行，更可靠

### 方案 2：拆分组件，测试小组件
- 将复杂组件拆分成更小的组件
- 测试小组件而不是大组件
- 例如：测试按钮组件、测试状态管理逻辑等

### 方案 3：简化测试，只测试关键路径
- 只测试最重要的用户流程
- 跳过边缘情况和复杂交互
- 使用快照测试捕获 UI 变化

### 方案 4：使用视觉回归测试
- 使用 Percy、Chromatic 等工具
- 捕获 UI 截图，自动对比变化
- 适合测试 UI 外观和布局

## 当前 dealingManualMode 测试的建议

由于 DealingAnimation 组件非常复杂（包含多个定时器、状态管理、DOM 操作），建议：

1. **保持排除**：在 `test:fast` 中排除这些测试
2. **标记为 UI 测试**：使用 `@ui` 标签标记
3. **手动测试**：在开发时手动测试这些功能
4. **E2E 测试**：如果确实需要自动化测试，使用 Playwright 进行 E2E 测试

这是合理的权衡，因为：
- 复杂的 UI 测试维护成本高
- 测试环境难以完全模拟真实浏览器环境
- 手动测试 + E2E 测试的组合更实用


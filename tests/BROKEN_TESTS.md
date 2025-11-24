# 失败的测试列表

## 📋 需要修复的测试

以下测试当前处于失败状态，已从快速测试中排除，需要修复：

### 1. chatService.test.ts - 聊天服务测试

**失败数量：** 2 个测试失败

**失败原因：**
- `triggerRandomChat` - 应该根据概率触发随机闲聊：返回 null 而不是消息
- `triggerEventChat` - 应该触发分牌被捡走事件聊天：返回 'taunt' 而不是 'event'

**可能原因：**
- Mock 配置不正确
- 异步操作未正确处理
- 概率计算逻辑问题

**状态：** 🔴 需要修复

### 2. chatSystem.test.ts - 聊天系统测试

**失败数量：** 10 个测试失败

**失败原因：**
- `triggerRandomChat` - 2 个测试失败（概率触发问题）
- `triggerEventChat` - 4 个测试失败（事件类型错误）
- `triggerBigDunReaction` - 1 个测试失败（没有触发反应）
- `triggerScoreStolenReaction` - 1 个测试失败（没有触发反应）
- `triggerGoodPlayReaction` - 1 个测试失败（没有触发反应）
- `triggerTaunt` - 1 个测试失败（没有触发反应）

**可能原因：**
- 异步操作未正确处理
- Mock 配置不完整
- 服务初始化问题

**状态：** 🔴 需要修复

### 3. dealingManualMode.test.ts - 手动发牌模式测试

**失败数量：** 4 个测试超时（30秒）

**失败原因：**
- 所有手动发牌模式相关测试都超时
- 测试等待时间过长（30秒）

**可能原因：**
- 组件渲染或状态更新问题
- 异步操作未正确完成
- 测试环境配置问题

**状态：** 🔴 需要修复

## 🚀 修复建议

1. **检查 Mock 配置**
   - 确保所有依赖的 mock 都正确配置
   - 检查异步操作的 mock 返回值

2. **优化测试超时**
   - 对于 dealingManualMode.test.ts，可以增加超时时间或优化测试逻辑
   - 使用 fake timers 加速测试

3. **检查异步操作**
   - 确保所有 Promise 都正确 await
   - 检查事件监听和回调函数

## 📝 当前状态

- ✅ 已标记为 `@broken`
- ✅ 已从 `test:fast` 中排除
- ⏳ 等待修复

## 🔍 如何运行失败的测试

如果需要单独运行这些测试进行调试：

```bash
# 运行聊天服务测试
npm test -- chatService

# 运行聊天系统测试
npm test -- chatSystem

# 运行手动发牌模式测试
npm test -- dealingManualMode
```


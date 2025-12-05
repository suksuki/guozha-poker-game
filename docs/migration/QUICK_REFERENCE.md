# 迁移快速参考

## 🚀 快速开始

### 运行测试
```bash
# 单元测试
npx vitest run tests/unit/ --reporter=verbose

# 特定模块
npx vitest run tests/unit/async/AsyncTaskManager.test.ts

# 集成测试
npx vitest run tests/integration/

# 回归测试
npx vitest run tests/regression/

# 覆盖率报告
npx vitest run --coverage

# 监听模式（开发时）
npx vitest watch tests/unit/async/
```

---

## 📊 当前进度

### Phase 1: 基础设施层
- ✅ AsyncTaskManager 实现完成
- ✅ AsyncTaskManager 测试编写完成
- ⏳ 等待测试执行
- ⏸️ ServiceHealthChecker 待开始
- ⏸️ GameState 待开始
- ⏸️ StateManager 待开始

### 下一步
1. 运行并通过 AsyncTaskManager 测试
2. 实现 ServiceHealthChecker
3. 实现 GameState
4. 实现 StateManager

---

## 🎯 关键原则提醒

### DO ✅
- ✅ 状态不可变（返回新对象）
- ✅ 纯函数Module（无副作用）
- ✅ 单向数据流
- ✅ 单一数据源
- ✅ 先写测试再写代码（TDD）

### DON'T ❌
- ❌ 直接修改状态
- ❌ 循环依赖
- ❌ Module持有状态
- ❌ Brain持有游戏状态
- ❌ 跳过测试

---

## 🔑 代码模板

### 纯函数Module模板
```typescript
export class XxxModule {
  static doSomething(
    state: GameState,
    input: any
  ): GameState {
    // 1. 验证输入
    if (!isValid(input)) {
      throw new Error('Invalid input');
    }
    
    // 2. 业务逻辑（纯函数）
    const result = processLogic(state, input);
    
    // 3. 创建新状态（不可变）
    const newState = state.updateXxx(result);
    
    return newState;
  }
}
```

### 测试模板
```typescript
describe('XxxModule', () => {
  describe('doSomething', () => {
    it('应该正确处理正常情况', () => {
      // 准备
      const state = createMockState();
      const input = createMockInput();
      
      // 执行
      const newState = XxxModule.doSomething(state, input);
      
      // 验证
      expect(newState).not.toBe(state); // 不可变
      expect(newState.xxx).toBe(expected);
    });
    
    it('应该拒绝无效输入', () => {
      expect(() => {
        XxxModule.doSomething(state, invalidInput);
      }).toThrow();
    });
  });
});
```

---

## 📝 检查清单

### 提交代码前
- [ ] 所有测试通过
- [ ] 覆盖率达标
- [ ] Lint无错误
- [ ] 无console.error
- [ ] 更新TODO状态
- [ ] 更新文档

### 完成模块后
- [ ] 单元测试 ≥ 90%
- [ ] 回归测试通过
- [ ] 性能测试通过
- [ ] 代码审查通过
- [ ] 文档完整

---

## 🐛 常见问题

### Q: 测试超时
A: 增加timeout配置或使用vi.setConfig

### Q: 异步测试不稳定
A: 使用vi.useFakeTimers()控制时间

### Q: 覆盖率不够
A: 检查边界情况和错误场景

---

**更新**: 2024-12-05


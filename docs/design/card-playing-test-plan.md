# 打牌系统重构 - 测试计划

## 📋 测试策略

### 测试金字塔
```
        /\
       /E2E\          (少量端到端测试)
      /------\
     /Integration\    (适量集成测试)
    /------------\
   /   Unit Tests \   (大量单元测试)
  /----------------\
```

### 测试覆盖率目标
- **单元测试**: > 85%
- **集成测试**: > 70%
- **端到端测试**: > 50%

## 🧪 单元测试

### ValidationService 测试

#### 测试文件: `tests/services/cardPlaying/ValidationService.test.ts`

#### 测试用例

**1. validateCardType 测试**
- [ ] 测试单张牌验证
- [ ] 测试对子验证
- [ ] 测试三张验证
- [ ] 测试三带二验证
- [ ] 测试顺子验证
- [ ] 测试连对验证
- [ ] 测试飞机验证
- [ ] 测试炸弹验证
- [ ] 测试墩验证
- [ ] 测试无效牌型

**2. validatePlayRules 测试**
- [ ] 测试无上家出牌（可以出任意牌型）
- [ ] 测试有上家出牌（必须压过）
- [ ] 测试接风情况
- [ ] 测试强制出牌规则
- [ ] 测试手牌不包含所选牌的情况

**3. findPlayableCards 测试**
- [ ] 测试无上家出牌时查找所有可出牌
- [ ] 测试有上家出牌时查找能压过的牌
- [ ] 测试炸弹可以压非炸弹牌型
- [ ] 测试墩可以压非墩牌型
- [ ] 测试复杂牌型查找

**4. hasPlayableCards 测试**
- [ ] 测试有能打过的牌
- [ ] 测试没有能打过的牌
- [ ] 测试接风情况
- [ ] 测试手牌为空

**覆盖率目标**: > 90%

---

### CardSelectorService 测试

#### 测试文件: `tests/services/cardPlaying/CardSelectorService.test.ts`

#### 测试用例

**1. 选牌操作测试**
- [ ] 测试 selectCard - 选择单张牌
- [ ] 测试 deselectCard - 取消选择单张牌
- [ ] 测试 toggleCard - 切换选择状态
- [ ] 测试 selectGroup - 选择一组牌
- [ ] 测试 clearSelection - 清空选择
- [ ] 测试多次选择同一张牌（应该只选择一次）

**2. 选牌状态测试**
- [ ] 测试 getSelection - 获取当前选择
- [ ] 测试选择状态隔离（不同玩家）
- [ ] 测试选择状态持久化

**3. 智能提示测试**
- [ ] 测试 highlightPlayableCards - 高亮可出牌
- [ ] 测试无上家出牌时的提示
- [ ] 测试有上家出牌时的提示
- [ ] 测试接风时的提示

**4. 选牌验证测试**
- [ ] 测试 validateSelection - 验证选择的牌
- [ ] 测试合法选择
- [ ] 测试非法选择（牌不在手牌中）
- [ ] 测试重复选择验证

**覆盖率目标**: > 85%

---

### PlayExecutorService 测试

#### 测试文件: `tests/services/cardPlaying/PlayExecutorService.test.ts`

#### 测试用例

**1. executePlay 测试**
- [ ] 测试正常出牌流程
- [ ] 测试出牌后手牌更新
- [ ] 测试出牌后轮次状态更新
- [ ] 测试出牌后分数计算
- [ ] 测试出牌后游戏状态更新

**2. validatePlay 测试**
- [ ] 测试合法出牌验证
- [ ] 测试非法牌型验证
- [ ] 测试不能压过上家验证
- [ ] 测试手牌不包含所选牌验证
- [ ] 测试不是玩家回合验证

**3. canBeat 测试**
- [ ] 测试能压过的情况
- [ ] 测试不能压过的情况
- [ ] 测试炸弹压非炸弹
- [ ] 测试墩压非墩
- [ ] 测试同类型比较

**4. getPlayableCards 测试**
- [ ] 测试获取所有可出牌
- [ ] 测试无上家出牌时
- [ ] 测试有上家出牌时
- [ ] 测试接风时

**5. 错误处理测试**
- [ ] 测试出牌失败的错误处理
- [ ] 测试验证失败的错误处理
- [ ] 测试异步错误处理

**覆盖率目标**: > 85%

---

### AISuggesterService 测试

#### 测试文件: `tests/services/cardPlaying/AISuggesterService.test.ts`

#### 测试用例

**1. getSuggestion 测试**
- [ ] 测试获取单个建议
- [ ] 测试无上家出牌时的建议
- [ ] 测试有上家出牌时的建议
- [ ] 测试没有可出牌时返回null
- [ ] 测试不同策略的建议

**2. getSuggestions 测试**
- [ ] 测试获取多个建议
- [ ] 测试建议数量限制
- [ ] 测试建议去重
- [ ] 测试建议排序

**3. explainSuggestion 测试**
- [ ] 测试建议解释生成
- [ ] 测试不同牌型的解释
- [ ] 测试解释内容准确性

**4. 缓存机制测试**
- [ ] 测试建议缓存
- [ ] 测试缓存失效（手牌变化）
- [ ] 测试缓存失效（上家出牌变化）
- [ ] 测试缓存命中率

**5. AI策略集成测试**
- [ ] 测试simple策略集成
- [ ] 测试MCTS策略集成
- [ ] 测试策略切换

**覆盖率目标**: > 80%

---

### CardPlayingService 测试

#### 测试文件: `tests/services/cardPlaying/CardPlayingService.test.ts`

#### 测试用例

**1. 选牌相关测试**
- [ ] 测试 selectCards
- [ ] 测试 clearSelection
- [ ] 测试 getSelection
- [ ] 测试 validateSelection

**2. 出牌相关测试**
- [ ] 测试 playCards
- [ ] 测试 canPlay
- [ ] 测试 getPlayableCards

**3. AI建议相关测试**
- [ ] 测试 suggestPlay
- [ ] 测试 getSuggestions

**4. 集成测试**
- [ ] 测试选牌→出牌流程
- [ ] 测试选牌→AI建议→出牌流程
- [ ] 测试错误恢复流程

**覆盖率目标**: > 80%

---

### useCardPlaying Hook 测试

#### 测试文件: `tests/hooks/useCardPlaying.test.ts`

#### 测试用例

**1. Hook初始化测试**
- [ ] 测试Hook正常初始化
- [ ] 测试初始状态正确
- [ ] 测试服务正确注入

**2. 选牌功能测试**
- [ ] 测试选牌状态更新
- [ ] 测试选牌操作
- [ ] 测试选牌副作用

**3. 出牌功能测试**
- [ ] 测试出牌状态更新
- [ ] 测试出牌操作
- [ ] 测试出牌副作用

**4. AI建议功能测试**
- [ ] 测试AI建议状态更新
- [ ] 测试AI建议操作
- [ ] 测试AI建议副作用

**5. 状态同步测试**
- [ ] 测试状态与游戏状态同步
- [ ] 测试状态更新触发重新渲染
- [ ] 测试状态清理

**覆盖率目标**: > 75%

---

## 🔗 集成测试

### CardPlayingService 集成测试

#### 测试文件: `tests/integration/CardPlayingService.integration.test.ts`

#### 测试场景

**1. 完整选牌→出牌流程**
- [ ] 测试选择牌→验证→出牌→状态更新
- [ ] 测试选择牌→验证失败→重新选择
- [ ] 测试选择牌→出牌失败→错误处理

**2. 选牌→AI建议→出牌流程**
- [ ] 测试选择牌→获取AI建议→应用建议→出牌
- [ ] 测试选择牌→获取AI建议→不应用建议→手动出牌
- [ ] 测试AI建议缓存

**3. 错误恢复流程**
- [ ] 测试出牌失败后的恢复
- [ ] 测试验证失败后的恢复
- [ ] 测试AI建议失败后的恢复

**4. 并发操作测试**
- [ ] 测试快速连续选牌
- [ ] 测试选牌和出牌并发
- [ ] 测试AI建议和出牌并发

---

### React组件集成测试

#### 测试文件: `tests/integration/CardPlayingComponents.integration.test.ts`

#### 测试场景

**1. CompactHandCards 组件**
- [ ] 测试选牌交互
- [ ] 测试智能提示显示
- [ ] 测试选牌验证反馈
- [ ] 测试组件状态更新

**2. ActionButtons 组件**
- [ ] 测试出牌按钮交互
- [ ] 测试要不起按钮交互
- [ ] 测试AI建议按钮交互
- [ ] 测试按钮状态更新

**3. 组件协作测试**
- [ ] 测试选牌组件和出牌组件协作
- [ ] 测试AI建议组件和出牌组件协作
- [ ] 测试错误提示显示

---

## 🌐 端到端测试

### 完整游戏流程测试

#### 测试文件: `tests/e2e/card-playing-flow.e2e.test.ts`

#### 测试场景

**1. 正常游戏流程**
- [ ] 测试完整的一局游戏（选牌→出牌→AI出牌→...）
- [ ] 测试多轮游戏
- [ ] 测试游戏结束

**2. AI建议流程**
- [ ] 测试获取AI建议
- [ ] 测试应用AI建议
- [ ] 测试多个AI建议选项

**3. 错误场景**
- [ ] 测试非法出牌处理
- [ ] 测试网络错误处理
- [ ] 测试超时处理

**4. 性能场景**
- [ ] 测试大量牌的处理
- [ ] 测试复杂牌型处理
- [ ] 测试快速操作

---

## 📊 测试工具和框架

### 单元测试
- **框架**: Vitest
- **断言库**: Vitest内置
- **Mock库**: Vitest内置

### 集成测试
- **框架**: Vitest
- **React测试**: React Testing Library
- **Mock库**: Vitest内置

### 端到端测试
- **框架**: Playwright (可选)
- **或者**: Vitest + jsdom

---

## 📈 测试指标

### 覆盖率指标
- **行覆盖率**: > 85%
- **分支覆盖率**: > 80%
- **函数覆盖率**: > 90%
- **语句覆盖率**: > 85%

### 性能指标
- **测试执行时间**: < 30秒（单元测试）
- **测试执行时间**: < 2分钟（集成测试）
- **测试执行时间**: < 5分钟（端到端测试）

### 质量指标
- **测试通过率**: 100%
- **测试稳定性**: > 95%
- **Bug发现率**: 通过测试发现 > 80% 的bug

---

## 🚀 测试执行计划

### 开发阶段
- **TDD**: 先写测试，再写代码
- **持续测试**: 每次提交前运行测试
- **覆盖率检查**: 每次提交检查覆盖率

### 集成阶段
- **每日测试**: 每天运行所有测试
- **覆盖率报告**: 每天生成覆盖率报告
- **问题跟踪**: 及时修复失败的测试

### 发布阶段
- **完整测试**: 发布前运行所有测试
- **性能测试**: 发布前运行性能测试
- **回归测试**: 发布前运行回归测试

---

## 📝 测试用例模板

```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do something when condition', () => {
      // Arrange
      const service = new ServiceName()
      const input = { ... }
      
      // Act
      const result = service.methodName(input)
      
      // Assert
      expect(result).toEqual(expected)
    })
    
    it('should handle error when invalid input', () => {
      // Arrange
      const service = new ServiceName()
      const invalidInput = { ... }
      
      // Act & Assert
      expect(() => service.methodName(invalidInput)).toThrow()
    })
  })
})
```

---

## 🔍 测试审查清单

### 测试代码审查
- [ ] 测试用例覆盖所有功能
- [ ] 测试用例覆盖边界情况
- [ ] 测试用例覆盖错误情况
- [ ] 测试代码可读性
- [ ] 测试代码可维护性
- [ ] 测试执行效率

### 测试结果审查
- [ ] 所有测试通过
- [ ] 覆盖率达标
- [ ] 无flaky测试
- [ ] 性能指标达标

---

## 📚 参考资料

- [Vitest文档](https://vitest.dev/)
- [React Testing Library文档](https://testing-library.com/react)
- [测试最佳实践](../testing/)


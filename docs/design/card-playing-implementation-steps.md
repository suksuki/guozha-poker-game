# 打牌系统重构 - 实施步骤

## 📅 时间线

**总时长**: 4周
**开始日期**: 待定
**结束日期**: 待定

## 🎯 阶段1: 基础服务层 (Week 1)

### Step 1.1: 创建 ValidationService

**目标**: 统一验证逻辑

**任务清单**:
- [ ] 创建 `src/services/cardPlaying/ValidationService.ts`
- [ ] 迁移 `canPlayCards` 逻辑
- [ ] 迁移 `canBeat` 逻辑
- [ ] 迁移 `findPlayableCards` 逻辑
- [ ] 迁移 `hasPlayableCards` 逻辑
- [ ] 添加统一的验证接口
- [ ] 编写单元测试 (`tests/services/cardPlaying/ValidationService.test.ts`)
- [ ] 测试覆盖率 > 90%

**接口设计**:
```typescript
class ValidationService {
  validateCardType(cards: Card[]): ValidationResult<Play | null>
  validatePlayRules(cards: Card[], lastPlay: Play | null, playerHand: Card[]): ValidationResult
  findPlayableCards(hand: Card[], lastPlay: Play | null): Card[][]
  hasPlayableCards(hand: Card[], lastPlay: Play | null): boolean
}
```

**验收标准**:
- ✅ 所有验证逻辑集中在一个服务中
- ✅ 单元测试通过
- ✅ 测试覆盖率 > 90%
- ✅ 代码审查通过

---

### Step 1.2: 创建 CardSelectorService

**目标**: 统一选牌逻辑

**任务清单**:
- [ ] 创建 `src/services/cardPlaying/CardSelectorService.ts`
- [ ] 实现选牌状态管理
- [ ] 实现 `selectCard`、`deselectCard`、`toggleCard` 方法
- [ ] 实现 `selectGroup` 方法（组选牌）
- [ ] 实现 `clearSelection` 方法
- [ ] 实现智能选牌提示（`highlightPlayableCards`）
- [ ] 集成 ValidationService
- [ ] 编写单元测试 (`tests/services/cardPlaying/CardSelectorService.test.ts`)
- [ ] 测试覆盖率 > 85%

**接口设计**:
```typescript
class CardSelectorService {
  selectCard(playerId: number, card: Card): void
  deselectCard(playerId: number, card: Card): void
  toggleCard(playerId: number, card: Card): void
  selectGroup(playerId: number, cards: Card[]): void
  clearSelection(playerId: number): void
  getSelection(playerId: number): Card[]
  highlightPlayableCards(playerId: number, lastPlay?: Play | null): Card[]
  validateSelection(playerId: number, cards: Card[]): ValidationResult
}
```

**验收标准**:
- ✅ 选牌逻辑集中管理
- ✅ 支持单个和组选牌
- ✅ 智能提示功能正常
- ✅ 单元测试通过
- ✅ 测试覆盖率 > 85%

---

### Step 1.3: 创建 PlayExecutorService

**目标**: 统一出牌执行逻辑

**任务清单**:
- [ ] 创建 `src/services/cardPlaying/PlayExecutorService.ts`
- [ ] 实现 `executePlay` 方法
- [ ] 实现 `validatePlay` 方法
- [ ] 实现 `canBeat` 方法
- [ ] 实现出牌流程 (`processPlayFlow`)
- [ ] 集成 ValidationService
- [ ] 集成 Round Manager
- [ ] 编写单元测试 (`tests/services/cardPlaying/PlayExecutorService.test.ts`)
- [ ] 测试覆盖率 > 85%

**接口设计**:
```typescript
class PlayExecutorService {
  async executePlay(playerId: number, cards: Card[], options?: PlayOptions): Promise<PlayResult>
  validatePlay(playerId: number, cards: Card[]): ValidationResult
  canBeat(cards: Card[], lastPlay: Play | null): boolean
  getPlayableCards(playerId: number): Card[][]
}
```

**验收标准**:
- ✅ 出牌逻辑集中管理
- ✅ 验证逻辑正确
- ✅ 错误处理完善
- ✅ 单元测试通过
- ✅ 测试覆盖率 > 85%

---

### Step 1.4: 创建 AISuggesterService

**目标**: 统一AI建议逻辑

**任务清单**:
- [ ] 创建 `src/services/cardPlaying/AISuggesterService.ts`
- [ ] 实现 `getSuggestion` 方法
- [ ] 实现 `getSuggestions` 方法（多个建议）
- [ ] 实现 `explainSuggestion` 方法（建议解释）
- [ ] 实现建议缓存机制
- [ ] 集成现有AI策略（simple、MCTS）
- [ ] 编写单元测试 (`tests/services/cardPlaying/AISuggesterService.test.ts`)
- [ ] 测试覆盖率 > 80%

**接口设计**:
```typescript
class AISuggesterService {
  async getSuggestion(playerId: number, options?: SuggestOptions): Promise<SuggestionResult>
  async getSuggestions(playerId: number, count?: number): Promise<SuggestionResult[]>
  explainSuggestion(suggestion: SuggestionResult): string
}
```

**验收标准**:
- ✅ AI建议逻辑集中管理
- ✅ 支持多个建议选项
- [ ] 建议缓存机制正常
- ✅ 单元测试通过
- ✅ 测试覆盖率 > 80%

---

## 🎯 阶段2: 统一服务层 (Week 2)

### Step 2.1: 创建 CardPlayingService

**目标**: 创建统一的服务入口

**任务清单**:
- [ ] 创建 `src/services/cardPlaying/CardPlayingService.ts`
- [ ] 整合 CardSelectorService
- [ ] 整合 PlayExecutorService
- [ ] 整合 AISuggesterService
- [ ] 提供统一接口
- [ ] 编写集成测试 (`tests/services/cardPlaying/CardPlayingService.test.ts`)
- [ ] 测试覆盖率 > 80%

**接口设计**:
```typescript
class CardPlayingService {
  // 选牌相关
  selectCards(playerId: number, cards: Card[]): SelectionResult
  clearSelection(playerId: number): void
  getSelection(playerId: number): Card[]
  validateSelection(playerId: number, cards: Card[]): ValidationResult
  
  // 出牌相关
  playCards(playerId: number, cards: Card[]): Promise<PlayResult>
  canPlay(playerId: number, cards: Card[]): boolean
  getPlayableCards(playerId: number): Card[][]
  
  // AI建议相关
  suggestPlay(playerId: number, options?: SuggestOptions): Promise<SuggestionResult>
  getSuggestions(playerId: number, count?: number): Promise<SuggestionResult[]>
}
```

**验收标准**:
- ✅ 统一接口正常工作
- ✅ 所有子服务正确集成
- ✅ 集成测试通过
- ✅ 测试覆盖率 > 80%

---

### Step 2.2: 创建 React Hooks

**目标**: 创建React友好的API

**任务清单**:
- [ ] 创建 `src/hooks/useCardPlaying.ts`
- [ ] 封装 CardPlayingService
- [ ] 提供React状态管理
- [ ] 处理副作用（useEffect）
- [ ] 编写Hook测试 (`tests/hooks/useCardPlaying.test.ts`)
- [ ] 测试覆盖率 > 75%

**接口设计**:
```typescript
function useCardPlaying(game: Game, playerId: number) {
  // 选牌状态
  const { selectedCards, highlightedCards, selectCard, clearSelection } = useCardSelection(...)
  
  // 出牌状态
  const { isPlaying, playCards, canPlay, playableCards } = useCardPlay(...)
  
  // AI建议状态
  const { isSuggesting, suggestions, suggestPlay, getSuggestions } = useAISuggestion(...)
  
  return { ... }
}
```

**验收标准**:
- ✅ Hook正常工作
- ✅ 状态更新正确
- ✅ 副作用处理正确
- ✅ Hook测试通过
- ✅ 测试覆盖率 > 75%

---

## 🎯 阶段3: UI层重构 (Week 3)

### Step 3.1: 重构选牌组件

**目标**: 使用新的选牌服务

**任务清单**:
- [ ] 重构 `src/components/game/CompactHandCards.tsx`
- [ ] 使用 `useCardPlaying` Hook
- [ ] 添加智能提示UI（高亮可出牌）
- [ ] 添加选牌验证反馈
- [ ] 添加选牌快捷键支持（可选）
- [ ] 更新样式
- [ ] 编写组件测试

**验收标准**:
- ✅ 选牌功能正常
- ✅ 智能提示显示正确
- ✅ 验证反馈及时
- ✅ UI/UX改进
- ✅ 组件测试通过

---

### Step 3.2: 重构出牌组件

**目标**: 使用新的出牌服务

**任务清单**:
- [ ] 重构 `src/components/game/ActionButtons.tsx`
- [ ] 使用 `useCardPlaying` Hook
- [ ] 改进错误提示
- [ ] 添加出牌加载状态
- [ ] 添加出牌动画（可选）
- [ ] 更新样式
- [ ] 编写组件测试

**验收标准**:
- ✅ 出牌功能正常
- ✅ 错误提示清晰
- ✅ 加载状态正确
- ✅ UI/UX改进
- ✅ 组件测试通过

---

### Step 3.3: 重构AI建议组件

**目标**: 使用新的AI建议服务

**任务清单**:
- [ ] 重构AI建议UI
- [ ] 使用 `useCardPlaying` Hook
- [ ] 添加建议解释显示
- [ ] 支持多个建议选项（可选）
- [ ] 添加建议加载状态
- [ ] 更新样式
- [ ] 编写组件测试

**验收标准**:
- ✅ AI建议功能正常
- ✅ 建议解释显示正确
- ✅ 多个建议选项正常（如果实现）
- ✅ UI/UX改进
- ✅ 组件测试通过

---

## 🎯 阶段4: 集成和优化 (Week 4)

### Step 4.1: 集成到现有系统

**目标**: 替换旧代码

**任务清单**:
- [ ] 替换 `usePlayerHand` 中的选牌逻辑
- [ ] 替换 `useGameActions` 中的出牌逻辑
- [ ] 替换 `useGameActions` 中的AI建议逻辑
- [ ] 更新 `MultiPlayerGameBoard` 组件
- [ ] 确保向后兼容
- [ ] 修复集成问题
- [ ] 端到端测试

**验收标准**:
- ✅ 所有功能正常工作
- ✅ 无回归bug
- ✅ 端到端测试通过
- ✅ 性能无下降

---

### Step 4.2: 性能优化

**目标**: 优化关键路径

**任务清单**:
- [ ] 优化选牌性能（减少重渲染）
- [ ] 优化AI建议性能（缓存、异步）
- [ ] 优化出牌流程性能
- [ ] 性能测试
- [ ] 性能分析报告

**验收标准**:
- ✅ 选牌响应时间 < 50ms
- ✅ AI建议响应时间 < 500ms
- ✅ 出牌流程时间 < 2s
- ✅ 性能测试通过

---

### Step 4.3: 用户体验优化

**目标**: 提升用户体验

**任务清单**:
- [ ] 添加加载状态
- [ ] 添加错误恢复
- [ ] 添加快捷键支持（可选）
- [ ] 优化动画效果
- [ ] 用户测试
- [ ] 收集反馈

**验收标准**:
- ✅ 操作流畅
- ✅ 反馈及时
- ✅ 错误提示清晰
- ✅ 用户满意度提升

---

## 📊 测试计划

### 单元测试
- [ ] ValidationService: 覆盖率 > 90%
- [ ] CardSelectorService: 覆盖率 > 85%
- [ ] PlayExecutorService: 覆盖率 > 85%
- [ ] AISuggesterService: 覆盖率 > 80%
- [ ] CardPlayingService: 覆盖率 > 80%
- [ ] useCardPlaying Hook: 覆盖率 > 75%

### 集成测试
- [ ] CardPlayingService 集成测试
- [ ] useCardPlaying Hook 集成测试
- [ ] 组件集成测试

### 端到端测试
- [ ] 完整游戏流程测试
- [ ] 错误场景测试
- [ ] 性能场景测试

## 📝 每日检查清单

### 开发前
- [ ] 阅读相关文档
- [ ] 理解需求
- [ ] 准备测试用例

### 开发中
- [ ] 编写代码
- [ ] 编写测试
- [ ] 运行测试
- [ ] 代码审查

### 开发后
- [ ] 测试通过
- [ ] 代码审查通过
- [ ] 文档更新
- [ ] 提交代码

## 🚨 风险控制

### 每日风险检查
- [ ] 进度是否正常？
- [ ] 是否有阻塞问题？
- [ ] 是否需要调整计划？

### 每周回顾
- [ ] 本周完成情况
- [ ] 下周计划
- [ ] 风险和问题

## 📚 参考资料

- [详细设计文档](./card-playing-system-refactor.md)
- [讨论要点](./card-playing-refactor-discussion.md)
- [当前出牌流程文档](../game/play-card-flow.md)


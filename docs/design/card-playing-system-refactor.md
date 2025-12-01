# 打牌系统重构设计文档

## 1. 代码审查总结

### 1.1 当前架构概览

#### 选牌系统
- **位置**: `src/hooks/usePlayerHand.ts`
- **职责**: 管理玩家手牌的选择、展开和分组
- **关键功能**:
  - `selectedCards`: 选中的牌列表
  - `groupedHand`: 按点数分组的手牌
  - `handleCardClick`: 处理卡片点击选择/取消
  - `toggleExpand`: 展开/收起同点数牌组

#### 出牌系统
- **位置**: `src/utils/Game.ts`, `src/hooks/useGameActions.ts`
- **职责**: 处理出牌逻辑、验证、状态更新
- **关键功能**:
  - `Game.playCards()`: 核心出牌方法
  - `useGameActions.handlePlay()`: UI层出牌处理
  - `processPlayAsync()`: 异步出牌处理（包含TTS、语音播放）
  - `RoundPlayHandler`: 轮次出牌处理器

#### AI建议系统
- **位置**: `src/utils/aiPlayer.ts`, `src/ai/`
- **职责**: 提供AI出牌建议
- **关键功能**:
  - `aiChoosePlay()`: AI选择出牌的统一接口
  - `simpleAIStrategy()`: 简单策略算法
  - MCTS算法: 蒙特卡洛树搜索
  - `useGameActions.handleSuggestPlay()`: UI层AI建议处理

#### 验证系统
- **位置**: `src/utils/cardUtils.ts`
- **职责**: 牌型验证、比较、查找可出牌
- **关键功能**:
  - `canPlayCards()`: 验证牌型是否合法
  - `canBeat()`: 验证是否能压过上家
  - `findPlayableCards()`: 查找所有可出的牌组合
  - `hasPlayableCards()`: 检查是否有能打过的牌

### 1.2 当前架构的问题

#### 问题1: 职责分散
- 选牌逻辑分散在 `usePlayerHand` 和 `CompactHandCards` 组件中
- 出牌逻辑分散在 `Game`、`useGameActions`、`asyncPlayHandler`、`RoundPlayHandler` 等多个地方
- AI建议逻辑分散在 `useGameActions` 和 `aiPlayer` 中

#### 问题2: 状态管理复杂
- 选牌状态在 React Hook 中管理
- 出牌状态在 `Game` 类中管理
- 轮次状态在 `Round` 类中管理
- 状态同步和更新机制不统一

#### 问题3: 异步处理混乱
- `processPlayAsync` 处理异步出牌
- `RoundPlayHandler` 也有异步处理逻辑
- TTS和语音播放的异步逻辑混杂在出牌流程中
- 错误处理和超时处理不统一

#### 问题4: 验证逻辑重复
- `canPlayCards` 在多个地方被调用
- 验证逻辑和业务逻辑耦合
- 缺少统一的验证入口

#### 问题5: 测试覆盖不足
- 选牌逻辑缺少单元测试
- 出牌流程缺少集成测试
- AI建议缺少测试

### 1.3 代码质量评估

#### 优点
- ✅ 使用了 TypeScript，类型安全
- ✅ 代码结构相对清晰，有基本的模块划分
- ✅ 使用了 React Hooks，符合现代React实践
- ✅ 有基本的错误处理

#### 缺点
- ❌ 职责划分不够清晰，单一职责原则执行不够
- ❌ 代码重复，验证逻辑在多处出现
- ❌ 异步处理逻辑复杂，难以追踪
- ❌ 缺少统一的错误处理机制
- ❌ 测试覆盖不足

## 2. 重构目标

### 2.1 核心目标

1. **统一职责**: 将选牌、出牌、AI建议的逻辑集中管理
2. **简化状态管理**: 统一状态管理机制，减少状态同步问题
3. **优化异步处理**: 统一异步处理模式，提高可维护性
4. **增强可测试性**: 提高代码的可测试性，增加测试覆盖
5. **提升用户体验**: 优化选牌、出牌、AI建议的交互体验

### 2.2 具体目标

#### 选牌系统
- ✅ 统一的选牌状态管理
- ✅ 智能选牌提示（高亮可出牌组合）
- ✅ 选牌验证（实时反馈）
- ✅ 选牌快捷键支持

#### 出牌系统
- ✅ 统一的出牌流程管理
- ✅ 清晰的验证流程
- ✅ 统一的错误处理
- ✅ 更好的用户反馈

#### AI建议系统
- ✅ 统一的AI建议接口
- ✅ 建议解释（为什么这样出）
- ✅ 多种建议选项
- ✅ 建议缓存机制

## 3. 重构设计

### 3.1 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ CardSelector │  │ PlayExecutor  │  │ AISuggester │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Card Playing Service Layer                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │         CardPlayingService (统一入口)            │   │
│  │  - selectCards()                                 │   │
│  │  - playCards()                                   │   │
│  │  - suggestPlay()                                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ CardSelector │ │ PlayExecutor │ │ AISuggester  │
│ Service      │ │ Service      │ │ Service      │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Validation   │ │ Round        │ │ AI Strategy  │
│ Service      │ │ Manager      │ │ Manager      │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 3.2 核心服务设计

#### 3.2.1 CardPlayingService (统一入口)

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

#### 3.2.2 CardSelectorService (选牌服务)

```typescript
class CardSelectorService {
  // 选牌状态管理
  private selections: Map<number, Card[]>
  
  // 选牌操作
  selectCard(playerId: number, card: Card): void
  deselectCard(playerId: number, card: Card): void
  toggleCard(playerId: number, card: Card): void
  selectGroup(playerId: number, cards: Card[]): void
  clearSelection(playerId: number): void
  
  // 智能选牌
  suggestSelection(playerId: number, targetPlay?: Play): Card[]
  highlightPlayableCards(playerId: number, lastPlay?: Play | null): Card[]
  
  // 验证
  validateSelection(playerId: number, cards: Card[]): ValidationResult
}
```

#### 3.2.3 PlayExecutorService (出牌执行服务)

```typescript
class PlayExecutorService {
  // 出牌执行
  async executePlay(
    playerId: number, 
    cards: Card[], 
    options?: PlayOptions
  ): Promise<PlayResult>
  
  // 验证
  validatePlay(playerId: number, cards: Card[]): ValidationResult
  canBeat(cards: Card[], lastPlay: Play | null): boolean
  
  // 出牌流程
  private async processPlayFlow(
    playerId: number,
    cards: Card[],
    play: Play
  ): Promise<PlayResult>
  
  // 异步处理（TTS、语音等）
  private async processAsyncEffects(
    playerId: number,
    cards: Card[],
    play: Play
  ): Promise<void>
}
```

#### 3.2.4 AISuggesterService (AI建议服务)

```typescript
class AISuggesterService {
  // 获取建议
  async getSuggestion(
    playerId: number,
    options?: SuggestOptions
  ): Promise<SuggestionResult>
  
  // 获取多个建议
  async getSuggestions(
    playerId: number,
    count?: number
  ): Promise<SuggestionResult[]>
  
  // 建议解释
  explainSuggestion(suggestion: SuggestionResult): string
  
  // 建议缓存
  private cache: Map<string, SuggestionResult>
  private getCacheKey(playerId: number, lastPlay: Play | null): string
}
```

#### 3.2.5 ValidationService (验证服务)

```typescript
class ValidationService {
  // 牌型验证
  validateCardType(cards: Card[]): ValidationResult<Play | null>
  
  // 出牌规则验证
  validatePlayRules(
    cards: Card[],
    lastPlay: Play | null,
    playerHand: Card[]
  ): ValidationResult
  
  // 查找可出牌
  findPlayableCards(hand: Card[], lastPlay: Play | null): Card[][]
  
  // 检查是否有能打过的牌
  hasPlayableCards(hand: Card[], lastPlay: Play | null): boolean
}
```

### 3.3 状态管理设计

#### 3.3.1 选牌状态

```typescript
interface SelectionState {
  selectedCards: Card[]
  highlightedCards: Card[]  // 高亮的可出牌
  validationResult: ValidationResult | null
  suggestions: Card[][]  // AI建议的选牌组合
}
```

#### 3.3.2 出牌状态

```typescript
interface PlayState {
  isPlaying: boolean
  lastPlay: Play | null
  playableCards: Card[][]
  canPass: boolean
  error: Error | null
}
```

#### 3.3.3 AI建议状态

```typescript
interface SuggestionState {
  isSuggesting: boolean
  suggestions: SuggestionResult[]
  currentSuggestion: SuggestionResult | null
  explanation: string | null
}
```

### 3.4 数据流设计

```
用户操作
  │
  ▼
CardPlayingService (统一入口)
  │
  ├─→ CardSelectorService (选牌)
  │     │
  │     └─→ ValidationService (验证)
  │
  ├─→ PlayExecutorService (出牌)
  │     │
  │     ├─→ ValidationService (验证)
  │     ├─→ Round Manager (轮次管理)
  │     └─→ Async Effects (TTS、语音)
  │
  └─→ AISuggesterService (AI建议)
        │
        └─→ AI Strategy (AI策略)
```

## 4. 实现步骤

### 阶段1: 基础服务层 (Week 1)

#### Step 1.1: 创建 ValidationService
- [ ] 创建 `src/services/cardPlaying/ValidationService.ts`
- [ ] 迁移 `canPlayCards`、`canBeat`、`findPlayableCards` 逻辑
- [ ] 添加统一的验证接口
- [ ] 编写单元测试

#### Step 1.2: 创建 CardSelectorService
- [ ] 创建 `src/services/cardPlaying/CardSelectorService.ts`
- [ ] 实现选牌状态管理
- [ ] 实现智能选牌提示
- [ ] 编写单元测试

#### Step 1.3: 创建 PlayExecutorService
- [ ] 创建 `src/services/cardPlaying/PlayExecutorService.ts`
- [ ] 实现出牌执行逻辑
- [ ] 集成 ValidationService
- [ ] 编写单元测试

#### Step 1.4: 创建 AISuggesterService
- [ ] 创建 `src/services/cardPlaying/AISuggesterService.ts`
- [ ] 实现AI建议接口
- [ ] 集成现有AI策略
- [ ] 实现建议缓存
- [ ] 编写单元测试

### 阶段2: 统一服务层 (Week 2)

#### Step 2.1: 创建 CardPlayingService
- [ ] 创建 `src/services/cardPlaying/CardPlayingService.ts`
- [ ] 整合所有子服务
- [ ] 提供统一接口
- [ ] 编写集成测试

#### Step 2.2: 创建 React Hooks
- [ ] 创建 `src/hooks/useCardPlaying.ts`
- [ ] 封装 CardPlayingService
- [ ] 提供React友好的API
- [ ] 编写Hook测试

### 阶段3: UI层重构 (Week 3)

#### Step 3.1: 重构选牌组件
- [ ] 重构 `CompactHandCards` 组件
- [ ] 使用新的 CardSelectorService
- [ ] 添加智能提示UI
- [ ] 添加选牌验证反馈

#### Step 3.2: 重构出牌组件
- [ ] 重构 `ActionButtons` 组件
- [ ] 使用新的 PlayExecutorService
- [ ] 改进错误提示
- [ ] 添加出牌动画

#### Step 3.3: 重构AI建议组件
- [ ] 重构AI建议UI
- [ ] 使用新的 AISuggesterService
- [ ] 添加建议解释显示
- [ ] 支持多个建议选项

### 阶段4: 集成和优化 (Week 4)

#### Step 4.1: 集成到现有系统
- [ ] 替换现有选牌逻辑
- [ ] 替换现有出牌逻辑
- [ ] 替换现有AI建议逻辑
- [ ] 确保向后兼容

#### Step 4.2: 性能优化
- [ ] 优化选牌性能
- [ ] 优化AI建议性能（缓存、异步）
- [ ] 优化出牌流程性能

#### Step 4.3: 用户体验优化
- [ ] 添加加载状态
- [ ] 添加错误恢复
- [ ] 添加快捷键支持
- [ ] 优化动画效果

## 5. 测试计划

### 5.1 单元测试

#### ValidationService 测试
- [ ] 测试 `validateCardType` - 各种牌型验证
- [ ] 测试 `validatePlayRules` - 出牌规则验证
- [ ] 测试 `findPlayableCards` - 查找可出牌
- [ ] 测试 `hasPlayableCards` - 检查是否有能打过的牌

#### CardSelectorService 测试
- [ ] 测试选牌/取消选牌
- [ ] 测试组选牌
- [ ] 测试智能选牌提示
- [ ] 测试选牌验证

#### PlayExecutorService 测试
- [ ] 测试出牌执行流程
- [ ] 测试出牌验证
- [ ] 测试错误处理
- [ ] 测试异步处理

#### AISuggesterService 测试
- [ ] 测试AI建议生成
- [ ] 测试建议缓存
- [ ] 测试多个建议选项
- [ ] 测试建议解释

### 5.2 集成测试

#### CardPlayingService 集成测试
- [ ] 测试完整的选牌→出牌流程
- [ ] 测试选牌→AI建议→出牌流程
- [ ] 测试错误恢复流程
- [ ] 测试并发操作

#### React Hooks 集成测试
- [ ] 测试 `useCardPlaying` Hook
- [ ] 测试状态更新
- [ ] 测试副作用处理

### 5.3 端到端测试

#### 用户流程测试
- [ ] 测试完整的游戏流程（选牌→出牌）
- [ ] 测试AI建议流程
- [ ] 测试错误场景
- [ ] 测试性能场景（大量牌、复杂牌型）

### 5.4 测试工具和框架

- **单元测试**: Vitest
- **集成测试**: Vitest + React Testing Library
- **端到端测试**: Playwright (可选)

## 6. 迁移策略

### 6.1 渐进式迁移

1. **阶段1**: 新服务与旧代码并存
   - 新服务实现完成但未使用
   - 旧代码继续工作

2. **阶段2**: 逐步替换
   - 先替换选牌逻辑
   - 再替换出牌逻辑
   - 最后替换AI建议逻辑

3. **阶段3**: 清理旧代码
   - 移除旧的实现
   - 更新文档

### 6.2 向后兼容

- 保持现有API接口不变（如果可能）
- 提供适配层（Adapter Pattern）
- 逐步迁移，不一次性替换

## 7. 风险和缓解措施

### 7.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 重构引入新bug | 高 | 充分测试，渐进式迁移 |
| 性能下降 | 中 | 性能测试，优化关键路径 |
| 用户体验变差 | 中 | 用户测试，收集反馈 |

### 7.2 时间风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 时间估算不准确 | 中 | 分阶段实施，优先核心功能 |
| 需求变更 | 中 | 保持设计灵活，预留扩展点 |

## 8. 成功标准

### 8.1 代码质量
- ✅ 代码覆盖率 > 80%
- ✅ 所有测试通过
- ✅ 无重大bug
- ✅ 代码审查通过

### 8.2 性能
- ✅ 选牌响应时间 < 50ms
- ✅ AI建议响应时间 < 500ms
- ✅ 出牌流程时间 < 2s

### 8.3 用户体验
- ✅ 选牌操作流畅
- ✅ 出牌反馈及时
- ✅ AI建议准确有用
- ✅ 错误提示清晰

## 9. 后续优化

### 9.1 功能增强
- 选牌快捷键支持
- 多选牌组合提示
- AI建议解释增强
- 出牌历史记录

### 9.2 性能优化
- AI建议预计算
- 选牌状态缓存
- 异步处理优化

### 9.3 用户体验
- 动画效果优化
- 交互反馈增强
- 无障碍支持

## 10. 参考资料

- [当前出牌流程文档](./play-card-flow.md)
- [游戏架构文档](../architecture/complete-system-architecture.md)
- [AI策略文档](../../src/ai/README.md)


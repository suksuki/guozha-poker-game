# AI建议系统重构 - 多方案设计与实现

## 📋 设计概述

将现有的单一AI建议系统重构为**多方案建议系统**，提供3-5个不同的出牌方案，每个方案都有详细的理由说明，让玩家可以选择最适合的策略。

---

## ❌ 现有系统的问题

### 1. 只提供单一建议

**现有代码**：
```typescript
const suggestedCards = await aiChoosePlay(hand, lastPlay, config);
// 只返回一个建议：Card[] | null
```

**问题**：
- ❌ 只有一个选择，玩家没有对比
- ❌ 没有说明理由，玩家不理解为什么这样建议
- ❌ 无法满足不同策略偏好（激进/保守/平衡）

### 2. 解释过于简单

**现有代码**：
```typescript
const explanation = this.generateExplanation(...);
// 只生成简单的文本说明
```

**问题**：
- ❌ 解释过于简单（如"出三张，平衡策略"）
- ❌ 没有详细的推理过程
- ❌ 没有说明优缺点
- ❌ 没有风险评估

---

## ✅ 新系统设计

### 核心目标

1. ✅ **提供3-5个不同的出牌方案**
2. ✅ **每个方案都有详细的理由说明**
3. ✅ **支持不同策略偏好**
4. ✅ **支持主动要不起方案**
5. ✅ **清晰展示优缺点和风险**

---

## 第一部分：数据结构设计

### 1.1 建议数据结构

```typescript
interface PlaySuggestion {
  id: string;                    // 唯一ID
  action: PlayAction;            // 动作（出牌或要不起）
  rating: number;                // 推荐度评分 (0-100)
  stars: number;                 // 星级 (1-5)
  
  // 理由说明
  reasoning: {
    mainReason: string;          // 主要原因（一句话）
    detailedReason: string;      // 详细理由
    pros: string[];              // 优点列表
    cons: string[];              // 缺点列表
    riskLevel: 'low' | 'medium' | 'high';  // 风险等级
  };
  
  // 评估指标
  evaluation: {
    teamBenefit?: number;        // 团队收益（团队模式）
    personalBenefit?: number;    // 个人收益
    confidence: number;          // 置信度 (0-100)
    longTermImpact: string;      // 长期影响描述
    expectedScore?: number;      // 预期得分
  };
  
  // 策略标签
  strategy: 'aggressive' | 'conservative' | 'balanced' | 'cooperative';
  
  // 卡片信息
  cards: Card[];                 // 建议的牌
  playType?: Play;               // 牌型信息
}

interface PlayAction {
  type: 'play' | 'pass';
  cards?: Card[];                // 出牌的牌（type='play'时）
  strategic?: boolean;           // 是否主动要不起（type='pass'时）
}

interface MultipleSuggestions {
  suggestions: PlaySuggestion[];  // 多个建议（按推荐度排序）
  context: {
    currentRoundScore: number;    // 当前轮次分数
    teamMode: boolean;            // 是否团队模式
    teammateInfo?: {              // 队友信息（团队模式）
      handCount: number;
      hasBigCards: boolean;
    };
  };
  timestamp: number;              // 生成时间
}
```

### 1.2 建议排序和筛选

```typescript
interface SuggestionFilters {
  strategy?: 'aggressive' | 'conservative' | 'balanced' | 'cooperative' | 'all';
  riskLevel?: 'low' | 'medium' | 'high' | 'all';
  minRating?: number;            // 最低评分
  maxSuggestions?: number;       // 最多返回几个建议
}
```

---

## 第二部分：生成多个建议的算法

### 2.1 MCTS生成多个候选

#### 现有MCTS（只返回最优）

```typescript
const bestAction = mctsChoosePlay(hand, lastPlay, config);
// 只返回一个最优动作
```

#### 新MCTS（返回多个候选）

```typescript
interface MCTSCandidates {
  best: Card[];                  // 最优动作
  alternatives: Alternative[];   // 备选动作
}

interface Alternative {
  cards: Card[];
  score: number;                 // 评分
  visits: number;                // 访问次数
  winRate: number;               // 胜率
}
```

### 2.2 生成多个建议的策略

#### 策略1：MCTS Top-N

```typescript
function generateMultipleSuggestionsFromMCTS(
  hand: Card[],
  lastPlay: Play | null,
  config: MCTSConfig,
  count: number = 5
): PlaySuggestion[] {
  // 1. 运行MCTS，获取多个候选动作
  const candidates = mctsChooseMultiplePlays(hand, lastPlay, config, count);
  
  // 2. 为每个候选生成建议
  const suggestions: PlaySuggestion[] = candidates.map((candidate, index) => {
    return generateSuggestionFromCandidate(candidate, index, hand, lastPlay, config);
  });
  
  // 3. 按评分排序
  suggestions.sort((a, b) => b.rating - a.rating);
  
  return suggestions;
}
```

#### 策略2：不同策略生成

```typescript
function generateSuggestionsByStrategy(
  hand: Card[],
  lastPlay: Play | null,
  config: AIConfig
): PlaySuggestion[] {
  const suggestions: PlaySuggestion[] = [];
  
  // 1. 激进策略建议
  const aggressiveSuggestion = generateSuggestion(
    hand, lastPlay, { ...config, strategy: 'aggressive' }
  );
  if (aggressiveSuggestion) {
    suggestions.push({
      ...aggressiveSuggestion,
      strategy: 'aggressive',
      reasoning: {
        ...aggressiveSuggestion.reasoning,
        mainReason: "激进策略：优先出大牌，快速控制局面"
      }
    });
  }
  
  // 2. 保守策略建议
  const conservativeSuggestion = generateSuggestion(
    hand, lastPlay, { ...config, strategy: 'conservative' }
  );
  if (conservativeSuggestion) {
    suggestions.push({
      ...conservativeSuggestion,
      strategy: 'conservative',
      reasoning: {
        ...conservativeSuggestion.reasoning,
        mainReason: "保守策略：保留大牌，谨慎出牌"
      }
    });
  }
  
  // 3. 平衡策略建议
  const balancedSuggestion = generateSuggestion(
    hand, lastPlay, { ...config, strategy: 'balanced' }
  );
  if (balancedSuggestion) {
    suggestions.push({
      ...balancedSuggestion,
      strategy: 'balanced',
      reasoning: {
        ...balancedSuggestion.reasoning,
        mainReason: "平衡策略：兼顾当前和长期收益"
      }
    });
  }
  
  // 4. 团队合作建议（团队模式）
  if (config.teamMode) {
    const cooperativeSuggestion = generateCooperativeSuggestion(
      hand, lastPlay, config
    );
    if (cooperativeSuggestion) {
      suggestions.push(cooperativeSuggestion);
    }
  }
  
  // 5. 主动要不起建议（如果适用）
  const strategicPassSuggestion = generateStrategicPassSuggestion(
    hand, lastPlay, config
  );
  if (strategicPassSuggestion) {
    suggestions.push(strategicPassSuggestion);
  }
  
  return suggestions;
}
```

### 2.3 生成单个建议的详细理由

```typescript
function generateSuggestionFromCandidate(
  candidate: Alternative,
  index: number,
  hand: Card[],
  lastPlay: Play | null,
  config: AIConfig
): PlaySuggestion {
  const play = canPlayCards(candidate.cards);
  const remainingHand = hand.filter(card => !candidate.cards.some(c => c.id === card.id));
  
  // 1. 生成主要原因
  const mainReason = generateMainReason(candidate, play, hand, lastPlay, config);
  
  // 2. 生成详细理由
  const detailedReason = generateDetailedReason(candidate, play, hand, lastPlay, config);
  
  // 3. 分析优点
  const pros = analyzePros(candidate, play, hand, remainingHand, lastPlay, config);
  
  // 4. 分析缺点
  const cons = analyzeCons(candidate, play, hand, remainingHand, lastPlay, config);
  
  // 5. 评估风险
  const riskLevel = evaluateRisk(candidate, play, hand, lastPlay, config);
  
  // 6. 计算评分
  const rating = calculateRating(candidate, pros, cons, riskLevel);
  
  // 7. 生成评估指标
  const evaluation = generateEvaluation(candidate, play, hand, lastPlay, config);
  
  return {
    id: `suggestion-${Date.now()}-${index}`,
    action: { type: 'play', cards: candidate.cards },
    rating,
    stars: Math.ceil(rating / 20), // 0-100 -> 1-5星
    reasoning: {
      mainReason,
      detailedReason,
      pros,
      cons,
      riskLevel
    },
    evaluation,
    strategy: config.strategy || 'balanced',
    cards: candidate.cards,
    playType: play || undefined
  };
}
```

---

## 第三部分：理由生成逻辑

### 3.1 主要原因生成

```typescript
function generateMainReason(
  candidate: Alternative,
  play: Play | null,
  hand: Card[],
  lastPlay: Play | null,
  config: AIConfig
): string {
  if (!play) return "要不起";
  
  const reasons: string[] = [];
  
  // 1. 牌型说明
  const typeNames: Record<string, string> = {
    'single': '单张',
    'pair': '对子',
    'triple': '三张',
    'bomb': '炸弹',
    'dun': '墩'
  };
  reasons.push(`出${typeNames[play.type] || play.type}`);
  
  // 2. 策略说明
  if (config.strategy === 'aggressive') {
    reasons.push("（激进策略：优先出大牌）");
  } else if (config.strategy === 'conservative') {
    reasons.push("（保守策略：保留大牌）");
  }
  
  // 3. 团队配合说明（团队模式）
  if (config.teamMode) {
    const teamReason = generateTeamReason(candidate, play, hand, lastPlay, config);
    if (teamReason) {
      reasons.push(`（${teamReason}）`);
    }
  }
  
  // 4. 关键收益说明
  const keyBenefit = identifyKeyBenefit(candidate, play, hand, lastPlay, config);
  if (keyBenefit) {
    reasons.push(`：${keyBenefit}`);
  }
  
  return reasons.join(' ');
}
```

### 3.2 详细理由生成

```typescript
function generateDetailedReason(
  candidate: Alternative,
  play: Play | null,
  hand: Card[],
  lastPlay: Play | null,
  config: AIConfig
): string {
  if (!play) return "当前没有能打过的牌，建议要不起";
  
  const reasons: string[] = [];
  const remainingHand = hand.filter(card => !candidate.cards.some(c => c.id === card.id));
  
  // 1. 当前局面分析
  if (lastPlay) {
    reasons.push(`当前上家出了${formatPlay(lastPlay)}，`);
    reasons.push(`出${formatPlay(play)}可以压过；`);
  } else {
    reasons.push("当前是新轮次，可以自由出牌；");
  }
  
  // 2. 手牌情况
  reasons.push(`出牌后剩余${remainingHand.length}张牌；`);
  
  // 3. 分数情况
  if (config.currentRoundScore) {
    const scoreCards = candidate.cards.filter(c => isScoreCard(c));
    if (scoreCards.length > 0) {
      const score = calculateCardsScore(scoreCards);
      reasons.push(`可以拿到${score}分；`);
    }
  }
  
  // 4. 战略考虑
  const strategicReason = generateStrategicReason(candidate, play, hand, lastPlay, config);
  if (strategicReason) {
    reasons.push(strategicReason);
  }
  
  return reasons.join(' ');
}
```

### 3.3 优点分析

```typescript
function analyzePros(
  candidate: Alternative,
  play: Play | null,
  hand: Card[],
  remainingHand: Card[],
  lastPlay: Play | null,
  config: AIConfig
): string[] {
  const pros: string[] = [];
  
  if (!play) return pros;
  
  // 1. 减少手牌数量
  if (remainingHand.length < hand.length / 2) {
    pros.push(`减少手牌数量（剩余${remainingHand.length}张）`);
  }
  
  // 2. 可以压过对手
  if (lastPlay && canBeat(play, lastPlay)) {
    pros.push(`可以压过上家的牌（${play.value} > ${lastPlay.value}）`);
  }
  
  // 3. 可以拿到分数
  const scoreCards = candidate.cards.filter(c => isScoreCard(c));
  if (scoreCards.length > 0) {
    const score = calculateCardsScore(scoreCards);
    pros.push(`可以拿到${score}分`);
  }
  
  // 4. 保留关键牌
  const preservesBigCards = checkPreservesBigCards(candidate.cards, remainingHand);
  if (preservesBigCards) {
    pros.push("保留了大牌用于关键时刻");
  }
  
  // 5. 团队配合（团队模式）
  if (config.teamMode) {
    const teamPros = analyzeTeamPros(candidate, play, hand, lastPlay, config);
    pros.push(...teamPros);
  }
  
  // 6. 不拆散关键组合
  const preservesCombos = checkPreservesCombos(candidate.cards, hand);
  if (preservesCombos) {
    pros.push("保留了关键组合牌型");
  }
  
  return pros;
}
```

### 3.4 缺点分析

```typescript
function analyzeCons(
  candidate: Alternative,
  play: Play | null,
  hand: Card[],
  remainingHand: Card[],
  lastPlay: Play | null,
  config: AIConfig
): string[] {
  const cons: string[] = [];
  
  if (!play) return cons;
  
  // 1. 拆散了关键组合
  const breaksCombos = checkBreaksCombos(candidate.cards, hand);
  if (breaksCombos.length > 0) {
    cons.push(`拆散了${breaksCombos.join('、')}组合`);
  }
  
  // 2. 浪费了大牌
  const wastesBigCards = checkWastesBigCards(candidate.cards, hand, lastPlay);
  if (wastesBigCards) {
    cons.push("浪费了大牌（可以用更小的牌压过）");
  }
  
  // 3. 暴露了信息
  const exposesInfo = checkExposesInfo(candidate.cards, hand);
  if (exposesInfo) {
    cons.push("暴露了手牌信息");
  }
  
  // 4. 风险较高
  const hasRisk = evaluateRisk(candidate, play, hand, lastPlay, config) !== 'low';
  if (hasRisk) {
    cons.push("存在一定风险");
  }
  
  // 5. 团队配合问题（团队模式）
  if (config.teamMode) {
    const teamCons = analyzeTeamCons(candidate, play, hand, lastPlay, config);
    cons.push(...teamCons);
  }
  
  return cons;
}
```

---

## 第四部分：UI组件设计

### 4.1 建议列表组件

```typescript
interface SuggestionListProps {
  suggestions: PlaySuggestion[];
  onSelect: (suggestion: PlaySuggestion) => void;
  onClose: () => void;
  currentRoundScore?: number;
  teamMode?: boolean;
}
```

### 4.2 UI布局设计

```
┌─────────────────────────────────────────────────────────┐
│ 💡 AI策略建议                                           │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│ 建议1：主动要不起                    ⭐⭐⭐⭐⭐        │
│ ─────────────────────────────────────────────────────  │
│ 📊 预期团队收益: +25分    🎯 置信度: 85%              │
│                                                         │
│ 💭 主要原因：                                           │
│ 保留大牌用于关键时刻，让队友先出                       │
│                                                         │
│ ✅ 优点：                                               │
│ • 保留大牌（A、A、A），用于关键时刻                   │
│ • 让队友出牌，队友手牌更少                            │
│ • 长期收益最大                                         │
│                                                         │
│ ⚠️ 缺点：                                               │
│ • 如果队友也压不过，会失去15分                        │
│                                                         │
│ 🔍 详细分析：                                           │
│ [展开] [选择此建议]                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 建议2：出K（单张）                   ⭐⭐⭐          │
│ ─────────────────────────────────────────────────────  │
│ 📊 预期团队收益: +15分    🎯 置信度: 70%              │
│                                                         │
│ 💭 主要原因：                                           │
│ 更安全的选择，可以立即拿到分                           │
│                                                         │
│ ✅ 优点：                                               │
│ • 可以立即拿到15分                                     │
│ • 相对安全                                             │
│                                                         │
│ ⚠️ 缺点：                                               │
│ • 暴露了手上有大牌                                     │
│ • 长期收益较低                                         │
│                                                         │
│ [展开] [选择此建议]                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 建议3：出A（单张）                   ⭐⭐            │
│ ─────────────────────────────────────────────────────  │
│ 📊 预期团队收益: +10分    🎯 置信度: 40%              │
│                                                         │
│ ⚠️ 不推荐：虽然能压过，但浪费资源                      │
│                                                         │
│ [展开] [选择此建议]                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.3 展开详细分析视图

```typescript
interface DetailedSuggestionViewProps {
  suggestion: PlaySuggestion;
  onSelect: () => void;
  onClose: () => void;
}
```

**详细视图内容**：
- 完整的推理链
- 卡片可视化
- 风险评估
- 长期影响分析
- 团队配合分析（团队模式）

---

## 第五部分：集成方案

### 5.1 Hook扩展

```typescript
interface UseMultipleSuggestionsResult {
  suggestions: PlaySuggestion[];
  isLoading: boolean;
  error: string | null;
  generateSuggestions: () => Promise<void>;
  selectSuggestion: (suggestion: PlaySuggestion) => void;
}
```

### 5.2 服务层扩展

```typescript
class MultipleAISuggesterService {
  async generateMultipleSuggestions(
    hand: Card[],
    lastPlay: Play | null,
    config: AIConfig,
    options?: {
      count?: number;           // 生成几个建议
      includeStrategicPass?: boolean;  // 是否包含主动要不起
      strategies?: ('aggressive' | 'conservative' | 'balanced')[];  // 策略列表
    }
  ): Promise<MultipleSuggestions> {
    // 1. 使用MCTS生成多个候选
    const mctsCandidates = await this.generateMCTSCandidates(hand, lastPlay, config, options?.count || 3);
    
    // 2. 使用不同策略生成建议
    const strategySuggestions = await this.generateStrategySuggestions(hand, lastPlay, config, options?.strategies);
    
    // 3. 生成主动要不起建议（如果适用）
    let strategicPassSuggestion: PlaySuggestion | null = null;
    if (options?.includeStrategicPass && config.teamMode) {
      strategicPassSuggestion = await this.generateStrategicPassSuggestion(hand, lastPlay, config);
    }
    
    // 4. 合并和排序
    const allSuggestions = [
      ...mctsCandidates,
      ...strategySuggestions,
      ...(strategicPassSuggestion ? [strategicPassSuggestion] : [])
    ];
    
    // 5. 去重（相同动作只保留评分最高的）
    const uniqueSuggestions = this.deduplicateSuggestions(allSuggestions);
    
    // 6. 排序（按评分）
    uniqueSuggestions.sort((a, b) => b.rating - a.rating);
    
    // 7. 限制数量
    const finalSuggestions = uniqueSuggestions.slice(0, options?.count || 5);
    
    return {
      suggestions: finalSuggestions,
      context: {
        currentRoundScore: config.currentRoundScore || 0,
        teamMode: config.teamMode || false,
        teammateInfo: config.teamMode ? this.getTeammateInfo(config) : undefined
      },
      timestamp: Date.now()
    };
  }
}
```

---

## 第六部分：实施步骤

### 阶段1：数据结构和服务层（2-3天）

1. ✅ 定义 `PlaySuggestion` 和 `MultipleSuggestions` 接口
2. ✅ 扩展 `AISuggesterService` 支持多建议生成
3. ✅ 实现理由生成逻辑

### 阶段2：MCTS扩展（2-3天）

1. ✅ 修改MCTS返回多个候选动作
2. ✅ 实现候选动作评分和排序
3. ✅ 集成到建议生成服务

### 阶段3：UI组件（3-4天）

1. ✅ 创建 `SuggestionList` 组件
2. ✅ 创建 `SuggestionCard` 组件
3. ✅ 创建 `DetailedSuggestionView` 组件
4. ✅ 集成到 `MultiPlayerGameBoard`

### 阶段4：集成和测试（2-3天）

1. ✅ 集成到现有的AI建议流程
2. ✅ 单元测试
3. ✅ UI测试

---

## 第七部分：向后兼容

### 保持现有接口

```typescript
// 保留原有接口
async function aiChoosePlay(...): Promise<Card[] | null> {
  // 原有实现
}

// 添加新接口
async function aiGenerateMultipleSuggestions(...): Promise<MultipleSuggestions> {
  // 新实现
}

// 统一入口（向后兼容）
async function getAISuggestions(
  hand: Card[],
  lastPlay: Play | null,
  config: AIConfig,
  mode: 'single' | 'multiple' = 'single'
): Promise<Card[] | null | MultipleSuggestions> {
  if (mode === 'single') {
    return await aiChoosePlay(hand, lastPlay, config);
  } else {
    return await aiGenerateMultipleSuggestions(hand, lastPlay, config);
  }
}
```

---

## 📊 总结

### 核心改进

1. **从单一建议 → 多个建议**
2. **从简单说明 → 详细理由**
3. **从单一策略 → 多种策略对比**

### 预期效果

- ✅ 玩家可以对比不同策略
- ✅ 玩家可以理解每个建议的理由
- ✅ 提升游戏体验和学习价值

---

## 📚 相关文档

- MCTS+LLM设计：`docs/review/mcts-llm-reasoning-chain.md`
- 团队作战设计：`docs/review/team-scoring-and-chat-redesign.md`
- 完整设计方案：`docs/design/team-cooperation-mcts-training-redesign.md`


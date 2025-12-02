# 团队合作MCTS算法重构设计方案 - 快速总结

## 🎯 核心目标

将现有的MCTS算法从**个人竞争模式**升级为**团队合作模式**，并支持**主动要不起**策略、**LLM推理链**和**智能训练系统**。

---

## 📋 主要改动

### 1. MCTS算法重构

#### 当前问题
- ❌ 只优化个人得分
- ❌ 不支持主动要不起
- ❌ 不考虑团队配合

#### 解决方案
- ✅ 扩展游戏状态（添加团队信息）
- ✅ 扩展动作空间（添加"主动要不起"动作）
- ✅ 重构评估函数（优化团队得分）
- ✅ 修改UCT公式（团队收益优化）
- ✅ 重构模拟过程（团队策略模拟）

#### 关键代码变化

**动作类型扩展**：
```typescript
// 原来：只有出牌
type Action = Card[];

// 现在：包含主动要不起
type TeamAction = 
  | { type: 'play', cards: Card[] }
  | { type: 'pass', strategic: boolean };  // strategic = 主动的
```

**评估函数扩展**：
```typescript
// 原来：只评估个人得分
function evaluate(action) {
  return personalScore;
}

// 现在：评估团队得分 + 主动要不起价值
function evaluateTeamAction(action, state) {
  return 
    + teamScore * 2.0          // 团队得分（权重高）
    + strategicPassValue        // 主动要不起价值
    + cooperationScore          // 团队配合得分
    + personalScore * 0.3;      // 个人得分（权重低）
}
```

---

### 2. 主动要不起策略

#### 何时主动要不起？

**场景1：队友能压过**
- 当前轮次有15分
- 队友手牌更少（8张 vs 我的15张）
- 队友有大牌能压过
→ **主动要不起，让队友拿分**

**场景2：保留大牌**
- 我有大牌（A、A、A）
- 当前轮次分数不高（5分）
- 预计后续轮次会有更高分
→ **主动要不起，保留大牌**

**场景3：节奏控制**
- 对手手牌多，我们领先
- 不需要抢分
- 保持优势更重要
→ **主动要不起，控制节奏**

#### 评估函数

```typescript
function evaluateStrategicPass(state) {
  let score = 0;
  
  // 队友能否压过？
  if (teammateCanBeat(state)) score += 50;
  
  // 是否保留了大牌？
  if (hasBigCards(state)) score += 30;
  
  // 轮次分数是否值得？
  if (state.roundScore > 15) score += 20;
  
  // 队友手牌情况
  if (teammateHandCount < myHandCount) score += 25;
  
  // 是否会导致对手得分？
  if (willOpponentScore(state)) score -= 40;
  
  return score;
}
```

---

### 3. 训练系统重构

#### 训练目标变化

**原来**：
- 最大化个人得分
- 最大化个人胜率

**现在**：
- ✅ 最大化团队得分
- ✅ 最大化团队胜率
- ✅ 优化主动要不起时机
- ✅ 最大化团队配合

#### 训练场景生成

```typescript
// 生成训练场景
function generateTrainingScenarios() {
  return [
    {
      name: "高分轮次，队友配合",
      initialState: { roundScore: 20, teammateCanBeat: true },
      expectedAction: { type: 'pass', strategic: true },
      evaluationWeight: { teamScore: 0.4, cooperation: 0.3, strategicPass: 0.3 }
    },
    {
      name: "保留大牌场景",
      initialState: { hasBigCards: true, roundScore: 5 },
      expectedAction: { type: 'pass', strategic: true },
      evaluationWeight: { strategicPass: 0.5, longTerm: 0.3 }
    },
    // ... 更多场景
  ];
}
```

---

### 4. LLM推理链集成

#### 流程

```
MCTS计算 → 多个候选动作
    ↓
LLM推理链分析 → 详细解释
    ↓
生成多个建议 → 玩家选择
```

#### 推理链示例

```
Step 1: 当前局势分析
- 优势：我们团队领先50分
- 劣势：对手可能有炸弹
- 目标：保护优势，谨慎出牌

Step 2: 选项分析
- 选项1：主动要不起
  ✓ 保留大牌（A、A、A）
  ✓ 让队友出牌（队友手牌更少）
  ✓ 长期收益+25分
  ✗ 如果队友压不过，会失去15分

- 选项2：出K
  ✓ 立即拿到15分
  ✗ 暴露了大牌信息

Step 3: 团队配合分析
- 队友手牌8张，更适合先出
- 我们应该保留大牌支援

Step 4: 对比分析
- 选项1长期收益更大
- 选项1风险可控

Step 5: 结论
推荐：主动要不起
理由：保留大牌，长期收益最大
```

---

## 🔧 技术实现要点

### 1. 游戏状态扩展

```typescript
interface TeamSimulatedGameState {
  // 原有字段
  aiHand: Card[];
  lastPlay: Play | null;
  
  // 新增：团队信息
  teamConfig: TeamConfig;
  teamScores: Map<number, number>;
  
  // 新增：主动要不起相关
  canPass: boolean;
  lastPassPlayerIndex: number | null;
  
  // 新增：团队策略
  teammateHands: Card[][];
  roundContext: {
    strategicPassOpportunity: boolean;
    expectedTeamBenefit: number;
  };
}
```

### 2. MCTS节点扩展

```typescript
interface TeamMCTSNode {
  state: TeamSimulatedGameState;
  visits: number;
  teamWins: number;          // 团队获胜（而不是个人）
  teamScoreSum: number;      // 累计团队得分
  action: TeamAction | null; // 包含主动要不起
  evaluation: {
    expectedTeamScore: number;
    strategicPassValue: number;
    teamCooperationScore: number;
  };
}
```

### 3. UCT公式修改

```typescript
function teamUCTValue(node: TeamMCTSNode, c: number) {
  // 利用：团队平均得分（归一化）
  const teamScoreAvg = node.teamScoreSum / node.visits;
  const normalizedScore = normalizeTeamScore(teamScoreAvg);
  
  // 探索：标准UCT
  const exploration = c * Math.sqrt(Math.log(node.parent?.visits || 1) / node.visits);
  
  // 额外：团队配合奖励
  const cooperationBonus = node.evaluation.teamCooperationScore * 0.1;
  
  return normalizedScore + exploration + cooperationBonus;
}
```

---

## 📊 实现优先级

### 阶段1：核心算法重构（2-3周）🔥

1. ✅ 扩展游戏状态
2. ✅ 扩展动作空间（添加主动要不起）
3. ✅ 重构评估函数
4. ✅ 修改UCT公式
5. ✅ 重构模拟过程

### 阶段2：训练系统重构（2-3周）🔥

1. ✅ 设计训练场景生成器
2. ✅ 实现团队评估函数
3. ✅ 实现参数优化算法
4. ✅ 创建训练数据收集系统

### 阶段3：LLM推理链集成（2-3周）⚡

1. ✅ 设计推理链Prompt
2. ✅ 实现LLM调用接口
3. ✅ 实现推理链解析
4. ✅ 集成到决策流程

### 阶段4：系统优化和测试（1-2周）⚡

1. ✅ 性能优化
2. ✅ 单元测试
3. ✅ 集成测试

---

## ⚠️ 关键技术挑战

### 挑战1：主动要不起的时机判断

**解决方案**：
- 规则引擎（明确规则）
- MCTS探索（搜索价值）
- 训练学习（学习最优时机）

### 挑战2：团队配合的量化评估

**解决方案**：
- 多维度评估（得分、配合、节奏）
- 权重学习（训练优化）
- 场景分析（不同场景不同标准）

### 挑战3：计算复杂度

**解决方案**：
- 并行计算
- 剪枝优化
- 缓存机制

---

## 📈 预期效果

### 算法改进

- ✅ **更强的团队配合**：AI能够理解并执行团队策略
- ✅ **更智能的决策**：能够判断何时主动要不起
- ✅ **更高的胜率**：通过训练优化团队策略

### 用户体验

- ✅ **更好的解释**：LLM提供清晰的推理过程
- ✅ **多个建议**：不只是最优解，还有备选方案
- ✅ **学习价值**：玩家可以理解策略逻辑

---

## 🚀 下一步行动

1. **Review设计方案**（当前步骤）
2. **开始实现阶段1**（核心算法重构）
3. **并行设计训练场景**
4. **准备LLM集成环境**

---

### 5. 智能拆牌策略 ⭐⭐⭐⭐

#### 核心思想

**拆牌不是总是坏的，有时候拆牌是必要的，可以形成有利于自己的牌局。**

#### 新评估逻辑

```typescript
// 拆牌评估 = 拆牌收益 - 拆牌代价
function evaluateCardBreaking(action, hand, state) {
  const cost = 40;  // 降低惩罚力度
  const benefits = {
    rhythmControl: 40,      // 节奏控制
    teamCooperation: 50,    // 团队配合
    keyCardPreservation: 60 // 保留关键牌
  };
  return sum(benefits) - cost;  // 如果>0，拆牌值得
}
```

#### 拆牌场景示例

- **节奏控制**：拆牌控制出牌节奏 → 收益+40
- **团队配合**：拆牌让队友出牌 → 收益+50
- **保留关键牌**：拆牌保留炸弹 → 收益+60

---

### 6. AI理解人类沟通 ⭐⭐⭐⭐⭐

#### 核心功能

**AI能够理解人类玩家的对话，实时调整出牌策略。**

#### 系统流程

```
人类输入 → AI理解 → 信息提取 → 策略调整 → 实时生效
"我来出"  NLU分析   策略意图   调整权重   更新MCTS
```

#### 意图识别

- **策略请求**："我来出"、"你来出"、"保留大牌"
- **信息透露**："我有炸弹"、"我没有大牌"
- **配合请求**："我来拿分"、"你保护"

#### 实时策略调整

- 根据理解的信息调整MCTS权重
- 根据策略意图调整评估函数
- 支持MCTS中断重启（实时生效）

---

### 7. 多方案AI建议 ⭐⭐⭐⭐

#### 核心功能

**提供3-5个不同的出牌方案，每个方案都有详细的理由说明。**

#### 建议格式

- 推荐度评分（1-5星）
- 主要原因和详细理由
- 优缺点列表
- 风险评估
- 预期收益

---

## 📚 相关文档

- 完整设计方案：`docs/design/team-cooperation-mcts-training-redesign.md`
- 智能拆牌策略：`docs/design/smart-card-breaking-strategy.md`
- 训练系统调整：`docs/design/mcts-training-adjustment-for-team-mode.md`
- AI理解沟通设计：`docs/design/ai-communication-understanding-redesign.md`
- 多方案建议设计：`docs/design/multiple-ai-suggestions-redesign.md`
- MCTS+LLM设计：`docs/review/mcts-llm-reasoning-chain.md`
- 团队作战设计：`docs/review/team-scoring-and-chat-redesign.md`


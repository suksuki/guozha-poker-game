# 智能拆牌策略设计

## 📋 核心思想

**拆牌不是总是坏的，有时候拆牌是必要的，可以形成有利于自己的牌局。**

现有系统过度惩罚拆牌，需要引入**拆牌收益评估**，平衡拆牌的**代价**和**收益**。

---

## ❌ 现有系统的问题

### 1. 过度惩罚拆牌

```typescript
// 现有评估：几乎总是惩罚拆牌
if (originalCount === 3 && play.type === 'single') {
  score -= 80;  // 拆散三张成单张，扣分
}
if (originalCount === 3 && play.type === 'pair') {
  score -= 100; // 拆散三张成对子，产生死牌，扣更多分
}
if (originalCount >= 4 && play.type !== 'bomb') {
  score -= 150; // 拆散炸弹，严重扣分
}
```

**问题**：
- ❌ 不考虑拆牌的战略价值
- ❌ 不考虑拆牌后的有利局面
- ❌ 不考虑团队模式下的拆牌收益

### 2. 没有考虑拆牌的必要场景

**应该拆牌的场景**：
1. ✅ **控制节奏**：拆牌可以更好地控制出牌节奏
2. ✅ **避免被压制**：有时候拆牌可以避免被对手的大牌压制
3. ✅ **团队配合**：在团队模式下，拆牌可能有利于团队
4. ✅ **保留关键牌**：拆散某些牌，保留更重要的牌（如炸弹）
5. ✅ **创造机会**：拆牌可以创造后续出牌的机会
6. ✅ **高分轮次**：在高分轮次，拆牌可能是必要的

---

## ✅ 智能拆牌策略设计

### 核心原则

**拆牌评估 = 拆牌代价 - 拆牌收益**

- **拆牌代价**：损失组合牌型的价值
- **拆牌收益**：形成的有利局面价值

只有当**拆牌收益 > 拆牌代价**时，拆牌才是值得的。

---

## 第一部分：拆牌收益评估

### 1.1 拆牌的收益类型

#### 收益1：节奏控制

```typescript
interface BreakingBenefit {
  rhythmControl: number;        // 节奏控制收益
  avoidSuppression: number;     // 避免被压制收益
  teamCooperation: number;      // 团队配合收益
  keyCardPreservation: number;  // 保留关键牌收益
  opportunityCreation: number;  // 创造机会收益
  highScoreRound: number;       // 高分轮次收益
  strategicPositioning: number; // 战略定位收益
}

function evaluateBreakingBenefits(
  action: Card[],
  hand: Card[],
  state: GameState,
  teamMode: boolean
): BreakingBenefit {
  const benefits: BreakingBenefit = {
    rhythmControl: 0,
    avoidSuppression: 0,
    teamCooperation: 0,
    keyCardPreservation: 0,
    opportunityCreation: 0,
    highScoreRound: 0,
    strategicPositioning: 0
  };
  
  // 1. 节奏控制收益
  benefits.rhythmControl = evaluateRhythmControlBenefit(action, hand, state);
  
  // 2. 避免被压制收益
  benefits.avoidSuppression = evaluateAvoidSuppressionBenefit(action, hand, state);
  
  // 3. 团队配合收益（团队模式）
  if (teamMode) {
    benefits.teamCooperation = evaluateTeamCooperationBenefit(action, hand, state);
  }
  
  // 4. 保留关键牌收益
  benefits.keyCardPreservation = evaluateKeyCardPreservationBenefit(action, hand, state);
  
  // 5. 创造机会收益
  benefits.opportunityCreation = evaluateOpportunityCreationBenefit(action, hand, state);
  
  // 6. 高分轮次收益
  benefits.highScoreRound = evaluateHighScoreRoundBenefit(action, hand, state);
  
  // 7. 战略定位收益
  benefits.strategicPositioning = evaluateStrategicPositioningBenefit(action, hand, state);
  
  return benefits;
}
```

### 1.2 节奏控制收益

**场景**：通过拆牌控制出牌节奏，避免被对手压制

```typescript
function evaluateRhythmControlBenefit(
  action: Card[],
  hand: Card[],
  state: GameState
): number {
  let score = 0;
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  
  // 场景1：拆牌后可以连续出牌，控制节奏
  const canFollowUp = canFollowUpAfterBreaking(action, remainingHand, state);
  if (canFollowUp) {
    score += 40;  // 可以连续出牌，控制节奏
  }
  
  // 场景2：拆牌后可以避免被对手大牌压制
  const avoidsSuppression = wouldAvoidSuppression(action, remainingHand, state);
  if (avoidsSuppression) {
    score += 30;  // 避免被大牌压制
  }
  
  // 场景3：拆牌后可以打乱对手节奏
  const disruptsOpponent = wouldDisruptOpponentRhythm(action, state);
  if (disruptsOpponent) {
    score += 25;  // 打乱对手节奏
  }
  
  return score;
}
```

**示例**：
- 手牌：3个A、2个K、1个Q
- 上家出：K（单张）
- 拆牌收益：拆散3个A，出1个A压过，保留2个A用于后续，控制节奏 → **收益+40**

### 1.3 避免被压制收益

**场景**：拆牌可以避免被对手的大牌压制，保留更大的牌

```typescript
function evaluateAvoidSuppressionBenefit(
  action: Card[],
  hand: Card[],
  state: GameState
): number {
  let score = 0;
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  
  // 场景1：拆牌后保留更大的牌，避免被压制
  const preservesBiggerCards = checkPreservesBiggerCards(action, remainingHand, state);
  if (preservesBiggerCards) {
    score += 35;  // 保留更大的牌
  }
  
  // 场景2：拆牌后可以应对对手可能的炸弹
  const preparesForBomb = wouldPrepareForBomb(action, remainingHand, state);
  if (preparesForBomb) {
    score += 30;  // 为应对炸弹做准备
  }
  
  // 场景3：拆牌后可以避免被对手控制
  const avoidsControl = wouldAvoidControl(action, remainingHand, state);
  if (avoidsControl) {
    score += 25;  // 避免被控制
  }
  
  return score;
}
```

**示例**：
- 手牌：4个A、3个K
- 上家出：K（单张）
- 不拆牌：出3个K（三张），但对手可能有更大的三张
- 拆牌：拆散3个K，出1个K压过，保留2个K和4个A → **收益+35**

### 1.4 团队配合收益（团队模式）

**场景**：拆牌有利于团队配合，让队友出牌

```typescript
function evaluateTeamCooperationBenefit(
  action: Card[],
  hand: Card[],
  state: TeamGameState
): number {
  let score = 0;
  
  // 场景1：拆牌后让队友更容易出牌
  const helpsTeammate = wouldHelpTeammate(action, hand, state);
  if (helpsTeammate) {
    score += 50;  // 帮助队友出牌
  }
  
  // 场景2：拆牌后保留大牌支援队友
  const supportsTeammate = wouldSupportTeammate(action, hand, state);
  if (supportsTeammate) {
    score += 40;  // 支援队友
  }
  
  // 场景3：拆牌后可以配合队友的牌型
  const coordinatesWithTeammate = wouldCoordinateWithTeammate(action, hand, state);
  if (coordinatesWithTeammate) {
    score += 35;  // 配合队友
  }
  
  return score;
}
```

**示例**：
- 手牌：3个A、2个K、1个Q
- 队友手牌：8张，有较多单张
- 上家出：K（单张）
- 拆牌收益：拆散3个A，出1个A压过，让队友用单张出牌 → **收益+50**

### 1.5 保留关键牌收益

**场景**：拆牌可以保留更重要的牌（如炸弹、大牌）

```typescript
function evaluateKeyCardPreservationBenefit(
  action: Card[],
  hand: Card[],
  state: GameState
): number {
  let score = 0;
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  
  // 场景1：拆牌后保留炸弹
  const preservesBomb = checkPreservesBomb(action, remainingHand);
  if (preservesBomb) {
    score += 60;  // 保留炸弹很重要
  }
  
  // 场景2：拆牌后保留大牌用于关键轮次
  const preservesBigCards = checkPreservesBigCards(action, remainingHand, state);
  if (preservesBigCards) {
    score += 45;  // 保留大牌
  }
  
  // 场景3：拆牌后保留关键组合牌型
  const preservesKeyCombos = checkPreservesKeyCombos(action, remainingHand);
  if (preservesKeyCombos) {
    score += 35;  // 保留关键组合
  }
  
  return score;
}
```

**示例**：
- 手牌：5个A、3个K、2个Q
- 上家出：Q（单张）
- 拆牌收益：拆散3个K，出1个K压过，保留5个A作为炸弹 → **收益+60**

### 1.6 创造机会收益

**场景**：拆牌可以创造后续出牌的机会

```typescript
function evaluateOpportunityCreationBenefit(
  action: Card[],
  hand: Card[],
  state: GameState
): number {
  let score = 0;
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  
  // 场景1：拆牌后可以形成新的组合牌型
  const createsNewCombos = wouldCreateNewCombos(action, remainingHand);
  if (createsNewCombos) {
    score += 40;  // 创造新组合
  }
  
  // 场景2：拆牌后可以连续出牌
  const enablesChain = wouldEnableChain(action, remainingHand, state);
  if (enablesChain) {
    score += 35;  // 可以连续出牌
  }
  
  // 场景3：拆牌后可以减少手牌数量
  const reducesHandSize = wouldReduceHandSize(action, remainingHand);
  if (reducesHandSize) {
    score += 25;  // 减少手牌数量
  }
  
  return score;
}
```

### 1.7 高分轮次收益

**场景**：在高分轮次，拆牌可能是必要的

```typescript
function evaluateHighScoreRoundBenefit(
  action: Card[],
  hand: Card[],
  state: GameState
): number {
  let score = 0;
  
  // 场景1：高分轮次，拆牌可能值得
  if (state.roundScore > 15) {
    // 如果拆牌可以帮助拿到高分
    const helpsGetHighScore = wouldHelpGetHighScore(action, hand, state);
    if (helpsGetHighScore) {
      score += 50;  // 高分轮次，值得拆牌
    }
  }
  
  // 场景2：高分轮次，拆牌可以保护分牌
  if (state.roundScore > 20) {
    const protectsScoreCards = wouldProtectScoreCards(action, hand, state);
    if (protectsScoreCards) {
      score += 40;  // 保护分牌
    }
  }
  
  return score;
}
```

---

## 第二部分：综合拆牌评估

### 2.1 新的拆牌评估函数

```typescript
function evaluateCardBreaking(
  action: Card[],
  hand: Card[],
  state: GameState,
  teamMode: boolean
): number {
  // 1. 计算拆牌代价（原有逻辑）
  const breakingCost = evaluateBreakingCost(action, hand, state);
  
  // 2. 计算拆牌收益（新逻辑）
  const breakingBenefits = evaluateBreakingBenefits(action, hand, state, teamMode);
  const totalBenefit = sumBreakingBenefits(breakingBenefits);
  
  // 3. 综合评估
  const netValue = totalBenefit - breakingCost;
  
  // 4. 如果收益大于代价，拆牌是值得的
  if (netValue > 0) {
    return netValue;  // 正分：拆牌值得
  } else {
    return netValue;  // 负分：拆牌不值得
  }
}

// 计算拆牌代价（保留原有逻辑，但降低惩罚力度）
function evaluateBreakingCost(
  action: Card[],
  hand: Card[],
  state: GameState
): number {
  let cost = 0;
  const handRankGroups = countRankGroups(hand);
  const actionRank = action[0].rank;
  const originalCount = handRankGroups.get(actionRank) || 0;
  const remainingCount = originalCount - action.length;
  const play = canPlayCards(action);
  
  // 降低惩罚力度，因为拆牌可能是必要的
  if (originalCount === 3 && play?.type === 'single') {
    cost = 40;  // 降低惩罚：从-80降到-40
  } else if (originalCount === 3 && play?.type === 'pair') {
    cost = 60;  // 降低惩罚：从-100降到-60
  } else if (originalCount >= 4 && play?.type !== 'bomb' && play?.type !== 'dun') {
    if (remainingCount > 0 && remainingCount < 3) {
      cost = 80;  // 降低惩罚：从-150降到-80
    } else {
      cost = 30;  // 降低惩罚：从-50降到-30
    }
  } else if (originalCount >= 7 && play?.type !== 'dun') {
    cost = 100;  // 降低惩罚：从-200降到-100
  }
  
  return cost;
}

// 汇总拆牌收益
function sumBreakingBenefits(benefits: BreakingBenefit): number {
  return (
    benefits.rhythmControl * 1.0 +
    benefits.avoidSuppression * 0.9 +
    benefits.teamCooperation * 1.2 +  // 团队配合权重更高
    benefits.keyCardPreservation * 1.1 +
    benefits.opportunityCreation * 0.8 +
    benefits.highScoreRound * 1.0 +
    benefits.strategicPositioning * 0.9
  );
}
```

### 2.2 集成到MCTS评估函数

```typescript
function evaluateActionQuality(
  action: Card[],
  hand: Card[],
  lastPlay: Play | null,
  state: GameState,
  teamMode: boolean
): number {
  let score = 0;
  const play = canPlayCards(action);
  if (!play) return -1000;
  
  // 1. 检查是否拆牌
  const handRankGroups = countRankGroups(hand);
  const actionRank = action[0].rank;
  const originalCount = handRankGroups.get(actionRank) || 0;
  const remainingCount = originalCount - action.length;
  const isBreaking = originalCount >= 3 && remainingCount > 0;
  
  // 2. 如果拆牌，使用智能拆牌评估
  if (isBreaking) {
    const breakingEvaluation = evaluateCardBreaking(action, hand, state, teamMode);
    score += breakingEvaluation;
  } else {
    // 3. 如果不拆牌，使用原有评估
    score += evaluateComboBreakdown(hand, action, play, lastPlay);
  }
  
  // 4. 其他评估项
  score += evaluatePlayTypeBonus(play.type);
  score += evaluateScoreCardStrategy(action, hand, play, lastPlay, state.roundScore);
  // ... 其他评估
  
  return score;
}
```

---

## 第三部分：拆牌场景训练

### 3.1 拆牌训练场景

#### 场景1：节奏控制拆牌

```typescript
const scenario1: BreakingTrainingScenario = {
  name: "节奏控制拆牌",
  description: "通过拆牌控制出牌节奏",
  initialState: {
    hand: [/* 3个A, 2个K, 1个Q */],
    lastPlay: { type: 'single', value: 11 },  // K
    roundScore: 10
  },
  expectedAction: {
    cards: [/* 1个A */],
    breaking: true,
    reason: "拆散3个A，出1个A压过，保留2个A用于后续，控制节奏"
  }
};
```

#### 场景2：团队配合拆牌

```typescript
const scenario2: BreakingTrainingScenario = {
  name: "团队配合拆牌",
  description: "拆牌帮助队友出牌",
  initialState: {
    hand: [/* 3个A, 2个K */],
    lastPlay: { type: 'single', value: 11 },  // K
    teammateHand: [/* 8张，较多单张 */],
    roundScore: 15
  },
  expectedAction: {
    cards: [/* 1个A */],
    breaking: true,
    reason: "拆散3个A，出1个A压过，让队友用单张出牌"
  }
};
```

#### 场景3：保留关键牌拆牌

```typescript
const scenario3: BreakingTrainingScenario = {
  name: "保留关键牌拆牌",
  description: "拆牌保留炸弹",
  initialState: {
    hand: [/* 5个A, 3个K, 2个Q */],
    lastPlay: { type: 'single', value: 10 },  // Q
    roundScore: 5
  },
  expectedAction: {
    cards: [/* 1个K */],
    breaking: true,
    reason: "拆散3个K，出1个K压过，保留5个A作为炸弹"
  }
};
```

---

## 第四部分：实施步骤

### 阶段1：评估函数扩展（2-3天）

1. ✅ 实现拆牌收益评估函数
2. ✅ 实现综合拆牌评估函数
3. ✅ 集成到MCTS评估函数

### 阶段2：训练场景生成（2-3天）

1. ✅ 设计拆牌训练场景
2. ✅ 实现场景生成器
3. ✅ 实现场景评估器

### 阶段3：测试验证（1-2天）

1. ✅ 单元测试
2. ✅ 集成测试
3. ✅ 训练数据验证

---

## 📊 总结

### 核心变化

1. **从惩罚拆牌 → 评估拆牌收益**
2. **从单一评估 → 多维度评估**
3. **从个人模式 → 团队模式拆牌**

### 关键改进

1. ✅ 考虑拆牌的战略价值
2. ✅ 平衡拆牌代价和收益
3. ✅ 支持团队模式下的拆牌
4. ✅ 提供拆牌训练场景

---

## 💡 示例对比

### 场景：手牌有3个A，上家出K（单张）

#### 现有系统（总是惩罚拆牌）

```typescript
// 拆散3个A，出1个A → 扣80分
score -= 80;  // 拆牌惩罚
// 结果：总是选择不拆牌
```

#### 新系统（评估拆牌收益）

```typescript
// 拆牌代价
const cost = 40;  // 降低惩罚

// 拆牌收益
const rhythmControl = 40;  // 节奏控制
const preservesKeyCards = 45;  // 保留2个A
const totalBenefit = 85;

// 综合评估
const netValue = 85 - 40 = +45;  // 拆牌值得！

// 结果：如果收益>代价，选择拆牌
```

---

## 🚀 下一步

1. Review这个拆牌策略设计
2. 开始实施阶段1（评估函数扩展）
3. 设计具体的拆牌场景


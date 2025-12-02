# 团队合作模式下的MCTS算法重构与训练系统设计

## 📋 设计概述

本文档设计了一个**完整的系统重构方案**，将现有的MCTS算法从个人竞争模式升级为**团队合作模式**，并引入**主动要不起**策略、**LLM推理链**和**智能训练系统**。

---

## 🎯 核心挑战

### 1. 团队合作策略 vs 个人竞争策略

**现状**：
- MCTS算法优化的是**个人得分最大化**
- 评估函数只考虑**当前玩家的收益**

**新需求**：
- 需要优化**团队总分最大化**
- 需要考虑**队友配合**和**对手威胁**
- 支持**主动要不起**（即使能打过也要不起）

### 2. 主动要不起的策略价值

**新机制**：
- 玩家可以主动选择"要不起"，即使有能打过的牌
- 目的是**保留大牌**、**让队友出牌**、**团队配合**

**MCTS挑战**：
- 需要在搜索树中包含"要不起"作为合法动作
- 评估函数需要理解"主动要不起"的长期价值
- 模拟过程需要考虑团队收益

### 3. 训练系统的复杂性

**现状**：
- 训练系统只针对**个人竞争模式**
- 只评估**个人胜率**和**个人得分**

**新需求**：
- 需要训练**团队策略**
- 需要评估**团队胜率**和**团队得分**
- 需要学习**主动要不起**的时机

### 4. LLM推理链的集成

**新需求**：
- MCTS提供计算，LLM提供解释
- 生成**多个建议**（不只是最优解）
- 解释**为什么主动要不起**是好的策略

---

## 🏗️ 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     游戏层 (Game Layer)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  团队系统    │  │  计分系统    │  │  规则系统    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  决策层 (Decision Layer)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          MCTS算法 (团队感知版本)                     │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │ 团队评估   │  │ 动作生成   │  │ 模拟引擎   │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          LLM推理链 (解释和推理)                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │ 局势分析   │  │ 推理生成   │  │ 建议生成   │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  训练层 (Training Layer)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          团队策略训练系统                             │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │ 场景生成   │  │ 策略评估   │  │ 参数优化   │   │   │
│  │  └────────────┘  └────────────┘  └────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 详细设计

## 第一部分：MCTS算法重构

### 1.1 游戏状态扩展

#### 现有状态（个人模式）

```typescript
interface SimulatedGameState {
  aiHand: Card[];
  opponentHands: Card[][];
  lastPlay: Play | null;
  currentPlayerIndex: number;
  playerCount: number;
  roundScore: number;
  aiScore: number;  // 个人分数
  isTerminal: boolean;
  winner: number | null;
}
```

#### 新状态（团队模式）

```typescript
interface TeamSimulatedGameState extends SimulatedGameState {
  // 团队信息
  teamConfig: TeamConfig;
  teamScores: Map<number, number>;  // teamId -> score
  teamRelationships: Map<number, TeamRelationship>;  // playerId -> relationship
  
  // 主动要不起相关
  canPass: boolean;  // 是否可以选择要不起
  lastPassPlayerIndex: number | null;  // 上一个要不起的玩家
  
  // 团队策略相关
  teammateHands: Card[][];  // 队友手牌（部分信息）
  opponentTeamHands: Card[][];  // 对手团队手牌（估计）
  
  // 决策上下文
  roundContext: {
    roundNumber: number;
    roundScore: number;
    expectedTeamBenefit: number;  // 预期团队收益
    strategicPassOpportunity: boolean;  // 是否有主动要不起的机会
  };
}
```

### 1.2 动作空间扩展

#### 现有动作（只有出牌）

```typescript
type Action = Card[];  // 出牌动作
```

#### 新动作（包含主动要不起）

```typescript
type TeamAction = 
  | { type: 'play', cards: Card[] }  // 出牌
  | { type: 'pass', strategic: boolean };  // 要不起（strategic表示是否是主动的）

// 动作生成函数
function generateTeamActions(
  state: TeamSimulatedGameState
): TeamAction[] {
  const actions: TeamAction[] = [];
  
  // 1. 生成所有可出牌动作
  const playableCards = findPlayableCards(state.aiHand, state.lastPlay);
  actions.push(...playableCards.map(cards => ({
    type: 'play' as const,
    cards
  })));
  
  // 2. 生成主动要不起动作（即使能打过）
  if (state.canPass) {
    actions.push({
      type: 'pass' as const,
      strategic: true  // 主动要不起
    });
  }
  
  return actions;
}
```

### 1.3 评估函数重构

#### 现有评估（个人得分）

```typescript
function evaluateAction(
  action: Card[],
  state: SimulatedGameState
): number {
  // 只评估个人收益
  const personalScore = calculatePersonalScore(action, state);
  return personalScore;
}
```

#### 新评估（团队得分 + 主动要不起价值）

```typescript
function evaluateTeamAction(
  action: TeamAction,
  state: TeamSimulatedGameState
): number {
  let score = 0;
  
  // 1. 团队得分评估
  const teamScore = calculateTeamScoreBenefit(action, state);
  score += teamScore * 2.0;  // 团队得分权重更高
  
  // 2. 主动要不起的评估
  if (action.type === 'pass' && action.strategic) {
    score += evaluateStrategicPass(state);
  }
  
  // 3. 个人得分评估（权重降低）
  if (action.type === 'play') {
    const personalScore = calculatePersonalScore(action.cards, state);
    score += personalScore * 0.3;  // 个人得分权重降低
  }
  
  // 4. 团队配合评估
  score += evaluateTeamCooperation(action, state);
  
  // 5. 长期策略评估
  score += evaluateLongTermStrategy(action, state);
  
  return score;
}

// 评估主动要不起的价值
function evaluateStrategicPass(
  state: TeamSimulatedGameState
): number {
  let score = 0;
  
  // 1. 队友能否压过？
  const teammateCanBeat = canTeammateBeat(state);
  if (teammateCanBeat) {
    score += 50;  // 队友能压过，主动要不起有价值
  }
  
  // 2. 是否保留了大牌？
  const hasBigCards = state.aiHand.some(card => {
    const play = canPlayCards([card]);
    return play && play.value >= 12;
  });
  if (hasBigCards) {
    score += 30;  // 保留大牌有价值
  }
  
  // 3. 当前轮次分数是否值得？
  if (state.roundScore > 15) {
    score += 20;  // 高分数轮次，让队友拿分有价值
  } else {
    score -= 10;  // 低分数轮次，不值得让分
  }
  
  // 4. 队友手牌情况
  const teammateHandCount = getTeammateHandCount(state);
  if (teammateHandCount < state.aiHand.length) {
    score += 25;  // 队友手牌更少，让队友出更合理
  }
  
  // 5. 是否会导致对手得分？
  if (willOpponentScore(state)) {
    score -= 40;  // 如果对手会得分，主动要不起有风险
  }
  
  return score;
}

// 评估团队配合
function evaluateTeamCooperation(
  action: TeamAction,
  state: TeamSimulatedGameState
): number {
  let score = 0;
  
  // 1. 是否帮助队友？
  if (action.type === 'pass' && action.strategic) {
    if (teammateNeedsHelp(state)) {
      score += 30;
    }
  }
  
  // 2. 是否保护了队友？
  if (action.type === 'play' && protectsTeammate(action.cards, state)) {
    score += 20;
  }
  
  // 3. 是否协调了出牌节奏？
  if (coordinatesWithTeammate(action, state)) {
    score += 15;
  }
  
  return score;
}

// 评估长期策略
function evaluateLongTermStrategy(
  action: TeamAction,
  state: TeamSimulatedGameState
): number {
  let score = 0;
  
  // 1. 是否保留了关键牌？
  if (action.type === 'pass' && action.strategic) {
    const preservesKeyCards = checkKeyCardsPreserved(state);
    if (preservesKeyCards) {
      score += 25;
    }
  }
  
  // 2. 是否影响了后续轮次？
  const futureRoundImpact = estimateFutureRoundImpact(action, state);
  score += futureRoundImpact * 0.5;
  
  // 3. 是否建立了团队优势？
  const teamAdvantage = calculateTeamAdvantage(action, state);
  score += teamAdvantage * 1.5;
  
  return score;
}
```

### 1.4 MCTS节点扩展

#### 现有节点（个人模式）

```typescript
interface MCTSNode {
  hand: Card[];
  lastPlay: Play | null;
  playerToMove: 'ai' | 'opponent';
  visits: number;
  wins: number;
  children: MCTSNode[];
  parent: MCTSNode | null;
  action: Card[] | null;
  untriedActions: Card[][];
}
```

#### 新节点（团队模式）

```typescript
interface TeamMCTSNode {
  // 状态信息
  state: TeamSimulatedGameState;
  playerToMove: number;  // 当前玩家ID（支持多人）
  
  // MCTS统计
  visits: number;
  teamWins: number;  // 团队获胜次数（而不是个人获胜）
  teamScoreSum: number;  // 累计团队得分
  
  // 子树
  children: TeamMCTSNode[];
  parent: TeamMCTSNode | null;
  
  // 动作
  action: TeamAction | null;
  untriedActions: TeamAction[];
  
  // 评估指标
  evaluation: {
    expectedTeamScore: number;  // 预期团队得分
    strategicPassValue: number;  // 主动要不起的价值
    teamCooperationScore: number;  // 团队配合得分
    confidence: number;  // 置信度
  };
}
```

### 1.5 UCT公式修改

#### 现有UCT（个人模式）

```typescript
function uctValue(node: MCTSNode, c: number): number {
  if (node.visits === 0) return Infinity;
  
  const exploitation = node.wins / node.visits;  // 个人胜率
  const exploration = c * Math.sqrt(
    Math.log(node.parent?.visits || 1) / node.visits
  );
  
  return exploitation + exploration;
}
```

#### 新UCT（团队模式）

```typescript
function teamUCTValue(node: TeamMCTSNode, c: number): number {
  if (node.visits === 0) return Infinity;
  
  // 利用：团队平均得分（而不是胜率）
  const teamScoreAvg = node.teamScoreSum / node.visits;
  const normalizedScore = normalizeTeamScore(teamScoreAvg);  // 归一化到[0,1]
  
  // 探索：标准UCT探索项
  const exploration = c * Math.sqrt(
    Math.log(node.parent?.visits || 1) / node.visits
  );
  
  // 额外项：团队配合度奖励
  const cooperationBonus = node.evaluation.teamCooperationScore * 0.1;
  
  return normalizedScore + exploration + cooperationBonus;
}
```

### 1.6 模拟过程重构

#### 现有模拟（个人竞争）

```typescript
function simulateGame(
  state: SimulatedGameState,
  maxDepth: number
): number {  // 返回获胜者索引
  while (!state.isTerminal && depth < maxDepth) {
    const playableOptions = findPlayableCards(currentHand, state.lastPlay);
    if (playableOptions.length === 0) {
      // 要不起，但这是被动的（没有能打过的牌）
      state.lastPlay = null;
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.playerCount;
      continue;
    }
    
    // 随机选择出牌
    const selectedAction = randomSelect(playableOptions);
    updateStateAfterPlay(state, selectedAction);
  }
  
  // 返回获胜者（个人）
  return state.winner;
}
```

#### 新模拟（团队合作 + 主动要不起）

```typescript
function simulateTeamGame(
  state: TeamSimulatedGameState,
  maxDepth: number
): { winningTeam: number; finalTeamScores: Map<number, number> } {
  while (!state.isTerminal && depth < maxDepth) {
    const currentPlayer = getCurrentPlayer(state);
    const currentTeamId = getPlayerTeamId(currentPlayer.id, state.teamConfig);
    
    // 生成所有动作（包括主动要不起）
    const actions = generateTeamActions(state);
    
    if (actions.length === 0) {
      // 真的没有能打过的牌
      state.lastPlay = null;
      state.currentPlayerIndex = getNextPlayer(state);
      continue;
    }
    
    // 根据策略选择动作
    const selectedAction = selectActionInSimulation(
      actions,
      state,
      currentPlayer,
      currentTeamId
    );
    
    // 更新状态
    if (selectedAction.type === 'play') {
      updateStateAfterPlay(state, selectedAction.cards);
    } else if (selectedAction.type === 'pass') {
      updateStateAfterPass(state, selectedAction.strategic);
    }
    
    // 转到下一个玩家
    state.currentPlayerIndex = getNextPlayer(state);
    depth++;
  }
  
  // 返回获胜团队和最终团队得分
  const finalTeamScores = calculateFinalTeamScores(state);
  const winningTeam = determineWinningTeam(finalTeamScores);
  
  return {
    winningTeam,
    finalTeamScores
  };
}

// 模拟中的动作选择（考虑团队策略）
function selectActionInSimulation(
  actions: TeamAction[],
  state: TeamSimulatedGameState,
  currentPlayer: Player,
  currentTeamId: number
): TeamAction {
  // 如果是当前玩家的队友，使用团队策略
  if (isTeammate(currentPlayer.id, state.teamConfig)) {
    return selectTeamCooperativeAction(actions, state);
  } else {
    // 对手使用竞争策略
    return selectCompetitiveAction(actions, state);
  }
}

// 团队配合动作选择
function selectTeamCooperativeAction(
  actions: TeamAction[],
  state: TeamSimulatedGameState
): TeamAction {
  // 评估每个动作的团队价值
  const scoredActions = actions.map(action => ({
    action,
    score: evaluateTeamAction(action, state)
  }));
  
  // 排序，优先选择团队价值高的
  scoredActions.sort((a, b) => b.score - a.score);
  
  // 添加一些随机性（避免过于确定）
  const topScore = scoredActions[0].score;
  const goodActions = scoredActions.filter(a => a.score >= topScore - 10);
  
  return goodActions[Math.floor(Math.random() * goodActions.length)].action;
}
```

---

## 第二部分：LLM推理链集成

### 2.1 MCTS + LLM 协作流程

```
游戏状态
    ↓
┌───────────────────────┐
│   1. MCTS计算         │
│   - 生成候选动作      │
│   - 评估团队收益      │
│   - 计算置信度        │
└───────────────────────┘
    ↓
┌───────────────────────┐
│   2. LLM推理链分析    │
│   - 分析当前局势      │
│   - 评估每个选项      │
│   - 生成推理过程      │
└───────────────────────┘
    ↓
┌───────────────────────┐
│   3. 生成多个建议     │
│   - 推荐建议          │
│   - 备选建议          │
│   - 详细解释          │
└───────────────────────┘
```

### 2.2 推理链Prompt设计

```typescript
interface ReasoningChainPrompt {
  gameState: TeamGameState;
  mctsResults: MCTSTeamResult[];
  context: {
    teamMode: boolean;
    currentRoundScore: number;
    teammateHandCount: number;
    opponentTeamHandCount: number;
  };
}

function buildReasoningChainPrompt(
  prompt: ReasoningChainPrompt
): string {
  return `
你是一个专业的过炸牌游戏策略分析师，擅长团队合作模式。

## 当前游戏状态

### 团队信息
- 你的团队：${prompt.gameState.myTeam.name}
- 团队分数：${prompt.gameState.myTeam.score}分
- 对手团队分数：${prompt.gameState.opponentTeam.score}分

### 手牌情况
- 你的手牌：${prompt.gameState.myHand.length}张
- 队友手牌：${prompt.context.teammateHandCount}张（估计）
- 对手团队手牌：${prompt.context.opponentTeamHandCount}张（估计）

### 当前轮次
- 轮次分数：${prompt.context.currentRoundScore}分
- 上家出牌：${formatLastPlay(prompt.gameState.lastPlay)}

## MCTS计算出的候选动作

${prompt.mctsResults.map((result, index) => `
### 选项${index + 1}：${formatAction(result.action)}
- **动作类型**：${result.action.type === 'play' ? '出牌' : '主动要不起'}
- **预期团队收益**：${result.evaluation.expectedTeamScore}分
- **团队配合得分**：${result.evaluation.teamCooperationScore}
- **置信度**：${result.evaluation.confidence}%
- **主动要不起价值**：${result.evaluation.strategicPassValue}
`).join('\n')}

## 请使用推理链分析：

### Step 1: 当前局势分析
- 当前的优势和劣势是什么？
- 主要目标是什么？（捡分/保护/控制节奏）
- 团队配合的关键点在哪里？

### Step 2: 选项分析
${prompt.mctsResults.map((result, index) => `
**选项${index + 1}**：
- 优点是什么？
- 缺点是什么？
- 对团队的影响是什么？
- 是否应该主动要不起？为什么？
`).join('\n')}

### Step 3: 团队配合分析
- 队友的情况如何？
- 是否需要配合队友？
- 如何最大化团队收益？

### Step 4: 对比分析
- 哪个选项最符合当前目标？
- 哪个选项风险最低？
- 哪个选项长期收益最大？
- 主动要不起是否值得？

### Step 5: 得出结论
- 推荐哪个选项？
- 为什么？
- 有什么风险需要注意？

请以清晰的推理链格式输出分析结果，特别关注**主动要不起**的策略价值。
  `;
}
```

### 2.3 推理链输出解析

```typescript
interface ReasoningChain {
  steps: ReasoningStep[];
  recommendation: Recommendation;
  alternatives: Alternative[];
}

interface ReasoningStep {
  stepNumber: number;
  title: string;
  content: string;
  conclusions: string[];
}

interface Recommendation {
  action: TeamAction;
  rating: number;  // 1-5星
  reasoning: string;
  pros: string[];
  cons: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

function parseReasoningChain(
  llmOutput: string,
  mctsResults: MCTSTeamResult[]
): ReasoningChain {
  // 解析LLM输出，提取推理步骤和推荐
  // 实现细节...
}
```

---

## 第三部分：训练系统重构

### 3.1 训练目标重构

#### 现有目标（个人模式）

```typescript
interface TrainingObjective {
  maximizePersonalScore: boolean;
  maximizeWinRate: boolean;
  minimizeAverageTurns: boolean;
}
```

#### 新目标（团队模式）

```typescript
interface TeamTrainingObjective {
  // 团队目标
  maximizeTeamScore: boolean;
  maximizeTeamWinRate: boolean;
  
  // 策略目标
  optimizeStrategicPass: boolean;  // 优化主动要不起的时机
  maximizeTeamCooperation: boolean;  // 最大化团队配合
  
  // 平衡目标
  balanceRiskAndReward: boolean;
  optimizeLongTermStrategy: boolean;
}
```

### 3.2 训练场景生成

```typescript
interface TrainingScenario {
  // 场景描述
  id: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  
  // 游戏状态
  initialState: TeamSimulatedGameState;
  
  // 预期策略
  expectedStrategies: {
    optimalAction: TeamAction;
    alternativeActions: TeamAction[];
    strategicPassOpportunity: boolean;
  };
  
  // 评估指标
  evaluationMetrics: {
    teamScoreWeight: number;
    cooperationWeight: number;
    strategicPassWeight: number;
  };
}

// 生成训练场景
function generateTrainingScenarios(
  count: number,
  difficulty: 'easy' | 'medium' | 'hard'
): TrainingScenario[] {
  const scenarios: TrainingScenario[] = [];
  
  for (let i = 0; i < count; i++) {
    // 1. 生成随机游戏状态
    const initialState = generateRandomTeamGameState();
    
    // 2. 识别策略机会
    const strategicPassOpportunity = detectStrategicPassOpportunity(initialState);
    
    // 3. 生成预期策略
    const expectedStrategies = generateExpectedStrategies(initialState);
    
    // 4. 创建场景
    scenarios.push({
      id: `scenario_${i}`,
      description: `训练场景 ${i + 1}`,
      difficulty,
      initialState,
      expectedStrategies,
      evaluationMetrics: {
        teamScoreWeight: 0.4,
        cooperationWeight: 0.3,
        strategicPassWeight: 0.3
      }
    });
  }
  
  return scenarios;
}
```

### 3.3 训练评估函数

```typescript
interface TrainingEvaluation {
  scenarioId: string;
  actualAction: TeamAction;
  expectedAction: TeamAction;
  score: number;
  breakdown: {
    teamScoreContribution: number;
    cooperationContribution: number;
    strategicPassContribution: number;
    longTermContribution: number;
  };
}

function evaluateTrainingResult(
  scenario: TrainingScenario,
  actualAction: TeamAction,
  gameResult: TeamGameResult
): TrainingEvaluation {
  // 1. 评估团队得分贡献
  const teamScoreContribution = evaluateTeamScoreContribution(
    actualAction,
    gameResult
  );
  
  // 2. 评估团队配合贡献
  const cooperationContribution = evaluateCooperationContribution(
    actualAction,
    gameResult
  );
  
  // 3. 评估主动要不起的贡献
  const strategicPassContribution = evaluateStrategicPassContribution(
    actualAction,
    gameResult
  );
  
  // 4. 评估长期策略贡献
  const longTermContribution = evaluateLongTermContribution(
    actualAction,
    gameResult
  );
  
  // 5. 计算总分
  const score = (
    teamScoreContribution * scenario.evaluationMetrics.teamScoreWeight +
    cooperationContribution * scenario.evaluationMetrics.cooperationWeight +
    strategicPassContribution * scenario.evaluationMetrics.strategicPassWeight +
    longTermContribution * 0.2
  );
  
  return {
    scenarioId: scenario.id,
    actualAction,
    expectedAction: scenario.expectedStrategies.optimalAction,
    score,
    breakdown: {
      teamScoreContribution,
      cooperationContribution,
      strategicPassContribution,
      longTermContribution
    }
  };
}
```

### 3.4 参数优化算法

```typescript
interface MCTSTeamConfig {
  // 基础参数
  iterations: number;
  explorationConstant: number;
  simulationDepth: number;
  
  // 团队参数
  teamScoreWeight: number;  // 团队得分权重
  cooperationWeight: number;  // 团队配合权重
  strategicPassWeight: number;  // 主动要不起权重
  
  // 评估参数
  bigCardPreservationBonus: number;  // 保留大牌奖励
  teammateSupportBonus: number;  // 支持队友奖励
  longTermStrategyWeight: number;  // 长期策略权重
}

// 使用遗传算法优化参数
async function optimizeTeamMCTSParameters(
  trainingScenarios: TrainingScenario[],
  initialConfig: MCTSTeamConfig,
  generations: number
): Promise<MCTSTeamConfig> {
  let population: MCTSTeamConfig[] = [initialConfig];
  
  for (let gen = 0; gen < generations; gen++) {
    // 1. 评估当前种群
    const fitnessScores = await evaluatePopulation(
      population,
      trainingScenarios
    );
    
    // 2. 选择优秀的配置
    const selected = selectBestConfigs(population, fitnessScores);
    
    // 3. 交叉和变异
    const newGeneration = evolveConfigs(selected);
    
    population = newGeneration;
  }
  
  // 返回最优配置
  return population[0];
}
```

---

## 第四部分：实现优先级

### 阶段1：核心算法重构（高优先级）

**目标**：将MCTS算法从个人模式升级为团队模式

**任务**：
1. ✅ 扩展游戏状态（添加团队信息）
2. ✅ 扩展动作空间（添加主动要不起）
3. ✅ 重构评估函数（团队得分评估）
4. ✅ 修改UCT公式（团队收益优化）
5. ✅ 重构模拟过程（团队策略模拟）

**预计时间**：2-3周

### 阶段2：训练系统重构（高优先级）

**目标**：创建团队策略训练系统

**任务**：
1. ✅ 设计训练场景生成器
2. ✅ 实现团队评估函数
3. ✅ 实现参数优化算法
4. ✅ 创建训练数据收集系统

**预计时间**：2-3周

### 阶段3：LLM推理链集成（中优先级）

**目标**：集成LLM提供解释和推理

**任务**：
1. ✅ 设计推理链Prompt
2. ✅ 实现LLM调用接口
3. ✅ 实现推理链解析
4. ✅ 集成到决策流程

**预计时间**：2-3周

### 阶段4：系统优化和测试（中优先级）

**目标**：优化性能和测试系统

**任务**：
1. ✅ 性能优化（并行计算、缓存）
2. ✅ 单元测试
3. ✅ 集成测试
4. ✅ 训练数据验证

**预计时间**：1-2周

---

## 第五部分：关键技术挑战

### 挑战1：主动要不起的时机判断

**问题**：如何判断何时应该主动要不起？

**解决方案**：
1. **规则引擎**：定义明确的规则（队友能压过、保留大牌、高分数轮次等）
2. **MCTS探索**：让MCTS在搜索树中探索主动要不起的价值
3. **训练学习**：通过训练数据学习最优时机

### 挑战2：团队配合的量化评估

**问题**：如何量化评估团队配合的价值？

**解决方案**：
1. **多维度评估**：团队得分、队友支持、节奏协调等
2. **权重学习**：通过训练优化各维度的权重
3. **场景分析**：针对不同场景使用不同的评估标准

### 挑战3：训练数据质量

**问题**：如何生成高质量的团队策略训练数据？

**解决方案**：
1. **场景设计**：精心设计训练场景（高分轮次、队友配合等）
2. **专家标注**：人工标注最优策略
3. **自我对弈**：通过自我对弈生成数据

### 挑战4：计算复杂度

**问题**：团队模式的MCTS计算复杂度大幅增加

**解决方案**：
1. **并行计算**：并行执行多个模拟
2. **剪枝优化**：提前剪枝明显差的动作
3. **缓存机制**：缓存重复计算的评估结果

---

## 第六部分：测试计划

### 单元测试

1. **团队评估函数测试**
   - 测试团队得分计算
   - 测试主动要不起价值评估
   - 测试团队配合评估

2. **动作生成测试**
   - 测试主动要不起动作生成
   - 测试动作合法性验证

3. **模拟过程测试**
   - 测试团队策略模拟
   - 测试状态更新正确性

### 集成测试

1. **MCTS决策测试**
   - 测试团队模式下的MCTS决策
   - 测试主动要不起的决策

2. **训练系统测试**
   - 测试训练场景生成
   - 测试参数优化

3. **LLM集成测试**
   - 测试推理链生成
   - 测试建议生成

### 性能测试

1. **计算性能**
   - 决策时间测试
   - 内存使用测试

2. **训练性能**
   - 训练速度测试
   - 数据生成速度测试

---

## 第七部分：智能拆牌策略

### 7.1 核心思想

**拆牌不是总是坏的，有时候拆牌是必要的，可以形成有利于自己的牌局。**

现有系统过度惩罚拆牌，需要引入**拆牌收益评估**，平衡拆牌的**代价**和**收益**。

### 7.2 现有问题

**现有评估**：几乎总是惩罚拆牌
```typescript
if (拆散三张) score -= 80;   // 扣分
if (拆散炸弹) score -= 150;  // 严重扣分
```

**问题**：
- ❌ 不考虑拆牌的战略价值
- ❌ 不考虑拆牌后的有利局面
- ❌ 不考虑团队模式下的拆牌收益

### 7.3 智能拆牌评估

**核心公式**：`拆牌评估 = 拆牌收益 - 拆牌代价`

只有当**拆牌收益 > 拆牌代价**时，拆牌才是值得的。

#### 拆牌收益类型

1. **节奏控制收益**（+40分）：通过拆牌控制出牌节奏
2. **避免被压制收益**（+35分）：拆牌可以避免被对手的大牌压制
3. **团队配合收益**（+50分）：拆牌有利于团队配合，让队友出牌
4. **保留关键牌收益**（+60分）：拆牌可以保留更重要的牌（如炸弹）
5. **创造机会收益**（+40分）：拆牌可以创造后续出牌的机会
6. **高分轮次收益**（+50分）：在高分轮次，拆牌可能是必要的

#### 拆牌评估函数

```typescript
function evaluateCardBreaking(
  action: Card[],
  hand: Card[],
  state: GameState,
  teamMode: boolean
): number {
  // 1. 计算拆牌代价（降低惩罚力度）
  const breakingCost = evaluateBreakingCost(action, hand, state);
  
  // 2. 计算拆牌收益（多维度评估）
  const breakingBenefits = evaluateBreakingBenefits(action, hand, state, teamMode);
  const totalBenefit = sumBreakingBenefits(breakingBenefits);
  
  // 3. 综合评估
  return totalBenefit - breakingCost;
}
```

### 7.4 拆牌场景示例

#### 场景1：节奏控制拆牌
- **手牌**：3个A、2个K、1个Q
- **上家出**：K（单张）
- **动作**：拆散3个A，出1个A压过
- **理由**：保留2个A用于后续，控制节奏
- **收益**：+40

#### 场景2：团队配合拆牌
- **手牌**：3个A、2个K
- **队友手牌**：8张，较多单张
- **上家出**：K（单张）
- **动作**：拆散3个A，出1个A压过
- **理由**：让队友用单张出牌
- **收益**：+50

#### 场景3：保留关键牌拆牌
- **手牌**：5个A、3个K、2个Q
- **上家出**：Q（单张）
- **动作**：拆散3个K，出1个K压过
- **理由**：保留5个A作为炸弹
- **收益**：+60

### 7.5 集成到评估函数

```typescript
function evaluateActionQuality(
  action: Card[],
  hand: Card[],
  lastPlay: Play | null,
  state: TeamSimulatedGameState
): number {
  let score = 0;
  
  // 检查是否拆牌
  const isBreaking = isCardBreaking(action, hand);
  
  if (isBreaking) {
    // 使用智能拆牌评估
    score += evaluateCardBreaking(action, hand, state, true);
  } else {
    // 使用原有评估
    score += evaluateComboBreakdown(hand, action, play, lastPlay);
  }
  
  // 其他评估项...
  return score;
}
```

### 7.6 实施要点

1. **降低拆牌惩罚力度**：从-80/-150降到-40/-80
2. **实现拆牌收益评估**：多维度评估拆牌价值
3. **集成到MCTS**：在搜索树中探索拆牌选项
4. **训练拆牌场景**：生成拆牌训练场景

---

## 第八部分：AI理解人类沟通并实时调整策略

### 8.1 核心功能

让AI玩家能够理解人类玩家的对话内容，从中提取策略意图和牌信息，并实时调整出牌策略。

### 8.2 系统流程

```
人类玩家输入 → AI理解 → 信息提取 → 策略调整 → 实时生效
     ↓           ↓         ↓          ↓          ↓
  "我来出"    NLU分析   策略意图   调整权重   更新MCTS
  "我有炸弹"  提取信息   牌信息    调整参数   立即响应
```

### 8.3 关键组件

1. **人类玩家输入系统**：文字输入 + 快捷短语
2. **NLU理解系统**：意图识别 + 信息提取
3. **策略调整系统**：动态权重调整 + 实时更新
4. **实时响应机制**：MCTS中断重启 + 立即生效

### 8.4 意图识别

```typescript
type IntentType = 
  | 'strategy_request'      // "我来出"、"你来出"
  | 'information_reveal'    // "我有炸弹"、"我没有大牌"
  | 'cooperation_request'   // "我来拿分"、"你保护"
  | 'tactical_suggestion'   // "保留大牌"、"拆牌出"
```

### 8.5 策略实时调整

- **根据理解的信息调整MCTS权重**
- **根据策略意图调整评估函数**
- **支持MCTS中断和重启**（实时生效）

### 8.6 实施要点

1. 实现聊天输入组件
2. 实现NLU理解模块（规则引擎 + LLM）
3. 实现动态策略调整机制
4. 集成到MCTS评估函数

---

## 第九部分：总结

### 核心改动

1. **MCTS算法**：从个人竞争模式升级为团队合作模式
2. **动作空间**：添加"主动要不起"作为合法动作
3. **评估函数**：优化团队得分而非个人得分
4. **拆牌策略**：智能评估拆牌的收益和代价
5. **AI理解沟通**：AI理解人类对话并实时调整策略
6. **多方案建议**：提供多个出牌方案供选择
7. **训练系统**：训练团队策略和主动要不起时机
8. **LLM集成**：提供推理链解释和多个建议

### 预期效果

1. **更强的团队配合**：AI能够理解并执行团队策略
2. **更智能的决策**：能够判断何时主动要不起
3. **更好的拆牌策略**：能够识别何时应该拆牌
4. **真正的沟通配合**：AI理解人类意图并实时响应
5. **更好的解释**：LLM提供清晰的推理过程
6. **更高的胜率**：通过训练优化团队策略

### 下一步行动

1. 开始实现阶段1（核心算法重构）
2. 实现智能拆牌策略评估
3. 实现AI理解人类沟通系统
4. 实现多方案建议系统
5. 并行设计训练场景
6. 准备LLM集成环境

---

## 📚 参考资料

1. 现有MCTS实现：`src/utils/mctsAI.ts`
2. 团队计分系统：`src/utils/teamScoring.ts`
3. MCTS+LLM设计：`docs/review/mcts-llm-reasoning-chain.md`
4. 团队作战设计：`docs/review/team-scoring-and-chat-redesign.md`
5. 智能拆牌策略：`docs/design/smart-card-breaking-strategy.md`
6. 训练系统调整：`docs/design/mcts-training-adjustment-for-team-mode.md`
7. AI理解沟通设计：`docs/design/ai-communication-understanding-redesign.md`
8. 多方案建议设计：`docs/design/multiple-ai-suggestions-redesign.md`


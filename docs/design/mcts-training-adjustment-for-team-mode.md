# MCTS训练系统调整方案 - 适应团队模式和主动要不起

## 📋 问题分析

### 现有训练系统的问题

当前训练系统（`mctsTuning.ts`）设计用于**个人竞争模式**，与新的**团队合作模式**存在以下不兼容：

#### 1. 游戏结果评估 - ❌ 只评估个人

**现有代码**：
```typescript
// 返回结果：个人获胜者和个人得分
return { 
  winner: number;        // 个人获胜者索引
  turns: number;         // 回合数
  aiScore: number;       // AI个人得分
};
```

**问题**：
- ❌ 只返回个人获胜者，不考虑团队
- ❌ 只统计AI个人得分，不考虑团队得分
- ❌ 无法评估团队配合效果

#### 2. 训练指标 - ❌ 只统计个人指标

**现有代码**：
```typescript
let aiWins = 0;        // AI个人获胜次数
let totalScore = 0;    // AI个人总得分
const winRate = aiWins / games;     // 个人胜率
const avgScore = totalScore / games; // 个人平均得分
```

**问题**：
- ❌ 只统计个人胜率，不统计团队胜率
- ❌ 只统计个人得分，不统计团队得分
- ❌ 无法评估主动要不起的策略价值

#### 3. 游戏模拟过程 - ❌ 不支持团队模式和主动要不起

**现有代码**：
```typescript
// AI玩家使用MCTS
if (currentPlayer === 0) {
  const aiPlay = mctsChoosePlay(currentHand, lastPlay, mctsConfig);
  
  if (!aiPlay || aiPlay.length === 0) {
    // 要不起（被动的）
    lastPlay = null;
    ...
  }
  // 出牌
  ...
}
```

**问题**：
- ❌ 不支持主动要不起（即使能打过也要不起）
- ❌ 不考虑团队配合
- ❌ 不考虑队友手牌情况
- ❌ 不分配分数到团队

#### 4. 评估函数 - ❌ 只优化个人收益

**现有代码**：
```typescript
// 其他玩家使用简单策略
const selectedPlay = playableOptions[0];
// 选择最小的能压过的牌（个人最优）
```

**问题**：
- ❌ 对手也使用个人策略，不模拟团队配合
- ❌ 无法测试团队对抗场景

---

## 🔧 调整方案

### 方案概览

需要调整的主要模块：
1. **游戏结果数据结构** - 从个人改为团队
2. **训练指标统计** - 从个人改为团队
3. **游戏模拟过程** - 支持团队模式和主动要不起
4. **评估函数** - 优化团队收益而非个人收益
5. **训练场景生成** - 生成团队策略场景

---

## 第一部分：游戏结果数据结构调整

### 1.1 扩展游戏结果接口

#### 现有接口（个人模式）

```typescript
interface GameResult {
  config: MCTSConfig;
  aiWins: number;          // AI个人获胜次数
  totalGames: number;
  winRate: number;         // AI个人胜率
  avgScore: number;        // AI个人平均得分
  avgTurns: number;
}
```

#### 新接口（团队模式）

```typescript
interface TeamGameResult {
  config: MCTSTeamConfig;
  
  // 团队指标
  teamWins: number;              // 团队获胜次数
  totalGames: number;
  teamWinRate: number;           // 团队胜率
  avgTeamScore: number;          // 团队平均得分
  
  // 策略指标
  strategicPassCount: number;    // 主动要不起次数
  strategicPassSuccessRate: number; // 主动要不起成功率
  teamCooperationScore: number;  // 团队配合得分
  
  // 其他指标
  avgTurns: number;
  avgRoundScore: number;         // 平均轮次得分
}

interface MCTSTeamConfig extends MCTSConfig {
  teamMode: boolean;
  teamConfig?: TeamConfig;
  strategicPassEnabled: boolean;  // 是否启用主动要不起
  teamScoreWeight: number;        // 团队得分权重
  cooperationWeight: number;      // 团队配合权重
}
```

### 1.2 单局游戏结果扩展

#### 现有结果（个人模式）

```typescript
function runSingleGame(...): { 
  winner: number;       // 个人获胜者
  turns: number;
  aiScore: number;      // AI个人得分
}
```

#### 新结果（团队模式）

```typescript
interface SingleTeamGameResult {
  // 团队结果
  winningTeam: number;           // 获胜团队ID
  finalTeamScores: Map<number, number>;  // 最终团队得分
  teamRankings: TeamRanking[];   // 团队排名
  
  // 策略统计
  strategicPassEvents: StrategicPassEvent[];  // 主动要不起事件
  cooperationEvents: CooperationEvent[];      // 团队配合事件
  
  // 其他统计
  turns: number;
  rounds: number;
  
  // 个人统计（用于分析）
  playerScores: Map<number, number>;
  finishOrder: number[];
}
```

---

## 第二部分：游戏模拟过程调整

### 2.1 游戏状态扩展

#### 现有状态（个人模式）

```typescript
interface TestGameState {
  players: Card[][];
  currentPlayer: number;
  lastPlay: Play | null;
  lastPlayPlayer: number | null;
  roundScore: number;
  finished: boolean;
  winner: number | null;
  turnCount: number;
}
```

#### 新状态（团队模式）

```typescript
interface TeamTestGameState {
  // 基础状态
  players: Card[][];
  currentPlayer: number;
  lastPlay: Play | null;
  lastPlayPlayer: number | null;
  roundScore: number;
  finished: boolean;
  turnCount: number;
  
  // 团队信息
  teamConfig: TeamConfig;
  teamScores: Map<number, number>;  // teamId -> score
  playerTeams: Map<number, number>; // playerId -> teamId
  
  // 主动要不起相关
  canPass: boolean;  // 当前玩家是否可以选择要不起
  lastPassPlayerIndex: number | null;
  strategicPassCount: Map<number, number>;  // playerId -> count
  
  // 统计信息
  cooperationEvents: CooperationEvent[];
  strategicPassEvents: StrategicPassEvent[];
  finishOrder: number[];
  
  // 游戏结束信息
  winningTeam: number | null;
  finalTeamScores: Map<number, number>;
}
```

### 2.2 runSingleGame函数重构

#### 现有函数（个人模式）

```typescript
export function runSingleGame(
  config: MCTSConfig,
  playerCount: number,
  perfectInformation: boolean
): { winner: number; turns: number; aiScore: number }
```

#### 新函数（团队模式）

```typescript
export function runTeamGame(
  config: MCTSTeamConfig,
  playerCount: 4 | 6,  // 只支持4人或6人
  perfectInformation: boolean
): SingleTeamGameResult {
  // 1. 初始化团队配置
  const teamConfig = config.teamConfig || createTeamConfig(playerCount, 0);
  
  // 2. 创建游戏状态
  const state: TeamTestGameState = initializeTeamGameState(
    playerCount,
    teamConfig
  );
  
  // 3. 游戏主循环
  while (!state.finished && state.turnCount < 1000) {
    const currentPlayer = state.players[state.currentPlayer];
    const currentTeamId = state.playerTeams.get(state.currentPlayer);
    
    // 判断是否可以主动要不起
    state.canPass = canStrategicPass(state);
    
    // AI玩家使用团队感知的MCTS
    if (state.currentPlayer === 0) {  // 假设AI是玩家0
      const action = chooseTeamAction(
        currentPlayer,
        state,
        config
      );
      
      // 执行动作（可能包括主动要不起）
      executeTeamAction(state, action, config);
    } else {
      // 其他玩家（可能是队友或对手）
      const action = chooseOtherPlayerAction(
        currentPlayer,
        state,
        currentTeamId,
        config
      );
      
      executeTeamAction(state, action, config);
    }
    
    // 检查游戏是否结束
    if (checkGameFinished(state)) {
      state.finished = true;
      state.winningTeam = determineWinningTeam(state);
      state.finalTeamScores = calculateFinalTeamScores(state);
      break;
    }
    
    // 转到下一个玩家
    state.currentPlayer = getNextPlayer(state);
    state.turnCount++;
  }
  
  // 4. 返回结果
  return {
    winningTeam: state.winningTeam!,
    finalTeamScores: state.finalTeamScores,
    teamRankings: calculateTeamRankings(state),
    strategicPassEvents: state.strategicPassEvents,
    cooperationEvents: state.cooperationEvents,
    turns: state.turnCount,
    rounds: state.roundNumber || 1,
    playerScores: calculatePlayerScores(state),
    finishOrder: state.finishOrder
  };
}
```

### 2.3 动作选择函数

#### 团队感知的动作选择

```typescript
function chooseTeamAction(
  hand: Card[],
  state: TeamTestGameState,
  config: MCTSTeamConfig
): TeamAction {
  // 生成所有可能的动作（包括主动要不起）
  const actions = generateTeamActions(hand, state, config);
  
  // 使用团队感知的MCTS选择动作
  if (config.teamMode) {
    return teamMCTSChoosePlay(hand, state, config);
  } else {
    // 降级到个人模式
    return individualMCTSChoosePlay(hand, state.lastPlay, config);
  }
}

// 生成团队动作（包括主动要不起）
function generateTeamActions(
  hand: Card[],
  state: TeamTestGameState,
  config: MCTSTeamConfig
): TeamAction[] {
  const actions: TeamAction[] = [];
  
  // 1. 生成所有可出牌动作
  const playableCards = findPlayableCards(hand, state.lastPlay);
  actions.push(...playableCards.map(cards => ({
    type: 'play' as const,
    cards
  })));
  
  // 2. 如果启用主动要不起，即使能打过也可以要不起
  if (config.strategicPassEnabled && state.canPass) {
    // 检查是否有能打过的牌
    const canBeatLastPlay = playableCards.some(cards => {
      const play = canPlayCards(cards);
      return play && state.lastPlay && canBeat(play, state.lastPlay);
    });
    
    // 即使能打过，也可以选择主动要不起
    if (canBeatLastPlay || !state.lastPlay) {
      actions.push({
        type: 'pass' as const,
        strategic: true  // 主动要不起
      });
    }
  }
  
  return actions;
}
```

---

## 第三部分：训练指标统计调整

### 3.1 训练结果统计

#### 现有统计（个人模式）

```typescript
let aiWins = 0;
let totalScore = 0;
let totalTurns = 0;

for (let game = 0; game < games; game++) {
  const result = runSingleGame(config, playerCount, perfectInformation);
  
  if (result.winner === 0) {
    aiWins++;  // AI个人获胜
  }
  totalScore += result.aiScore;  // AI个人得分
  totalTurns += result.turns;
}

const winRate = aiWins / games;
const avgScore = totalScore / games;
```

#### 新统计（团队模式）

```typescript
let teamWins = 0;
let totalTeamScore = 0;
let totalStrategicPassCount = 0;
let totalStrategicPassSuccess = 0;
let totalCooperationScore = 0;
let totalTurns = 0;
let totalRounds = 0;

for (let game = 0; game < games; game++) {
  const result = runTeamGame(config, playerCount, perfectInformation);
  
  // 团队获胜（假设AI在团队0）
  const aiTeamId = getPlayerTeamId(0, config.teamConfig!);
  if (result.winningTeam === aiTeamId) {
    teamWins++;
  }
  
  // 团队得分
  const aiTeamScore = result.finalTeamScores.get(aiTeamId) || 0;
  totalTeamScore += aiTeamScore;
  
  // 主动要不起统计
  const aiStrategicPasses = result.strategicPassEvents.filter(
    e => e.playerId === 0
  );
  totalStrategicPassCount += aiStrategicPasses.length;
  
  // 主动要不起成功（队友拿分或团队受益）
  const successfulPasses = aiStrategicPasses.filter(e => e.successful);
  totalStrategicPassSuccess += successfulPasses.length;
  
  // 团队配合得分
  const cooperationScore = calculateCooperationScore(result);
  totalCooperationScore += cooperationScore;
  
  totalTurns += result.turns;
  totalRounds += result.rounds;
}

// 计算最终指标
const teamWinRate = teamWins / games;
const avgTeamScore = totalTeamScore / games;
const strategicPassRate = totalStrategicPassCount / games;
const strategicPassSuccessRate = totalStrategicPassSuccess / totalStrategicPassCount || 0;
const avgCooperationScore = totalCooperationScore / games;
const avgTurns = totalTurns / games;
const avgRounds = totalRounds / games;
```

### 3.2 训练结果接口扩展

#### 现有结果（个人模式）

```typescript
interface GameResult {
  config: MCTSConfig;
  aiWins: number;
  totalGames: number;
  winRate: number;
  avgScore: number;
  avgTurns: number;
}
```

#### 新结果（团队模式）

```typescript
interface TeamGameResult {
  config: MCTSTeamConfig;
  
  // 核心指标
  teamWins: number;
  totalGames: number;
  teamWinRate: number;
  avgTeamScore: number;
  
  // 策略指标
  strategicPassCount: number;
  avgStrategicPassPerGame: number;
  strategicPassSuccessRate: number;
  avgCooperationScore: number;
  
  // 其他指标
  avgTurns: number;
  avgRounds: number;
  
  // 详细统计（可选）
  detailedStats?: {
    teamScoreDistribution: Map<number, number[]>;
    strategicPassByRound: Map<number, number>;
    cooperationEventsByType: Map<string, number>;
  };
}
```

---

## 第四部分：评估函数调整

### 4.1 训练评估优先级

#### 现有优先级（个人模式）

```typescript
// 按个人胜率排序
results.sort((a, b) => b.winRate - a.winRate);
```

#### 新优先级（团队模式）

```typescript
// 综合评估函数
function evaluateTeamConfig(result: TeamGameResult): number {
  let score = 0;
  
  // 1. 团队胜率（最重要，权重40%）
  score += result.teamWinRate * 0.4;
  
  // 2. 团队得分（重要，权重30%）
  const normalizedScore = normalizeTeamScore(result.avgTeamScore);
  score += normalizedScore * 0.3;
  
  // 3. 主动要不起成功率（重要，权重15%）
  score += result.strategicPassSuccessRate * 0.15;
  
  // 4. 团队配合得分（中等，权重10%）
  const normalizedCooperation = normalizeCooperationScore(result.avgCooperationScore);
  score += normalizedCooperation * 0.1;
  
  // 5. 效率（回合数，权重5%）
  const efficiency = 1 / (1 + result.avgTurns / 100);  // 回合数越少越好
  score += efficiency * 0.05;
  
  return score;
}

// 按综合得分排序
results.sort((a, b) => 
  evaluateTeamConfig(b) - evaluateTeamConfig(a)
);
```

---

## 第五部分：训练场景生成调整

### 5.1 团队模式训练场景

#### 场景1：高分轮次，队友配合

```typescript
const scenario1: TeamTrainingScenario = {
  name: "高分轮次，队友配合",
  description: "当前轮次有20分，队友手牌更少，应该主动要不起让队友拿分",
  initialState: {
    roundScore: 20,
    players: [
      [/* AI手牌：有大牌 */],
      [/* 队友手牌：8张，有大牌能压过 */],
      [/* 对手1手牌 */],
      [/* 对手2手牌 */]
    ],
    teamConfig: {
      teams: [
        { id: 0, players: [0, 2] },  // AI和玩家2一队
        { id: 1, players: [1, 3] }   // 玩家1和玩家3一队
      ]
    },
    lastPlay: { type: 'single', value: 8, cards: [] },
    currentPlayer: 0  // AI的回合
  },
  expectedAction: {
    type: 'pass',
    strategic: true
  },
  evaluationMetrics: {
    teamScoreWeight: 0.5,
    cooperationWeight: 0.3,
    strategicPassWeight: 0.2
  }
};
```

#### 场景2：保留大牌场景

```typescript
const scenario2: TeamTrainingScenario = {
  name: "保留大牌，长期策略",
  description: "当前轮次分数不高，AI有大牌，应该保留用于后续高分轮次",
  initialState: {
    roundScore: 5,
    players: [
      [/* AI手牌：有大牌（A、A、A） */],
      [/* 队友手牌 */],
      [/* 对手手牌 */],
      [/* 对手手牌 */]
    ],
    teamConfig: { /* ... */ },
    lastPlay: { type: 'single', value: 7, cards: [] },
    currentPlayer: 0
  },
  expectedAction: {
    type: 'pass',
    strategic: true
  },
  evaluationMetrics: {
    longTermWeight: 0.4,
    strategicPassWeight: 0.3,
    teamScoreWeight: 0.3
  }
};
```

---

## 第六部分：具体调整清单

### 需要修改的文件

#### 1. `src/utils/mctsTuning.ts` ⚠️ **核心文件**

**需要修改**：
- ✅ `GameResult` 接口 → `TeamGameResult`
- ✅ `runSingleGame` 函数 → `runTeamGame`
- ✅ `tuneMCTSParameters` 函数 → 统计团队指标
- ✅ `quickTestConfig` 函数 → 支持团队模式

#### 2. `src/components/game/TrainingRunner.tsx` ⚠️ **UI组件**

**需要修改**：
- ✅ `runTrainingWithProgress` 函数 → 使用 `runTeamGame`
- ✅ 显示界面 → 显示团队指标而非个人指标
- ✅ 结果展示 → 显示团队胜率、团队得分、主动要不起统计

#### 3. `src/utils/mctsAI.ts` ⚠️ **MCTS算法**

**需要修改**：
- ✅ `mctsChoosePlay` → 支持团队模式和主动要不起
- ✅ 评估函数 → 优化团队收益

#### 4. `src/components/game/TrainingConfigPanel.tsx` ⚠️ **配置面板**

**需要修改**：
- ✅ 添加团队模式选项
- ✅ 添加主动要不起开关
- ✅ 添加团队配置选项

---

## 第七部分：实施步骤

### 阶段1：数据结构调整（1-2天）

1. ✅ 定义 `TeamGameResult` 接口
2. ✅ 定义 `MCTSTeamConfig` 接口
3. ✅ 定义 `TeamTestGameState` 接口
4. ✅ 定义 `TeamAction` 类型（包含主动要不起）

### 阶段2：游戏模拟重构（3-5天）

1. ✅ 实现 `runTeamGame` 函数
2. ✅ 实现团队状态初始化
3. ✅ 实现团队动作选择
4. ✅ 实现主动要不起逻辑
5. ✅ 实现团队计分

### 阶段3：训练统计调整（2-3天）

1. ✅ 修改 `tuneMCTSParameters` 统计团队指标
2. ✅ 修改 `quickTestConfig` 支持团队模式
3. ✅ 实现综合评估函数

### 阶段4：UI调整（2-3天）

1. ✅ 修改 `TrainingRunner` 显示团队指标
2. ✅ 修改 `TrainingConfigPanel` 添加团队选项
3. ✅ 更新结果展示界面

### 阶段5：测试验证（2-3天）

1. ✅ 单元测试
2. ✅ 集成测试
3. ✅ 训练数据验证

---

## 第八部分：迁移策略

### 向后兼容

为了保持向后兼容，可以：

1. **保留原有函数**：保留 `runSingleGame` 用于个人模式
2. **添加新模式**：添加 `runTeamGame` 用于团队模式
3. **配置开关**：通过配置选择个人模式或团队模式

```typescript
// 向后兼容的方式
export function runSingleGame(...) {
  // 原有实现
}

export function runTeamGame(...) {
  // 新实现
}

// 统一入口
export function runGame(
  config: MCTSConfig | MCTSTeamConfig,
  playerCount: number,
  perfectInformation: boolean
) {
  if (config.teamMode) {
    return runTeamGame(config as MCTSTeamConfig, playerCount, perfectInformation);
  } else {
    return runSingleGame(config as MCTSConfig, playerCount, perfectInformation);
  }
}
```

---

## 📊 总结

### 核心变化

1. **游戏结果**：从个人获胜 → 团队获胜
2. **训练指标**：从个人胜率 → 团队胜率 + 策略指标
3. **动作空间**：从只有出牌 → 出牌 + 主动要不起
4. **评估目标**：从个人得分 → 团队得分 + 团队配合

### 关键挑战

1. **复杂性增加**：团队模式比个人模式复杂很多
2. **评估难度**：如何量化团队配合和主动要不起的价值
3. **计算成本**：团队模式的MCTS计算量更大

### 预期效果

1. ✅ 训练出能够理解团队策略的AI
2. ✅ 训练出能够判断主动要不起时机的AI
3. ✅ 训练出能够与队友配合的AI
4. ✅ 提高团队模式下的胜率

---

## 🚀 下一步

1. Review这个调整方案
2. 确认实施优先级
3. 开始实施阶段1（数据结构调整）


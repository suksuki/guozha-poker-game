# 迁移架构设计文档

## 🎯 架构重构目标

### 问题定位（之前失败的原因）

```
旧架构问题：
┌──────────┐
│   Game   │ ← 既有状态又有逻辑
│  state   │    职责不清晰
│  logic   │    
└────┬─────┘
     ├─────→ GameController ────┐
     │                          │
     └─────→ RoundScheduler     │
                  ↓             │
            getGameState()      │
                  ↓             │
            this.game ←─────────┘
            
❌ 问题：
1. 循环依赖：Game ↔ Controller ↔ Game
2. 状态分散：Game有状态，Controller也修改Game
3. 调用链混乱：难以追踪数据流
4. 职责不清：每个类都做太多事情
```

### 新架构设计

```
新架构：单一数据源 + 单向数据流

┌─────────────────────────────────────────┐
│          CentralBrain                    │
│      (决策和调度中枢)                     │
│                                          │
│  - 不持有游戏状态                         │
│  - 只持有调度相关状态(任务队列等)          │
│  - 通过StateManager读取游戏状态           │
│  - 通过executeAction修改状态              │
└──────────┬──────────────────────────────┘
           │
           │ 单向：读状态 → 做决策 → 发事件
           ↓
┌─────────────────────────────────────────┐
│         StateManager                     │
│      (唯一状态管理器)                     │
│                                          │
│  - 持有GameState（唯一数据源）            │
│  - 提供getState()（只读）                │
│  - 提供executeAction()（写入）           │
│  - 通过Module处理业务逻辑                 │
└──────────┬──────────────────────────────┘
           │
           │ 状态变化事件
           ↓
┌─────────────────────────────────────────┐
│         GameState                        │
│      (纯数据容器)                         │
│                                          │
│  - 只存储数据，不含逻辑                   │
│  - 不可变更新                             │
│  - 所有字段只读                           │
└──────────┬──────────────────────────────┘
           │
           │ 数据
           ↓
┌─────────────────────────────────────────┐
│    Business Modules (纯函数)             │
│                                          │
│  RoundModule.processPlay(state, action) │
│      ↓                                   │
│  返回新的state（不可变）                  │
└──────────────────────────────────────────┘

✅ 优势：
1. 单一数据源：只有GameState持有数据
2. 单向数据流：清晰可追踪
3. 无循环依赖：严格的层次结构
4. 易于测试：每层独立可测试
```

---

## 📐 详细层次设计

### Layer 1: 数据层（最底层）

```typescript
// GameState - 纯数据容器

class GameState {
  // 只读字段
  readonly config: Readonly<GameConfig>;
  
  private _players: readonly Player[];
  private _status: GameStatus;
  private _rounds: readonly Round[];
  
  // 只提供getter
  get players(): readonly Player[] {
    return this._players;
  }
  
  // 不可变更新（返回新对象）
  updatePlayer(index: number, updates: Partial<Player>): GameState {
    const newPlayers = [...this._players];
    newPlayers[index] = { ...newPlayers[index], ...updates };
    
    const newState = this.clone();
    newState._players = Object.freeze(newPlayers);
    return newState;
  }
  
  // 不允许直接修改
  // ❌ state.players[0] = newPlayer;  // 编译错误
  // ✅ state = state.updatePlayer(0, {...}); // 正确方式
}

职责：
✅ 存储游戏数据
✅ 提供只读访问
✅ 不可变更新
❌ 不包含业务逻辑
❌ 不调用其他模块
```

### Layer 2: 业务逻辑层（纯函数）

```typescript
// RoundModule - 处理轮次逻辑

class RoundModule {
  // 所有方法都是静态纯函数
  static processPlay(
    state: GameState,  // 输入：当前状态
    playerIndex: number,
    cards: Card[]
  ): GameState {      // 输出：新状态
    // 1. 验证
    if (playerIndex !== state.currentPlayerIndex) {
      throw new Error('Not your turn');
    }
    
    // 2. 业务逻辑（纯函数）
    const play = canPlayCards(cards);
    const newHand = removeCards(state.players[playerIndex].hand, cards);
    
    // 3. 创建新状态
    let newState = state.updatePlayer(playerIndex, { hand: newHand });
    
    // 4. 检查游戏逻辑
    if (newHand.length === 0) {
      newState = newState.addToFinishOrder(playerIndex);
    }
    
    // 5. 切换玩家
    const nextPlayer = findNextActivePlayer(newState);
    newState = newState.updateCurrentPlayer(nextPlayer);
    
    return newState;
  }
}

职责：
✅ 处理业务逻辑
✅ 纯函数（输入状态 → 输出新状态）
✅ 无副作用
❌ 不持有状态
❌ 不直接修改状态
```

### Layer 3: 状态管理层

```typescript
// StateManager - 状态管理器

class StateManager {
  private currentState: GameState; // 唯一持有状态的地方
  
  // 只读访问
  getState(): GameState {
    return this.currentState; // GameState本身是不可变的，安全返回
  }
  
  // 执行动作（通过Module处理）
  async executeAction(action: GameAction): Promise<void> {
    const oldState = this.currentState;
    
    // 根据动作类型，调用对应的Module
    let newState: GameState;
    
    switch (action.type) {
      case 'PLAY_CARDS':
        newState = RoundModule.processPlay(
          oldState,
          action.playerIndex,
          action.cards
        );
        break;
        
      case 'PASS':
        newState = RoundModule.processPass(
          oldState,
          action.playerIndex
        );
        break;
        
      default:
        throw new Error(`Unknown action: ${action.type}`);
    }
    
    // 更新状态
    this.currentState = newState;
    
    // 发出事件
    this.emit('stateChanged', { oldState, newState });
  }
}

职责：
✅ 持有当前状态（唯一）
✅ 提供只读访问
✅ 协调Module处理动作
✅ 发出状态变化事件
❌ 不包含业务逻辑
❌ 不直接修改状态（通过Module）
```

### Layer 4: 决策和调度层

```typescript
// CentralBrain - 决策和调度中枢

class CentralBrain {
  private stateManager: StateManager; // 引用，不持有
  private taskQueue: TaskQueue;       // 持有调度状态
  private aiModules: Map<string, IAIModule>;
  
  constructor(stateManager: StateManager) {
    this.stateManager = stateManager; // 只引用
    this.taskQueue = new TaskQueue();
    
    // 监听状态变化
    this.stateManager.on('stateChanged', ({ newState }) => {
      // 状态变化时触发调度
      this.scheduleNext(newState);
    });
  }
  
  // 调度下一个玩家
  private scheduleNext(state: GameState): void {
    const player = state.currentPlayer;
    
    if (player.type === PlayerType.AI) {
      // AI玩家，请求决策
      this.requestAIDecision(player.id);
    }
    // 人类玩家，等待UI输入（不需要处理）
  }
  
  // AI决策
  private async requestAIDecision(playerId: number): Promise<void> {
    // 1. 读取当前状态（只读）
    const state = this.stateManager.getState();
    
    // 2. 提取决策数据
    const decisionInput = this.buildDecisionInput(state, playerId);
    
    // 3. 调用AI模块
    const decision = await this.aiModules.get('mcts')!.decide(decisionInput);
    
    // 4. 执行决策（通过StateManager）
    await this.stateManager.executeAction({
      type: 'PLAY_CARDS',
      playerIndex: playerId,
      cards: decision.cards
    });
  }
}

职责：
✅ 决策调度
✅ AI决策
✅ 聊天管理
✅ 数据收集
❌ 不持有游戏状态（只引用）
❌ 不直接修改状态（通过StateManager）
```

---

## 🔄 数据流设计

### 完整数据流

```
用户点击"出牌"
    ↓
UI层(Vue)
    ↓
store.playCards(cards)
    ↓
stateManager.executeAction({
  type: 'PLAY_CARDS',
  cards: [...]
})
    ↓
RoundModule.processPlay(state, cards)
    ↓
newState = state.updatePlayer(...)
    ↓
stateManager.currentState = newState
    ↓
emit('stateChanged', newState)
    ↓
┌─────────────────┬──────────────────┐
│                 │                  │
↓                 ↓                  ↓
Vue响应式更新      CentralBrain监听   DataCollector收集
UI重新渲染        scheduleNext()     训练数据
                  │
                  ├─ 如果是AI玩家
                  ↓
            requestAIDecision()
                  ↓
            MCTS/LLM决策
                  ↓
        executeAction({PLAY...})
                  ↓
            (循环，但单向清晰)
```

### 关键特征

✅ **单向流动**
- 数据只从上往下流
- 事件只从下往上冒泡
- 不允许反向调用

✅ **清晰的职责**
- GameState：存数据
- Module：处理逻辑
- StateManager：协调
- Brain：调度决策

✅ **无循环依赖**
```
Brain 引用→ StateManager
StateManager 引用→ GameState
Module 引用→ cardUtils (纯函数)

没有反向引用！
```

---

## 🔑 关键设计决策

### 决策1：状态不可变

**为什么？**
- ✅ 易于追踪变化
- ✅ 时间旅行调试（可撤销）
- ✅ 并发安全
- ✅ 易于测试

**如何实现？**
```typescript
// ❌ 可变方式（旧）
game.players[0].score += 10;  // 直接修改

// ✅ 不可变方式（新）
const newState = state.updatePlayer(0, {
  score: state.players[0].score + 10
});
```

### 决策2：纯函数Module

**为什么？**
- ✅ 易于测试（相同输入 → 相同输出）
- ✅ 无副作用
- ✅ 可预测
- ✅ 易于理解

**如何实现？**
```typescript
// ✅ 纯函数
static processPlay(
  state: GameState,  // 输入
  cards: Card[]
): GameState {       // 输出
  // 只依赖输入参数
  // 不读取外部状态
  // 不修改输入参数
  // 不产生副作用
  return newState;
}
```

### 决策3：Brain不持有游戏状态

**为什么？**
- ✅ 避免状态同步问题
- ✅ 单一数据源
- ✅ 职责清晰

**如何实现？**
```typescript
class CentralBrain {
  // ❌ 不这样做
  // private gameState: GameState;
  
  // ✅ 只引用StateManager
  private stateManager: StateManager;
  
  // 需要状态时，从StateManager读取
  private getGameState(): GameState {
    return this.stateManager.getState();
  }
}
```

### 决策4：事件驱动解耦

**为什么？**
- ✅ 模块间松耦合
- ✅ 易于扩展
- ✅ 调用链清晰

**如何实现？**
```typescript
// ❌ 直接调用（旧）
game.playNextTurn(); // 谁调用？何时调用？

// ✅ 事件驱动（新）
stateManager.emit('stateChanged', newState);
    ↓
brain.on('stateChanged', (state) => {
  this.scheduleNext(state);
});
```

---

## 🚨 避免之前的错误

### 错误1：Round状态混乱

**之前的问题**：
```typescript
// Round类既有状态又有逻辑
class Round {
  private plays: Play[] = [];  // 状态
  private totalScore: number;  // 状态
  
  processPlay(cards) {
    this.plays.push(...);  // 直接修改状态
    this.totalScore += ...; // 副作用
    
    // 还调用Game的方法
    this.game.updatePlayer(...); // 循环调用！
  }
}
```

**新方案**：
```typescript
// RoundData - 只存数据
class RoundData {
  readonly plays: readonly Play[];
  readonly totalScore: number;
  // 所有字段只读，不可变
}

// RoundModule - 纯函数处理
class RoundModule {
  static processPlay(
    round: RoundData,
    state: GameState,
    cards: Card[]
  ): { newRound: RoundData; newState: GameState } {
    // 不修改输入
    // 返回新对象
    const newPlays = [...round.plays, newPlay];
    const newRound = new RoundData({ ...round, plays: newPlays });
    
    const newState = state.updatePlayer(...);
    
    return { newRound, newState };
  }
}
```

### 错误2：Scheduler循环调用

**之前的问题**：
```typescript
class RoundScheduler {
  private getGameState: () => Game;  // 引用Game
  onNextTurnCallback: (index) => void; // 回调到Game
  
  scheduleNextTurn() {
    const state = this.getGameState(); // 读取Game
    this.onNextTurnCallback(nextPlayer); // 调用Game.playNextTurn
        ↓
    Game.playNextTurn() {
      // 又调用scheduler
      this.scheduler.scheduleNextTurn(); // 循环！
    }
  }
}
```

**新方案**：
```typescript
class CentralBrain {
  private stateManager: StateManager; // 只引用
  
  constructor(stateManager: StateManager) {
    // 监听状态变化（事件驱动）
    stateManager.on('stateChanged', (newState) => {
      this.onStateChanged(newState);
    });
  }
  
  private onStateChanged(state: GameState): void {
    // 判断是否需要AI出牌
    if (state.currentPlayer.type === PlayerType.AI) {
      this.scheduleAITurn(state.currentPlayerIndex);
    }
  }
  
  private async scheduleAITurn(playerIndex: number): Promise<void> {
    // 添加到任务队列
    await this.taskQueue.add({
      type: 'AI_TURN',
      playerIndex
    });
  }
}

// 不会循环，因为：
// StateManager → emit事件 → Brain监听
// Brain → executeAction → StateManager
// StateManager → emit事件（新一轮）
// 虽然循环，但是单向清晰的事件循环
```

---

## 📊 职责矩阵

| 模块 | 持有状态 | 业务逻辑 | 调用其他模块 | 被调用 |
|------|---------|---------|-------------|--------|
| GameState | ✅ 游戏数据 | ❌ | ❌ | StateManager |
| RoundModule | ❌ | ✅ 轮次逻辑 | cardUtils | StateManager |
| ScoreModule | ❌ | ✅ 计分逻辑 | gameRules | StateManager |
| StateManager | ✅ 当前状态 | ❌ 协调 | Modules | Brain, UI |
| CentralBrain | ❌ 游戏状态<br>✅ 调度状态 | ✅ 调度逻辑 | StateManager, AI | UI, Services |

---

## 🧪 测试策略

### 测试金字塔

```
         /\
        /  \  E2E测试 (少量，关键场景)
       /____\
      /      \  集成测试 (中量，模块协作)
     /________\
    /          \  单元测试 (大量，全覆盖)
   /____________\
```

### 各层测试重点

**单元测试（90%的测试）**
```typescript
// GameState测试
- 不可变性 ✓
- 状态更新 ✓
- 边界情况 ✓

// Module测试
- 纯函数特性 ✓
- 业务逻辑正确性 ✓
- 边界和异常 ✓

// AsyncTaskManager测试
- 超时/重试/降级 ✓
- 取消机制 ✓
- 指标收集 ✓
```

**集成测试（9%的测试）**
```typescript
// StateManager + Modules
- 动作执行流程 ✓
- 状态同步 ✓
- 事件链 ✓

// Brain + StateManager
- 调度流程 ✓
- 状态读写 ✓
- 无循环依赖 ✓
```

**E2E测试（1%的测试）**
```typescript
// 完整游戏流程
- 从开始到结束 ✓
- 真实用户场景 ✓
```

---

## 📈 迁移进度追踪

### 代码迁移进度

```
[▓▓▓▓▓▓▓░░░░░░░░░░░░] 30% - Phase 1-2
[░░░░░░░░░░░░░░░░░░░] 0%  - Phase 3 (Round重构)
[░░░░░░░░░░░░░░░░░░░] 0%  - Phase 4 (调度重构)
[░░░░░░░░░░░░░░░░░░░] 0%  - Phase 5 (Game拆分)
[░░░░░░░░░░░░░░░░░░░] 0%  - Phase 6 (服务集成)
[░░░░░░░░░░░░░░░░░░░] 0%  - Phase 7 (Vue迁移)
```

### 测试进度

```
单元测试覆盖率: [░░░░░░░░░░] 0% → 目标 90%
集成测试: [░░░░░░░░░░] 0/20 → 目标 20个
回归测试: [░░░░░░░░░░] 0% → 目标 98%一致
```

---

## 📝 架构验证清单

### 核心原则检查
- [ ] ✅ 单一数据源（只有GameState持有数据）
- [ ] ✅ 单向数据流（无循环调用）
- [ ] ✅ 职责清晰（每个类单一职责）
- [ ] ✅ 状态不可变（所有更新返回新对象）
- [ ] ✅ 纯函数Module（无副作用）

### 依赖关系检查
- [ ] ✅ GameState不依赖任何业务模块
- [ ] ✅ Module只依赖utils（纯函数）
- [ ] ✅ StateManager只依赖GameState和Module
- [ ] ✅ Brain只依赖StateManager（不持有游戏状态）
- [ ] ✅ 无循环依赖（画依赖图验证）

### 测试覆盖检查
- [ ] ✅ 所有纯函数100%覆盖
- [ ] ✅ 关键路径100%覆盖
- [ ] ✅ 异常场景覆盖
- [ ] ✅ 边界情况覆盖
- [ ] ✅ 回归测试≥98%一致

---

**更新时间**: 2024-12-05  
**负责人**: 开发团队  
**状态**: 进行中


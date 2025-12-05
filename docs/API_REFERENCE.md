# API参考文档

**版本:** v2.0.0  
**更新:** 2024-12-05

---

## 📋 目录

- [GameState API](#gamestate-api)
- [StateManager API](#statemanager-api)
- [RoundData API](#rounddata-api)
- [RoundModule API](#roundmodule-api)
- [业务模块 API](#业务模块-api)
- [异步管理 API](#异步管理-api)
- [服务封装 API](#服务封装-api)

---

## 🎮 GameState API

### 构造函数

```typescript
constructor(config: GameConfig)
```

**参数:**
- `config` - 游戏配置对象

**示例:**
```typescript
const gameState = new GameState({
  playerCount: 4,
  humanPlayerIndex: 0,
  teamMode: false
});
```

### 只读属性

```typescript
readonly config: GameConfig
readonly status: GameStatus
readonly players: readonly Player[]
readonly rounds: readonly RoundData[]
readonly currentPlayerIndex: number
readonly currentRoundIndex: number
readonly finishOrder: readonly number[]
readonly teamConfig: TeamConfig | null
readonly currentRound: RoundData | undefined
readonly currentPlayer: Player | undefined
readonly winner: number | null
readonly finalRankings: any[] | null
readonly teamRankings: any[] | null
readonly winningTeamId: number | null
readonly initialHands: readonly Card[][] | null
readonly gameStartTime: number
readonly gameId: string
```

### 方法

#### initializePlayers

```typescript
initializePlayers(players: Player[]): GameState
```

初始化玩家列表。

**返回:** 新的GameState实例

#### updatePlayer

```typescript
updatePlayer(index: number, updates: Partial<Player>): GameState
```

更新指定玩家的属性。

**参数:**
- `index` - 玩家索引
- `updates` - 要更新的属性

**返回:** 新的GameState实例

#### addRound

```typescript
addRound(round: RoundData): GameState
```

添加新回合。

**返回:** 新的GameState实例

#### updateRound

```typescript
updateRound(index: number, updates: Partial<RoundData>): GameState
```

更新指定回合。

**返回:** 新的GameState实例

#### setStatus

```typescript
setStatus(status: GameStatus): GameState
```

设置游戏状态。

**返回:** 新的GameState实例

#### setCurrentPlayerIndex

```typescript
setCurrentPlayerIndex(index: number): GameState
```

设置当前玩家索引。

**返回:** 新的GameState实例

#### setWinner

```typescript
setWinner(winnerId: number): GameState
```

设置获胜者。

**返回:** 新的GameState实例

---

## 🎛️ StateManager API

### 构造函数

```typescript
constructor(config: GameConfig, maxHistorySize?: number)
```

**参数:**
- `config` - 游戏配置
- `maxHistorySize` - 最大历史记录数（默认100）

### 方法

#### getState

```typescript
getState(): GameState
```

获取当前状态（只读）。

**返回:** 当前GameState实例

#### executeAction

```typescript
async executeAction(action: GameAction): Promise<void>
```

执行游戏动作。

**参数:**
- `action` - 游戏动作对象

**示例:**
```typescript
await stateManager.executeAction({
  type: 'INIT_GAME',
  payload: { players }
});
```

#### registerHandler

```typescript
registerHandler(
  type: GameActionType,
  handler: (state: GameState, payload: any) => GameState | Promise<GameState>
): void
```

注册动作处理器。

**参数:**
- `type` - 动作类型
- `handler` - 处理函数

#### undo

```typescript
undo(): void
```

撤销上一次操作。

#### redo

```typescript
redo(): void
```

重做上一次撤销的操作。

#### canUndo

```typescript
canUndo(): boolean
```

是否可以撤销。

#### canRedo

```typescript
canRedo(): boolean
```

是否可以重做。

#### getStats

```typescript
getStats(): {
  actionCount: number;
  errorCount: number;
  historySize: number;
  successRate: number;
}
```

获取统计信息。

---

## 🎯 RoundData API

### 构造函数

```typescript
constructor(roundNumber: number, isTakeoverRound?: boolean)
```

**参数:**
- `roundNumber` - 回合编号
- `isTakeoverRound` - 是否为接管回合

### 只读属性

```typescript
readonly roundNumber: number
readonly startTime: number
readonly plays: readonly RoundPlayRecord[]
readonly totalScore: number
readonly lastPlay: Play | null
readonly lastPlayPlayerIndex: number | null
readonly isFinished: boolean
readonly endTime?: number
readonly winnerId?: number
readonly winnerName?: string
readonly isTakeoverRound: boolean
readonly takeoverStartPlayerIndex: number | null
readonly takeoverEndPlayerIndex: number | null
```

### 方法

#### addPlay

```typescript
addPlay(playerIndex: number, play: Play): RoundData
```

添加一次出牌。

**返回:** 新的RoundData实例

#### setTakeoverInfo

```typescript
setTakeoverInfo(startIndex: number, endIndex: number): RoundData
```

设置接管信息。

**返回:** 新的RoundData实例

#### finish

```typescript
finish(winnerId: number, winnerName: string, totalScore: number): RoundData
```

完成回合。

**返回:** 新的RoundData实例

---

## 🔧 RoundModule API

### processPlay

```typescript
static processPlay(
  round: RoundData,
  playerIndex: number,
  play: Play
): PlayResult
```

处理玩家出牌。

**返回:**
```typescript
{
  updatedRound: RoundData;
  isValid: boolean;
  message?: string;
}
```

### processPass

```typescript
static processPass(
  round: RoundData,
  playerIndex: number
): PassResult
```

处理玩家pass。

**返回:**
```typescript
{
  updatedRound: RoundData;
  isValid: boolean;
  message?: string;
}
```

### checkRoundEnd

```typescript
static checkRoundEnd(
  round: RoundData,
  allPlayersPassed: boolean
): boolean
```

检查回合是否结束。

**返回:** 是否结束

---

## 📦 业务模块 API

### ScoreModule

```typescript
class ScoreModule {
  static allocateRoundScore(
    roundScore: number,
    winnerId: number,
    playerCount: number
  ): Map<number, number>;
  
  static calculatePlayerTotalScore(
    playerId: number,
    rounds: RoundData[]
  ): number;
  
  static calculateAllScores(
    rounds: RoundData[],
    playerCount: number
  ): Map<number, number>;
  
  static updatePlayerScore(
    state: GameState,
    playerIndex: number,
    scoreChange: number
  ): GameState;
}
```

### DealingModule

```typescript
class DealingModule {
  static dealAndUpdateState(
    state: GameState,
    algorithm?: string
  ): { updatedState: GameState; hands: Card[][] };
  
  static assignHandsToPlayers(
    state: GameState,
    hands: Card[][]
  ): GameState;
}

// 工具函数
export function dealCards(playerCount: number): Card[][];
```

### GameFlowModule

```typescript
class GameFlowModule {
  static startGame(state: GameState): GameState;
  
  static endGame(
    state: GameState,
    winnerId: number,
    rankings: any[]
  ): GameState;
  
  static checkGameEnd(state: GameState): boolean;
  
  static findNextPlayer(
    state: GameState,
    currentIndex: number
  ): number;
}
```

---

## ⚡ 异步管理 API

### AsyncTaskManager

```typescript
class AsyncTaskManager {
  constructor(config?: AsyncManagerConfig);
  
  async execute<T>(
    taskFn: () => Promise<T>,
    config: AsyncTaskConfig
  ): Promise<TaskResult<T>>;
  
  cancelTask(taskId: string): void;
  
  getMetrics(): AsyncMetrics;
  
  getTaskHistory(): TaskHistoryEntry[];
}
```

**配置:**
```typescript
interface AsyncTaskConfig {
  timeout?: number;        // 超时时间(ms)
  retryCount?: number;     // 重试次数
  retryDelay?: number;     // 重试延迟(ms)
  fallback?: () => Promise<T>;  // 失败回退
  enableMetrics?: boolean; // 启用指标
  taskId?: string;         // 任务ID
}
```

**示例:**
```typescript
const result = await asyncManager.execute(
  () => fetchData(),
  {
    timeout: 5000,
    retryCount: 3,
    retryDelay: 1000,
    fallback: () => Promise.resolve(defaultValue)
  }
);
```

### ServiceHealthChecker

```typescript
class ServiceHealthChecker {
  registerService(
    serviceName: string,
    healthCheckFn: () => Promise<boolean>,
    checkInterval?: number
  ): void;
  
  getServiceStatus(serviceName: string): ServiceStatus;
  
  getServiceHealth(serviceName: string): ServiceHealth | undefined;
  
  unregisterService(serviceName: string): void;
  
  cleanup(): void;
}
```

**示例:**
```typescript
healthChecker.registerService(
  'llm-service',
  async () => {
    const response = await fetch('http://llm-api/health');
    return response.ok;
  },
  30000 // 每30秒检查一次
);

const status = healthChecker.getServiceStatus('llm-service');
// 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE'
```

---

## 🔌 服务封装 API

### LLMServiceWrapper

```typescript
class LLMServiceWrapper {
  constructor(
    asyncManager: AsyncTaskManager,
    healthChecker: ServiceHealthChecker
  );
  
  async call(
    prompt: string,
    options?: LLMOptions
  ): Promise<string>;
  
  getMetrics(): LLMMetrics;
}
```

**示例:**
```typescript
const wrapper = new LLMServiceWrapper(asyncManager, healthChecker);
const response = await wrapper.call('分析当前局面', {
  timeout: 5000,
  model: 'gpt-4'
});
```

### TTSServiceWrapper

```typescript
class TTSServiceWrapper {
  constructor(
    asyncManager: AsyncTaskManager,
    healthChecker: ServiceHealthChecker
  );
  
  async speak(
    text: string,
    options?: TTSOptions
  ): Promise<AudioBuffer>;
  
  getMetrics(): TTSMetrics;
}
```

---

## 📊 类型定义

### 核心类型

```typescript
// 游戏状态
enum GameStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

// 玩家类型
enum PlayerType {
  HUMAN = 'HUMAN',
  AI = 'AI'
}

// 玩家
interface Player {
  id: number;
  name: string;
  type: PlayerType;
  hand: Card[];
  score: number;
  isHuman: boolean;
  finishedRank: number | null;
  dunCount: number;
}

// 卡牌
interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
}

// 出牌
interface Play {
  cards: Card[];
  type: PlayType;
  value: number;
}
```

---

## 🎯 使用示例

### 完整游戏流程

```typescript
import { 
  GameState, 
  StateManager,
  DealingModule,
  GameFlowModule 
} from './src/game-engine';

// 1. 创建状态管理器
const config = {
  playerCount: 4,
  humanPlayerIndex: 0,
  teamMode: false
};
const stateManager = new StateManager(config);

// 2. 初始化玩家
const players = [0, 1, 2, 3].map(id => ({
  id,
  name: `玩家${id}`,
  type: id === 0 ? PlayerType.HUMAN : PlayerType.AI,
  hand: [],
  score: 0,
  isHuman: id === 0
}));

let state = stateManager.getState();
state = state.initializePlayers(players);

// 3. 发牌
const hands = dealCards(4);
state = DealingModule.assignHandsToPlayers(state, hands);

// 4. 开始游戏
state = GameFlowModule.startGame(state);

// 5. 监听状态变化
stateManager.on('stateChanged', ({ newState }) => {
  console.log('状态更新:', newState.status);
});
```

### 异步任务管理

```typescript
import { AsyncTaskManager } from './src/central-brain/infrastructure/async';

const asyncManager = new AsyncTaskManager({
  enableMetrics: true,
  maxHistorySize: 100
});

// 执行带超时的任务
const result = await asyncManager.execute(
  async () => {
    const response = await fetch('http://api.example.com/data');
    return response.json();
  },
  {
    timeout: 5000,
    retryCount: 3,
    retryDelay: 1000,
    fallback: async () => ({ data: 'default' })
  }
);

if (result.success) {
  console.log('数据:', result.data);
} else {
  console.error('失败:', result.error);
}
```

### Vue组件使用

```vue
<template>
  <GameBoard />
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore';
import GameBoard from '@/components/GameBoard.vue';

const gameStore = useGameStore();

// 开始游戏
await gameStore.startGame();

// 出牌
await gameStore.playCards(selectedCards);

// 过牌
await gameStore.pass();
</script>
```

---

## 🔗 相关链接

- [架构设计](./migration/MIGRATION_ARCHITECTURE.md)
- [快速参考](./migration/QUICK_REFERENCE.md)
- [测试策略](./migration/TESTING_STRATEGY.md)

---

**文档版本:** v1.0  
**最后更新:** 2024-12-05  
**维护者:** Dev Team


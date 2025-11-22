# MCTS算法重构与训练功能规划

## 一、总体目标

重构MCTS算法，实现训练功能，通过大量模拟对局来优化算法参数和策略选择。

## 二、核心需求

### 1. 训练功能需求
- ✅ 可设定模拟牌局数量
- ✅ 全信息牌局（知道所有玩家手牌）
- ✅ 记录不同场景下的最优出牌方式
- ✅ 通过训练结果微调算法参数
- ✅ 训练时MCTS深度可调整

### 2. 关键需求
- ✅ **训练时MCTS深度与打牌时分离**：通过配置文件独立设置
- ✅ **训练进度条**：必须显示有效进度，防止死机无感知
- ✅ **模式区分**：启动时明确区分训练模式和正常游戏模式

## 三、架构设计

### 3.1 目录结构

```
src/ai/
├── mcts/                    # MCTS核心算法（已存在）
│   ├── index.ts
│   ├── uct.ts
│   ├── selection.ts
│   ├── expansion.ts
│   ├── simulation.ts
│   ├── backpropagation.ts
│   └── ...
├── training/                # 训练模块（新建）
│   ├── index.ts            # 训练入口
│   ├── trainer.ts          # 训练器主类
│   ├── gameSimulator.ts    # 游戏模拟器
│   ├── scenarioRecorder.ts # 场景记录器
│   ├── progressTracker.ts  # 进度跟踪器
│   └── resultAnalyzer.ts   # 结果分析器
├── config/                 # 配置模块（新建）
│   ├── trainingConfig.ts   # 训练配置
│   └── mctsConfig.ts       # MCTS配置（分离训练/游戏）
└── types.ts                # 类型定义
```

### 3.2 配置分离设计

#### 3.2.1 MCTS配置分离

```typescript
// src/ai/config/mctsConfig.ts

// 游戏时MCTS配置
export const GAME_MCTS_CONFIG: MCTSConfig = {
  iterations: 50,           // 游戏时迭代次数（快速）
  simulationDepth: 20,      // 游戏时模拟深度（浅）
  explorationConstant: 1.414,
  // ...
};

// 训练时MCTS配置
export const TRAINING_MCTS_CONFIG: MCTSConfig = {
  iterations: 200,          // 训练时迭代次数（更多）
  simulationDepth: 50,      // 训练时模拟深度（更深）
  explorationConstant: 1.414,
  // ...
};

// 从配置文件读取
export function loadMCTSConfig(mode: 'game' | 'training'): MCTSConfig {
  // 从配置文件或环境变量读取
}
```

#### 3.2.2 训练配置

```typescript
// src/ai/config/trainingConfig.ts

export interface TrainingConfig {
  // 基础配置
  gameCount: number;              // 模拟牌局数量
  playerCount: number;             // 玩家数量（默认4）
  
  // MCTS配置（训练时使用）
  mctsConfig: MCTSConfig;
  
  // 场景记录配置
  recordScenarios: boolean;        // 是否记录场景
  scenarioThreshold?: number;      // 场景记录阈值
  
  // 进度显示配置
  progressUpdateInterval: number;  // 进度更新间隔（毫秒）
  showDetailedProgress: boolean;   // 是否显示详细进度
  
  // 结果分析配置
  analyzeResults: boolean;         // 是否分析结果
  saveResults: boolean;            // 是否保存结果
  resultsPath?: string;            // 结果保存路径
}
```

### 3.3 训练流程设计

```
开始训练
  ↓
初始化训练器
  ↓
循环（gameCount次）
  ├─ 创建全信息游戏状态
  ├─ 模拟完整对局
  ├─ 记录关键场景和决策
  ├─ 更新进度条
  └─ 收集统计数据
  ↓
分析训练结果
  ↓
生成优化建议
  ↓
保存结果（可选）
  ↓
结束训练
```

## 四、核心模块设计

### 4.1 训练器（Trainer）

**职责**：
- 管理训练流程
- 协调各模块
- 处理进度更新
- 生成训练报告

**接口**：
```typescript
class Trainer {
  async train(config: TrainingConfig): Promise<TrainingResult>
  pause(): void
  resume(): void
  stop(): void
  getProgress(): TrainingProgress
}
```

### 4.2 游戏模拟器（GameSimulator）

**职责**：
- 创建全信息游戏状态
- 模拟完整对局
- 使用训练时MCTS配置
- 返回对局结果

**接口**：
```typescript
class GameSimulator {
  async simulateGame(config: SimulationConfig): Promise<GameResult>
  createPerfectInformationState(): GameState
}
```

### 4.3 场景记录器（ScenarioRecorder）

**职责**：
- 识别关键场景（如：大分被吃、出墩、接风等）
- 记录场景上下文
- 记录最优决策
- 统计决策效果

**接口**：
```typescript
class ScenarioRecorder {
  recordScenario(scenario: GameScenario, decision: Decision, outcome: Outcome): void
  getScenarioStats(): ScenarioStatistics
  exportScenarios(): ScenarioData[]
}
```

### 4.4 进度跟踪器（ProgressTracker）

**职责**：
- 跟踪训练进度
- 计算剩余时间
- 更新进度条
- 提供进度回调

**接口**：
```typescript
class ProgressTracker {
  update(current: number, total: number): void
  getProgress(): ProgressInfo
  onProgress(callback: (progress: ProgressInfo) => void): void
}

interface ProgressInfo {
  current: number;           // 当前进度
  total: number;            // 总数
  percentage: number;        // 百分比
  elapsedTime: number;      // 已用时间（毫秒）
  estimatedTimeRemaining: number; // 预计剩余时间（毫秒）
  gamesPerSecond: number;   // 每秒游戏数
  currentGame: number;      // 当前游戏编号
}
```

### 4.5 结果分析器（ResultAnalyzer）

**职责**：
- 分析训练结果
- 统计胜率、平均分数等
- 识别最优策略
- 生成优化建议

**接口**：
```typescript
class ResultAnalyzer {
  analyze(results: GameResult[]): AnalysisResult
  generateRecommendations(): Recommendation[]
}
```

## 五、进度条实现方案

### 5.1 进度条要求
- ✅ 实时更新（至少每100ms更新一次）
- ✅ 显示百分比、已用时间、剩余时间
- ✅ 显示当前游戏编号
- ✅ 显示处理速度（游戏/秒）
- ✅ 可取消训练

### 5.2 实现方式

#### 方案1：控制台进度条（Node.js环境）
```typescript
import cliProgress from 'cli-progress';

const progressBar = new cliProgress.SingleBar({
  format: '训练进度 |{bar}| {percentage}% | {value}/{total} 游戏 | 已用: {duration}s | 剩余: {eta}s | 速度: {speed} 游戏/s'
}, cliProgress.Presets.shades_classic);
```

#### 方案2：Web UI进度条（浏览器环境）
```typescript
// 使用React组件显示进度
<TrainingProgress
  current={progress.current}
  total={progress.total}
  elapsedTime={progress.elapsedTime}
  estimatedTimeRemaining={progress.estimatedTimeRemaining}
  gamesPerSecond={progress.gamesPerSecond}
  onCancel={() => trainer.stop()}
/>
```

#### 方案3：Web Worker + 主线程通信（推荐）
```typescript
// 在Web Worker中运行训练
// 通过postMessage发送进度更新
// 主线程接收并更新UI
```

## 六、场景记录设计

### 6.1 关键场景类型

```typescript
enum ScenarioType {
  BIG_SCORE_STOLEN = 'big_score_stolen',    // 大分被吃
  DUN_PLAYED = 'dun_played',                // 出墩
  TAKEOVER = 'takeover',                    // 接风
  FINISHING_MOVE = 'finishing_move',        // 最后一手
  HIGH_STAKE_ROUND = 'high_stake_round',    // 高分轮次
  BOMB_USED = 'bomb_used',                  // 使用炸弹
  // ...
}
```

### 6.2 场景数据结构

```typescript
interface GameScenario {
  type: ScenarioType;
  context: {
    hand: Card[];
    lastPlay: Play | null;
    roundScore: number;
    playerScores: number[];
    // ...
  };
  decision: Decision;        // 实际决策
  alternatives: Decision[];  // 其他可选决策
  outcome: Outcome;          // 决策结果
  optimalDecision?: Decision; // 最优决策（通过训练得出）
}
```

## 七、实施步骤

### 阶段1：配置分离（1-2小时）
1. ✅ 创建 `src/ai/config/mctsConfig.ts`
2. ✅ 分离游戏时和训练时MCTS配置
3. ✅ 支持从配置文件读取
4. ✅ 更新现有代码使用新配置

### 阶段2：训练基础设施（2-3小时）
1. ✅ 创建 `src/ai/training/` 目录
2. ✅ 实现 `ProgressTracker`
3. ✅ 实现 `GameSimulator`
4. ✅ 实现基础 `Trainer` 类

### 阶段3：场景记录（2-3小时）
1. ✅ 实现 `ScenarioRecorder`
2. ✅ 定义场景类型
3. ✅ 实现场景识别逻辑
4. ✅ 实现场景统计

### 阶段4：进度条UI（1-2小时）
1. ✅ 实现控制台进度条（Node.js）
2. ✅ 实现Web UI进度条（React）
3. ✅ 实现Web Worker版本（可选）

### 阶段5：结果分析（1-2小时）
1. ✅ 实现 `ResultAnalyzer`
2. ✅ 实现结果统计
3. ✅ 实现优化建议生成

### 阶段6：集成测试（1小时）
1. ✅ 测试训练流程
2. ✅ 测试进度条更新
3. ✅ 测试场景记录
4. ✅ 测试配置分离

## 八、配置文件示例

### 8.1 训练配置文件（training.config.json）

```json
{
  "training": {
    "gameCount": 1000,
    "playerCount": 4,
    "mctsConfig": {
      "iterations": 200,
      "simulationDepth": 50,
      "explorationConstant": 1.414,
      "perfectInformation": true
    },
    "progressUpdateInterval": 100,
    "showDetailedProgress": true,
    "recordScenarios": true,
    "analyzeResults": true,
    "saveResults": true,
    "resultsPath": "./training-results"
  },
  "game": {
    "mctsConfig": {
      "iterations": 50,
      "simulationDepth": 20,
      "explorationConstant": 1.414,
      "perfectInformation": true
    }
  }
}
## 九、模式区分设计

### 9.1 启动模式区分

#### 方案1：配置面板模式切换（推荐）

在 `GameConfigPanel` 中添加模式选择：

```typescript
// 在配置面板顶部添加模式选择
<div className="mode-selector">
  <button 
    className={mode === 'game' ? 'active' : ''}
    onClick={() => setMode('game')}
  >
    🎮 游戏模式
  </button>
  <button 
    className={mode === 'training' ? 'active' : ''}
    onClick={() => setMode('training')}
  >
    🏋️ 训练模式
  </button>
</div>

// 根据模式显示不同的配置选项
{mode === 'game' ? (
  // 游戏模式配置：玩家数量、位置、算法等
) : (
  // 训练模式配置：游戏数量、MCTS深度等
)}
```

#### 方案2：独立训练入口

在主页添加两个入口按钮：

```typescript
<div className="start-screen">
  <h1>过炸扑克游戏</h1>
  <div className="mode-buttons">
    <button className="btn-primary" onClick={() => setMode('game')}>
      🎮 开始游戏
    </button>
    <button className="btn-secondary" onClick={() => setMode('training')}>
      🏋️ 训练模式
    </button>
  </div>
</div>
```

#### 方案3：URL参数区分

```typescript
// 通过URL参数区分
// /game?mode=training
// /game?mode=game

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'game';
```

#### 推荐方案：方案1（配置面板模式切换）

**优点**：
- 用户友好，一目了然
- 可以在同一界面切换
- 不需要额外的路由

**实现**：

1. 在 `GameConfigPanel` 添加模式状态
2. 根据模式显示不同配置项
3. 训练模式显示：游戏数量、MCTS深度、进度条等
4. 游戏模式显示：玩家数量、位置、算法等

### 9.2 模式状态管理

```typescript
// src/hooks/useGameConfig.ts
export type GameMode = 'game' | 'training';

export function useGameConfig() {
  const [mode, setMode] = useState<GameMode>('game');
  const [playerCount, setPlayerCount] = useState(4);
  // ... 其他状态
  
  // 训练模式特定配置
  const [trainingGameCount, setTrainingGameCount] = useState(1000);
  const [trainingMCTSIterations, setTrainingMCTSIterations] = useState(200);
  const [trainingMCTSDepth, setTrainingMCTSDepth] = useState(50);
  
  return {
    mode,
    setMode,
    // ... 其他返回值
  };
}
```

### 9.3 启动流程

```
用户打开应用
  ↓
显示配置面板（默认游戏模式）
  ↓
用户选择模式
  ├─ 游戏模式 → 显示游戏配置 → 点击"开始游戏" → 启动游戏
  └─ 训练模式 → 显示训练配置 → 点击"开始训练" → 启动训练
```

## 十、API设计

### 10.1 训练API

```typescript
// 启动训练
const trainer = new Trainer();
const result = await trainer.train({
  gameCount: 1000,
  playerCount: 4,
  mctsConfig: TRAINING_MCTS_CONFIG,
  progressUpdateInterval: 100,
  onProgress: (progress) => {
    console.log(`进度: ${progress.percentage}%`);
    updateProgressBar(progress);
  }
});

// 获取进度
const progress = trainer.getProgress();

// 暂停/恢复/停止
trainer.pause();
trainer.resume();
trainer.stop();
```

## 十、注意事项

1. **性能优化**：
   - 训练时使用Web Worker避免阻塞主线程
   - 批量处理场景记录
   - 使用增量更新进度条

2. **内存管理**：
   - 及时释放已完成的游戏状态
   - 限制场景记录数量
   - 定期清理临时数据

3. **错误处理**：
   - 训练中断时保存进度
   - 异常场景记录
   - 提供恢复机制

4. **可扩展性**：
   - 支持分布式训练（未来）
   - 支持断点续训
   - 支持自定义场景类型

## 十一、验收标准

- [ ] 训练时MCTS配置与游戏时分离，可通过配置文件设置
- [ ] 训练时显示有效进度条，包含百分比、时间、速度等信息
- [ ] 可以设定模拟牌局数量
- [ ] 使用全信息牌局进行训练
- [ ] 记录不同场景下的最优决策
- [ ] 生成训练报告和优化建议
- [ ] 支持暂停、恢复、停止训练
- [ ] 进度条更新流畅，不卡顿


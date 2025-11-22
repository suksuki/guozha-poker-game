# AI配置说明

## 配置文件位置

所有AI相关配置都在 `src/config/aiConfig.ts` 中集中管理。

## 配置模式

### 1. 快速模式（Fast Mode）
```typescript
import { FAST_MODE_CONFIG } from '../config/aiConfig';

// 使用快速模式配置
const config = FAST_MODE_CONFIG;
// mctsIterations: 30
// algorithm: 'mcts'
```

### 2. 普通模式（Normal Mode）
```typescript
import { DEFAULT_AI_CONFIG } from '../config/aiConfig';

// 使用默认配置
const config = DEFAULT_AI_CONFIG;
// mctsIterations: 50
// algorithm: 'mcts'
```

### 3. 高质量模式（High Quality Mode）
```typescript
import { HIGH_QUALITY_MODE_CONFIG } from '../config/aiConfig';

// 使用高质量模式配置
const config = HIGH_QUALITY_MODE_CONFIG;
// mctsIterations: 100
// algorithm: 'mcts'
```

### 4. 简单模式（Simple Mode）
```typescript
import { SIMPLE_MODE_CONFIG } from '../config/aiConfig';

// 使用简单策略，不依赖MCTS
const config = SIMPLE_MODE_CONFIG;
// algorithm: 'simple'
```

## 使用方式

### 方式1：使用预设配置
```typescript
import { getAIConfigByMode } from '../config/aiConfig';

const config = getAIConfigByMode('fast'); // 'fast' | 'normal' | 'high-quality' | 'simple'
```

### 方式2：合并自定义配置
```typescript
import { mergeAIConfig, DEFAULT_AI_CONFIG } from '../config/aiConfig';

const customConfig = mergeAIConfig({
  mctsIterations: 80,
  strategy: 'aggressive'
});
```

### 方式3：直接使用aiChoosePlay（自动合并配置）
```typescript
import { aiChoosePlay } from '../utils/aiPlayer';

// 只需要传入部分配置，会自动与默认配置合并
const cards = await aiChoosePlay(hand, lastPlay, {
  mctsIterations: 60,
  strategy: 'balanced'
});
```

## 大模型配置（预留）

未来接入大模型时，可以使用 `DEFAULT_LLM_CONFIG`：

```typescript
import { DEFAULT_LLM_CONFIG, LLMConfig } from '../config/aiConfig';

const llmConfig: LLMConfig = {
  ...DEFAULT_LLM_CONFIG,
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'your-api-key'
};
```

## 配置项说明

### AIConfig
- `strategy`: 'aggressive' | 'conservative' | 'balanced' - AI策略风格
- `algorithm`: 'simple' | 'mcts' | 'llm' - AI算法选择
- `mctsIterations`: number - MCTS迭代次数（影响AI强度和速度）
- `perfectInformation`: boolean - 是否使用完全信息模式
- `allPlayerHands`: Card[][] - 所有玩家手牌（完全信息模式使用）
- `currentRoundScore`: number - 当前轮次累计分数
- `playerCount`: number - 玩家总数

### MCTSConfig
- `iterations`: number - 迭代次数
- `explorationConstant`: number - UCT探索常数（默认1.414）
- `simulationDepth`: number - 模拟深度
- `perfectInformation`: boolean - 完全信息模式
- `allPlayerHands`: Card[][] - 所有玩家手牌
- `currentRoundScore`: number - 当前轮次分数
- `playerCount`: number - 玩家总数


# 算法演化层使用指南

算法演化层提供各种优化算法，用于参数优化和策略演化。

## 快速开始

### 1. 启用算法功能

```typescript
import { AIControlCenter } from '../AIControlCenter';

const aiControl = AIControlCenter.getInstance();

// 初始化时启用算法
await aiControl.initialize({
  evolution: {
    enabled: true,
    llmEnabled: false,
    algorithmEnabled: true, // 启用算法
    evolutionInterval: 3600000
  }
});

// 获取算法演化层
const algorithmLayer = aiControl.getAlgorithmEvolutionLayer();
```

### 2. 使用遗传算法优化参数

```typescript
const algorithmLayer = aiControl.getAlgorithmEvolutionLayer();
if (algorithmLayer) {
  // 定义参数范围
  const config = {
    populationSize: 50,
    maxGenerations: 100,
    mutationRate: 0.1,
    crossoverRate: 0.8,
    eliteRate: 0.2,
    geneRanges: [
      { min: 0.1, max: 2.0 }, // explorationConstant
      { min: 100, max: 10000 }, // maxSimulations
      { min: 100, max: 5000 }   // timeLimit
    ]
  };
  
  // 定义适应度函数
  const fitnessFunction = async (individual) => {
    // 使用参数运行测试，返回性能分数
    const performance = await testWithParameters(individual.genes);
    return performance.winRate * 0.5 + performance.averageScore * 0.3 - performance.time * 0.2;
  };
  
  // 运行优化
  const result = await algorithmLayer.optimizeWithGeneticAlgorithm(
    config,
    fitnessFunction
  );
  
  console.log('优化后的参数:', result.parameters);
  console.log('性能分数:', result.performance.score);
}
```

### 3. 使用局部搜索快速优化

```typescript
const algorithmLayer = aiControl.getAlgorithmEvolutionLayer();
if (algorithmLayer) {
  // 初始参数
  const initialSolution = {
    parameters: [1.0, 1000, 1000], // [explorationConstant, maxSimulations, timeLimit]
    score: 0.5
  };
  
  // 评分函数
  const scoreFunction = async (params: number[]) => {
    const performance = await testWithParameters(params);
    return performance.winRate;
  };
  
  // 局部搜索
  const result = await algorithmLayer.optimizeWithLocalSearch(
    {
      maxIterations: 100,
      stepSize: 0.1,
      tolerance: 0.01
    },
    initialSolution,
    scoreFunction
  );
  
  console.log('优化后的参数:', result.parameters);
}
```

### 4. 使用梯度下降优化

```typescript
const algorithmLayer = aiControl.getAlgorithmEvolutionLayer();
if (algorithmLayer) {
  // 初始参数
  const initialSolution = {
    parameters: [1.0, 1000],
    score: 0.5
  };
  
  // 评分函数
  const scoreFunction = async (params: number[]) => {
    return await calculateScore(params);
  };
  
  // 梯度函数（可选，如果不提供会使用数值梯度）
  const gradientFunction = async (params: number[]) => {
    return await calculateGradient(params);
  };
  
  // 梯度下降
  const result = await algorithmLayer.optimizeWithGradientDescent(
    {
      maxIterations: 100,
      stepSize: 0.01,
      tolerance: 0.001
    },
    initialSolution,
    scoreFunction,
    gradientFunction
  );
  
  console.log('优化后的参数:', result.parameters);
}
```

### 5. 使用强化学习演化策略

```typescript
const algorithmLayer = aiControl.getAlgorithmEvolutionLayer();
if (algorithmLayer) {
  // 强化学习配置
  const config = {
    learningRate: 0.1,
    discountFactor: 0.99,
    epsilon: 0.1,
    epsilonDecay: 0.995,
    minEpsilon: 0.01,
    batchSize: 32,
    memorySize: 10000
  };
  
  // 初始状态
  const initialState: State = {
    id: 'state_1',
    features: [0.5, 0.3, 0.2], // 状态特征
    timestamp: Date.now()
  };
  
  // 步进函数
  const stepFunction = async (state: State, action: Action) => {
    // 执行动作，返回新状态和奖励
    const result = await executeAction(state, action);
    return {
      nextState: result.newState,
      reward: result.reward,
      done: result.done
    };
  };
  
  // 学习
  const result = await algorithmLayer.evolveStrategyWithRL(
    config,
    initialState,
    stepFunction,
    100 // 100个episodes
  );
  
  console.log('学习后的策略:', result.policy);
  console.log('平均奖励:', result.averageReward);
}
```

### 6. 快速参数调整

```typescript
const algorithmLayer = aiControl.getAlgorithmEvolutionLayer();
if (algorithmLayer) {
  // 当前参数
  const currentParams = {
    explorationConstant: 1.0,
    maxSimulations: 1000,
    timeLimit: 1000
  };
  
  // 评分函数
  const scoreFunction = async (params: Record<string, number>) => {
    const performance = await testWithParameters(Object.values(params));
    return performance.winRate;
  };
  
  // 快速调整
  const result = await algorithmLayer.quickParameterAdjustment(
    currentParams,
    scoreFunction
  );
  
  console.log('调整后的参数:', result.parameters);
}
```

## 算法选择指南

### 遗传算法
- **适用场景**：参数空间大、多峰优化、全局搜索
- **优点**：全局搜索能力强、适合离散和连续参数
- **缺点**：收敛慢、需要大量评估

### 局部搜索
- **适用场景**：快速优化、局部改进、参数空间小
- **优点**：收敛快、计算量小
- **缺点**：容易陷入局部最优

### 梯度下降
- **适用场景**：可微目标函数、连续参数、凸优化
- **优点**：收敛快、精度高
- **缺点**：需要可微函数、可能陷入局部最优

### 强化学习
- **适用场景**：策略学习、序列决策、自适应优化
- **优点**：可以从经验中学习、适应性强
- **缺点**：需要大量数据、训练时间长

## 协同使用

### LLM + 算法协同

```typescript
const llmLayer = aiControl.getLLMEvolutionLayer();
const algorithmLayer = aiControl.getAlgorithmEvolutionLayer();

if (llmLayer && algorithmLayer) {
  // 1. LLM生成方案
  const solution = await llmLayer.analyzeAndGenerateSolution(problem);
  
  // 2. 如果方案包含参数，使用算法优化
  if (solution.solution.parameters) {
    const optimized = await algorithmLayer.quickParameterAdjustment(
      solution.solution.parameters,
      async (params) => {
        // 评估参数性能
        return await evaluateParameters(params);
      }
    );
    
    console.log('LLM方案:', solution.solution);
    console.log('算法优化后:', optimized);
  }
}
```

## 注意事项

1. **计算成本**：算法优化需要大量评估，可能耗时较长
2. **参数范围**：合理设置参数范围，避免搜索无效空间
3. **适应度函数**：设计好的适应度函数对优化效果至关重要
4. **收敛判断**：注意设置合理的收敛条件，避免过度优化


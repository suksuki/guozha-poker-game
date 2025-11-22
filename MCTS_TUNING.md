# MCTS算法微调指南

## 什么是MCTS微调？

MCTS（蒙特卡洛树搜索）**不是大模型**，它的"微调"机制与深度学习模型完全不同：

### MCTS的学习方式

1. **实时学习**：MCTS在每次决策时通过搜索树实时积累经验，不需要预先训练
2. **统计优化**：通过大量模拟对局来评估不同策略的效果
3. **参数调优**：通过调整算法参数（如探索常数、迭代次数等）来优化性能

### 与深度学习模型的区别

| 特性 | MCTS | 深度学习模型 |
|------|------|-------------|
| 学习方式 | 实时搜索树 | 预训练+微调 |
| 数据需求 | 不需要训练数据 | 需要大量训练数据 |
| 参数存储 | 不存储参数 | 存储模型权重 |
| 微调方法 | 调整算法参数 | 调整模型权重 |

## MCTS可微调的参数

### 1. 探索常数（explorationConstant）

- **作用**：控制UCT公式中探索与利用的平衡
- **默认值**：1.414（√2）
- **调优范围**：0.5 - 3.0
- **影响**：
  - 较小值（0.5-1.0）：更偏向利用已知好的策略
  - 较大值（2.0-3.0）：更偏向探索新的策略

### 2. 迭代次数（iterations）

- **作用**：MCTS搜索树的迭代次数，越多越准确但越慢
- **默认值**：800-1000
- **调优范围**：500 - 5000
- **影响**：
  - 较少：决策快但可能不够准确
  - 较多：决策慢但更准确

### 3. 模拟深度（simulationDepth）

- **作用**：每次模拟游戏的最大深度（回合数）
- **默认值**：100
- **调优范围**：50 - 300
- **影响**：
  - 较浅：模拟不完整，可能误判
  - 较深：模拟完整但计算量大

### 4. 完全信息模式（perfectInformation）

- **作用**：是否知道所有玩家的手牌（"作弊"模式）
- **默认值**：false
- **影响**：
  - true：AI知道所有手牌，决策更准确
  - false：AI需要估计对手手牌，更接近真实情况

## 如何使用微调工具

### 快速测试单个配置

```typescript
import { quickTestConfig, MCTSConfig } from './utils/mctsTuning';

const config: MCTSConfig = {
  explorationConstant: 1.414,
  iterations: 1000,
  simulationDepth: 100,
  perfectInformation: true,
  playerCount: 4
};

// 运行100局游戏测试
const result = await quickTestConfig(config, 4, 100);

console.log(`胜率: ${(result.winRate * 100).toFixed(2)}%`);
console.log(`平均分数: ${result.avgScore.toFixed(2)}`);
```

### 完整参数微调

```typescript
import { tuneMCTSParameters } from './utils/mctsTuning';

const tuningConfig = {
  explorationConstants: [1.0, 1.414, 2.0],  // 测试3个探索常数
  iterations: [500, 1000, 2000],            // 测试3个迭代次数
  simulationDepths: [50, 100, 200],         // 测试3个模拟深度
  perfectInformation: true,
  playerCount: 4,
  gamesPerConfig: 100  // 每个配置运行100局
};

// 总配置数 = 3 × 3 × 3 = 27个
// 总对局数 = 27 × 100 = 2700局

const results = await tuneMCTSParameters(tuningConfig);

// 结果按胜率排序，第一个是最佳配置
console.log('最佳配置:', results[0].config);
```

## 微调流程

### 步骤1：确定测试范围

根据你的需求确定要测试的参数范围：

```typescript
// 示例：测试探索常数对性能的影响
const explorationConstants = [0.5, 1.0, 1.414, 2.0, 3.0];
```

### 步骤2：运行测试

运行大量对局（建议每个配置至少100局）：

```typescript
const results = await tuneMCTSParameters({
  explorationConstants: [1.0, 1.414, 2.0],
  iterations: [1000],  // 固定迭代次数
  simulationDepths: [100],  // 固定模拟深度
  perfectInformation: true,
  playerCount: 4,
  gamesPerConfig: 200  // 每个配置200局，确保统计显著性
});
```

### 步骤3：分析结果

查看胜率、平均分数等指标：

```typescript
results.forEach((result, index) => {
  console.log(`配置 ${index + 1}:`);
  console.log(`  参数:`, result.config);
  console.log(`  胜率: ${(result.winRate * 100).toFixed(2)}%`);
  console.log(`  平均分数: ${result.avgScore.toFixed(2)}`);
  console.log(`  平均回合数: ${result.avgTurns.toFixed(1)}`);
});
```

### 步骤4：应用最佳配置

将最佳配置应用到实际游戏中：

```typescript
// 在 useMultiPlayerGame.ts 中
const aiConfigWithContext = {
  ...currentPlayer.aiConfig,
  explorationConstant: bestConfig.explorationConstant,  // 使用最佳参数
  iterations: bestConfig.iterations,
  simulationDepth: bestConfig.simulationDepth,
  perfectInformation: true,
  allPlayerHands: currentState.players.map(p => [...p.hand]),
  currentRoundScore: currentState.roundScore || 0,
  playerCount: currentState.playerCount
};
```

## 微调策略建议

### 1. 分阶段微调

不要一次性测试所有参数，分阶段进行：

1. **第一阶段**：固定其他参数，只测试探索常数
2. **第二阶段**：使用最佳探索常数，测试迭代次数
3. **第三阶段**：使用最佳参数，测试模拟深度

### 2. 增加对局数

- **初步测试**：每个配置50-100局
- **精确测试**：每个配置200-500局
- **最终验证**：最佳配置1000+局

### 3. 对比完全信息模式

分别测试完全信息模式和估计模式，了解性能差异：

```typescript
// 测试完全信息模式
const perfectInfoResult = await quickTestConfig({
  ...baseConfig,
  perfectInformation: true
}, 4, 200);

// 测试估计模式
const estimatedResult = await quickTestConfig({
  ...baseConfig,
  perfectInformation: false
}, 4, 200);
```

## 常见问题

### Q: MCTS如何记录不同场景和策略？

**A:** MCTS不"记录"场景和策略。它通过以下方式工作：

1. **搜索树**：每次决策时构建一个搜索树，节点代表游戏状态
2. **统计信息**：每个节点记录访问次数和获胜次数
3. **实时评估**：通过大量模拟来评估不同动作的价值
4. **不存储历史**：每次决策都是独立的，不依赖之前的对局

### Q: 为什么需要运行1000局？

**A:** 为了获得统计显著性：

- 少量对局（<50）：结果受随机性影响大，不可靠
- 中等对局（50-200）：可以初步判断趋势
- 大量对局（200+）：结果更稳定，可以区分不同配置的真实差异

### Q: 如何知道微调是否有效？

**A:** 对比指标：

- **胜率提升**：最佳配置的胜率应该明显高于默认配置
- **分数提升**：平均分数应该更高
- **稳定性**：多次运行结果应该一致

### Q: 微调需要多长时间？

**A:** 取决于配置数量和对局数：

- 单个配置100局：约1-5分钟
- 27个配置各100局：约30-60分钟
- 建议在后台运行，或使用更少的配置数进行初步测试

## 示例脚本

查看 `src/utils/mctsTuningExample.ts` 获取完整的使用示例。

## 总结

MCTS的微调不是训练模型，而是通过**统计方法**找到最优参数配置：

1. **定义参数范围**：确定要测试的参数值
2. **运行大量对局**：每个配置运行足够多的对局
3. **统计分析**：比较不同配置的胜率、分数等指标
4. **应用最佳配置**：将最佳参数应用到实际游戏中

这种方法不需要训练数据，不需要存储模型，只需要计算资源和时间。


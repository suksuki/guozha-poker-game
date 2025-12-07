# 训练参数应用指南

## 📋 概述

训练完成后，系统会自动将优化后的MCTS参数应用到实际的游戏算法中，提升AI的决策质量。

## 🔄 工作流程

### 1. 训练阶段
```
训练开始 → 收集数据 → 分析性能 → 优化参数 → 保存参数
```

### 2. 应用阶段
```
训练完成 → 获取最佳参数 → 保存到localStorage → 游戏自动使用
```

### 3. 使用阶段
```
游戏开始 → 读取训练参数 → 合并到MCTS配置 → AI使用优化参数
```

## 🎯 参数类型

### MCTS参数
- **iterations**: 迭代次数（默认100，训练后可能优化为50-1000）
- **explorationConstant**: 探索常数（默认1.414，训练后可能优化为0.5-2.0）
- **simulationDepth**: 模拟深度（默认20，训练后可能优化为10-50）
- **perfectInformation**: 完全信息模式（默认false）

## 💾 存储位置

训练后的参数保存在：
- **localStorage key**: `trained_mcts_params`
- **格式**: JSON对象，包含参数和应用时间

## 🔧 使用方法

### 自动应用（推荐）

训练完成后，系统会自动应用最佳参数，无需手动操作。

### 手动应用

```typescript
import { TrainingController } from '@/training/core/TrainingController';

const controller = new TrainingController();

// 应用参数
await controller.applyParams();

// 查看当前应用的参数
const params = controller.getAppliedParams();
console.log('当前MCTS参数:', params.mcts);

// 清除参数（恢复默认）
controller.clearAppliedParams();
```

### 在代码中使用

```typescript
import { ParameterApplier } from '@/training/core/ParameterApplier';

// 获取训练后的参数
const trainedParams = ParameterApplier.getAppliedMCTSParams();

// 合并到MCTS配置
const mctsConfig = ParameterApplier.mergeWithDefaults(
  trainedParams,
  defaultMCTSConfig
);
```

## 📊 参数效果

### 训练前（默认）
- iterations: 100
- explorationConstant: 1.414
- simulationDepth: 20

### 训练后（示例）
- iterations: 150（根据训练数据优化）
- explorationConstant: 1.2（根据训练数据优化）
- simulationDepth: 25（根据训练数据优化）

## ⚠️ 注意事项

1. **参数范围限制**：
   - iterations: 50-1000
   - explorationConstant: 0.5-2.0
   - simulationDepth: 10-50

2. **性能影响**：
   - 更高的iterations → 更准确但更慢
   - 更高的explorationConstant → 更多探索但可能不稳定
   - 更高的simulationDepth → 更完整模拟但更慢

3. **恢复默认**：
   - 如果训练参数导致性能下降，可以清除参数恢复默认
   - 使用 `ParameterApplier.clearAppliedParams()`

## 🔍 验证参数应用

### 方法1：查看控制台日志
训练完成后，控制台会显示：
```
[TrainingController] 已应用训练后的MCTS参数: { iterations: 150, ... }
```

### 方法2：检查localStorage
```javascript
// 在浏览器控制台执行
const params = JSON.parse(localStorage.getItem('trained_mcts_params'));
console.log('训练参数:', params);
```

### 方法3：观察游戏表现
- AI决策质量是否提升
- 胜率是否提高
- 决策时间是否合理

## 🎨 UI集成

训练面板会在训练完成后显示：
- ✅ 参数已应用提示
- 📊 参数对比（训练前 vs 训练后）
- 🔄 应用/清除按钮

## 📈 持续优化

1. **定期训练**：建议每周或每月重新训练
2. **A/B测试**：可以对比不同参数组合的效果
3. **监控指标**：跟踪胜率、决策质量等指标


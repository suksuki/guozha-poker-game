# 大模型训练数据收集指南

## 概述

系统会自动收集大模型的原始输出和精简后的结果，用于后续训练优化。这些数据可以帮助您：

1. **分析大模型的输出模式**：了解哪些内容需要精简
2. **优化提示词**：根据收集的数据改进 prompt
3. **训练微调模型**：使用收集的数据进行模型微调
4. **持续改进**：通过数据分析不断优化输出质量

## 数据收集

### 自动收集

系统会在以下情况自动收集数据：

- **随机闲聊** (`generateRandomChat`)
- **事件聊天** (`generateEventChat`)
- **对骂** (`generateTaunt`)

每条数据包含：
- 原始内容（大模型直接返回）
- 精简后内容（经过处理）
- 处理统计（长度、减少量、减少百分比）
- 上下文信息（游戏状态、玩家状态等）
- Prompt（用于分析提示词效果）

### 数据格式

```typescript
interface TrainingSample {
  timestamp: number;
  playerId: number;
  playerName: string;
  eventType: string;
  prompt: string;
  originalContent: string;
  processedContent: string;
  processingStats: {
    originalLength: number;
    processedLength: number;
    reduction: number;
    reductionPercent: number;
  };
  context?: any;
}
```

## 使用方法

### 在浏览器控制台中

开发模式下，训练数据收集器已暴露到全局：

```javascript
// 获取所有样本
const samples = window.trainingDataCollector.getAllSamples();

// 获取最近的100条样本
const recent = window.trainingDataCollector.getRecentSamples(100);

// 获取统计信息
const stats = window.trainingDataCollector.getStats();
console.log('平均精简率:', stats.averageReductionPercent.toFixed(2) + '%');

// 导出JSON
const json = window.trainingDataCollector.exportToJSON();

// 导出CSV（用于Excel分析）
const csv = window.trainingDataCollector.exportToCSV();

// 下载数据
window.trainingDataCollector.downloadData('json'); // 或 'csv'
```

### 在代码中使用

```typescript
import { trainingDataCollector } from './services/trainingDataCollector';

// 获取所有样本
const samples = trainingDataCollector.getAllSamples();

// 获取统计信息
const stats = trainingDataCollector.getStats();
```

## 数据分析

### 1. 分析精简效果

```javascript
const samples = window.trainingDataCollector.getAllSamples();
const highReduction = samples.filter(s => s.processingStats.reductionPercent > 50);
console.log('精简率超过50%的样本:', highReduction.length);
```

### 2. 分析常见问题

```javascript
const samples = window.trainingDataCollector.getAllSamples();

// 找出最长的原始内容
const longest = samples.reduce((max, s) => 
  s.processingStats.originalLength > max.processingStats.originalLength ? s : max
);
console.log('最长的原始内容:', longest.originalContent);
```

### 3. 分析事件类型

```javascript
const samples = window.trainingDataCollector.getAllSamples();
const byEvent = {};
samples.forEach(s => {
  if (!byEvent[s.eventType]) {
    byEvent[s.eventType] = [];
  }
  byEvent[s.eventType].push(s);
});

// 每个事件类型的平均精简率
Object.keys(byEvent).forEach(eventType => {
  const avg = byEvent[eventType].reduce((sum, s) => 
    sum + s.processingStats.reductionPercent, 0
  ) / byEvent[eventType].length;
  console.log(`${eventType}: ${avg.toFixed(2)}%`);
});
```

## 训练优化建议

### 1. 优化提示词

根据收集的数据，分析哪些 prompt 导致输出过长：

```javascript
const samples = window.trainingDataCollector.getAllSamples();
const longOutputs = samples.filter(s => s.processingStats.originalLength > 50);

// 分析这些样本的 prompt
longOutputs.forEach(s => {
  console.log('Prompt:', s.prompt);
  console.log('输出:', s.originalContent);
  console.log('---');
});
```

### 2. 创建训练数据集

使用收集的数据创建微调数据集：

```javascript
const samples = window.trainingDataCollector.getAllSamples();

// 创建训练对（原始 -> 精简）
const trainingPairs = samples.map(s => ({
  input: s.originalContent,
  output: s.processedContent,
  context: s.context
}));

// 导出为训练格式
const trainingData = JSON.stringify(trainingPairs, null, 2);
```

### 3. 持续改进

定期导出数据，分析趋势：

```javascript
// 每周导出一次
window.trainingDataCollector.downloadData('json');

// 分析改进趋势
const stats = window.trainingDataCollector.getStats();
console.log('本周平均精简率:', stats.averageReductionPercent.toFixed(2) + '%');
```

## 配置

### 调整最大样本数

默认最多保存 1000 条样本，可以在 `trainingDataCollector.ts` 中修改：

```typescript
private maxSamples: number = 1000; // 修改为您需要的数量
```

### 启用/禁用收集

```javascript
// 禁用收集（节省内存）
window.trainingDataCollector.setEnabled(false);

// 重新启用
window.trainingDataCollector.setEnabled(true);
```

## 导出数据

### JSON 格式

适合程序处理和分析：

```bash
# 在浏览器控制台
window.trainingDataCollector.downloadData('json');
```

### CSV 格式

适合 Excel 分析：

```bash
# 在浏览器控制台
window.trainingDataCollector.downloadData('csv');
```

## 最佳实践

1. **定期导出**：每周或每月导出一次数据
2. **分析趋势**：关注平均精简率的变化
3. **优化提示词**：根据数据改进 prompt
4. **训练微调**：使用高质量样本进行模型微调
5. **持续迭代**：不断收集新数据，持续改进

## 注意事项

- 数据保存在内存中，刷新页面会丢失
- 建议定期导出重要数据
- 样本数量有限制（默认1000条），超出会自动删除最旧的
- 生产环境建议禁用数据收集（或仅收集部分样本）


# AI 中控系统

AI中控系统是应用的"AI大脑"，负责监控、分析、优化整个系统。

## 快速开始

### 基本使用

```typescript
import { AIControlCenter } from './services/ai/control';

// 获取实例
const aiControl = AIControlCenter.getInstance();

// 初始化
await aiControl.initialize({
  monitor: {
    enabled: true,
    samplingRate: 0.1 // 10%采样
  },
  analysis: {
    enabled: true,
    interval: 300000 // 5分钟分析一次
  }
});

// 启动监控
aiControl.startMonitoring();

// 订阅事件
aiControl.on('analysis:complete', (results) => {
  console.log('分析完成', results);
});

// 获取分析结果
const results = aiControl.getAnalysisResults();
```

### 通过SystemApplication使用

AI中控系统已经集成到SystemApplication模块系统，会自动初始化：

```typescript
import { SystemApplication } from './services/system/SystemApplication';

const systemApp = SystemApplication.getInstance();

// 初始化系统（会自动初始化AI中控系统）
await systemApp.initialize();

// 获取AI中控系统
const aiControlModule = systemApp.getModule('ai-control');
const aiControl = aiControlModule?.getAIControl();
```

## 架构

- **MonitorLayer**: 监控层，负责收集数据
- **AnalyzeLayer**: 分析层，负责分析数据
- **ExecuteLayer**: 执行层，负责执行优化
- **KnowledgeBase**: 知识库，存储历史数据
- **DecisionEngine**: 决策引擎，决定行动

## 配置

```typescript
interface AIControlConfig {
  monitor: {
    enabled: boolean;
    samplingRate: number; // 0-1
    keyPaths: string[]; // 关键路径，100%采样
    maxMemoryUsage: number; // MB
    maxCPUUsage: number; // 0-1
  };
  analysis: {
    enabled: boolean;
    interval: number; // ms
    batchSize: number;
    depth: 'shallow' | 'medium' | 'deep';
  };
  execute: {
    enabled: boolean;
    autoFix: boolean;
    requireConfirmation: boolean;
    maxRiskLevel: 'low' | 'medium' | 'high';
  };
}
```

## 功能

### 监控功能

- 函数调用监控
- 性能监控
- 错误监控
- 用户行为监控
- 游戏状态监控

### 分析功能

- 错误模式识别
- 性能瓶颈分析
- 热点函数识别
- 趋势分析

### 执行功能

- 自动修复（低风险）
- 优化建议生成
- 代码生成

## 事件

- `monitor:data`: 监控数据
- `monitor:error`: 错误事件
- `monitor:performance`: 性能事件
- `analysis:complete`: 分析完成
- `execute:complete`: 执行完成
- `execute:suggestion`: 优化建议

## 注意事项

1. 系统设计为低资源占用，默认采样率10%
2. 所有操作都是异步的，不会阻塞主线程
3. 自动执行默认关闭，需要手动启用
4. 高风险操作需要确认


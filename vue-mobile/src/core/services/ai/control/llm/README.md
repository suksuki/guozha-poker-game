# LLM集成层使用指南

LLM集成层提供LLM分析和代码生成功能。

## 快速开始

### 1. 启用LLM功能

```typescript
import { AIControlCenter } from '../AIControlCenter';

const aiControl = AIControlCenter.getInstance();

// 初始化时启用LLM
await aiControl.initialize({
  evolution: {
    enabled: true,
    llmEnabled: true, // 启用LLM
    algorithmEnabled: false,
    evolutionInterval: 3600000
  }
});

// 检查LLM是否可用
const llmLayer = aiControl.getLLMEvolutionLayer();
if (llmLayer && await llmLayer.isAvailable()) {
  console.log('LLM功能可用');
}
```

### 2. 使用LLM分析问题

```typescript
const llmLayer = aiControl.getLLMEvolutionLayer();
if (llmLayer) {
  // 分析问题
  const result = await llmLayer.analyzeAndGenerateSolution({
    id: 'issue_1',
    type: 'performance',
    description: '函数执行时间过长',
    severity: 'high',
    data: { functionName: 'slowFunction', duration: 1000 }
  });
  
  console.log('分析结果:', result);
  // {
  //   solution: {
  //     description: '优化方案描述',
  //     code: '优化后的代码',
  //     parameters: {}
  //   },
  //   explanation: '优化理由'
  // }
}
```

### 3. 使用LLM生成代码优化

```typescript
const llmLayer = aiControl.getLLMEvolutionLayer();
if (llmLayer) {
  // 生成代码优化
  const result = await llmLayer.generateCodeOptimization({
    code: `
      function slowFunction(data) {
        let result = [];
        for (let i = 0; i < data.length; i++) {
          result.push(data[i] * 2);
        }
        return result;
      }
    `,
    description: '函数执行时间过长',
    context: '这是一个数据处理函数'
  });
  
  console.log('优化后的代码:', result.solution.code);
}
```

### 4. 协同优化（LLM + 算法）

```typescript
const llmLayer = aiControl.getLLMEvolutionLayer();
if (llmLayer) {
  // 定义算法优化器
  const algorithmOptimizer = async (params: any) => {
    // 使用遗传算法或其他算法优化参数
    // ...
    return { parameters: optimizedParams, performance: metrics };
  };
  
  // 协同优化
  const result = await llmLayer.collaborativeOptimize(
    {
      id: 'opt_1',
      type: 'optimization',
      description: '优化MCTS参数',
      severity: 'medium',
      data: { currentParams: { explorationConstant: 1.0 } }
    },
    algorithmOptimizer
  );
  
  console.log('优化结果:', result);
}
```

### 5. 直接使用LLM服务

```typescript
const llmService = aiControl.getLLMService();
if (llmService) {
  // 调用LLM
  const response = await llmService.call({
    prompt: '分析以下代码的性能问题：...',
    systemPrompt: '你是一个代码分析专家',
    temperature: 0.3,
    maxTokens: 1000
  });
  
  console.log('LLM响应:', response.content);
  console.log('响应时间:', response.latency, 'ms');
}
```

### 6. 使用LLM分析器

```typescript
import { LLMAnalyzer } from './llm/LLMAnalyzer';
import { LLMService } from './llm/LLMService';

const llmService = new LLMService({
  apiUrl: 'http://localhost:11434/api/chat',
  model: 'qwen2.5:latest'
});

const analyzer = new LLMAnalyzer(llmService);

// 分析问题
const problemAnalysis = await analyzer.analyzeProblem({
  id: 'p1',
  type: 'error',
  description: '重复错误',
  severity: 'high',
  data: { error: 'TypeError' },
  timestamp: Date.now()
});

// 分析代码
const codeAnalysis = await analyzer.analyzeCode(`
  function test() {
    let x = 0;
    for (let i = 0; i < 1000000; i++) {
      x += i;
    }
    return x;
  }
`);

// 生成代码
const generatedCode = await analyzer.generateCode(
  '创建一个函数，计算数组的平均值'
);
```

## 配置

### LLM配置

```typescript
interface LLMConfig {
  apiUrl?: string;        // Ollama API地址
  model?: string;         // 模型名称
  temperature?: number;   // 温度（0-1）
  maxTokens?: number;     // 最大token数
  timeout?: number;       // 超时时间(ms)
  systemPrompt?: string;  // 系统提示词
}
```

### 默认配置

- API地址: `http://localhost:11434/api/chat`
- 模型: `qwen2.5:latest`
- 温度: `0.7`
- 超时: `60000ms` (60秒)

## 功能说明

### LLMService
- 封装Ollama API调用
- 支持配置管理
- 支持服务检查
- 支持模型列表获取

### LLMAnalyzer
- 问题分析
- 代码分析
- 优化方案生成
- 代码生成

### LLMEvolutionLayer
- 问题分析和方案生成
- 代码优化
- LLM+算法协同
- 优化结果解释

## 注意事项

1. **服务可用性**: 使用前检查Ollama服务是否运行
2. **性能影响**: LLM调用有延迟，建议异步处理
3. **错误处理**: LLM可能失败，需要降级处理
4. **资源占用**: LLM调用会占用CPU和内存

## 降级策略

如果LLM不可用，系统会自动降级：
- 使用规则分析
- 使用算法优化
- 跳过LLM相关功能


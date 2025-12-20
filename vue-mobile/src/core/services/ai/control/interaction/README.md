# AI中控系统交互系统

交互系统提供与AI中控系统交互的统一接口，包括REST API和WebSocket。

## 快速开始

### 1. 使用交互服务

```typescript
import { getInteractionService } from './InteractionService';

const service = getInteractionService();

// 获取系统状态
const status = service.getSystemStatus();
console.log('系统状态:', status);

// 获取分析结果
const results = service.getAnalysisResults({
  severity: 'high',
  limit: 10
});

// 生成优化方案
const suggestion = await service.generateOptimization(resultId);

// 执行优化
await service.executeOptimization(resultId);
```

### 2. 使用API服务器

```typescript
import { getAPIServer } from './api/APIServer';

const apiServer = getAPIServer();

// 处理请求
const response = await apiServer.handleRequest({
  method: 'GET',
  path: '/api/ai-control/status'
});

console.log('响应:', response);
```

### 3. 使用WebSocket服务器

```typescript
import { getWebSocketServer } from './api/WebSocketServer';

const wsServer = getWebSocketServer();

// 添加连接
wsServer.addConnection({
  id: 'connection_1',
  send: (message) => {
    // 发送消息到客户端
    console.log('发送消息:', message);
  },
  subscribedEvents: new Set(['monitor', 'analysis'])
});

// 处理消息
wsServer.handleMessage('connection_1', {
  type: 'subscribe',
  action: 'subscribe',
  data: { events: ['monitor', 'analysis'] },
  timestamp: Date.now()
});
```

## API接口

### REST API

#### 系统状态
- `GET /api/ai-control/status` - 获取系统状态
- `POST /api/ai-control/monitoring/start` - 启动监控
- `POST /api/ai-control/monitoring/stop` - 停止监控

#### 分析结果
- `GET /api/ai-control/analysis/results` - 获取分析结果列表
- `GET /api/ai-control/analysis/results/:id` - 获取单个分析结果
- `POST /api/ai-control/analysis/analyze` - 手动触发分析

#### 优化方案
- `GET /api/ai-control/optimization/suggestions` - 获取优化建议
- `POST /api/ai-control/optimization/generate` - 生成优化方案
- `POST /api/ai-control/optimization/execute/:id` - 执行优化

#### 数据管理
- `GET /api/ai-control/data/sessions` - 获取游戏会话列表
- `GET /api/ai-control/data/sessions/:id` - 获取游戏会话详情
- `POST /api/ai-control/data/training/generate` - 生成训练数据

#### 知识库
- `GET /api/ai-control/knowledge/patterns` - 获取模式
- `GET /api/ai-control/knowledge/history` - 获取历史记录

### WebSocket

#### 连接
```
ws://localhost/api/ai-control/events
```

#### 订阅事件
```json
{
  "action": "subscribe",
  "data": {
    "events": ["monitor", "analysis", "optimization"]
  }
}
```

#### 接收事件
```json
{
  "type": "monitor:data",
  "data": { ... },
  "timestamp": 1234567890
}
```

## 使用示例

### React组件中使用

```typescript
import { useEffect, useState } from 'react';
import { getInteractionService } from './InteractionService';

function AIControlDashboard() {
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    const service = getInteractionService();
    
    // 获取系统状态
    const systemStatus = service.getSystemStatus();
    setStatus(systemStatus);
    
    // 获取分析结果
    const analysisResults = service.getAnalysisResults({ limit: 10 });
    setResults(analysisResults);
    
    // 订阅事件
    service.on('analysis:complete', (newResults) => {
      setResults(prev => [...newResults, ...prev]);
    });
    
    return () => {
      service.off('analysis:complete', () => {});
    };
  }, []);
  
  return (
    <div>
      <h1>AI中控系统</h1>
      <div>状态: {status?.monitoring ? '运行中' : '已停止'}</div>
      <div>分析结果: {results.length}个</div>
    </div>
  );
}
```

## 注意事项

1. **单例模式**：交互服务使用单例模式，确保全局唯一
2. **异步操作**：所有API操作都是异步的
3. **错误处理**：需要处理API调用失败的情况
4. **事件清理**：组件卸载时需要取消事件订阅


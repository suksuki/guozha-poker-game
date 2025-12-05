# Master AI Brain 使用示例

## 🎮 在游戏中使用

### 方法1: 使用React Hook（推荐）

```typescript
// components/Game.tsx
import { useMasterAIBrain } from '../hooks/useMasterAIBrain';

function Game() {
  // 初始化Master AI Brain
  const { 
    api, 
    initialized, 
    triggerAITurn, 
    exportTrainingData,
    statistics 
  } = useMasterAIBrain({
    config: {
      aiPlayers: [
        { 
          id: 1, 
          personality: { preset: 'aggressive' }, 
          decisionModules: ['mcts'], 
          communicationEnabled: true 
        },
        { 
          id: 2, 
          personality: { preset: 'conservative' }, 
          decisionModules: ['mcts'], 
          communicationEnabled: true 
        },
        { 
          id: 3, 
          personality: { preset: 'balanced' }, 
          decisionModules: ['mcts'], 
          communicationEnabled: true 
        }
      ],
      llm: {
        enabled: false  // 先不启用LLM
      },
      dataCollection: {
        enabled: true,
        autoExport: false,
        exportInterval: 60000
      },
      performance: {
        enableCache: true,
        timeout: 5000
      }
    },
    autoInit: true  // 自动初始化
  });
  
  // 监听AI事件
  useEffect(() => {
    if (!api) return;
    
    // 监听AI回合完成
    const bridge = (api as any).bridge;
    if (bridge) {
      bridge.eventBus.on('ai:turn-complete', handleAITurnComplete);
    }
    
    return () => {
      if (bridge) {
        bridge.eventBus.off('ai:turn-complete', handleAITurnComplete);
      }
    };
  }, [api]);
  
  // 处理AI回合完成
  const handleAITurnComplete = (result: any) => {
    const { playerId, decision, message } = result;
    
    // 执行AI决策
    if (decision.action.type === 'play') {
      executePlay(playerId, decision.action.cards);
    }
    
    // 显示AI消息
    if (message) {
      showChatMessage(playerId, message.content);
    }
  };
  
  // AI玩家回合
  const handleAITurn = (playerId: number) => {
    if (!initialized) {
      console.warn('AI大脑未初始化');
      return;
    }
    
    // 构建游戏状态
    const gameState = buildGameState(playerId);
    
    // 触发AI决策
    triggerAITurn(playerId, gameState);
  };
  
  // 游戏结束
  const handleGameEnd = () => {
    // 导出训练数据
    const data = exportTrainingData();
    
    // 保存或下载
    downloadTrainingData(data);
    
    // 显示统计
    console.log('AI统计:', statistics);
  };
  
  return (
    <div>
      {initialized && <div>AI大脑已就绪</div>}
      
      {statistics && (
        <div>
          收集了 {statistics.dataCollection?.totalDataPoints || 0} 个训练样本
        </div>
      )}
      
      <button onClick={() => handleAITurn(1)}>
        AI玩家1出牌
      </button>
      
      <button onClick={handleGameEnd}>
        导出训练数据
      </button>
    </div>
  );
}
```

### 方法2: 直接使用API

```typescript
import { GameBridge } from '../ai-core';

class GameLogic {
  private bridge: GameBridge;
  private api: any;
  
  async initialize() {
    this.bridge = new GameBridge();
    this.api = this.bridge.getAPI();
    
    await this.api.initialize({
      aiPlayers: [...],
      llm: { enabled: true, endpoint: 'http://localhost:11434/api/chat', model: 'qwen2.5:3b' },
      dataCollection: { enabled: true, autoExport: false, exportInterval: 60000 },
      performance: { enableCache: true, timeout: 5000 }
    });
  }
  
  async aiTurn(playerId: number) {
    // 触发AI
    this.api.triggerAITurn(playerId, this.getGameState());
  }
}
```

## 📊 数据收集示例

### 自动收集

```typescript
// AI每次出牌，自动收集训练数据
// 无需手动调用，完全自动！

// 玩10局游戏后
const data = api.exportTrainingData();

// 查看收集了多少数据
const stats = api.getStatistics();
console.log(`
训练数据统计：
- 总数据点: ${stats.dataCollection.totalDataPoints}
- 优秀: ${stats.dataCollection.byQuality.excellent}
- 良好: ${stats.dataCollection.byQuality.good}
- 一般: ${stats.dataCollection.byQuality.average}
- 较差: ${stats.dataCollection.byQuality.poor}

可用训练样本: ${stats.dataCollection.byQuality.excellent + stats.dataCollection.byQuality.good}
`);

// 导出为文件
downloadFile('training-data-' + Date.now() + '.jsonl', data);
```

### 数据格式

导出的JSONL格式可直接用于LLM训练：

```json
{"messages":[{"role":"system","content":"你是一个激进型扑克牌AI玩家。"},{"role":"user","content":"游戏状态：\n- 回合：5\n- 阶段：middle\n..."},{"role":"assistant","content":"动作：play\n推理：激进型策略：出1张牌，战略意图：aggressive_attack"}],"metadata":{"id":"dp_xxx","quality":"good","tags":["decision","aggressive"]}}
```

## 🎯 完整游戏流程示例

```typescript
import { useMasterAIBrain } from '../hooks/useMasterAIBrain';

function MultiPlayerGame() {
  // 1. 初始化AI大脑
  const { 
    initialized, 
    triggerAITurn, 
    exportTrainingData 
  } = useMasterAIBrain({
    config: {
      aiPlayers: [
        { id: 1, personality: { preset: 'aggressive' }, decisionModules: ['mcts'], communicationEnabled: true },
        { id: 2, personality: { preset: 'conservative' }, decisionModules: ['mcts'], communicationEnabled: true },
        { id: 3, personality: { preset: 'balanced' }, decisionModules: ['mcts'], communicationEnabled: true }
      ],
      llm: { enabled: false },
      dataCollection: { enabled: true, autoExport: false, exportInterval: 60000 },
      performance: { enableCache: true, timeout: 5000 }
    },
    autoInit: true
  });
  
  // 2. 游戏循环
  const playRound = async () => {
    for (let playerId = 0; playerId < 4; playerId++) {
      if (players[playerId].isAI) {
        // AI玩家回合
        const gameState = buildGameState(playerId);
        triggerAITurn(playerId, gameState);
        
        // 等待AI响应（通过事件）
        await waitForAIResponse(playerId);
      } else {
        // 人类玩家回合
        await waitForHumanInput();
      }
    }
  };
  
  // 3. 游戏结束
  const onGameEnd = () => {
    // 导出训练数据
    const trainingData = exportTrainingData();
    
    // 保存
    const blob = new Blob([trainingData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-data-${Date.now()}.jsonl`;
    a.click();
    
    console.log('训练数据已导出');
  };
  
  return (
    <div>
      {initialized ? (
        <>
          <GameBoard onGameEnd={onGameEnd} />
          <AIStatsPanel statistics={statistics} />
        </>
      ) : (
        <div>AI大脑初始化中...</div>
      )}
    </div>
  );
}
```

## 🔧 实用工具函数

### 构建游戏状态

```typescript
function buildGameState(currentPlayerId: number): GameState {
  const player = players[currentPlayerId];
  
  return {
    myHand: player.hand,
    myPosition: currentPlayerId,
    playerCount: 4,
    lastPlay: lastPlay,
    lastPlayerId: lastPlayerId,
    currentPlayerId: currentPlayerId,
    playHistory: playHistory,
    roundNumber: roundNumber,
    opponentHandSizes: getOpponentHandSizes(currentPlayerId),
    teamMode: false,
    myTeamId: undefined,
    currentRoundScore: currentRoundScore,
    cumulativeScores: getCumulativeScores(),
    phase: determinePhase()
  };
}

function determinePhase(): 'early' | 'middle' | 'late' | 'critical' {
  if (roundNumber <= 3) return 'early';
  
  const minCards = Math.min(...players.map(p => p.hand.length));
  if (minCards < 3) return 'critical';
  if (minCards < 5) return 'late';
  
  return 'middle';
}
```

### 下载训练数据

```typescript
function downloadTrainingData(data: string) {
  const blob = new Blob([data], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `poker-ai-training-${Date.now()}.jsonl`;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('训练数据已下载');
}
```

## 📈 监控AI表现

```typescript
// 实时监控组件
function AIMonitor({ statistics }) {
  if (!statistics) return null;
  
  const { performance, dataCollection } = statistics;
  
  return (
    <div className="ai-monitor">
      <h3>AI大脑监控</h3>
      
      <div>
        <h4>性能</h4>
        <p>平均决策时间: {performance?.avgDecisionTime?.toFixed(2)}ms</p>
        <p>平均通信时间: {performance?.avgCommunicationTime?.toFixed(2)}ms</p>
        <p>成功率: {(performance?.successRate * 100)?.toFixed(1)}%</p>
      </div>
      
      <div>
        <h4>训练数据</h4>
        <p>总数据点: {dataCollection?.totalDataPoints || 0}</p>
        <p>优秀样本: {dataCollection?.byQuality?.excellent || 0}</p>
        <p>良好样本: {dataCollection?.byQuality?.good || 0}</p>
      </div>
    </div>
  );
}
```

## 🎯 调试技巧

### 1. 查看AI决策过程

```typescript
// 监听AI事件，查看详细过程
bridge.eventBus.on('ai:turn-complete', (result) => {
  console.log('AI决策详情:', {
    playerId: result.playerId,
    action: result.decision.action,
    reasoning: result.decision.reasoning,
    confidence: result.decision.confidence,
    message: result.message?.content
  });
});
```

### 2. 导出和查看数据

```typescript
// 随时导出数据查看
const data = exportTrainingData();
const samples = data.split('\n').map(line => JSON.parse(line));

console.log('第一个样本:', samples[0]);
console.log('样本质量分布:', {
  excellent: samples.filter(s => s.metadata.quality === 'excellent').length,
  good: samples.filter(s => s.metadata.quality === 'good').length
});
```

### 3. 性能分析

```typescript
// 定期查看性能
setInterval(() => {
  const stats = api.getStatistics();
  console.table({
    '决策时间': stats.performance.avgDecisionTime + 'ms',
    '通信时间': stats.performance.avgCommunicationTime + 'ms',
    '成功率': (stats.performance.successRate * 100).toFixed(1) + '%',
    '数据点': stats.dataCollection.totalDataPoints
  });
}, 10000);
```

## 💡 最佳实践

### 1. 初始化时机

在App.tsx或游戏主组件中初始化：

```typescript
function App() {
  const brainHook = useMasterAIBrain({
    config: {...},
    autoInit: true  // 应用启动时自动初始化
  });
  
  return (
    <GameProvider brainHook={brainHook}>
      <Game />
    </GameProvider>
  );
}
```

### 2. 数据导出时机

建议在以下时机导出：
- ✅ 每局游戏结束
- ✅ 玩家退出游戏
- ✅ 达到一定数据量（如100局）

### 3. 性能优化

```typescript
// 根据设备性能调整MCTS迭代次数
const config = {
  aiPlayers: players.map(p => ({
    ...p,
    personality: {
      ...p.personality,
      // 移动设备用较少迭代
      mctsIterations: isMobile ? 300 : 1000
    }
  }))
};
```

---

**现在可以开始收集真实的训练数据了！** 🎉


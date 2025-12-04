# 游戏引擎 - 架构说明

## 📖 设计理念

**逻辑清晰 > 一切**

- 每个文件职责单一
- 每个函数功能明确
- 每行代码都有注释
- 分层架构，易于理解

## 📁 目录结构（超级清晰）

```
engine/
├── README.md                  # 本文档
├── GameEngine.ts              # 主引擎（游戏循环和调度）
├── GameState.ts               # 状态管理（所有游戏数据）
├── Player.ts                  # 玩家类（玩家相关逻辑）
├── RuleEngine.ts              # 规则引擎（游戏规则判断）
├── TurnManager.ts             # 回合管理（控制回合流程）
└── types.ts                   # 类型定义（所有接口和类型）
```

## 🎯 每个文件的职责

### GameEngine.ts - 游戏引擎（主调度）
**职责：**
- 初始化游戏
- 运行游戏主循环
- 调度各个组件
- 发送事件通知

**不负责：**
- 具体的游戏规则（在RuleEngine）
- 状态管理（在GameState）
- AI逻辑（在MasterAIBrain）
- 渲染（在Renderer）

### GameState.ts - 状态管理（数据）
**职责：**
- 存储所有游戏数据
- 提供状态访问接口
- 状态更新（不可变）
- 状态验证

**不负责：**
- 游戏逻辑
- 渲染
- AI决策

### Player.ts - 玩家类（玩家逻辑）
**职责：**
- 玩家基本信息
- 手牌管理
- 玩家操作

**不负责：**
- AI决策（在MasterAIBrain）
- 游戏规则（在RuleEngine）

### RuleEngine.ts - 规则引擎（规则判断）
**职责：**
- 判断出牌是否合法
- 比较牌型大小
- 计算分数
- 判断游戏结束

**不负责：**
- 游戏流程控制
- AI决策
- 状态管理

### TurnManager.ts - 回合管理（流程控制）
**职责：**
- 管理回合流程
- 判断下一个玩家
- 处理Pass逻辑
- Round结束判断

**不负责：**
- 具体出牌逻辑
- AI决策
- 渲染

## 🎮 使用示例

### 超级简单的主入口

```typescript
// main.ts - 只有10行代码！

import { GameEngine } from './engine/GameEngine';
import { CanvasRenderer } from './renderer/CanvasRenderer';

async function main() {
  const renderer = new CanvasRenderer('game-canvas');
  const engine = new GameEngine(renderer);
  
  await engine.initialize();
  engine.start();
  
  console.log('游戏已启动！');
}

main();
```

### 清晰的调用流程

```
main.ts
  ↓ 创建
GameEngine
  ↓ 初始化
MasterAIBrain + GameState + TurnManager
  ↓ 启动
游戏循环
  ↓ 每一帧
update() → render()
  ↓ AI回合
MasterAIBrain.handleTurn()
  ↓ 应用结果
GameState.applyAction()
  ↓ 通知渲染
Renderer.render()
```

## 💡 代码风格

### 1. 清晰的注释

```typescript
/**
 * 处理AI玩家回合
 * 
 * 流程：
 * 1. 显示"AI思考中"
 * 2. 调用AI大脑决策
 * 3. 应用决策到游戏状态
 * 4. 显示AI消息
 * 5. 通知渲染器更新
 * 
 * @param player AI玩家对象
 */
private async handleAITurn(player: Player): Promise<void> {
  // 步骤1: 显示思考状态
  this.renderer.showAIThinking(player.id);
  
  // 步骤2: AI决策
  const result = await this.masterBrain.handleTurn(
    player.id,
    this.gameState.export()
  );
  
  // 步骤3: 应用决策
  this.gameState.applyDecision(player.id, result.decision);
  
  // 步骤4: 显示消息
  if (result.message) {
    this.renderer.showMessage(player.id, result.message);
  }
  
  // 步骤5: 通知更新
  this.renderer.render(this.gameState.export());
}
```

### 2. 明确的类型

```typescript
/**
 * 游戏引擎配置
 * 所有配置项都有清晰说明
 */
export interface GameEngineConfig {
  /** 渲染器实例 */
  renderer: IRenderer;
  
  /** 玩家总数（通常是4） */
  playerCount: 4;
  
  /** AI玩家ID列表（例如[1,2,3]表示玩家1、2、3是AI） */
  aiPlayerIds: number[];
  
  /** AI配置 */
  aiConfig?: {
    /** AI性格列表（与aiPlayerIds对应） */
    personalities?: PersonalityType[];
    
    /** 是否启用LLM */
    enableLLM?: boolean;
    
    /** 是否收集训练数据 */
    enableDataCollection?: boolean;
  };
}
```

### 3. 单一职责

```typescript
// ✅ 好：每个函数只做一件事

// 判断游戏是否结束
private isGameOver(): boolean {
  return this.gameState.hasWinner();
}

// 获取当前玩家
private getCurrentPlayer(): Player {
  return this.gameState.getCurrentPlayer();
}

// 应用出牌动作
private applyPlay(playerId: number, cards: Card[]): void {
  this.gameState.playCards(playerId, cards);
}

// ❌ 不好：一个函数做太多事
private handleTurnAndRenderAndCheckWin() {
  // 太复杂！
}
```

---

## 🎯 核心优势

### 1. 逻辑清晰

```
看代码就像看故事：
1. 创建游戏引擎
2. 初始化
3. 开始游戏循环
4. AI回合 → 人类回合 → 下一轮
5. 游戏结束
```

### 2. 易于调试

```
console.log('[GameEngine] 开始AI回合');
console.log('[MasterBrain] AI思考中...');
console.log('[AIPlayer] 决策完成:', decision);
console.log('[GameState] 状态已更新');
console.log('[Renderer] 渲染完成');

→ 每一步都清楚！
```

### 3. 易于测试

```typescript
// 测试游戏引擎（无需UI）
const engine = new GameEngine(mockRenderer);
await engine.initialize();
await engine.processTurn(1);

expect(engine.getState().currentPlayer).toBe(2);
```

### 4. 易于扩展

```
添加新功能：
1. 确定属于哪个模块
2. 在该模块添加
3. 不影响其他模块
```

---

要不要我现在就开始实现这个**超级清晰**的游戏引擎？

我会：
1. ✅ 每个文件都有详细注释
2. ✅ 每个函数都说明职责
3. ✅ 代码像文章一样易读
4. ✅ 分层清晰，职责明确

开始吗？🚀

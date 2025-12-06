# 聊天机制 Review

## 📋 当前架构

### 1. AI Brain 聊天系统（新系统）

```
游戏引擎 (Game)
    ↓
GameBridge (桥接层)
    ↓
MasterAIBrain (统一大脑)
    ├── CommunicationScheduler (通信调度器)
    │   ├── maybeGenerateMessage() - 决定是否生成聊天
    │   ├── generateMessageContent() - 生成消息内容
    │   │   ├── 有LLM → 调用 UnifiedLLMService
    │   │   └── 无LLM → 使用 generateRuleBasedMessage (规则生成)
    │   └── 触发类型：
    │       - after_decision: AI决策后
    │       - after_play: 出牌后
    │       - after_pass: 要不起后
    │       - game_event: 游戏事件触发
    │       - idle: 空闲时
    └── UnifiedLLMService (统一LLM服务)
        ├── 队列管理
        ├── 并发控制
        ├── 缓存机制
        └── 优先级管理
```

### 2. 旧聊天系统（需要废弃）

```
chatService (旧服务)
    ├── RuleBasedStrategy (规则策略)
    └── LLMChatStrategy (LLM策略)
```

## 🔄 聊天生成流程

### 场景1: AI玩家打牌时主动聊天

**当前流程**：
```
1. 游戏引擎调用 triggerAITurn(playerId, gameState)
2. GameBridge 转发到 MasterAIBrain.handleTurn()
3. MasterAIBrain:
   a. 共享认知层分析局面
   b. AI玩家做决策
   c. CommunicationScheduler.maybeGenerateMessage()
      - 检查是否应该说话（概率、间隔）
      - 生成消息（LLM或规则）
   d. 返回 { decision, message }
4. 游戏引擎接收 message，显示聊天
```

**✅ 已实现**：AI打牌时会自动生成聊天

### 场景2: 特定场景触发聊天

**当前流程**：
```
需要游戏引擎主动通知AI Brain：
1. 游戏事件发生（如：出炸弹、大墩、分牌被抢等）
2. 游戏引擎调用 notifyStateChange() 或触发特定事件
3. AI Brain 的 CommunicationScheduler 响应事件
4. 生成相应的聊天消息
```

**⚠️ 问题**：目前Vue mobile版本可能还没有实现游戏事件通知

### 场景3: 人类玩家打牌后，AI的反应聊天

**当前流程**：
```
1. 人类玩家出牌
2. 游戏引擎需要通知AI Brain：notifyStateChange()
3. AI Brain 的 CommunicationScheduler 检测到状态变化
4. 其他AI玩家可能生成反应聊天
```

**⚠️ 问题**：需要确认是否已实现

## 🎯 回退机制

### LLM不可用时的处理

**当前实现**：
```typescript
// CommunicationScheduler.generateMessageContent()
if (!this.llmService) {
  return this.generateRuleBasedMessage(playerId, context, personality);
}

// LLM调用失败时
catch (error) {
  console.error('[CommunicationScheduler] LLM生成失败，使用规则生成:', error);
  return this.generateRuleBasedMessage(playerId, context, personality);
}
```

**✅ 已实现**：自动回退到规则生成

### 规则生成内容

**当前实现**：
```typescript
const messages: Record<string, string[]> = {
  'aggressive': ['就这？', '不服来战！', '还有没有？', '太弱了'],
  'conservative': ['先看看', '谨慎点', '再看看', '不急'],
  'balanced': ['还行', '继续', '不错', '可以'],
  'adaptive': ['看情况', '随机应变', '灵活应对', '看局势']
};
```

**✅ 已实现**：根据性格生成不同内容

## ⚠️ 发现的问题

### 1. 游戏事件触发聊天未完全实现

**问题**：
- Vue mobile版本中，游戏事件（出牌、要不起、炸弹等）可能还没有通知AI Brain
- 需要确认 `gameStore.playCards()` 和 `gameStore.pass()` 是否调用了 `notifyStateChange()`

**建议**：
- 在 `gameStore.playCards()` 后调用 `aiBrainIntegration.notifyStateChange()`
- 在 `gameStore.pass()` 后调用 `aiBrainIntegration.notifyStateChange()`
- 在游戏事件发生时（炸弹、大墩等）主动触发聊天

### 2. 人类玩家聊天未通过AI Brain

**问题**：
- 人类玩家主动聊天（通过ChatInput）可能还没有通过AI Brain
- 需要确认人类聊天是否也需要AI Brain处理（AI可以帮人类说话）

**建议**：
- 人类聊天可以通过AI Brain的 `maybeGenerateMessage()` 生成
- 或者人类直接输入，但AI可以基于人类输入生成反应

### 3. 聊天触发时机不完整

**当前触发类型**：
- ✅ after_decision: AI决策后
- ✅ after_play: 出牌后
- ✅ after_pass: 要不起后
- ⚠️ game_event: 游戏事件（需要确认是否实现）
- ⚠️ idle: 空闲时（需要确认是否实现）

**建议**：
- 完善 game_event 触发机制
- 实现 idle 触发机制（定时触发）

## 📝 建议的改进

### 1. 统一聊天入口

**所有聊天都应该通过AI Brain**：
```typescript
// 游戏引擎中
gameStore.playCards() {
  // 1. 执行出牌
  const result = game.value.playCards(...);
  
  // 2. 通知AI Brain状态变化
  aiBrainIntegration.notifyStateChange(game.value, playerId);
  
  // 3. AI Brain会自动生成聊天（如果有）
  // 通过 onCommunicationMessage 监听
}
```

### 2. 完善事件触发

**添加游戏事件监听**：
```typescript
// 在 gameStore 中
watch(() => game.value?.currentRound?.lastPlay, (newPlay) => {
  if (newPlay) {
    // 出牌事件
    aiBrainIntegration.notifyStateChange(game.value, currentPlayerId);
    
    // 触发其他AI的反应聊天
    // 可以通过 CommunicationScheduler 的 game_event 触发
  }
});
```

### 3. 人类玩家聊天集成

**人类聊天也通过AI Brain**：
```typescript
// ChatInput 组件中
const sendMessage = async (content: string) => {
  // 1. 人类直接发送
  chatStore.addMessage({
    playerId: humanPlayerId,
    content,
    type: 'human'
  });
  
  // 2. 通知AI Brain（AI可以生成反应）
  aiBrainIntegration.notifyStateChange(game.value, humanPlayerId);
  
  // 3. AI可能会生成反应聊天
};
```

## 🎯 总结

### ✅ 已实现
1. AI打牌时主动聊天（after_decision）
2. LLM不可用时自动回退到规则生成
3. 统一通过AI Brain调度
4. 优先级管理和队列控制

### ⚠️ 需要完善
1. **提示词构建不完整**：
   - ❌ 缺少游戏规则说明
   - ❌ 缺少玩家名字信息
   - ❌ 缺少完整的游戏状态上下文
   - ❌ 缺少提示词验证和预处理

2. **LLM返回处理不完善**：
   - ⚠️ 只有基本的引号移除和长度截断
   - ❌ 缺少内容过滤（不当内容、敏感词等）
   - ❌ 缺少格式验证

3. **游戏事件触发聊天**（game_event）
4. **人类玩家出牌后AI反应聊天**
5. **空闲时聊天**（idle）
6. **人类聊天与AI Brain的集成**

### 🔧 下一步
1. **增强提示词构建**：
   - 添加游戏规则说明（开局时或首次调用时）
   - 添加玩家名字和角色信息
   - 添加完整的游戏状态上下文
   - 添加提示词验证和预处理

2. **完善LLM返回处理**：
   - 添加内容过滤（不当内容、敏感词）
   - 添加格式验证
   - 增强错误处理

3. 在 `gameStore.playCards()` 和 `gameStore.pass()` 中添加 `notifyStateChange()` 调用
4. 实现游戏事件监听和触发机制
5. 完善 CommunicationScheduler 的 game_event 处理
6. 实现人类聊天与AI Brain的集成

## 📝 提示词构建改进建议

### 1. 完整的游戏上下文

**应该包含**：
- 游戏规则说明（首次调用时或开局时）
- 玩家信息（名字、角色、性格）
- 当前游戏状态（轮次、得分、手牌数量等）
- 最近出牌记录
- 当前局面分析

### 2. 提示词验证

**应该检查**：
- 提示词长度（避免过长）
- 特殊字符（避免注入）
- 必要信息完整性

### 3. LLM返回处理

**应该处理**：
- 移除引号、换行等格式字符
- 过滤不当内容（脏话、敏感词）
- 长度控制（最多15个字符）
- 格式验证（确保是纯文本）
- 错误恢复（如果返回无效，使用规则生成）


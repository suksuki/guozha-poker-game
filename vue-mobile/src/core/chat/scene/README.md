# 聊天场景化系统

## 概述

聊天场景化系统采用策略模式，将聊天分为不同场景，每个场景有独立的提示词构建和内容处理逻辑，提供更好的扩展性和灵活性。

## 场景类型

### 1. 自发聊天（Spontaneous）
- **场景标识**: `ChatScene.SPONTANEOUS`
- **特点**: 玩家主动闲聊，不依赖具体游戏事件
- **提示词**: 轻量级，主要关注玩家状态和聊天历史
- **内容处理**: 宽松，允许更多口语化表达
- **最大长度**: 20字
- **适用事件**: `RANDOM`, `DEALING`

### 2. 事件触发聊天（Event-Driven）
- **场景标识**: `ChatScene.EVENT_DRIVEN`
- **特点**: 基于具体游戏事件触发
- **提示词**: 详细，包含完整牌局信息和事件详情
- **内容处理**: 严格，必须精准对应事件
- **最大长度**: 15字
- **适用事件**: 除 `RANDOM` 和 `DEALING` 外的所有事件

### 3. 对骂（Taunt）
- **场景标识**: `ChatScene.TAUNT`
- **特点**: 玩家之间的对骂/挑衅
- **提示词**: 特殊，必须包含脏话
- **内容处理**: 严格，简短有力
- **最大长度**: 15字
- **适用事件**: 对骂场景

## 架构设计

### 核心接口

```typescript
interface IChatSceneProcessor {
  readonly scene: ChatScene;
  readonly description: string;
  buildPrompt(player, eventType, context, config): string;
  processContent(content, config): string;
  matchesEventType?(eventType): boolean;
}
```

### 场景处理器

- `SpontaneousChatProcessor`: 处理自发聊天
- `EventDrivenChatProcessor`: 处理事件触发聊天
- `TauntChatProcessor`: 处理对骂

### 工厂模式

`ChatSceneProcessorFactory` 负责：
- 创建场景处理器实例
- 管理事件类型到场景的映射
- 支持注册自定义处理器（扩展性）

## 配置系统

每个场景都有独立的配置：

```typescript
interface ChatSceneConfig {
  maxLength: number;              // 最大长度
  removeFormal: boolean;          // 是否移除正式表达
  includeFullGameState: boolean;  // 是否包含完整游戏状态
  includeDetailedEventInfo: boolean; // 是否包含详细事件信息
  historyLength: number;          // 聊天历史长度
  promptTemplate?: string;        // 自定义提示词模板（可选）
}
```

默认配置在 `DEFAULT_CHAT_SCENE_CONFIG` 中定义。

## 使用方式

### 在 LLMChatStrategy 中使用

```typescript
// 根据事件类型确定场景
const scene = ChatSceneProcessorFactory.getSceneByEventType(eventType);
const processor = ChatSceneProcessorFactory.getProcessor(scene);
const sceneConfig = this.sceneConfigs[scene];

// 构建提示词
const prompt = processor.buildPrompt(player, eventType, context, sceneConfig);

// 处理内容
const processedContent = processor.processContent(content, sceneConfig);
```

### 扩展新场景

1. 创建新的场景处理器，实现 `IChatSceneProcessor` 接口
2. 在 `ChatSceneProcessorFactory` 中注册
3. 在 `DEFAULT_CHAT_SCENE_CONFIG` 中添加配置

```typescript
// 1. 创建处理器
class CustomChatProcessor implements IChatSceneProcessor {
  readonly scene = ChatScene.CUSTOM;
  // ... 实现接口方法
}

// 2. 注册处理器
ChatSceneProcessorFactory.registerProcessor(ChatScene.CUSTOM, new CustomChatProcessor());

// 3. 添加配置
DEFAULT_CHAT_SCENE_CONFIG[ChatScene.CUSTOM] = {
  maxLength: 15,
  // ... 其他配置
};
```

## 优势

1. **性能优化**: 自发聊天使用轻量级提示词，减少 token 消耗
2. **内容质量**: 不同场景有针对性处理，提升内容质量
3. **可扩展性**: 易于添加新场景和处理策略
4. **维护性**: 场景分离，便于独立优化和调试

## 未来扩展

- 支持更多场景类型（如"策略讨论"、"情绪表达"等）
- 动态场景配置（运行时调整）
- 场景特定的 LLM 模型选择
- 场景性能监控和分析


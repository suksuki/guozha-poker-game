# 聊天模块说明

## 模块结构

聊天模块采用策略模式设计，支持灵活替换不同的聊天生成策略。

```
src/chat/
├── strategy/
│   ├── IChatStrategy.ts      # 聊天策略接口
│   ├── RuleBasedStrategy.ts # 基于规则的策略（当前使用）
│   ├── LLMChatStrategy.ts   # 大模型策略（预留接口）
│   └── index.ts             # 策略工厂
└── index.ts                 # 模块主入口
```

## 策略接口

所有聊天策略都实现 `IChatStrategy` 接口：

```typescript
interface IChatStrategy {
  generateRandomChat(player: Player, context?: ChatContext): Promise<ChatMessage | null> | ChatMessage | null;
  generateEventChat(player: Player, eventType: ChatEventType, context?: ChatContext): Promise<ChatMessage | null> | ChatMessage | null;
  generateTaunt(player: Player, targetPlayer?: Player, context?: ChatContext): Promise<ChatMessage | null> | ChatMessage | null;
  readonly name: string;
  readonly description: string;
}
```

## 现有策略

### 1. 规则策略（RuleBasedStrategy）
- **名称**: `rule-based`
- **描述**: 基于预定义规则的聊天策略
- **特点**: 使用预定义的内容库，速度快，稳定

### 2. 大模型策略（LLMChatStrategy）- 预留
- **名称**: `llm`
- **描述**: 基于大语言模型的智能聊天策略（预留接口）
- **状态**: 尚未实现，未来可接入OpenAI、Claude等

## 使用方式

### 方式1：通过chatService自动选择策略（推荐）

```typescript
import { chatService } from '../services/chatService';

// 默认使用rule-based策略
const message = await chatService.triggerRandomChat(player);

// 切换到大模型策略（需要先实现）
chatService.setStrategy('llm');
const llmMessage = await chatService.triggerRandomChat(player);
```

### 方式2：直接使用策略实例

```typescript
import { getChatStrategy } from '../chat/strategy';

const strategy = getChatStrategy('rule-based');
const message = await strategy.generateRandomChat(player, context);
```

### 方式3：使用配置模式

```typescript
import { getChatConfigByMode } from '../config/chatConfig';

const config = getChatConfigByMode('llm');
// 使用配置创建策略...
```

## 实现自定义策略

### 步骤1：实现IChatStrategy接口

```typescript
import { IChatStrategy, ChatContext } from './IChatStrategy';
import { ChatMessage, ChatEventType } from '../../types/chat';
import { Player } from '../../types/card';

export class MyCustomChatStrategy implements IChatStrategy {
  readonly name = 'my-custom';
  readonly description = '我的自定义聊天策略';

  generateRandomChat(player: Player, context?: ChatContext): ChatMessage | null {
    // 实现你的逻辑
    return {
      playerId: player.id,
      playerName: player.name,
      content: '自定义内容',
      timestamp: Date.now(),
      type: 'random'
    };
  }

  generateEventChat(player: Player, eventType: ChatEventType, context?: ChatContext): ChatMessage | null {
    // 实现你的逻辑
    return null;
  }

  generateTaunt(player: Player, targetPlayer?: Player, context?: ChatContext): ChatMessage | null {
    // 实现你的逻辑
    return null;
  }
}
```

### 步骤2：注册策略

```typescript
import { registerChatStrategy } from '../chat/strategy';
import { MyCustomChatStrategy } from './MyCustomChatStrategy';

registerChatStrategy('my-custom', new MyCustomChatStrategy());
```

### 步骤3：使用自定义策略

```typescript
chatService.setStrategy('my-custom');
```

## 大模型策略实现示例（未来）

```typescript
export class OpenAIChatStrategy implements IChatStrategy {
  readonly name = 'openai';
  readonly description = '基于OpenAI GPT的智能聊天策略';

  async generateRandomChat(player: Player, context?: ChatContext): Promise<ChatMessage | null> {
    // 1. 构建提示词
    const prompt = this.buildPrompt(player, 'random', context);
    
    // 2. 调用OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.config.systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })
    });
    
    // 3. 解析返回结果
    const data = await response.json();
    const content = this.parseResponse(data.choices[0].message.content);
    
    return {
      playerId: player.id,
      playerName: player.name,
      content,
      timestamp: Date.now(),
      type: 'random'
    };
  }

  private buildPrompt(player: Player, type: string, context?: ChatContext): string {
    // 构建提示词逻辑
    return `...`;
  }

  private parseResponse(response: string): string {
    // 解析和验证返回的聊天内容
    return response.trim();
  }
}
```

## 配置说明

所有配置都在 `src/config/chatConfig.ts` 中：

- `ChatServiceConfig` - 聊天服务配置
- `BigDunConfig` - 大墩触发配置
- `TauntConfig` - 对骂配置
- `LLMChatConfig` - 大模型配置（预留）

## 上下文信息

`ChatContext` 接口提供了丰富的上下文信息，帮助策略生成更合适的聊天内容：

- `gameState` - 游戏状态（轮次、分数等）
- `eventData` - 事件数据（墩大小、被偷分数等）
- `playerState` - 玩家状态（手牌数、分数、排名等）
- `history` - 聊天历史

## 策略选择建议

- **当前使用**: `rule-based` 策略（稳定、快速）
- **未来接入大模型**: `llm` 策略（需要实现）
- **自定义需求**: 实现 `IChatStrategy` 接口


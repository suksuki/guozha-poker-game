# AI策略接口说明

## 策略接口设计

所有AI算法都实现了 `IAIStrategy` 接口，可以灵活替换不同的AI算法。

## 现有策略

### 1. MCTS策略（MCTSStrategy）
- **名称**: `mcts`
- **描述**: 蒙特卡洛树搜索算法（MCTS）
- **特点**: 平衡性能和速度，推荐使用

### 2. 简单策略（SimpleStrategy）
- **名称**: `simple`
- **描述**: 基于启发式规则的简单AI策略
- **特点**: 速度快，适合快速响应场景

### 3. 大模型策略（LLMStrategy）- 预留
- **名称**: `llm`
- **描述**: 基于大语言模型的AI策略（预留接口）
- **状态**: 尚未实现，未来可接入OpenAI、Claude等

## 使用方式

### 方式1：通过aiChoosePlay自动选择策略
```typescript
import { aiChoosePlay } from '../utils/aiPlayer';

const cards = await aiChoosePlay(hand, lastPlay, {
  algorithm: 'mcts', // 自动使用MCTS策略
  mctsIterations: 50
});
```

### 方式2：直接使用策略实例
```typescript
import { getAIStrategy } from '../ai/strategy';

const strategy = getAIStrategy('mcts');
const cards = strategy.choosePlay(hand, lastPlay, config);
```

### 方式3：获取所有可用策略
```typescript
import { getAvailableStrategies } from '../ai/strategy';

const strategies = getAvailableStrategies();
strategies.forEach(s => {
  console.log(`${s.name}: ${s.description}`);
});
```

## 实现自定义策略

### 步骤1：实现IAIStrategy接口
```typescript
import { IAIStrategy } from './IAIStrategy';
import { Card, Play } from '../../types/card';
import { AIConfig } from '../types';

export class MyCustomStrategy implements IAIStrategy {
  readonly name = 'my-custom';
  readonly description = '我的自定义策略';

  choosePlay(
    hand: Card[],
    lastPlay: Play | null,
    config: AIConfig
  ): Card[] | null {
    // 实现你的AI逻辑
    return selectedCards;
  }
}
```

### 步骤2：注册策略
```typescript
import { registerStrategy } from '../ai/strategy';
import { MyCustomStrategy } from './MyCustomStrategy';

// 注册自定义策略
registerStrategy('my-custom', new MyCustomStrategy());
```

### 步骤3：使用自定义策略
```typescript
import { aiChoosePlay } from '../utils/aiPlayer';

const cards = await aiChoosePlay(hand, lastPlay, {
  algorithm: 'my-custom' // 使用自定义策略
});
```

## 大模型策略实现示例（未来）

```typescript
import { IAIStrategy } from './IAIStrategy';
import { Card, Play } from '../../types/card';
import { AIConfig } from '../types';
import { LLMConfig } from '../../config/aiConfig';

export class OpenAIStrategy implements IAIStrategy {
  readonly name = 'openai';
  readonly description = '基于OpenAI GPT的AI策略';

  async choosePlay(
    hand: Card[],
    lastPlay: Play | null,
    config: AIConfig
  ): Promise<Card[] | null> {
    // 1. 构建提示词
    const prompt = this.buildPrompt(hand, lastPlay);
    
    // 2. 调用OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: '你是一个专业的过炸牌游戏AI' },
          { role: 'user', content: prompt }
        ]
      })
    });
    
    // 3. 解析返回结果
    const data = await response.json();
    const cards = this.parseResponse(data.choices[0].message.content);
    
    return cards;
  }

  private buildPrompt(hand: Card[], lastPlay: Play | null): string {
    // 构建提示词逻辑
    return `...`;
  }

  private parseResponse(response: string): Card[] {
    // 解析大模型返回结果
    return [];
  }
}
```

## 策略选择建议

- **快速响应场景**: 使用 `simple` 策略
- **平衡性能和速度**: 使用 `mcts` 策略（默认）
- **追求最强AI**: 使用 `mcts` 策略 + 增加 `mctsIterations`
- **未来接入大模型**: 使用 `llm` 策略（需要实现）


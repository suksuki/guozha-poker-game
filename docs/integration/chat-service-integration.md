# ChatService 集成 QuarrelVoiceService 指南

## 概述

本文档展示如何在现有的 `ChatService` 中集成 `QuarrelVoiceService`，实现"吵架王对轰"效果。

## 方案1：并行使用（推荐）

保留原有的 `multiChannelVoiceService`，在特定场景（如对骂）时使用 `QuarrelVoiceService`。

### 修改 chatService.ts

```typescript
import { getQuarrelVoiceService, updateMainFightRoles } from '../services/quarrelVoiceService';
import { submitChatMessageToQuarrel, handleQuarrelScene } from '../utils/quarrelVoiceHelper';
import { ChatEventType } from '../types/chat';

class ChatService {
  private quarrelService = getQuarrelVoiceService();
  private useQuarrelForTaunt: boolean = true;  // 对骂场景使用QuarrelVoiceService

  // 在构造函数中初始化
  constructor(...) {
    // ... 原有代码
    this.quarrelService.init().catch(err => {
      console.warn('[ChatService] QuarrelVoiceService初始化失败:', err);
    });
  }

  // 修改 triggerTaunt 方法
  async triggerTaunt(
    player: Player,
    targetPlayer?: Player,
    context?: ChatContext,
    fullGameState?: MultiPlayerGameState
  ): Promise<ChatMessage | null> {
    // 生成对骂内容（原有逻辑）
    const message = await this.triggerEventChat(
      player,
      ChatEventType.TAUNT,
      { ...context, targetPlayer },
      fullGameState
    );

    if (!message) {
      return null;
    }

    // 如果启用QuarrelVoiceService，使用它播放
    if (this.useQuarrelForTaunt && targetPlayer) {
      try {
        // 设置主吵架双方
        updateMainFightRoles([
          player.id.toString(),
          targetPlayer.id.toString()
        ]);

        // 提交到QuarrelVoiceService
        await submitChatMessageToQuarrel(message, player, {
          priority: 'MAIN_FIGHT',
          civility: this.config.civilityLevel || 2,
          onStart: () => {
            console.log(`${player.name} 开始对骂`);
          },
          onEnd: () => {
            console.log(`${player.name} 对骂结束`);
          }
        });

        // 目标玩家可能回复（60%概率）
        if (Math.random() < 0.6) {
          const replyMessage = await this.triggerReply(
            targetPlayer,
            message,
            0.6,
            fullGameState
          );

          if (replyMessage) {
            await submitChatMessageToQuarrel(replyMessage, targetPlayer, {
              priority: 'MAIN_FIGHT',
              civility: this.config.civilityLevel || 2,
            });
          }
        }
      } catch (error) {
        console.error('[ChatService] QuarrelVoiceService播放失败，回退到原有服务:', error);
        // 回退到原有的语音服务
        await this.playMessageWithOriginalService(message, player);
      }
    } else {
      // 使用原有的语音服务
      await this.playMessageWithOriginalService(message, player);
    }

    return message;
  }

  // 原有的播放方法（作为回退）
  private async playMessageWithOriginalService(message: ChatMessage, player: Player): Promise<void> {
    // 使用原有的 multiChannelVoiceService 或 voiceService
    // ... 原有代码
  }
}
```

## 方案2：完全替换（高级）

完全使用 `QuarrelVoiceService` 替换原有的语音播放。

### 修改 chatService.ts

```typescript
import { getQuarrelVoiceService } from '../services/quarrelVoiceService';
import { submitChatMessageToQuarrel, getPriorityFromEventType } from '../utils/quarrelVoiceHelper';

class ChatService {
  private quarrelService = getQuarrelVoiceService();
  private useQuarrelVoice: boolean = true;  // 是否使用QuarrelVoiceService

  constructor(...) {
    // ... 原有代码
    if (this.useQuarrelVoice) {
      this.quarrelService.init().catch(err => {
        console.warn('[ChatService] QuarrelVoiceService初始化失败:', err);
        this.useQuarrelVoice = false;  // 回退到原有服务
      });
    }
  }

  // 统一的播放方法
  private async playMessage(message: ChatMessage, player: Player): Promise<void> {
    if (this.useQuarrelVoice) {
      try {
        await submitChatMessageToQuarrel(message, player, {
          priority: getPriorityFromEventType(message.eventType),
          civility: this.config.civilityLevel || 2,
        });
      } catch (error) {
        console.error('[ChatService] QuarrelVoiceService播放失败:', error);
        // 回退到原有服务
        await this.playMessageWithOriginalService(message, player);
      }
    } else {
      await this.playMessageWithOriginalService(message, player);
    }
  }

  // 在所有触发聊天的地方调用 playMessage
  async triggerRandomChat(...) {
    const message = await this.strategy.generateRandomChat(...);
    if (message) {
      this.addMessage(message);
      await this.playMessage(message, player);
    }
    return message;
  }

  async triggerEventChat(...) {
    const message = await this.strategy.generateEventChat(...);
    if (message) {
      this.addMessage(message);
      await this.playMessage(message, player);
    }
    return message;
  }
}
```

## 方案3：使用 React Hook（组件中）

在 React 组件中直接使用 `useQuarrelVoice` Hook。

### 修改 useChatBubbles.ts

```typescript
import { useQuarrelVoice } from '../hooks/useQuarrelVoice';
import { submitChatMessageToQuarrel } from '../utils/quarrelVoiceHelper';

export function useChatBubbles(...) {
  // 使用QuarrelVoiceService
  const quarrelVoice = useQuarrelVoice({
    autoInit: true,
    enableDucking: true,
    duckingLevel: 0.25,
  });

  // 监听新消息
  useEffect(() => {
    const newMessages = getChatMessages().filter(...);
    
    for (const message of newMessages) {
      const player = gameState.players.find(p => p.id === message.playerId);
      if (!player) continue;

      // 判断是否使用QuarrelVoiceService
      const useQuarrel = message.eventType === ChatEventType.TAUNT || 
                        message.eventType === ChatEventType.REPLY;

      if (useQuarrel) {
        // 使用QuarrelVoiceService
        submitChatMessageToQuarrel(message, player, {
          priority: message.eventType === ChatEventType.TAUNT ? 'MAIN_FIGHT' : 'NORMAL_CHAT',
          civility: 2,
          onStart: () => {
            // 显示聊天气泡
            setActiveChatBubbles(prev => {
              const newMap = new Map(prev);
              newMap.set(player.id, message);
              return newMap;
            });
          },
          onEnd: () => {
            // 隐藏聊天气泡
            setActiveChatBubbles(prev => {
              const newMap = new Map(prev);
              newMap.delete(player.id);
              return newMap;
            });
          }
        }).catch(error => {
          console.error('[useChatBubbles] QuarrelVoiceService播放失败:', error);
          // 回退到原有服务
          gameAudio?.speak(message.content, player.voiceConfig, player.id);
        });
      } else {
        // 使用原有服务
        gameAudio?.speak(message.content, player.voiceConfig, player.id);
      }
    }
  }, [messages, gameState.players, quarrelVoice, gameAudio]);
}
```

## 配置选项

### 在 GameConfigPanel 中添加配置

```typescript
// 在 GameConfigPanel.tsx 中
const [useQuarrelVoice, setUseQuarrelVoice] = useState(true);
const [quarrelCivilityLevel, setQuarrelCivilityLevel] = useState(2);

// 在配置面板中添加
<div>
  <label>
    <input
      type="checkbox"
      checked={useQuarrelVoice}
      onChange={(e) => setUseQuarrelVoice(e.target.checked)}
    />
    启用吵架王语音（多声道同时播放）
  </label>
</div>

<div>
  <label>
    文明等级：
    <input
      type="range"
      min="0"
      max="4"
      value={quarrelCivilityLevel}
      onChange={(e) => setQuarrelCivilityLevel(Number(e.target.value))}
    />
    {quarrelCivilityLevel}
  </label>
</div>
```

## 完整示例：对骂场景

```typescript
import { handleQuarrelScene, handleQuickJab } from '../utils/quarrelVoiceHelper';

// 在游戏逻辑中
async function onPlayerTaunt(player1: Player, player2: Player) {
  // 生成对骂内容
  const player1Text = await generateTauntText(player1, player2);
  const player2Text = await generateReplyText(player2, player1, player1Text);

  // 使用QuarrelVoiceService播放
  await handleQuarrelScene(
    player1,
    player2,
    player1Text,
    player2Text,
    {
      civility: gameConfig.civilityLevel || 2,
      volume: 1.0
    }
  );

  // 其他玩家可能短插一句
  const otherPlayers = gameState.players.filter(
    p => p.id !== player1.id && p.id !== player2.id
  );

  for (const otherPlayer of otherPlayers) {
    if (Math.random() < 0.3) {  // 30%概率
      const quickJab = await generateQuickJabText(otherPlayer);
      await handleQuickJab(otherPlayer, quickJab, {
        civility: 1,
        volume: 0.8
      });
    }
  }
}
```

## 注意事项

1. **初始化时机**：确保在游戏开始前初始化 `QuarrelVoiceService`
2. **错误处理**：始终提供回退方案，避免服务不可用时影响游戏
3. **性能考虑**：长吵架分段播放会增加LLM调用，注意性能影响
4. **配置同步**：确保文明等级等配置在多个服务间同步

## 测试建议

1. **单元测试**：测试各个辅助函数
2. **集成测试**：测试与ChatService的集成
3. **性能测试**：测试并发播放性能
4. **用户体验测试**：测试实际游戏中的效果


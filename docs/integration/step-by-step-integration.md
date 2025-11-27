# 逐步集成指南

## 概述

本文档提供详细的逐步集成指南，帮助你将 `QuarrelVoiceService` 集成到现有的游戏代码中。

## 步骤1：检查依赖

确保以下服务已正确配置：

1. **TTS服务**：确保 `ttsAudioService` 已启用多声道模式
2. **LLM服务**（可选）：如果要用长吵架分段，需要LLM服务可用

### 检查TTS服务配置

```typescript
import { ttsAudioService } from './services/ttsAudioService';

// 检查服务状态
const status = ttsAudioService.getStatus();
console.log('TTS服务状态:', status);

// 确保多声道已启用
ttsAudioService.updateConfig({
  enabled: true,
  maxConcurrentSpeakers: 2,
  useTTS: true  // 使用TTS API服务
});
```

## 步骤2：初始化 QuarrelVoiceService

在游戏初始化时初始化服务：

```typescript
// 在 App.tsx 或游戏主组件中
import { getQuarrelVoiceService } from './services/quarrelVoiceService';

useEffect(() => {
  const initQuarrelVoice = async () => {
    const service = getQuarrelVoiceService();
    await service.init();
    console.log('QuarrelVoiceService 初始化完成');
  };
  
  initQuarrelVoice();
}, []);
```

## 步骤3：在 ChatService 中集成（方案A：最小改动）

### 3.1 导入必要的模块

```typescript
// 在 chatService.ts 顶部添加
import { getQuarrelVoiceService, updateMainFightRoles } from './quarrelVoiceService';
import { submitChatMessageToQuarrel } from '../utils/quarrelVoiceHelper';
```

### 3.2 添加配置选项

```typescript
class ChatService {
  private quarrelService = getQuarrelVoiceService();
  private useQuarrelVoice: boolean = true;  // 是否使用QuarrelVoiceService

  constructor(...) {
    // ... 原有代码
    // 初始化QuarrelVoiceService
    this.quarrelService.init().catch(err => {
      console.warn('QuarrelVoiceService初始化失败:', err);
      this.useQuarrelVoice = false;
    });
  }
}
```

### 3.3 修改 triggerTaunt 方法

```typescript
async triggerTaunt(
  player: Player,
  targetPlayer?: Player,
  context?: ChatContext,
  fullGameState?: MultiPlayerGameState
): Promise<ChatMessage | null> {
  // 先生成对骂内容（原有逻辑不变）
  const message = await this.strategy.generateTaunt(player, targetPlayer, fullContext);
  
  if (!message) {
    return null;
  }

  // 添加消息到聊天记录（原有逻辑）
  this.addMessage(message);

  // 如果启用QuarrelVoiceService且有目标玩家，使用它播放
  if (this.useQuarrelVoice && targetPlayer) {
    try {
      // 设置主吵架双方
      updateMainFightRoles([
        player.id.toString(),
        targetPlayer.id.toString()
      ]);

      // 使用QuarrelVoiceService播放
      await submitChatMessageToQuarrel(message, player, {
        priority: 'MAIN_FIGHT',
        civility: this.config.civilityLevel || 2,
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
      console.error('QuarrelVoiceService播放失败，回退到原有服务:', error);
      // 回退到原有的语音服务（如果有）
      // await this.playMessageWithOriginalService(message, player);
    }
  }

  return message;
}
```

## 步骤4：在 useChatBubbles 中集成（方案B：组件层集成）

### 4.1 使用 useQuarrelVoice Hook

```typescript
// 在 useChatBubbles.ts 中
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
          console.error('QuarrelVoiceService播放失败:', error);
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

## 步骤5：测试集成

### 5.1 基本测试

```typescript
// 测试对骂场景
async function testTaunt() {
  const player1 = gameState.players[0];
  const player2 = gameState.players[1];
  
  await chatService.triggerTaunt(player1, player2, undefined, gameState);
  
  // 应该听到两个玩家同时说话（如果都触发了）
}
```

### 5.2 检查服务状态

```typescript
const service = getQuarrelVoiceService();
const status = service.getStatus();
console.log('服务状态:', status);
console.log('正在播放:', service.getPlayingRoles());
console.log('队列长度:', service.getQueueLength());
```

## 步骤6：优化和调整

### 6.1 调整配置

```typescript
const service = getQuarrelVoiceService();
service.updateConfig({
  maxRetries: 3,           // 增加重试次数
  retryDelay: 1000,        // 增加重试延迟
  longTextThreshold: 50,   // 调整长文本阈值
});
```

### 6.2 监控性能

```typescript
// 定期检查队列长度
setInterval(() => {
  const queueLength = service.getQueueLength();
  if (queueLength > 10) {
    console.warn('队列积压，可能需要优化');
  }
}, 5000);
```

## 常见问题

### Q1: 没有听到声音

**检查清单：**
1. TTS服务是否可用？
2. `ttsAudioService` 是否已启用多声道？
3. 浏览器是否允许自动播放音频？
4. 检查控制台是否有错误

### Q2: 只有一个人说话

**可能原因：**
1. 并发限制设置为1（应该是2）
2. 两个话语的优先级不同
3. 第二个话语被队列阻塞

**解决方案：**
```typescript
// 确保并发设置为2
const service = getQuarrelVoiceService();
// 注意：DialogueScheduler的maxConcurrent在创建时设置，需要重新创建服务
```

### Q3: LLM生成segments失败

**这是正常的**，系统会自动回退到按标点符号分段。

### Q4: 如何禁用QuarrelVoiceService？

```typescript
// 在ChatService中
this.useQuarrelVoice = false;

// 或者在useChatBubbles中
const useQuarrel = false;  // 不使用QuarrelVoiceService
```

## 完整示例

参考 `src/services/chatServiceWithQuarrel.ts` 查看完整的集成示例。

---

**最后更新**：2025-01-25  
**状态**：✅ 逐步集成指南已完成


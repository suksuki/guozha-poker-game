# 游戏集成示例

## 概述

本文档展示如何在游戏主流程中集成 `QuarrelVoiceService`，实现"吵架王对轰"效果。

## 基本集成

### 1. 初始化服务

```typescript
import { getQuarrelVoiceService, updateMainFightRoles } from '../services/quarrelVoiceService';
import { Priority, Language } from '../audio/DialogueScheduler';

// 在游戏初始化时
const quarrelService = getQuarrelVoiceService();
await quarrelService.init();
```

### 2. 在游戏事件中触发语音

```typescript
// 示例：玩家出牌后触发对骂
async function onPlayerPlay(player: Player, play: Play) {
  // 检查是否有其他玩家想要对骂
  const otherPlayers = gameState.players.filter(p => p.id !== player.id);
  
  // 随机选择一个玩家进行对骂（示例）
  const targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
  
  // 设置主吵架双方
  updateMainFightRoles([player.id.toString(), targetPlayer.id.toString()]);
  
  // 生成对骂内容（使用LLM）
  const tauntText = await generateTauntText(player, targetPlayer, play);
  
  // 提交主吵架话语
  await quarrelService.submitUtter({
    roleId: player.id.toString(),
    text: tauntText,
    priority: 'MAIN_FIGHT',
    civility: 2,  // 根据游戏设置调整
    lang: 'zh',
    volume: 1.0,
    onStart: () => {
      console.log(`${player.name} 开始对骂`);
    },
    onEnd: () => {
      console.log(`${player.name} 对骂结束`);
    }
  });
  
  // 目标玩家可能回复
  if (Math.random() < 0.6) {  // 60%概率回复
    const replyText = await generateReplyText(targetPlayer, player, tauntText);
    await quarrelService.submitUtter({
      roleId: targetPlayer.id.toString(),
      text: replyText,
      priority: 'MAIN_FIGHT',
      civility: 2,
      lang: 'zh',
      volume: 1.0
    });
  }
}
```

### 3. 短插一句（QUICK_JAB）

```typescript
// 其他玩家可以短插一句
async function onOtherPlayerInterrupt(interruptingPlayer: Player) {
  const quickJabText = await generateQuickJab(interruptingPlayer);
  
  await quarrelService.submitUtter({
    roleId: interruptingPlayer.id.toString(),
    text: quickJabText,  // 会自动检查时长，超过1.5s会截断
    priority: 'QUICK_JAB',
    civility: 1,
    lang: 'zh',
    volume: 0.8  // 稍低音量
  });
}
```

### 4. 长吵架自动分段

```typescript
// 如果生成的文本超过40字，会自动分段播放
async function onLongQuarrel(player: Player, longText: string) {
  // QuarrelVoiceService会自动检测长文本并分段
  await quarrelService.submitUtter({
    roleId: player.id.toString(),
    text: longText,  // 超过40字会自动分段
    priority: 'MAIN_FIGHT',
    civility: 3,
    lang: 'zh',
    volume: 1.0
  });
  
  // 分段播放过程中，其他玩家可以插入QUICK_JAB
}
```

## 与现有ChatService集成

### 方案1：替换现有语音播放

```typescript
// 在 chatService.ts 中
import { getQuarrelVoiceService } from '../services/quarrelVoiceService';

class ChatService {
  private quarrelService = getQuarrelVoiceService();
  
  async triggerTaunt(player: Player, targetPlayer: Player) {
    // 生成对骂内容
    const message = await this.strategy.generateTaunt(player, { targetPlayer });
    
    // 使用QuarrelVoiceService播放
    await this.quarrelService.submitUtter({
      roleId: player.id.toString(),
      text: message.content,
      priority: 'MAIN_FIGHT',
      civility: this.config.civilityLevel || 2,
      lang: this.detectLanguage(message.content),
      volume: 1.0
    });
    
    // 同时保存消息到聊天记录
    this.addMessage(message);
  }
}
```

### 方案2：并行使用（保留原有语音服务）

```typescript
// 在需要"吵架王"效果时使用QuarrelVoiceService
// 在普通聊天时使用原有的multiChannelVoiceService

async function handleChatMessage(message: ChatMessage) {
  // 判断是否是"吵架"场景
  if (isQuarrelScene(message)) {
    // 使用QuarrelVoiceService
    await quarrelService.submitUtter({
      roleId: message.playerId.toString(),
      text: message.content,
      priority: determinePriority(message),
      civility: message.civility || 2,
      lang: detectLanguage(message.content),
      volume: 1.0
    });
  } else {
    // 使用原有的语音服务
    await multiChannelVoiceService.speak(
      message.content,
      message.voiceConfig,
      getPlayerChannel(message.playerId)
    );
  }
}
```

## 完整示例：对骂场景

```typescript
import { getQuarrelVoiceService, updateMainFightRoles } from '../services/quarrelVoiceService';
import { Priority } from '../audio/DialogueScheduler';

async function handleQuarrelScene(
  player1: Player,
  player2: Player,
  triggerEvent: string
) {
  const service = getQuarrelVoiceService();
  
  // 1. 设置主吵架双方
  updateMainFightRoles([player1.id.toString(), player2.id.toString()]);
  
  // 2. 生成对骂内容
  const player1Text = await generateQuarrelText(player1, player2, triggerEvent);
  const player2Text = await generateQuarrelText(player2, player1, triggerEvent);
  
  // 3. 同时提交（会按优先级和并发限制播放）
  await Promise.all([
    service.submitUtter({
      roleId: player1.id.toString(),
      text: player1Text,
      priority: 'MAIN_FIGHT',
      civility: 3,
      lang: 'zh',
      volume: 1.0
    }),
    service.submitUtter({
      roleId: player2.id.toString(),
      text: player2Text,
      priority: 'MAIN_FIGHT',
      civility: 3,
      lang: 'zh',
      volume: 1.0
    })
  ]);
  
  // 4. 其他玩家可能短插一句
  const otherPlayers = gameState.players.filter(
    p => p.id !== player1.id && p.id !== player2.id
  );
  
  for (const otherPlayer of otherPlayers) {
    if (Math.random() < 0.3) {  // 30%概率插话
      const quickJab = await generateQuickJab(otherPlayer, player1, player2);
      await service.submitUtter({
        roleId: otherPlayer.id.toString(),
        text: quickJab,
        priority: 'QUICK_JAB',
        civility: 1,
        lang: 'zh',
        volume: 0.8
      });
    }
  }
}
```

## 配置选项

### 文明等级控制

```typescript
// 根据游戏设置调整文明等级
const civilityLevel = gameSettings.civilityLevel || 2;

await quarrelService.submitUtter({
  roleId: player.id.toString(),
  text: message,
  priority: 'MAIN_FIGHT',
  civility: civilityLevel,  // 0-4
  lang: 'zh',
  volume: 1.0
});
```

### 语言支持

```typescript
// 支持多语言
const lang = i18n.language.startsWith('zh') ? 'zh' : 
             i18n.language.startsWith('ja') ? 'ja' :
             i18n.language.startsWith('ko') ? 'ko' : 'zh';

await quarrelService.submitUtter({
  roleId: player.id.toString(),
  text: message,
  priority: 'MAIN_FIGHT',
  civility: 2,
  lang: lang as Language,
  volume: 1.0
});
```

### 南昌话支持

```typescript
// 如果玩家设置了南昌话
if (player.voiceConfig?.dialect === 'nanchang') {
  // 先转换为南昌话文本
  const nanchangText = convertToNanchang(message);
  
  await quarrelService.submitUtter({
    roleId: player.id.toString(),
    text: nanchangText,
    priority: 'MAIN_FIGHT',
    civility: 2,
    lang: 'nanchang',
    volume: 1.0
  });
}
```

## 注意事项

1. **并发限制**：最多同时播放2个角色，其他会进入队列
2. **QUICK_JAB时长**：超过1.5秒会自动截断
3. **长文本分段**：超过40字会自动分段，每段可独立播放
4. **主吵架pan值**：只有前2个主吵架角色会获得 -0.35 和 +0.35 的pan值
5. **LLM依赖**：长吵架分段需要LLM服务可用，否则会回退到按标点符号分段

## 性能优化建议

1. **预生成音频**：对于常用台词，可以预先生成音频缓存
2. **批量提交**：可以批量提交多个话语，DialogueScheduler会自动调度
3. **优先级管理**：合理使用优先级，避免低优先级话语阻塞高优先级
4. **错误处理**：确保有错误处理，避免单个话语失败影响整体流程


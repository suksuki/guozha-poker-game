# CHAT系统重构计划（简化版）

## 📋 重构目标

### 核心原则
1. **CHAT和VOICE完全分离** - ChatService不再直接调用语音
2. **组件直接调用语音系统** - 显示当前牌的组件直接调用VoiceService
3. **直接替换，不保留旧接口** - 彻底移除耦合代码
4. **简化设计** - 不需要复杂的消息类型系统

---

## 🎯 重构方案

### 1. 移除ChatService中的语音耦合

#### 1.1 修改 `chatService.ts`
- ❌ 移除 `import { speakText } from './voiceService'`
- ❌ 移除 `playChatVoice()` 方法
- ✅ 聊天消息生成后，不自动播放语音
- ✅ 返回消息，由调用方决定是否播放语音

#### 1.2 更新所有触发聊天的方法
```typescript
// 旧代码
async triggerRandomChat(player: Player, probability?: number): Promise<ChatMessage | null> {
  const message = await this.strategy.generateRandomChat(player);
  if (message) {
    this.addMessage(message);
    await this.playChatVoice(message.content, player); // ❌ 移除
  }
  return message;
}

// 新代码
async triggerRandomChat(player: Player, probability?: number): Promise<ChatMessage | null> {
  const message = await this.strategy.generateRandomChat(player);
  if (message) {
    this.addMessage(message);
    // 不再自动播放语音，由调用方决定
  }
  return message;
}
```

---

### 2. 组件直接调用语音系统

#### 2.1 修改 `useChatBubbles.ts`
```typescript
// 监听聊天消息，如果需要播放语音，直接调用voiceService
useEffect(() => {
  const messages = getChatMessages();
  if (messages.length > 0) {
    const latestMessage = messages[messages.length - 1];
    
    // 显示气泡
    setActiveChatBubbles(prev => {
      const newMap = new Map(prev);
      newMap.set(latestMessage.playerId, latestMessage);
      return newMap;
    });
    
    // 如果需要播放语音，直接调用voiceService
    if (config.enableVoice) {
      const player = gameState.players.find(p => p.id === latestMessage.playerId);
      if (player?.voiceConfig) {
        voiceService.speak(latestMessage.content, player.voiceConfig);
      }
    }
  }
}, [gameState.players, gameState.currentPlayerIndex]);
```

#### 2.2 报牌组件直接调用语音
```typescript
// 在显示当前牌的组件中
import { voiceService } from '../services/voiceService';
import { playToSpeechText } from '../utils/speechUtils';

// 当需要报牌时
const announcePlay = (play: Play, player: Player) => {
  const text = playToSpeechText(play);
  voiceService.speak(text, player.voiceConfig);
};
```

---

### 3. 清理旧代码

#### 3.1 移除 `speechUtils.ts` 中的废弃函数
- 保留 `playToSpeechText()` - 工具函数，仍有用
- 移除或标记废弃 `speakPlay()` 和 `speakPass()` - 由组件直接调用voiceService替代

#### 3.2 更新所有调用方
- `useMultiPlayerGame.ts` 中的 `speakPlay()` 调用 → 直接调用 `voiceService.speak()`
- `useMultiPlayerGame.ts` 中的 `speakPass()` 调用 → 直接调用 `voiceService.speak('要不起', ...)`

---

## 📦 重构步骤

### 步骤1: 移除ChatService中的语音耦合
1. 移除 `chatService.ts` 中的 `speakText` 导入
2. 移除 `playChatVoice()` 方法
3. 更新所有触发方法，移除语音播放调用

### 步骤2: 更新组件调用语音
1. 修改 `useChatBubbles.ts`，添加语音播放逻辑
2. 修改 `useMultiPlayerGame.ts`，直接调用 `voiceService.speak()`
3. 更新其他需要语音的地方

### 步骤3: 清理工具函数
1. 更新 `speechUtils.ts`，移除或标记废弃 `speakPlay`/`speakPass`
2. 保留 `playToSpeechText` 作为工具函数

### 步骤4: 测试验证
1. 运行测试确保功能正常
2. 验证聊天消息显示正常
3. 验证语音播放正常

---

## 📁 文件修改清单

### 需要修改的文件
1. `src/services/chatService.ts` - 移除语音耦合
2. `src/hooks/useChatBubbles.ts` - 添加语音播放逻辑
3. `src/hooks/useMultiPlayerGame.ts` - 直接调用voiceService
4. `src/utils/speechUtils.ts` - 清理废弃函数

### 保持不变的文件
1. `src/services/voiceService.ts` - 保持不变
2. `src/types/chat.ts` - 保持不变（暂时）

---

## ✅ 重构后的架构

```
ChatService
  └── 只负责生成和管理聊天消息
      └── 不涉及语音

VoiceService
  └── 负责所有语音播放
      └── 被组件直接调用

组件层
  ├── useChatBubbles - 监听聊天消息，决定是否播放语音
  ├── 显示当前牌的组件 - 直接调用voiceService报牌
  └── useMultiPlayerGame - 直接调用voiceService报牌/要不起
```

---

## 🎯 优势

1. **职责清晰**: ChatService只负责聊天，VoiceService只负责语音
2. **灵活控制**: 组件可以根据需要决定是否播放语音
3. **简单直接**: 不需要复杂的消息类型系统
4. **易于维护**: 代码结构清晰，易于理解和修改

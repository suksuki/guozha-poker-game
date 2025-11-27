# 聊天系统实现指南

> 本文档由以下文档合并而成：
- `docs/features/CHAT_SYSTEM.md`
- `docs/features/CHAT_SYSTEM_REFACTOR_PLAN.md`
- `docs/features/CHAT_BUBBLE_SYNC_IMPLEMENTATION.md`
- `docs/features/CHAT_PERFORMANCE_OPTIMIZATION.md`
- `docs/features/CHAT_QUEUE_OPTIMIZATION.md`

---

## 来源: CHAT_SYSTEM.md

## 相关文档

- [聊天气泡同步实现](../features/CHAT_BUBBLE_SYNC_IMPLEMENTATION.md)
- [聊天性能优化](../features/CHAT_PERFORMANCE_OPTIMIZATION.md)
- [聊天队列优化](../features/CHAT_QUEUE_OPTIMIZATION.md)
- [聊天系统重构计划](../features/CHAT_SYSTEM_REFACTOR_PLAN.md)
- [LLM请求队列优化](../features/LLM_REQUEST_QUEUE_OPTIMIZATION.md)

## 概述

聊天系统支持：
- LLM生成智能聊天内容
- 多声道语音播放
- 聊天气泡同步显示
- 方言支持



---

## 来源: CHAT_SYSTEM_REFACTOR_PLAN.md

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


---

## 来源: CHAT_BUBBLE_SYNC_IMPLEMENTATION.md

## 📋 实现概述

实现了文字气泡与语音播放的完全同步，确保：
- ✅ 文字气泡和语音同时开始显示/播放
- ✅ 文字气泡在语音播放完成后自动消失
- ✅ 支持播放中动画效果
- ✅ 完善的错误处理和超时保护

---

## 🏗️ 架构设计

### 数据流

```
聊天消息生成
  ↓
useChatBubbles Hook 接收消息
  ↓
显示气泡（初始状态：等待语音）
  ↓
调用 voiceService.speak（传入事件回调）
  ↓
multiChannelVoiceService 播放语音
  ├─> onStart 事件 → 更新 speakingStates → 气泡显示播放指示器
  ├─> 播放中 → 气泡保持显示 + 脉冲动画
  └─> onEnd 事件 → 更新 speakingStates → 气泡开始淡出 → 隐藏
```

---

## 📦 核心组件

### 1. 语音服务扩展

**文件：** `src/services/voiceService.ts`

**新增接口：**
```typescript
interface SpeechPlaybackEvents {
  onStart?: () => void;      // 语音开始播放
  onEnd?: () => void;        // 语音播放完成
  onError?: (error: Error) => void;  // 播放出错
  estimatedDuration?: number; // 预估播放时长（毫秒，只读）
}
```

**关键方法：**
- `speak(text, voiceConfig, priority, playerId, events)` - 支持事件回调
- `calculateDuration(text, voiceConfig)` - 计算预估播放时长

### 2. 多声道服务扩展

**文件：** `src/services/multiChannelVoiceService.ts`

**增强功能：**
- 支持事件回调参数
- 在 `utterance.onstart` 中触发 `onStart`
- 在 `utterance.onend` 中触发 `onEnd`
- 在 `utterance.onerror` 中触发 `onError`
- 处理语音被中断的情况

### 3. 聊天气泡组件增强

**文件：** `src/components/ChatBubble.tsx`

**新增属性：**
- `isSpeaking?: boolean` - 是否正在播放语音
- `onSpeechStart?: () => void` - 语音开始回调
- `onSpeechEnd?: () => void` - 语音结束回调

**功能：**
- 初始立即显示气泡（等待语音开始）
- 根据 `isSpeaking` 状态显示/隐藏播放指示器
- 播放中显示脉冲动画
- 语音结束后开始淡出动画
- 10秒超时保护机制

### 4. useChatBubbles Hook 协调

**文件：** `src/hooks/useChatBubbles.ts`

**新增状态：**
- `speakingStates: Map<number, boolean>` - 跟踪每个玩家的播放状态

**功能：**
- 监听聊天消息
- 调用语音服务并传入事件回调
- 在 `onStart` 中设置 `speakingStates[playerId] = true`
- 在 `onEnd` 中设置 `speakingStates[playerId] = false`
- 错误处理和超时保护

### 5. CSS 动画

**文件：** `src/components/ChatBubble.css`

**新增动画：**
- `.speaking` - 脉冲动画（1.5秒循环）
- `.speaking-indicator` - 播放指示器弹跳动画
- 增强的阴影效果（播放中）

---

## 🔄 同步流程详解

### 场景：玩家0说"好牌！"

```
1. 聊天消息生成
   ChatMessage {
     playerId: 0,
     content: "好牌！",
     type: 'event'
   }

2. useChatBubbles 接收消息
   ├─> 显示气泡（activeChatBubbles.set(0, message)）
   └─> 调用 voiceService.speak(..., events)

3. 语音服务处理
   ├─> 计算预估时长（约 300ms）
   └─> 调用 multiChannelVoiceService.speak(..., events)

4. 多声道服务播放
   ├─> 创建 SpeechSynthesisUtterance
   ├─> 设置 utterance.onstart → 触发 events.onStart
   ├─> 设置 utterance.onend → 触发 events.onEnd
   └─> window.speechSynthesis.speak(utterance)

5. 事件回调触发
   ├─> onStart() → speakingStates.set(0, true)
   │   └─> ChatBubble 检测到 isSpeaking=true
   │       └─> 显示播放指示器 🔊 + 脉冲动画
   │
   ├─> 播放中（约 300ms）
   │   └─> 气泡保持显示 + 动画效果
   │
   └─> onEnd() → speakingStates.set(0, false)
       └─> ChatBubble 检测到 isSpeaking=false
           ├─> 移除播放指示器
           ├─> 开始淡出动画（1秒）
           └─> 淡出完成后隐藏气泡
```

---

## 🛡️ 错误处理和保护机制

### 1. 语音播放失败

**处理方式：**
- `onError` 回调触发
- 3秒后自动设置 `speakingStates[playerId] = false`
- 气泡自动淡出并隐藏

### 2. 超时保护

**处理方式：**
- 如果10秒后还没有结束，自动隐藏气泡
- 防止气泡永久显示

### 3. 语音被中断

**处理方式：**
- 检查 `utterance.__interrupted` 标志
- 被中断的语音不触发 `onEnd` 事件
- 避免状态不一致

---

## 🧪 测试

### 单元测试

**文件：** `tests/chatBubbleSync.test.ts`

**测试用例：**
1. ✅ 应该在语音开始时显示气泡和播放指示器
2. ✅ 应该在语音结束时开始淡出
3. ✅ 应该在播放中显示 speaking 类名和播放指示器
4. ✅ 应该在没有语音时使用超时保护机制

### 快速回归测试

**文件：** `tests/chatBubbleSyncRegression.test.ts`

**测试用例：**
1. ✅ 应该同步显示气泡和播放语音
2. ✅ 应该在语音播放完成时更新状态
3. ✅ 应该在语音播放失败时使用超时保护
4. ✅ 应该处理多个玩家的同步播放

### 运行测试

```bash
# 运行同步测试（实时显示进度）
npm test -- chatBubbleSync.test.ts --run --reporter=verbose

# 运行回归测试（实时显示进度）
npm test -- chatBubbleSyncRegression.test.ts --run --reporter=verbose

# 运行所有测试（实时显示进度）
npm run test:realtime
```

---

## 📝 使用示例

### 基本使用

```typescript
// useChatBubbles Hook 自动处理同步
const chatBubbles = useChatBubbles(gameState);

// 返回的状态
{
  activeChatBubbles: Map<number, ChatMessage>,  // 活跃的气泡
  speakingStates: Map<number, boolean>,          // 播放状态
  removeChatBubble: (playerId: number) => void,
  getPlayerBubblePosition: (playerId: number) => React.CSSProperties
}

// 在组件中使用
<ChatBubblesContainer
  activeChatBubbles={chatBubbles.activeChatBubbles}
  speakingStates={chatBubbles.speakingStates}
  getPlayerBubblePosition={chatBubbles.getPlayerBubblePosition}
  onBubbleComplete={chatBubbles.removeChatBubble}
/>
```

### 手动调用语音服务（带事件回调）

```typescript
import { voiceService, SpeechPlaybackEvents } from './services/voiceService';

const events: SpeechPlaybackEvents = {
  onStart: () => {
    console.log('语音开始播放');
    // 更新UI状态
  },
  onEnd: () => {
    console.log('语音播放完成');
    // 更新UI状态
  },
  onError: (error) => {
    console.error('播放失败:', error);
    // 错误处理
  }
};

await voiceService.speak(
  '好牌！',
  voiceConfig,
  0,
  playerId,
  events
);

// events.estimatedDuration 会被自动设置
console.log('预估时长:', events.estimatedDuration, 'ms');
```

---

## 🎨 视觉效果

### 播放中状态

- **脉冲动画**：气泡轻微放大缩小（1.5秒循环）
- **播放指示器**：🔊 图标弹跳动画
- **增强阴影**：更明显的阴影效果

### 淡出动画

- **淡出时间**：1秒
- **动画效果**：透明度从1到0，同时向上移动10px

---

## ⚙️ 配置选项

### 超时时间

可以在 `ChatBubble.tsx` 中调整：

```typescript
// 超时保护时间（毫秒）
const TIMEOUT_DURATION = 10000; // 10秒

// 淡出动画时间（毫秒）
const FADE_OUT_DURATION = 1000; // 1秒
```

### 语音时长计算

可以在 `voiceService.ts` 中调整：

```typescript
// 中文：约0.3秒/字
const charsPerSecond = isChinese ? 3.3 : 6.7;
```

---

## 🔍 调试技巧

### 1. 查看播放状态

```typescript
// 在浏览器控制台
const chatBubbles = window.gameState?.chatBubbles;
console.log('播放状态:', chatBubbles?.speakingStates);
```

### 2. 查看事件回调

```typescript
// 在 voiceService.speak 调用时添加日志
voiceService.speak(text, config, 0, playerId, {
  onStart: () => console.log('[DEBUG] 语音开始:', text),
  onEnd: () => console.log('[DEBUG] 语音结束:', text),
  onError: (err) => console.error('[DEBUG] 播放失败:', err)
});
```

### 3. 检查气泡状态

```typescript
// 在 ChatBubble 组件中添加日志
useEffect(() => {
  console.log('[ChatBubble] 状态变化:', {
    isSpeaking,
    speaking,
    visible,
    fadeOut
  });
}, [isSpeaking, speaking, visible, fadeOut]);
```

---

## ✅ 完成清单

- [x] 扩展语音服务，添加播放事件回调
- [x] 增强聊天气泡组件，支持播放状态
- [x] 更新 useChatBubbles Hook，协调显示和播放
- [x] 添加 CSS 动画效果
- [x] 编写单元测试
- [x] 编写快速回归测试
- [x] 优化错误处理
- [x] 添加超时保护机制
- [x] 处理语音中断情况
- [x] 优化状态同步逻辑

---

## 🚀 后续优化建议

1. **性能优化**
   - 考虑使用 `useMemo` 优化状态计算
   - 考虑使用 `useCallback` 优化回调函数

2. **功能增强**
   - 支持语音播放进度显示
   - 支持暂停/恢复播放
   - 支持音量控制

3. **用户体验**
   - 支持自定义动画时长
   - 支持自定义播放指示器样式
   - 支持多语言播放指示器文本



---

## 来源: CHAT_PERFORMANCE_OPTIMIZATION.md

## 🔧 优化内容

### 1. LLM调用优化

**问题**：密集聊天时，大量LLM请求导致超时和阻塞。

**解决方案**：
- ✅ **南昌话转换超时缩短**：从60秒降到5秒
- ✅ **并发限制**：最多同时2个LLM转换请求
- ✅ **快速回退**：超时或失败时立即使用映射表，不等待

**修改文件**：
- `src/utils/nanchangDialectMapper.ts`

### 2. 气泡清理优化

**问题**：气泡显示很多，要过很久才消除。

**解决方案**：
- ✅ **缩短超时时间**：
  - 未开始播放：5秒后自动隐藏（从10秒降到5秒）
  - 未结束播放：8秒后自动隐藏（从10秒降到8秒）
- ✅ **失败立即隐藏**：语音播放失败时立即隐藏，不等待
- ✅ **无语音配置**：2秒后自动隐藏（从3秒降到2秒）

**修改文件**：
- `src/components/ChatBubble.tsx`
- `src/hooks/useChatBubbles.ts`

## 📊 优化效果

### LLM调用

**之前**：
- 超时时间：60秒
- 无并发限制
- 超时后等待60秒才回退

**现在**：
- 超时时间：5秒（南昌话转换）
- 并发限制：最多2个同时请求
- 超时后立即回退到映射表

### 气泡显示

**之前**：
- 未开始播放：10秒后隐藏
- 未结束播放：10秒后隐藏
- 播放失败：3秒后隐藏
- 无语音配置：3秒后隐藏

**现在**：
- 未开始播放：5秒后隐藏
- 未结束播放：8秒后隐藏
- 播放失败：立即隐藏
- 无语音配置：2秒后隐藏

## 🎯 性能提升

1. **响应速度**：气泡更快消失，界面更流畅
2. **资源占用**：减少LLM请求数量，降低服务器压力
3. **用户体验**：避免气泡堆积，界面更清爽

## 🔍 调试

### 查看LLM转换状态

```
[NanchangDialectMapper] LLM转换队列已满，快速回退到映射表
[NanchangDialectMapper] LLM转换超时（5秒），快速回退到映射表
```

### 查看气泡清理

```
[ChatBubble] 5秒内未开始播放，自动隐藏
[ChatBubble] 8秒内未结束播放，自动隐藏
```

## ⚙️ 配置参数

### LLM转换并发限制

在 `src/utils/nanchangDialectMapper.ts` 中：

```typescript
const MAX_CONCURRENT_LLM_CONVERSIONS = 2; // 最多同时2个LLM转换请求
```

### 超时时间

```typescript
// 南昌话转换超时（5秒）
setTimeout(() => controller.abort(), 5000);

// 气泡未开始播放超时（5秒）
setTimeout(() => { ... }, 5000);

// 气泡未结束播放超时（8秒）
setTimeout(() => { ... }, 8000);
```

## 🚀 未来优化建议

1. **请求去重**：相同文本的转换请求只发送一次
2. **智能队列**：根据优先级调整请求顺序
3. **批量转换**：将多个转换请求合并为一次调用
4. **本地缓存**：持久化缓存转换结果

---

**更新日期**：2024-12-19



---

## 来源: CHAT_QUEUE_OPTIMIZATION.md

## 🔧 修复内容

### 1. 队列阻塞问题

**问题**：聊天消息太多时，队列会堆积，导致阻塞。

**解决方案**：
- ✅ 降低队列最大长度：从 100 降到 20
- ✅ 添加队列溢出保护：超过限制时自动丢弃最旧的消息
- ✅ 添加详细日志：显示队列长度和溢出警告

**修改文件**：
- `src/config/voiceConfig.ts` - 降低 `maxQueueSize` 到 20
- `src/services/multiChannelVoiceService.ts` - 添加队列溢出保护

### 2. 气泡位置问题

**问题**：人类玩家的聊天气泡位置在底部中央（`bottom: 200px`），会挡住手牌和出牌按钮。

**解决方案**：
- ✅ 调整人类玩家气泡位置：从底部中央改为底部左侧
- ✅ 减小气泡最大宽度：从 400px 降到 300px
- ✅ 新位置：`bottom: 450px, left: 10%`（避免挡住手牌区域）

**修改文件**：
- `src/hooks/useChatBubbles.ts` - 调整人类玩家气泡位置
- `src/components/ChatBubble.css` - 减小气泡最大宽度

## 📊 配置参数

### 队列配置

```typescript
// src/config/voiceConfig.ts
export const DEFAULT_VOICE_SERVICE_CONFIG: VoiceServiceConfig = {
  maxQueueSize: 20, // 队列最大长度（从100降到20）
  deduplicationWindow: 2000, // 去重时间窗口（2秒）
  defaultTimeout: 5000 // 默认超时时间（5秒）
};
```

### 气泡位置

```typescript
// src/hooks/useChatBubbles.ts
if (isHuman) {
  // 人类玩家在底部左侧，避免挡住手牌和出牌按钮
  return { bottom: '450px', left: '10%', transform: 'translateX(0)' };
}
```

## 🎯 效果

### 队列管理

- ✅ **防止阻塞**：队列长度限制为20，超过时自动丢弃旧消息
- ✅ **实时监控**：日志显示队列长度和溢出警告
- ✅ **优雅降级**：队列满时丢弃旧消息，而不是阻塞新消息

### 气泡显示

- ✅ **不挡住手牌**：人类玩家气泡显示在左侧，不会挡住手牌区域
- ✅ **不挡住按钮**：气泡位置在手牌上方，不会挡住出牌按钮
- ✅ **更紧凑**：减小气泡宽度，减少占用空间

## 🔍 调试

### 查看队列状态

在浏览器控制台查看日志：

```
[玩家0（左）] 加入全局队列（队列长度: 15/20）: 好牌！
[玩家1（右）] ⚠️ 队列已满，丢弃旧消息: 要不起
```

### 调整队列长度

如果需要调整队列长度，修改 `src/config/voiceConfig.ts`：

```typescript
maxQueueSize: 30, // 增加到30（如果消息很多）
// 或
maxQueueSize: 10, // 减少到10（如果希望更严格）
```

### 调整气泡位置

如果需要调整人类玩家气泡位置，修改 `src/hooks/useChatBubbles.ts`：

```typescript
// 更靠左
return { bottom: '450px', left: '5%', transform: 'translateX(0)' };

// 更靠右
return { bottom: '450px', left: '15%', transform: 'translateX(0)' };

// 更高（更远离手牌）
return { bottom: '500px', left: '10%', transform: 'translateX(0)' };
```

## ⚠️ 注意事项

1. **队列溢出**：当队列满时，最旧的消息会被丢弃。这是预期行为，避免阻塞。
2. **气泡位置**：如果手牌区域高度变化，可能需要调整 `bottom` 值。
3. **响应式**：气泡位置是固定的，在不同屏幕尺寸下可能需要调整。

---

**更新日期**：2024-12-19



---


# 聊天气泡与语音同步实现文档

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


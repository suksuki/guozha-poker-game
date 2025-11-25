# 聊天队列优化

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


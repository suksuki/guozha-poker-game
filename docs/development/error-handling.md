# 错误处理和重试机制

## 概述

`QuarrelVoiceService` 实现了完善的错误处理和重试机制，确保在各种异常情况下仍能正常工作。

## 重试机制

### 配置

```typescript
const RETRY_CONFIG = {
  maxRetries: 2,      // 最大重试次数
  retryDelay: 500,    // 重试延迟（毫秒）
};
```

### 应用场景

1. **播放失败重试**
   - 当 `ttsAudioService.speak()` 失败时，会自动重试
   - 最多重试2次，每次间隔500ms

2. **LLM生成segments失败重试**
   - 当LLM生成segments失败时，会自动重试
   - 最多重试2次，每次间隔500ms
   - 如果重试后仍失败，会回退到按标点符号分段

### 实现细节

```typescript
// 播放重试
private async playUtterWithRetry(utter: Utter, retryCount: number = 0): Promise<void> {
  try {
    await this.playUtter(utter);
  } catch (error) {
    if (retryCount >= this.retryConfig.maxRetries) {
      throw error;  // 最后一次重试失败，抛出错误
    }
    await delay(this.retryConfig.retryDelay);
    return this.playUtterWithRetry(utter, retryCount + 1);
  }
}

// LLM生成重试
private async generateSegmentsWithLLM(
  ...,
  retryCount: number = 0
): Promise<string[] | null> {
  try {
    // ... LLM调用
  } catch (error) {
    if (retryCount >= this.retryConfig.maxRetries) {
      return null;  // 最后一次重试失败，返回null触发回退
    }
    await delay(this.retryConfig.retryDelay);
    return this.generateSegmentsWithLLM(..., retryCount + 1);
  }
}
```

## 回退机制

### 多层回退策略

1. **长吵架分段回退**
   ```
   LLM生成segments
     ↓ (失败)
   按标点符号分段
     ↓ (失败)
   直接播放原文本
   ```

2. **播放失败回退**
   - 如果 `QuarrelVoiceService` 播放失败，可以回退到原有的 `multiChannelVoiceService`
   - 在 `ChatService` 中实现

### 实现示例

```typescript
// 在ChatService中
async triggerTaunt(...) {
  try {
    // 使用QuarrelVoiceService
    await submitChatMessageToQuarrel(message, player);
  } catch (error) {
    console.error('QuarrelVoiceService播放失败，回退到原有服务:', error);
    // 回退到原有的语音服务
    await this.playMessageWithOriginalService(message, player);
  }
}
```

## 错误处理

### 错误类型

1. **TTS服务不可用**
   - 错误：`TTS服务音频生成失败`
   - 处理：抛出错误，触发重试或回退

2. **LLM服务不可用**
   - 错误：`LLM策略不可用` 或 `LLM返回空响应`
   - 处理：回退到按标点符号分段

3. **音频播放失败**
   - 错误：`播放失败`
   - 处理：触发重试机制

4. **空文本或无效文本**
   - 错误：文本为空或格式错误
   - 处理：跳过播放，记录警告

### 错误日志

所有错误都会记录到控制台，包含：
- 错误类型
- 错误消息
- 重试次数（如果适用）
- 上下文信息

```typescript
console.error('[QuarrelVoiceService] 播放失败:', error);
console.warn(`[QuarrelVoiceService] 播放失败，${delay}ms后重试 (${retryCount + 1}/${maxRetries}):`, error);
```

## 配置重试参数

### 动态配置

```typescript
const service = getQuarrelVoiceService();
service.updateConfig({
  maxRetries: 3,      // 增加重试次数
  retryDelay: 1000,   // 增加重试延迟
});
```

### 获取当前配置

```typescript
const config = service.getConfig();
console.log('当前重试配置:', {
  maxRetries: config.maxRetries,
  retryDelay: config.retryDelay,
});
```

## 最佳实践

### 1. 始终提供回退方案

```typescript
try {
  await quarrelService.submitUtter(utter);
} catch (error) {
  // 回退到原有服务
  await fallbackVoiceService.speak(text);
}
```

### 2. 监听错误事件

```typescript
await service.submitUtter({
  ...utter,
  onError: (error) => {
    console.error('播放失败:', error);
    // 执行错误处理逻辑
    handlePlaybackError(error);
  }
});
```

### 3. 检查服务状态

```typescript
const status = service.getStatus();
if (!status.initialized) {
  await service.init();
}
if (!status.hasLLM) {
  console.warn('LLM不可用，将使用回退方案');
}
```

### 4. 合理设置重试参数

```typescript
// 对于关键场景，增加重试次数
service.updateConfig({
  maxRetries: 3,
  retryDelay: 1000,
});

// 对于非关键场景，减少重试次数
service.updateConfig({
  maxRetries: 1,
  retryDelay: 300,
});
```

## 测试错误处理

参考 `docs/examples/test-quarrel-voice.ts` 中的 `testErrorHandling` 函数。

```typescript
// 测试空文本
await service.submitUtter({
  roleId: 'test_player_1',
  text: '',
  priority: 'NORMAL_CHAT',
  civility: 1,
  lang: 'zh',
  volume: 1.0,
});

// 测试停止功能
await service.submitUtter({...});
setTimeout(() => {
  service.stopRole('test_player_1');
}, 100);
```

## 监控和调试

### 启用详细日志

```typescript
// 在开发环境中启用详细日志
if (process.env.NODE_ENV === 'development') {
  // 所有错误和警告都会输出到控制台
}
```

### 状态监控

```typescript
// 定期检查服务状态
setInterval(() => {
  const status = service.getStatus();
  console.log('服务状态:', status);
  
  if (status.queueLength > 10) {
    console.warn('队列积压，可能需要优化');
  }
}, 5000);
```

---

**最后更新**：2025-01-25  
**状态**：✅ 错误处理和重试机制已实现


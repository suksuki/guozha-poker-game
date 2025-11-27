# 多声道配置指南

## 概述

本文档介绍如何配置多声道语音播放功能，包括启用/禁用多声道、选择TTS服务商、调整并发数等。

## 快速配置

### 基本配置

```typescript
import { multiChannelVoiceService } from './services/multiChannelVoiceService';
import { DEFAULT_MULTI_CHANNEL_CONFIG } from './config/voiceConfig';

// 更新多声道配置
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,  // 启用多声道
  maxConcurrentSpeakers: 2,  // 最多2个同时播放
  useTTS: true,  // 使用TTS API服务
  ttsProvider: 'auto',  // 自动选择最佳TTS服务商
});
```

## 配置选项详解

### 1. 启用/禁用多声道

```typescript
// 启用多声道
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true
});

// 禁用多声道（回退到串行播放）
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: false
});
```

### 2. 选择TTS服务商

```typescript
// 自动选择（推荐）
multiChannelVoiceService.updateMultiChannelConfig({
  ttsProvider: 'auto'  // 自动选择最佳可用的TTS服务商
});

// 指定TTS服务商
multiChannelVoiceService.updateMultiChannelConfig({
  ttsProvider: 'gpt_sovits'  // 使用GPT-SoVITS
});

// 可用的TTS服务商：
// - 'auto': 自动选择（默认）
// - 'gpt_sovits': GPT-SoVITS（优先级最高）
// - 'coqui': Coqui TTS
// - 'edge': Edge TTS
// - 'local': 本地TTS API
// - 'browser': 浏览器TTS（不推荐，单声道）
```

### 3. 调整并发数

```typescript
// 最多2个同时播放（默认，推荐）
multiChannelVoiceService.updateMultiChannelConfig({
  maxConcurrentSpeakers: 2
});

// 最多3个同时播放（更激烈）
multiChannelVoiceService.updateMultiChannelConfig({
  maxConcurrentSpeakers: 3
});
```

### 4. Ducking配置

Ducking功能：当某个角色说话时，自动降低其他角色的音量，让主要对话更清晰。

```typescript
// 启用ducking（默认启用）
multiChannelVoiceService.updateMultiChannelConfig({
  enableDucking: true,
  duckingLevel: 0.25  // 其他角色音量降低到25%
});

// 禁用ducking
multiChannelVoiceService.updateMultiChannelConfig({
  enableDucking: false
});

// 调整ducking级别（0-1）
// 0.2: 其他角色音量降低到20%（更明显）
// 0.25: 其他角色音量降低到25%（默认）
// 0.35: 其他角色音量降低到35%（较轻微）
```

### 5. 音频缓存配置

```typescript
// 启用缓存（默认启用，推荐）
multiChannelVoiceService.updateMultiChannelConfig({
  enableAudioCache: true,
  cacheSize: 100  // 缓存最多100个音频
});

// 禁用缓存（不推荐，会增加TTS API调用）
multiChannelVoiceService.updateMultiChannelConfig({
  enableAudioCache: false
});

// 调整缓存大小
multiChannelVoiceService.updateMultiChannelConfig({
  cacheSize: 200  // 缓存最多200个音频（占用更多内存）
});
```

## 完整配置示例

```typescript
import { multiChannelVoiceService } from './services/multiChannelVoiceService';

// 高性能配置（推荐）
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  maxConcurrentSpeakers: 2,
  useTTS: true,
  ttsProvider: 'auto',  // 自动选择最佳TTS服务商
  enableDucking: true,
  duckingLevel: 0.25,
  enableAudioCache: true,
  cacheSize: 100
});

// 激烈对骂配置（3人同时说话）
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  maxConcurrentSpeakers: 3,  // 最多3人同时说话
  useTTS: true,
  ttsProvider: 'auto',
  enableDucking: true,
  duckingLevel: 0.2,  // 更明显的ducking
  enableAudioCache: true,
  cacheSize: 150  // 更大的缓存
});

// 节省资源配置（低配置设备）
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  maxConcurrentSpeakers: 2,
  useTTS: true,
  ttsProvider: 'edge',  // 使用轻量级Edge TTS
  enableDucking: false,  // 禁用ducking节省CPU
  enableAudioCache: true,
  cacheSize: 50  // 较小的缓存
});
```

## 检查配置状态

```typescript
// 获取当前配置
const config = multiChannelVoiceService.getMultiChannelConfig();
console.log('当前配置:', config);

// 获取TTS服务商状态
const providerStatus = await multiChannelVoiceService.getTTSProviderStatus();
console.log('TTS服务商状态:', providerStatus);

// 获取服务状态
import { ttsAudioService } from './services/ttsAudioService';
const status = ttsAudioService.getStatus();
console.log('服务状态:', {
  启用: status.enabled,
  当前并发: `${status.currentConcurrent}/${status.maxConcurrent}`,
  活动声道: status.activeChannels,
  队列长度: status.queueLength,
  缓存: `${status.cacheSize}/${status.cacheMaxSize}`,
  TTS服务商: status.ttsProvider,
  Ducking: status.duckingEnabled ? '启用' : '禁用'
});
```

## 性能优化建议

### 1. 缓存策略

- **启用缓存**：对于重复的语音内容（如"出牌"、"要不起"等），缓存可以显著减少TTS API调用
- **缓存大小**：根据内存情况调整，一般100-200个音频足够
- **清空缓存**：如果内存紧张，可以定期清空缓存

```typescript
import { ttsAudioService } from './services/ttsAudioService';

// 清空缓存
ttsAudioService.clearCache();
```

### 2. TTS服务商选择

- **auto（推荐）**：自动选择最佳可用的TTS服务商，支持故障转移
- **gpt_sovits**：音质最好，但需要本地服务运行
- **edge**：轻量级，适合低配置设备
- **coqui**：开源，音质较好

### 3. 并发数调整

- **2个（默认）**：平衡性能和体验，推荐
- **3个**：更激烈的对骂效果，但可能造成混乱
- **1个**：不推荐，失去了多声道的意义

### 4. Ducking配置

- **启用（推荐）**：让主要对话更清晰
- **duckingLevel**: 0.2-0.35之间，根据个人喜好调整

## 故障排查

### 问题1：没有听到声音

**检查清单：**
1. 确认 `enabled: true`
2. 确认 `useTTS: true`
3. 检查TTS服务商状态
4. 检查浏览器是否允许自动播放音频

```typescript
// 检查TTS服务商状态
const status = await multiChannelVoiceService.getTTSProviderStatus();
console.log('TTS服务商状态:', status);

// 检查是否有可用的服务商
const hasAvailable = Object.values(status).some(s => s.enabled && s.healthy);
if (!hasAvailable) {
  console.error('❌ 没有可用的TTS服务商');
}
```

### 问题2：只有一个人说话

**可能原因：**
1. `maxConcurrentSpeakers` 设置为1
2. TTS服务响应慢，导致队列积压

**解决方案：**
```typescript
// 检查并发数
const config = multiChannelVoiceService.getMultiChannelConfig();
if (config.maxConcurrentSpeakers === 1) {
  console.warn('⚠️ 并发数设置为1，只能一个人说话');
  multiChannelVoiceService.updateMultiChannelConfig({
    maxConcurrentSpeakers: 2
  });
}
```

### 问题3：TTS服务不可用

**解决方案：**
```typescript
// 切换到可用的TTS服务商
multiChannelVoiceService.updateMultiChannelConfig({
  ttsProvider: 'edge'  // 使用Edge TTS（通常最稳定）
});
```

---

**最后更新**：2025-01-25  
**状态**：✅ 配置指南已完成


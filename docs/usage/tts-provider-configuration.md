# TTS服务商配置指南

## 概述

本文档介绍如何配置和选择不同的TTS服务商。

## 可用的TTS服务商

1. **auto**（自动选择）- 默认，自动选择最佳可用的TTS服务商
2. **gpt_sovits** - GPT-SoVITS（需要本地服务运行在 9880 端口）
3. **coqui** - Coqui TTS（需要本地服务运行在 5002 端口）
4. **edge** - Edge TTS（需要后端代理 `/api/edge-tts`）
5. **local** - 本地TTS API（需要本地服务运行）
6. **browser** - 浏览器TTS（使用 speechSynthesis，单声道，不推荐用于多声道）

## 快速配置

### 使用浏览器TTS

```typescript
import { multiChannelVoiceService } from './services/multiChannelVoiceService';

// 配置使用浏览器TTS
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  useTTS: true,
  ttsProvider: 'browser'  // 指定使用浏览器TTS
});
```

### 使用Edge TTS

```typescript
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  useTTS: true,
  ttsProvider: 'edge'  // 使用Edge TTS
});
```

### 自动选择（推荐）

```typescript
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  useTTS: true,
  ttsProvider: 'auto'  // 自动选择最佳可用的TTS服务商
});
```

## 检查TTS服务商状态

```typescript
// 获取TTS服务商状态
const providerStatus = await multiChannelVoiceService.getTTSProviderStatus();
console.log('TTS服务商状态:', providerStatus);

// 示例输出：
// {
//   gpt_sovits: { enabled: true, healthy: false },
//   coqui: { enabled: true, healthy: false },
//   edge: { enabled: true, healthy: true },
//   local: { enabled: true, healthy: false },
//   browser: { enabled: true, healthy: true }
// }
```

## 浏览器TTS的特殊说明

**注意**：浏览器TTS（`speechSynthesis`）有以下限制：

1. **单声道队列**：`speechSynthesis` 是单通道队列，无法真正实现多声道同时播放
2. **需要捕获**：如果要用于多声道，需要通过 `MediaRecorder` 捕获音频（需要用户授权）
3. **不推荐**：对于多声道场景，不推荐使用浏览器TTS

**如果必须使用浏览器TTS**：

```typescript
// 配置使用浏览器TTS
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  useTTS: true,
  ttsProvider: 'browser'
});

// 注意：浏览器TTS会尝试通过MediaRecorder捕获音频
// 如果捕获失败，会生成占位音频（静音）
```

## 推荐配置

### 场景1：有本地TTS服务（GPT-SoVITS或Coqui）

```typescript
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  useTTS: true,
  ttsProvider: 'auto'  // 自动选择，优先使用GPT-SoVITS或Coqui
});
```

### 场景2：只有Edge TTS后端

```typescript
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  useTTS: true,
  ttsProvider: 'edge'  // 直接使用Edge TTS
});
```

### 场景3：没有TTS服务，只能使用浏览器TTS

```typescript
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  useTTS: true,
  ttsProvider: 'browser'  // 使用浏览器TTS（功能受限）
});
```

## 故障排查

### 问题1：没有听到声音

**检查清单：**
1. 检查TTS服务商状态
2. 检查AudioContext状态
3. 检查浏览器控制台错误

```typescript
// 检查TTS服务商状态
const status = await multiChannelVoiceService.getTTSProviderStatus();
const hasHealthy = Object.values(status).some(s => s.enabled && s.healthy);
if (!hasHealthy) {
  console.error('❌ 没有可用的TTS服务商');
}

// 检查AudioContext状态
import { ttsAudioService } from './services/ttsAudioService';
const audioStatus = ttsAudioService.getStatus();
console.log('AudioContext状态:', audioStatus);
```

### 问题2：浏览器TTS没有声音

**可能原因：**
1. MediaRecorder捕获失败（需要用户授权）
2. AudioContext被暂停
3. 浏览器不支持

**解决方案：**
```typescript
// 确保AudioContext处于运行状态
const audioContext = ttsAudioService.getAudioContext();
if (audioContext && audioContext.state === 'suspended') {
  await audioContext.resume();
}
```

---

**最后更新**：2025-01-25  
**状态**：✅ TTS服务商配置指南已完成


# TTS 系统使用指南

## 概述

TTS（Text-to-Speech）系统提供了完整的语音合成功能，支持多种 TTS 后端、持久化缓存、音频预加载和自动降级。

## 核心功能

### 1. 多种 TTS 后端支持

- **AzureSpeechTTSClient**: Azure Speech Service 客户端（云端，高质量，支持多语言）
- **PiperTTSClient**: Piper TTS 客户端（本地，轻量级）
- **BrowserTTSClient**: 浏览器原生 TTS（speechSynthesis，后备）

### 2. 持久化音频缓存

使用 IndexedDB 持久化存储音频数据，支持：
- 自动缓存管理
- 过期清理
- 访问统计
- 内存+持久化双层缓存

### 3. TTS 服务管理器

统一管理多个 TTS 后端，支持：
- 自动选择最佳提供者
- 故障转移和自动降级
- 健康检查
- 提供者状态监控

### 4. 音频预加载

提前加载常用短语，提高响应速度：
- 常用游戏短语预加载
- 玩家语音预加载
- 优先级队列管理

## 快速开始

### 基础使用

```typescript
import { synthesizeSpeech } from './tts';

// 生成语音
const result = await synthesizeSpeech('你好，世界！', {
  lang: 'zh',
  useCache: true,
});

// 播放音频
const audioContext = new AudioContext();
const audioBuffer = await audioContext.decodeAudioData(result.audioBuffer);
const source = audioContext.createBufferSource();
source.buffer = audioBuffer;
source.connect(audioContext.destination);
source.start();
```

### 使用 TTS 服务管理器（推荐）

```typescript
import { getTTSServiceManager } from './tts';

const ttsManager = getTTSServiceManager();

// 自动选择最佳提供者
const result = await ttsManager.synthesize('你好，世界！', {
  lang: 'zh',
});

// 使用指定提供者
const result2 = await ttsManager.synthesizeWithProvider(
  'gpt_sovits',
  '你好，世界！',
  { lang: 'zh' }
);

// 检查提供者状态
const status = ttsManager.getProviderStatus();
console.log(status);
```

### 配置 GPT-SoVITS

```typescript
import { GPTSoVITSClient, getTTSServiceManager } from './tts';

// 创建 GPT-SoVITS 客户端
const gptSoVITSClient = new GPTSoVITSClient({
  baseUrl: 'http://localhost:9880',
  refAudioUrl: '/path/to/reference/audio.wav',
  refText: '这是参考文本',
  language: 'zh',
  topK: 5,
  topP: 1.0,
  temperature: 1.0,
});

// 注册到服务管理器
const ttsManager = getTTSServiceManager();
ttsManager.configureProvider('gpt_sovits', {
  provider: 'gpt_sovits',
  priority: 1,  // 最高优先级
  enabled: true,
});
```

### 配置 Piper TTS

```typescript
import { PiperTTSClient, getTTSServiceManager } from './tts';

// 创建 Piper TTS 客户端
const piperClient = new PiperTTSClient({
  baseUrl: 'http://localhost:5000',
});

// 注册到服务管理器
const ttsManager = getTTSServiceManager();
ttsManager.configureProvider('piper', {
  provider: 'piper',
  priority: 3,
  enabled: true,
});
```

### 音频预加载

```typescript
import { getAudioPreloader } from './tts';

const preloader = getAudioPreloader();

// 预加载常用短语
await preloader.preloadCommonPhrases('zh');

// 预加载特定短语
await preloader.preloadPhrases([
  '我跟一手',
  '你莫急咧',
  '你一张嘴就输钱气',
], { lang: 'zh' });

// 预加载玩家语音
await preloader.preloadPlayerPhrases('player0', 'zh');
```

### 使用音频缓存

```typescript
import { getAudioCache } from './tts';

const audioCache = getAudioCache();

// 获取缓存
const cached = await audioCache.get('cache_key');
if (cached) {
  // 使用缓存的音频
}

// 设置缓存
await audioCache.set('cache_key', {
  audioBuffer: arrayBuffer,
  duration: 2.5,
  format: 'audio/wav',
});

// 获取统计信息
const stats = await audioCache.getStats();
console.log(stats);
```

## 高级用法

### 自定义 TTS 提供者优先级

```typescript
const ttsManager = getTTSServiceManager();

// 配置提供者优先级
ttsManager.configureProvider('gpt_sovits', {
  provider: 'gpt_sovits',
  priority: 1,  // 最高优先级
  enabled: true,
});

ttsManager.configureProvider('piper', {
  provider: 'piper',
  priority: 3,
  enabled: true,
});

// 浏览器 TTS 作为最后的后备
ttsManager.configureProvider('browser', {
  provider: 'browser',
  priority: 5,
  enabled: true,
});
```

### 健康检查

```typescript
const ttsManager = getTTSServiceManager();

// 检查单个提供者
const isHealthy = await ttsManager.checkProviderHealth('gpt_sovits');

// 检查所有提供者
await ttsManager.checkAllProvidersHealth();

// 启动定期健康检查（每5分钟）
ttsManager.startHealthCheck(5 * 60 * 1000);

// 停止健康检查
ttsManager.stopHealthCheck();
```

### 南昌话支持

```typescript
import { synthesizeSpeech } from './tts';

// 使用南昌话（文本会自动转换）
const result = await synthesizeSpeech('我跟一手', {
  lang: 'nanchang',
  useCache: true,
});
```

## 配置说明

### GPT-SoVITS 配置

- **baseUrl**: GPT-SoVITS 服务地址（默认: `http://localhost:9880`）
- **refAudioUrl**: 参考音频 URL（用于声音克隆）
- **refText**: 参考文本（用于声音克隆）
- **language**: 语言代码（zh, en, ja 等）
- **topK**: Top-K 采样（默认: 5）
- **topP**: Top-P 采样（默认: 1.0）
- **temperature**: 温度参数（默认: 1.0）

### Piper TTS 配置

- **baseUrl**: Piper TTS 服务地址（默认: `http://localhost:5000`）
- **timeout**: 请求超时时间（默认: 10000ms）
- **retryCount**: 重试次数（默认: 2）

### 音频缓存配置

- **maxMemoryCacheSize**: 内存缓存最大条目数（默认: 100）
- **maxDBSize**: IndexedDB 最大大小（默认: 100MB）
- **maxAge**: 缓存最大年龄（默认: 7天）

## 最佳实践

1. **使用 TTS 服务管理器**: 统一管理多个 TTS 后端，自动降级
2. **启用缓存**: 使用 `useCache: true` 提高性能
3. **预加载常用短语**: 在应用启动时预加载常用语音
4. **监控提供者状态**: 定期检查提供者健康状态
5. **配置合理的优先级**: 根据实际需求配置提供者优先级

## 故障排除

### GPT-SoVITS 连接失败

1. 检查服务是否运行: `curl http://localhost:9880/health`
2. 检查端口是否正确
3. 检查 CORS 设置

### Piper TTS 连接失败

1. 检查服务是否运行: `curl http://localhost:5000/api/tts`
2. 检查模型是否已下载
3. 检查 API 端点是否正确

### 缓存问题

1. 检查 IndexedDB 是否可用
2. 检查浏览器存储限制
3. 清理过期缓存: `audioCache.clear()`

## 性能优化

1. **使用预加载**: 提前加载常用短语
2. **启用缓存**: 减少重复请求
3. **并发控制**: 限制同时进行的 TTS 请求数量
4. **健康检查**: 定期检查提供者状态，避免使用不健康的提供者

## 相关文档

- [GPT-SoVITS 文档](https://github.com/RVC-Boss/GPT-SoVITS)
- [Piper TTS 文档](https://github.com/rhasspy/piper)
- [Web Audio API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)


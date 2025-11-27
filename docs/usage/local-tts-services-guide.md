# 本地TTS服务指南

## 概述

本文档介绍所有可用的本地TTS服务，以及如何检查和使用它们。

## 可用的本地TTS服务

### 1. GPT-SoVITS ⭐（推荐）

- **服务商ID**: `gpt_sovits`
- **默认地址**: `http://localhost:9880`
- **特点**: 零样本TTS，支持声音克隆，高质量
- **优先级**: 最高（1）

**启动方法**:
```bash
# 需要启动GPT-SoVITS服务
# 默认端口：9880
```

**检查健康状态**:
```typescript
import { checkAllLocalTTSServices } from './utils/checkLocalTTSServices';

const status = await checkAllLocalTTSServices();
const gptSoVITS = status.find(s => s.provider === 'gpt_sovits');
console.log('GPT-SoVITS状态:', gptSoVITS?.status);
```

### 2. Coqui TTS

- **服务商ID**: `coqui`
- **默认地址**: `http://localhost:5002`
- **特点**: 开源多语言TTS，支持声音克隆
- **优先级**: 2

**启动方法**:
```bash
# 需要启动Coqui TTS服务
# 默认端口：5002
```

### 3. 本地TTS API

- **服务商ID**: `local`
- **默认地址**: `http://localhost:8000`
- **特点**: 通用本地TTS API服务
- **优先级**: 4

**启动方法**:
```bash
# 需要启动本地TTS API服务
# 默认端口：8000
```

### 4. Edge TTS

- **服务商ID**: `edge`
- **默认地址**: `/api/edge-tts`（需要后端代理）
- **特点**: Edge TTS，免费，音质好
- **优先级**: 3

**配置方法**:
需要配置后端代理 `/api/edge-tts`

### 5. 浏览器TTS

- **服务商ID**: `browser`
- **默认地址**: `speechSynthesis`（浏览器内置）
- **特点**: 浏览器原生TTS，单声道，功能受限
- **优先级**: 最低（5）

**说明**: 不需要启动，浏览器内置支持

## 快速检查所有服务状态

### 方法1：使用检查工具

```typescript
import { printLocalTTSServicesStatus } from './utils/checkLocalTTSServices';

// 打印所有服务状态
await printLocalTTSServicesStatus();
```

### 方法2：在浏览器控制台

```javascript
// 如果已暴露工具
window.checkLocalTTS.printStatus();
```

### 方法3：使用TTS服务管理器

```typescript
import { getTTSServiceManager } from './tts/ttsServiceManager';

const ttsManager = getTTSServiceManager();
const status = ttsManager.getProviderStatus();
console.log('TTS服务商状态:', status);
```

## 配置使用特定的本地TTS服务

### 使用GPT-SoVITS

```typescript
import { multiChannelVoiceService } from './services/multiChannelVoiceService';

multiChannelVoiceService.setTTSProvider('gpt_sovits');
```

### 使用Coqui TTS

```typescript
multiChannelVoiceService.setTTSProvider('coqui');
```

### 使用本地TTS API

```typescript
multiChannelVoiceService.setTTSProvider('local');
```

### 使用Edge TTS

```typescript
multiChannelVoiceService.setTTSProvider('edge');
```

### 使用浏览器TTS

```typescript
multiChannelVoiceService.setTTSProvider('browser');
```

### 自动选择（推荐）

```typescript
multiChannelVoiceService.setTTSProvider('auto');
// 系统会自动选择最佳可用的TTS服务商
```

## 检查服务健康状态

```typescript
import { checkAllLocalTTSServices, getAvailableLocalTTSServices } from './utils/checkLocalTTSServices';

// 检查所有服务
const allStatus = await checkAllLocalTTSServices();
allStatus.forEach(service => {
  console.log(`${service.status} ${service.name}`);
});

// 获取可用的服务
const available = await getAvailableLocalTTSServices();
console.log('可用的服务:', available.map(s => s.name));
```

## 故障排查

### 问题1：所有本地TTS服务都不健康

**检查清单：**
1. 检查服务是否启动
2. 检查端口是否正确
3. 检查防火墙设置
4. 检查服务日志

**解决方案：**
```typescript
// 1. 检查服务状态
await printLocalTTSServicesStatus();

// 2. 尝试手动检查
const response = await fetch('http://localhost:9880/health');
console.log('GPT-SoVITS健康检查:', response.ok);

// 3. 如果都不健康，使用浏览器TTS
multiChannelVoiceService.setTTSProvider('browser');
```

### 问题2：只有Edge TTS可用

**说明**：Edge TTS需要后端代理，如果后端代理配置正确，Edge TTS应该可用。

**检查方法：**
```typescript
// 检查Edge TTS后端代理
try {
  const response = await fetch('/api/edge-tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'test', voice: 'zh-CN-XiaoxiaoNeural' }),
  });
  console.log('Edge TTS代理状态:', response.ok);
} catch (error) {
  console.error('Edge TTS代理不可用:', error);
}
```

### 问题3：如何启动本地TTS服务

**GPT-SoVITS**:
```bash
# 参考 GPT-SoVITS 官方文档
# https://github.com/RVC-Boss/GPT-SoVITS
```

**Coqui TTS**:
```bash
# 参考 Coqui TTS 官方文档
# https://github.com/coqui-ai/TTS
```

**本地TTS API**:
```bash
# 需要自己实现或使用第三方服务
# 默认端口：8000
# 需要实现 /tts 和 /health 接口
```

## 推荐配置

### 场景1：有GPT-SoVITS服务

```typescript
multiChannelVoiceService.setTTSProvider('gpt_sovits');
// 或使用自动选择
multiChannelVoiceService.setTTSProvider('auto');
```

### 场景2：有Coqui TTS服务

```typescript
multiChannelVoiceService.setTTSProvider('coqui');
```

### 场景3：只有Edge TTS后端

```typescript
multiChannelVoiceService.setTTSProvider('edge');
```

### 场景4：没有任何本地TTS服务

```typescript
// 使用浏览器TTS（功能受限，单声道）
multiChannelVoiceService.setTTSProvider('browser');
```

---

**最后更新**：2025-01-25  
**状态**：✅ 本地TTS服务指南已完成


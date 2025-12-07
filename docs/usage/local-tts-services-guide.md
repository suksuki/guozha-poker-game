# TTS 服务指南

## 概述

本文档介绍所有可用的 TTS 服务，以及如何检查和使用它们。

## 可用的 TTS 服务

### 1. Azure Speech Service ⭐（推荐）

- **服务商ID**: `azure`
- **类型**: 云端服务
- **特点**: 
  - 支持 140+ 种语言和方言
  - 400+ 种神经网络语音
  - 高质量语音合成
  - 支持中文、英文、日文、韩文等多种语言
- **优先级**: 最高（0）
- **需要配置**: Subscription Key 和 Region

**配置方法**:
1. 在 Azure Portal 创建语音服务资源
2. 获取 Subscription Key 和 Region
3. 在 `.env` 文件中设置：
   ```bash
   VITE_AZURE_SPEECH_KEY=你的Subscription-Key
   VITE_AZURE_SPEECH_REGION=你的区域（如eastus）
   ```

**定价**:
- 免费层：每月 500 万字符
- 标准层：按使用量计费

### 2. Piper TTS

- **服务商ID**: `piper`
- **类型**: 本地服务
- **默认地址**: `http://localhost:5000`
- **特点**: 轻量级本地TTS，速度快，资源占用少
- **优先级**: 1

**启动方法**:
```bash
# 使用项目提供的脚本（整理后的路径）
./scripts/setup-piper-tts.sh
./docs/root-docs/scripts/start/start-piper-tts.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
./start-piper-tts.sh

# 或手动启动
python scripts/piper-tts-server.py
```

**检查健康状态**:
```bash
curl http://localhost:5000/health
```

### 3. 浏览器 TTS

- **服务商ID**: `browser`
- **类型**: 浏览器内置
- **特点**: 浏览器原生TTS，单声道，功能受限
- **优先级**: 最低（2）

**说明**: 不需要启动，浏览器内置支持，总是可用作为后备

## 快速检查所有服务状态

### 方法1：使用TTS服务管理器

```typescript
import { getTTSServiceManager } from './tts/ttsServiceManager';

const ttsManager = getTTSServiceManager();
const status = ttsManager.getProviderStatus();
console.log('TTS服务商状态:', status);
```

### 方法2：在浏览器控制台

打开浏览器开发者工具，在控制台中查看 TTS 服务状态。

## 配置使用特定的 TTS 服务

### 使用 Azure Speech Service

```typescript
import { multiChannelVoiceService } from './services/multiChannelVoiceService';

multiChannelVoiceService.setTTSProvider('azure');
```

### 使用 Piper TTS

```typescript
multiChannelVoiceService.setTTSProvider('piper');
```

### 使用浏览器 TTS

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
import { getTTSServiceManager } from './tts/ttsServiceManager';

const ttsManager = getTTSServiceManager();
const status = ttsManager.getProviderStatus();

// 检查每个服务的状态
Object.entries(status).forEach(([provider, state]) => {
  console.log(`${provider}: ${state.enabled ? '✅ 启用' : '❌ 禁用'} ${state.healthy ? '健康' : '不健康'}`);
});
```

## 故障排查

### 问题1：Azure Speech Service 不可用

**检查清单：**
1. 检查 `.env` 文件中是否设置了 `VITE_AZURE_SPEECH_KEY` 和 `VITE_AZURE_SPEECH_REGION`
2. 检查 Subscription Key 是否有效
3. 检查 Region 是否正确
4. 检查网络连接

**解决方案：**
```typescript
// 1. 检查环境变量
console.log('Azure Key:', import.meta.env.VITE_AZURE_SPEECH_KEY ? '已设置' : '未设置');
console.log('Azure Region:', import.meta.env.VITE_AZURE_SPEECH_REGION || '未设置');

// 2. 检查服务状态
const ttsManager = getTTSServiceManager();
const status = ttsManager.getProviderStatus();
console.log('Azure状态:', status.azure);
```

### 问题2：Piper TTS 不可用

**检查清单：**
1. 检查服务是否启动
2. 检查端口是否正确（默认 5000）
3. 检查防火墙设置
4. 检查服务日志

**解决方案：**
```bash
# 1. 检查服务状态
curl http://localhost:5000/health

# 2. 如果服务未启动，启动服务
python scripts/piper-tts-server.py
```

### 问题3：所有服务都不健康

**说明**：如果所有服务都不可用，系统会自动使用浏览器 TTS 作为后备。

**解决方案：**
```typescript
// 使用浏览器 TTS（总是可用）
multiChannelVoiceService.setTTSProvider('browser');
```

## 推荐配置

### 场景1：有 Azure Speech Service 配置

```typescript
// 使用 Azure Speech Service（最高质量）
multiChannelVoiceService.setTTSProvider('azure');
// 或使用自动选择
multiChannelVoiceService.setTTSProvider('auto');
```

### 场景2：有 Piper TTS 服务

```typescript
multiChannelVoiceService.setTTSProvider('piper');
```

### 场景3：没有任何配置

```typescript
// 使用浏览器 TTS（功能受限，单声道）
multiChannelVoiceService.setTTSProvider('browser');
```

---

**最后更新**：2025-01-25  
**状态**：✅ TTS 服务指南已完成

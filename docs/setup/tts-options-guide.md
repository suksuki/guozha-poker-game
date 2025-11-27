# TTS 服务选项指南

## 概述

根据 ChatGPT 讨论的方案，要实现"多AI同时说话"，必须使用 **"先生成音频，再用WebAudio播放"** 的方案。这意味着：

- ❌ **不能使用** `speechSynthesis`（它是单通道队列，会让AI排队）
- ✅ **必须使用** TTS API 服务生成音频文件（ArrayBuffer），然后用 Web Audio API 播放

## 三种TTS选项

### 选项1：Edge TTS（推荐，免费，在线）

**优点：**
- 完全免费，无需API Key
- 音色丰富（与Edge浏览器同源）
- 支持多语言（中文、日语、韩语等）
- 不需要本地服务

**缺点：**
- 需要后端代理（因为CORS限制）
- 需要网络连接

**设置步骤：**
1. 启动Edge TTS后端代理（见下方）
2. 在浏览器控制台运行：
```javascript
window.checkLocalTTS.printStatus();
// 如果Edge TTS可用，切换到它：
const { setTTSProvider } = await import('./services/multiChannelVoiceService');
setTTSProvider('edge');
```

### 选项2：本地TTS服务（GPT-SoVITS、Coqui TTS等）

**优点：**
- 完全离线
- 可自定义音色（GPT-SoVITS支持语音克隆）
- 无网络依赖

**缺点：**
- 需要启动本地服务
- 需要安装和配置
- 资源消耗较大

**设置步骤：**
1. 启动本地TTS服务（如GPT-SoVITS在 `http://localhost:9880`）
2. 在浏览器控制台检查服务状态：
```javascript
await window.checkLocalTTS.printStatus();
// 如果服务可用，切换到它：
const { setTTSProvider } = await import('./services/multiChannelVoiceService');
setTTSProvider('gpt_sovits'); // 或 'coqui'
```

### 选项3：云端TTS（Azure TTS、Google TTS等）

**优点：**
- 音色质量高
- 稳定可靠
- 支持多语言

**缺点：**
- 需要API Key（可能有费用）
- 需要网络连接

**设置步骤：**
1. 获取API Key
2. 配置TTS客户端（需要实现对应的客户端）

## 当前实现状态

### ✅ 已实现
- Edge TTS客户端（需要后端代理）
- GPT-SoVITS客户端
- Coqui TTS客户端
- 本地TTS API客户端
- TTS服务管理器（自动降级）

### ⚠️ 需要配置
- Edge TTS后端代理（见下方实现）
- 本地TTS服务（如果选择选项2）

## Edge TTS后端代理实现

Edge TTS需要后端代理是因为浏览器的CORS限制。你可以选择以下两种方式之一：

### 方式1：使用Vite代理（开发环境，已配置）

✅ **已配置**：`vite.config.ts` 中已经添加了Edge TTS代理配置。

**使用方法：**
1. 直接启动开发服务器：`npm run dev`
2. Edge TTS请求会自动通过Vite代理转发

**注意：** 这个代理是简化版本，如果遇到问题，请使用方式2。

### 方式2：使用独立的Node.js后端服务（推荐，更稳定）

**优点：**
- 更稳定可靠
- 可以独立运行
- 支持生产环境

**设置步骤：**
1. 安装依赖（如果还没有）：
```bash
npm install express cors node-fetch
```

2. 启动代理服务：
```bash
node scripts/edge-tts-proxy.js
```

3. 服务将在 `http://localhost:3001` 运行

4. 更新 `src/tts/localTTSClient.ts` 中的Edge TTS客户端，将请求地址改为 `http://localhost:3001/api/edge-tts`

**注意：** 如果使用方式2，需要同时运行两个服务：
- 前端开发服务器：`npm run dev` (端口3000)
- Edge TTS代理服务：`node scripts/edge-tts-proxy.js` (端口3001)

## 快速开始

### 1. 检查可用的TTS服务

在浏览器控制台运行：
```javascript
await window.checkLocalTTS.printStatus();
```

### 2. 切换到可用的TTS服务

```javascript
// 获取可用的服务
const available = await window.checkLocalTTS.getAvailable();
if (available.length > 0) {
  console.log('✅ 可用的服务:', available.map(s => s.name));
  
  // 自动切换到第一个可用的服务
  const { setTTSProvider } = await import('./services/multiChannelVoiceService');
  setTTSProvider(available[0].provider);
  console.log(`✅ 已切换到: ${available[0].name}`);
} else {
  console.log('⚠️ 没有可用的TTS服务');
  console.log('💡 建议：');
  console.log('   1. 启动Edge TTS后端代理（最简单）');
  console.log('   2. 或启动本地TTS服务（GPT-SoVITS/Coqui TTS）');
}
```

### 3. 测试多声道播放

```javascript
// 测试两个AI同时说话
const { multiChannelVoiceService } = await import('./services/multiChannelVoiceService');
const { ChannelType } = await import('./types/channel');

// 同时播放两个语音
await Promise.all([
  multiChannelVoiceService.speak('我是玩家1', undefined, ChannelType.PLAYER_0),
  multiChannelVoiceService.speak('我是玩家2', undefined, ChannelType.PLAYER_1),
]);

console.log('✅ 如果听到两个声音同时播放，说明多声道工作正常！');
```

## 常见问题

### Q: 我必须启动本地TTS服务吗？
A: **不一定**。你有三个选择：
1. **Edge TTS**（推荐，免费，在线）- 需要后端代理（已配置在Vite中，或使用独立的Node.js服务）
2. **本地TTS服务**（GPT-SoVITS、Coqui TTS等）- 需要启动本地服务
3. **云端TTS**（Azure TTS、Google TTS等）- 需要API Key

**最简单的方式**：直接使用Edge TTS，Vite代理已经配置好了，直接运行 `npm run dev` 即可。

### Q: Edge TTS后端代理怎么实现？
A: 见上方的"Edge TTS后端代理实现"部分。最简单的方式是使用Vite代理（开发环境）或创建独立的Node.js服务。

### Q: 为什么不能用speechSynthesis？
A: `speechSynthesis` 是浏览器的单通道队列，同一时刻只能有一个语音在播放。要实现"多AI同时说话"，必须使用TTS API生成音频文件，然后用Web Audio API并发播放。

### Q: 如何知道当前使用的是哪个TTS服务？
A: 在浏览器控制台运行：
```javascript
const { getTTSProviderStatus } = await import('./services/multiChannelVoiceService');
const status = await getTTSProviderStatus();
console.log('当前TTS服务状态:', status);
```

## 下一步

1. 选择你的TTS选项（推荐Edge TTS）
2. 配置后端代理（如果选择Edge TTS）
3. 测试多声道播放
4. 享受多AI同时说话的体验！


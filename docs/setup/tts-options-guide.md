# TTS 服务选项指南

## 概述

根据 ChatGPT 讨论的方案，要实现"多AI同时说话"，必须使用 **"先生成音频，再用WebAudio播放"** 的方案。这意味着：

- ❌ **不能使用** `speechSynthesis`（它是单通道队列，会让AI排队）
- ✅ **必须使用** TTS API 服务生成音频文件（ArrayBuffer），然后用 Web Audio API 播放

## 三种TTS选项

### 选项1：Piper TTS（推荐，免费，本地）

**优点：**
- 完全免费，无需API Key
- 轻量级（模型只有几MB）
- 速度快，延迟低
- 支持离线使用
- 支持 Python 3.12

**缺点：**
- 多语言支持有限
- 需要本地服务

**设置步骤：**
1. 使用项目提供的脚本安装和启动：
```bash
# 使用整理后的脚本路径
./scripts/setup-piper-tts.sh
./docs/root-docs/scripts/start/start-piper-tts.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
./start-piper-tts.sh
```

2. 在浏览器控制台检查服务状态：
```javascript
await window.checkLocalTTS.printStatus();
// 如果Piper TTS可用，切换到它：
const { setTTSProvider } = await import('./services/multiChannelVoiceService');
setTTSProvider('piper');
```

详细文档：`docs/setup/piper-tts-quick-start.md`

### 选项2：本地TTS服务（GPT-SoVITS、CosyVoice TTS等）

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
setTTSProvider('gpt_sovits'); // 或 'cosyvoice', 'melo'
```

### 选项3：云端TTS（Google TTS等）

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
- Piper TTS客户端（轻量级本地TTS，推荐）
- GPT-SoVITS客户端（支持声音克隆）
- CosyVoice TTS客户端（高质量中文）
- Melo TTS客户端（高质量中文）
- Google TTS客户端（云端高质量）
- 本地TTS API客户端
- TTS服务管理器（自动降级）

### ⚠️ 需要配置
- 本地TTS服务（如果选择选项1或2）

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
  console.log('   1. 启动Piper TTS服务（最简单，推荐）');
  console.log('   2. 或启动其他本地TTS服务（GPT-SoVITS/CosyVoice TTS等）');
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
1. **Piper TTS**（推荐，免费，本地）- 轻量级，支持 Python 3.12
2. **本地TTS服务**（GPT-SoVITS、CosyVoice TTS等）- 需要启动本地服务
3. **云端TTS**（Google TTS等）- 需要API Key

**最简单的方式**：使用 Piper TTS，运行 `./scripts/setup-piper-tts.sh` 和 `./docs/root-docs/scripts/start/start-piper-tts.sh` 即可。

> 💡 **提示**：建议运行 `./docs/root-docs/create-symlinks.sh` 创建符号链接，然后可以直接使用 `./start-piper-tts.sh`

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

1. 选择你的TTS选项（推荐Piper TTS）
2. 安装和启动TTS服务
3. 测试多声道播放
4. 享受多AI同时说话的体验！


# AudioMixer 设计文档（符合原始设计）

## 📋 概述

本文档描述了按照原始设计文档实现的 AudioMixer 系统，用于支持最多8人的"吵架王"棋牌游戏中的多声道并发语音播放。

## 🎯 设计原则

### 核心原则

1. **不使用 `speechSynthesis`**：它是单通道队列，会让 AI 排队，无法实现真正的多声道并发播放。
2. **生成音频文件再播放**：每个 AI 话语 → 先合成独立音频段（mp3/wav/ArrayBuffer），然后通过 Web Audio API 播放。
3. **真正的多声道并发**：使用 Web Audio API 的 `AudioContext`，每个角色一个 `roleGainNode + StereoPanner`，每段音频一个 `AudioBufferSourceNode`，多段同时 `start()` → 多 AI 同时说话。

## 🏗️ 架构设计

### AudioMixer 结构

```
AudioContext
  ├─ masterGain (主音量控制)
  │   └─ destination (输出)
  │
  └─ 每个角色 (ChannelType)
      ├─ roleGain (角色增益节点)
      ├─ panner (立体声声像节点)
      │
      └─ 每个音频段
          ├─ source (AudioBufferSourceNode)
          └─ segGain (段增益节点)
```

### 音频连接图

按照设计文档，音频连接图如下：

```
source (AudioBufferSourceNode)
  ↓
segGain (GainNode - 单个音频段的音量控制)
  ↓
roleGain (GainNode - 角色的基础音量)
  ↓
panner (StereoPannerNode - 声像定位)
  ↓
masterGain (GainNode - 主音量控制)
  ↓
destination (AudioContext.destination)
```

## 🔊 多声道配置

### 8人房间配置

- **最多8人**：`PLAYER_0` 到 `PLAYER_7`
- **同时发声最多2人**：`maxConcurrentSpeakers = 2`（符合设计文档）
- **其他人只能短插一句**：`QUICK_JAB ≤ 1.5s`（待实现）

### 声像定位（Pan值）

| 玩家 | Pan值 | 位置 |
|------|-------|------|
| PLAYER_0 | -0.7 | 左 |
| PLAYER_1 | 0.7 | 右 |
| PLAYER_2 | -0.5 | 左中 |
| PLAYER_3 | 0.5 | 右中 |
| PLAYER_4 | -0.3 | 左环绕 |
| PLAYER_5 | 0.3 | 右环绕 |
| PLAYER_6 | -0.15 | 左后 |
| PLAYER_7 | 0.15 | 右后 |
| ANNOUNCEMENT | 0.0 | 中央 |

### 主吵架声像

按照设计文档，主吵架左右声像：
- 左：`pan = -0.35`
- 右：`pan = +0.35`

其他人随机分布 `[-0.6, 0.6]`（制造一桌人围吵感）

## 🎚️ Ducking 机制

### 功能说明

当某个角色说话时，其他角色的音量降低，突出当前说话的角色。

### 实现

```typescript
duckOthers(activeChannel: ChannelType): void {
  // 降低其他角色的音量到 otherLevel (0.2~0.35)
  // 当前说话的角色保持正常音量
}
```

### 参数

- **enabled**: `true`（默认启用）
- **otherLevel**: `0.25`（其他角色的音量级别，范围 0.2~0.35）
- **fadeTime**: `0.05`（50ms 淡入淡出时间）

### 效果

- 主吵架角色：音量 = 1.0
- 其他角色：音量 = 0.25（降低75%）

## 📊 优先级管理

### 优先级定义

| 优先级 | 类型 | 说明 |
|--------|------|------|
| 4 | 报牌 (ANNOUNCEMENT) | 最高优先级，可以中断其他播放 |
| 3 | 对骂 (MAIN_FIGHT) | 吵架主对话 |
| 2 | 事件 (NORMAL_CHAT) | 游戏事件触发 |
| 1 | 随机 (QUICK_JAB) | 短插一句 |

### 队列管理

- **按优先级排序**：优先级高的在前
- **并发控制**：最多同时播放 `maxConcurrentSpeakers` 个
- **报牌中断**：报牌可以中断所有非报牌播放

## 🔄 播放流程

### 1. 生成音频

```typescript
// 使用本地TTS服务生成音频
const audioBuffer = await ttsManager.synthesize(text, options);
```

### 2. 添加到队列

```typescript
// 检查是否可以立即播放
if (currentConcurrentCount < maxConcurrentSpeakers) {
  playAudio(item);
} else {
  // 加入队列（按优先级排序）
  playQueue.push(item);
  playQueue.sort((a, b) => b.priority - a.priority);
}
```

### 3. 播放音频

```typescript
// 创建音频源
const source = audioContext.createBufferSource();
source.buffer = audioBuffer;

// 创建段增益节点
const segGain = audioContext.createGain();
segGain.gain.value = baseVolume * voiceVolume;

// 连接音频图
source.connect(segGain);
segGain.connect(roleGain);

// 应用ducking
duckOthers(channel);

// 开始播放
source.start(0);
```

### 4. 播放结束

```typescript
source.onended = () => {
  // 恢复其他角色的音量
  restoreOthersVolume();
  
  // 处理队列中的下一个
  processQueue();
};
```

## 🚫 不支持的方案

### ❌ 捕获 speechSynthesis

**原因**：
- 浏览器无法捕获系统音频输出
- `getUserMedia` 的 `systemAudio: true` 是实验性API，大多数浏览器不支持
- 即使支持，也需要用户授权，且效果不稳定

**替代方案**：
- 必须使用本地TTS服务（GPT-SoVITS、Coqui TTS、Edge TTS等）生成音频文件
- 然后通过 Web Audio API 播放

## 📝 实现状态

### ✅ 已实现

- [x] Web Audio API 多声道播放
- [x] 8人支持（PLAYER_0 到 PLAYER_7）
- [x] 优先级管理（报牌 > 对骂 > 事件 > 随机）
- [x] 并发控制（最多2个同时播放）
- [x] Ducking 机制（降低其他角色音量）
- [x] 音频缓存（减少API调用）
- [x] 音频连接图（source -> segGain -> roleGain -> panner -> masterGain -> destination）

### ⏳ 待实现

- [ ] DialogueScheduler（完整的对话调度器）
- [ ] QUICK_JAB 短插一句机制（≤ 1.5s）
- [ ] 长吵架节拍化（beats 生成 → 分段出句边播）
- [ ] 主吵架声像优化（左右 -0.35 / +0.35）
- [ ] 其他人随机分布（[-0.6, 0.6]）

## 🔗 相关文档

- [原始设计文档](../design/system-design.md)
- [多声道语音使用说明](../features/audio/multi-voice-chat-usage.md)
- [多声道语音开发计划](../development/multi-voice-chat-implementation.md)

---

**最后更新**：2025-01-25  
**状态**：符合原始设计文档，核心功能已实现


# 多声道音频实现说明（逻辑多通道）

## 📋 概述

本文档说明当前实现的多声道音频系统，这是**逻辑多通道**（多路同时发声），不是物理多声道（5.1/7.1）。

## 🎯 实现目标

实现"吵架王"效果：
- ✅ 多个AI同时说话（最多2-3个）
- ✅ 抢话、叠加、节奏混乱但听得清
- ✅ 左右声像分离（增强戏剧感）
- ✅ Ducking机制（A说话时B自动压低）

## 🏗️ 核心实现

### 1. AudioMixer（音频混音器）

**位置**: `src/services/ttsAudioService.ts`

**实现要点**:
- 使用 `AudioContext` 作为主音频上下文
- 每个角色（ChannelType）一个 `roleGainNode` + `StereoPannerNode`
- 每段音频一个 `AudioBufferSourceNode`
- 多段同时 `start()` 实现并发播放

**音频连接图**:
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

### 2. Ducking机制

**实现**: `ttsAudioService.ts` 中的 `duckOthers()` 方法

**效果**:
- 当某个角色说话时，其他角色的音量降低到 `otherLevel` (0.25)
- 使用 `setTargetAtTime()` 实现平滑淡入淡出（50ms）
- 播放结束后自动恢复所有角色音量

**代码示例**:
```typescript
private duckOthers(activeChannel: ChannelType): void {
  const now = this.audioContext.currentTime;
  const fadeTime = 0.05; // 50ms 淡入淡出时间

  this.channelGains.forEach((gain, channel) => {
    if (channel !== activeChannel) {
      const targetGain = baseVolume * 0.25; // 降低到25%
      gain.gain.setTargetAtTime(targetGain, now, fadeTime);
    } else {
      // 当前说话的角色保持正常音量
      gain.gain.setTargetAtTime(baseVolume, now, fadeTime);
    }
  });
}
```

### 3. 声像分离（Stereo Panning）

**实现**: 通过 `StereoPannerNode` 实现左右声像分离

**配置**:
- PLAYER_0: pan = -0.7 (左)
- PLAYER_1: pan = 0.7 (右)
- PLAYER_2: pan = -0.5 (左中)
- PLAYER_3: pan = 0.5 (右中)
- ... (支持8个玩家)

**效果**: 不同玩家声音从不同位置发出，增强"围桌吵架"的戏剧感

### 4. 并发播放控制

**实现**: `maxConcurrentSpeakers` 配置（默认2个）

**逻辑**:
- 最多同时播放 `maxConcurrentSpeakers` 个音频
- 超过限制时加入队列，按优先级排序
- 播放完成后自动处理队列中的下一个

**优先级**:
- 4 = 报牌（最高）
- 3 = 对骂
- 2 = 事件
- 1 = 随机

### 5. 长吵架分段播放（待完善）

**已有组件**:
- `DialogueScheduler` (`src/audio/DialogueScheduler.ts`) - 对话调度器
- `BeatsGenerator` (`src/ai/beatsGenerator.ts`) - 节拍生成器
- `SegmentedPlayback` (`src/audio/SegmentedPlayback.ts`) - 分段播放管理器

**当前状态**:
- ✅ 已有Beats生成和分段播放的基础设施
- ⏳ 需要集成到当前的播放流程中

**待实现**:
- 当检测到长文本（>40字）时，自动调用Beats生成
- 按节拍分段生成TTS音频
- 边生成边播放，支持插嘴

## 📊 当前实现状态

### ✅ 已实现

- [x] Web Audio API 多声道播放
- [x] 8人支持（PLAYER_0 到 PLAYER_7）
- [x] 优先级管理（报牌 > 对骂 > 事件 > 随机）
- [x] 并发控制（最多2个同时播放）
- [x] Ducking机制（降低其他角色音量）
- [x] 声像分离（Stereo Panning）
- [x] 音频缓存（减少API调用）
- [x] 音频连接图（source -> segGain -> roleGain -> panner -> masterGain -> destination）

### ⏳ 待完善

- [ ] 长吵架自动分段（检测长文本，调用Beats生成）
- [ ] 边生成边播放（流式TTS生成）
- [ ] QUICK_JAB 短插一句机制（≤ 1.5s）
- [ ] 主吵架声像优化（左右 -0.35 / +0.35）
- [ ] 其他人随机分布（[-0.6, 0.6]）

## 🔧 使用方式

### 基本播放

```typescript
import { ttsAudioService } from './services/ttsAudioService';
import { ChannelType } from './types/channel';

// 播放语音（多声道）
await ttsAudioService.speak(
  "我跟一手。你莫急咧。",
  voiceConfig,
  ChannelType.PLAYER_0,
  {
    onStart: () => console.log('开始播放'),
    onEnd: () => console.log('播放完成'),
    onError: (error) => console.error('播放失败', error)
  },
  3 // 优先级：对骂
);
```

### 配置

```typescript
import { DEFAULT_MULTI_CHANNEL_CONFIG } from './config/voiceConfig';

// 更新配置
ttsAudioService.updateConfig({
  enabled: true,
  maxConcurrentSpeakers: 2, // 最多2个同时播放
  useTTS: true // 使用TTS API服务
});
```

## 🎬 效果演示

### 场景1：两个玩家同时说话

```
玩家0（左）: "我跟一手。"
玩家1（右）: "你莫急咧。"
```

**效果**: 两个声音同时播放，左右分离，互不干扰

### 场景2：Ducking效果

```
玩家0（左）: "我跟一手。" [音量1.0]
玩家1（右）: "你莫急咧。" [音量降低到0.25]
```

**效果**: 玩家0说话时，玩家1音量自动降低，突出玩家0

### 场景3：抢话

```
玩家0（左）: "我跟一手。你莫急咧。你一张嘴就输钱气！"
玩家1（右）: "你算什么东西！" [在玩家0说话时插入]
```

**效果**: 玩家1的短句可以插入玩家0的长句，实现抢话效果

## 📝 技术细节

### 为什么不用 speechSynthesis？

- `speechSynthesis` 是单通道队列，无法真正同时播放多个语音
- 必须先生成音频文件（ArrayBuffer/AudioBuffer），然后通过Web Audio API播放
- 这样才能实现真正的多声道并发播放

### 为什么最多2个同时播放？

- 符合设计文档要求（最多2-3个玩家同时说话）
- 超过2个会变得混乱，听不清
- 可以通过配置调整 `maxConcurrentSpeakers`

### 如何实现长吵架分段？

1. 检测文本长度（>40字）
2. 调用 `BeatsGenerator` 生成节拍结构
3. 按节拍分段调用TTS生成音频
4. 边生成边播放，支持插嘴

## 🔗 相关文档

- [原始设计文档](./system-design.md) - 包含"吵架王"8人房间语音调度设计
- [AudioMixer设计文档](./audio-mixer-design.md) - 详细的AudioMixer实现说明
- [多声道语音使用说明](../features/audio/multi-voice-chat-usage.md) - 使用指南
- [多声道语音开发计划](../development/multi-voice-chat-implementation.md) - 开发计划

---

**最后更新**：2025-01-25  
**状态**：核心功能已实现，长吵架分段播放待完善


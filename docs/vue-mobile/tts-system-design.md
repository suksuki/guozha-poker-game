# Vue Mobile TTS系统设计文档

## 📋 概述

Vue Mobile版本的TTS（Text-to-Speech）系统设计，支持多通道、异步调用、优先级管理和动态通道分配。

## 🎯 核心需求

1. **多通道支持**：同时多人发声
2. **异步TTS调用**：不阻塞主线程
3. **优先级管理**：系统(4) > 对骂(3) > 事件(2) > 随机(1)
4. **动态通道分配**：
   - 系统独占一条通道（ANNOUNCEMENT）
   - 聊天共享多条通道（PLAYER_0-PLAYER_7），动态分配

## 🏗️ 架构设计

### 1. 通道调度器（ChannelScheduler）

**文件**: `vue-mobile/src/services/channelScheduler.ts`

**职责**:
- 管理所有声道的分配和状态
- 支持优先级排序
- 动态分配玩家通道
- 系统通道独占

**通道分配策略**:
- `ANNOUNCEMENT` (ChannelType.ANNOUNCEMENT): 系统专用，独占
- `PLAYER_0-PLAYER_7`: 玩家聊天共享，最多同时3个（可配置）

**优先级**:
- 系统声音: priority = 4（最高）
- 对骂: priority = 3
- 事件: priority = 2
- 随机聊天: priority = 1（最低）

### 2. TTS服务（TTSService）

**文件**: `vue-mobile/src/services/tts/ttsService.ts`

**职责**:
- 统一管理多个TTS后端
- 支持异步调用
- 自动降级和故障转移
- 服务器健康检查

**支持的TTS提供商**:
- `browser`: 浏览器TTS（后备）
- `ollama`: Ollama TTS（如果支持）
- `custom`: 自定义TTS服务器

### 3. 多通道音频服务（MultiChannelAudioService）

**文件**: `vue-mobile/src/services/multiChannelAudioService.ts`

**职责**:
- 使用Web Audio API播放音频
- 支持多通道同时播放
- 异步TTS调用集成
- 声道队列管理

**工作流程**:
```
1. 接收播放请求（文本、玩家ID、优先级）
2. 通过ChannelScheduler分配通道
3. 异步调用TTS服务生成音频
4. 将音频解码为AudioBuffer
5. 通过Web Audio API播放
6. 播放完成后释放通道
```

### 4. 聊天集成（ChatStore）

**文件**: `vue-mobile/src/stores/chatStore.ts`

**职责**:
- 监听AI Brain生成的聊天消息
- 自动触发TTS播放
- 根据intent确定优先级

**优先级映射**:
- `taunt` → priority = 3
- `tactical_signal` → priority = 2
- `social_chat` → priority = 1
- `celebrate` → priority = 2

## 🔄 完整流程

```
AI Brain生成聊天消息
  ↓
ChatStore接收消息
  ├─> 显示聊天气泡
  └─> 触发TTS播放（异步）
      ↓
MultiChannelAudioService.speak()
  ├─> ChannelScheduler分配通道
  │   ├─> 系统消息 → ANNOUNCEMENT（独占）
  │   └─> 聊天消息 → PLAYER_X（动态分配）
  │
  ├─> 异步调用TTS服务
  │   └─> TTSService.synthesize()
  │       ├─> 尝试启用的服务器（按优先级）
  │       └─> 失败则降级到浏览器TTS
  │
  ├─> 解码音频（ArrayBuffer → AudioBuffer）
  │
  └─> Web Audio API播放
      ├─> 设置声道参数（pan, volume）
      ├─> 连接音频节点
      └─> 开始播放
          ├─> onStart: 气泡显示
          ├─> onEnd: 释放通道，处理队列
          └─> onError: 错误处理
```

## ⚙️ 配置

### TTS服务器配置

通过`SettingsPanel`的TTS标签页管理：

```typescript
interface TTSServerConfig {
  id: string;
  name: string;
  type: 'browser' | 'ollama' | 'custom';
  url: string;
  enabled: boolean;
  priority: number;  // 数字越小优先级越高
  timeout?: number;
  retryCount?: number;
}
```

### 通道配置

```typescript
// 每个通道的配置
const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  [ChannelType.PLAYER_0]: { pan: -0.7, volume: 1.0, name: '玩家0（左）' },
  [ChannelType.PLAYER_1]: { pan: 0.7, volume: 1.0, name: '玩家1（右）' },
  // ...
  [ChannelType.ANNOUNCEMENT]: { pan: 0.0, volume: 1.2, name: '系统（中央）' }
};
```

### 并发配置

```typescript
// 最多同时播放的玩家数（默认3）
maxConcurrentPlayers: 3
```

## 📝 使用示例

### 在ChatStore中自动播放

```typescript
// chatStore.ts
audioService.speak(
  event.content,
  undefined, // voiceConfig
  event.playerId,
  priority,  // 根据intent确定
  {
    onStart: () => { /* 语音开始 */ },
    onEnd: () => { /* 语音结束 */ },
    onError: (error) => { /* 错误处理 */ }
  }
);
```

### 手动播放系统声音

```typescript
import { getMultiChannelAudioService } from '@/services/multiChannelAudioService';

const audioService = getMultiChannelAudioService();
await audioService.speak(
  '系统提示音',
  undefined,
  undefined,  // playerId为空表示系统声音
  4,  // 系统优先级
  {
    onStart: () => console.log('系统声音开始'),
    onEnd: () => console.log('系统声音结束')
  }
);
```

## 🔧 设置界面

### TTS服务器管理

1. **添加服务器**: 点击"➕ 添加TTS服务器"按钮
2. **编辑服务器**: 点击服务器项
3. **测试连接**: 点击"🔍"按钮
4. **启用/禁用**: 切换开关

### 服务器类型

- **浏览器**: 使用浏览器原生TTS（speechSynthesis）
- **Ollama**: 使用Ollama TTS服务（如果支持）
- **自定义**: 自定义TTS服务器URL

## 🎨 特性

1. **真正的多声道**: 使用Web Audio API，支持同时播放
2. **异步非阻塞**: TTS生成和播放都是异步的
3. **智能降级**: TTS服务失败时自动降级到浏览器TTS
4. **优先级管理**: 重要消息优先播放
5. **动态分配**: 玩家通道根据使用情况动态分配

## 📊 统计信息

可以通过`getStatistics()`获取：

```typescript
const stats = audioService.getStatistics();
// {
//   enabled: true,
//   maxConcurrentPlayers: 3,
//   activeChannels: 2,
//   totalQueueLength: 5,
//   channelStates: Map<ChannelType, ChannelState>,
//   schedulerStats: {...}
// }
```

## 🚀 未来扩展

1. **更多TTS提供商**: 支持Azure、Google TTS等
2. **音频缓存**: 缓存常用短语的音频
3. **语音个性化**: 根据玩家性格调整语音参数
4. **方言支持**: 支持多种方言TTS


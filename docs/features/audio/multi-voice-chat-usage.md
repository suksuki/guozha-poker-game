# 多语音聊天使用指南

## 📋 概述

多语音聊天功能允许最多2-3个玩家同时说话，营造更真实的游戏氛围。该功能使用本地TTS服务（GPT-SoVITS、Coqui TTS、Edge TTS等）生成音频，然后通过Web Audio API进行多声道播放。

## 🎯 功能特性

- ✅ **真正多声道**：最多2-3个玩家同时说话
- ✅ **优先级管理**：报牌 > 对骂 > 事件 > 随机
- ✅ **音频缓存**：减少API调用，提高响应速度
- ✅ **自动降级**：如果TTS服务不可用，自动回退到speechSynthesis串行播放
- ✅ **向后兼容**：可以随时切换回串行播放模式

## ⚙️ 配置

### 启用多声道

在代码中启用多声道功能：

```typescript
import { multiChannelVoiceService } from './services/multiChannelVoiceService';
import { DEFAULT_MULTI_CHANNEL_CONFIG } from './config/voiceConfig';

// 启用多声道
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  maxConcurrentSpeakers: 2,  // 最多2个同时播放
  useTTS: true  // 使用本地TTS服务
});
```

### 配置选项

```typescript
interface MultiChannelConfig {
  enabled: boolean;  // 是否启用多声道
  maxConcurrentSpeakers: number;  // 最多同时播放数（2-3）
  useTTS: boolean;  // 是否使用本地TTS服务（否则使用speechSynthesis）
}
```

### 默认配置

```typescript
{
  enabled: false,  // 默认关闭，使用串行播放（更稳定）
  maxConcurrentSpeakers: 2,  // 最多2个同时播放
  useTTS: true  // 使用本地TTS服务
}
```

## 🔧 使用方式

### 方式1：通过代码启用

```typescript
// 在应用启动时或游戏配置中
import { multiChannelVoiceService } from './services/multiChannelVoiceService';

// 启用多声道
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  maxConcurrentSpeakers: 2,
  useTTS: true
});
```

### 方式2：通过游戏配置界面（未来）

可以在游戏配置界面添加一个开关，让用户选择是否启用多声道。

## 📊 工作原理

### 播放流程

```
聊天消息生成
  ↓
检查是否启用多声道
  ├─> 是 → TTS服务生成音频 → Web Audio多声道播放
  └─> 否 → speechSynthesis串行播放（回退）
  ↓
并发播放控制
  ├─> 当前并发数 < 最大并发数 → 立即播放
  └─> 当前并发数 >= 最大并发数 → 加入队列（按优先级排序）
  ↓
播放完成 → 处理队列中的下一个
```

### 优先级系统

- **报牌（priority=4）**：最高优先级，可以中断其他播放
- **对骂（priority=3）**：高优先级，优先播放
- **事件（priority=2）**：中等优先级
- **随机（priority=1）**：低优先级

### 并发控制

- 最多同时播放2-3个玩家（可配置）
- 超过限制时，新请求加入队列
- 队列按优先级排序（优先级高的在前）
- 播放完成后自动处理队列中的下一个

## 🎨 声道分配

- **玩家0**：左声道（pan=-0.7）
- **玩家1**：右声道（pan=0.7）
- **玩家2**：左中（pan=-0.3）
- **玩家3**：右中（pan=0.3）
- **报牌**：中央（pan=0.0）

## 🔍 调试

### 查看当前状态

```typescript
import { ttsAudioService } from './services/ttsAudioService';

// 获取状态
const status = ttsAudioService.getStatus();
console.log('多声道状态:', status);
// {
//   enabled: true,
//   currentConcurrent: 2,
//   maxConcurrent: 2,
//   queueLength: 3,
//   activeChannels: [0, 1]
// }
```

### 查看多声道配置

```typescript
import { multiChannelVoiceService } from './services/multiChannelVoiceService';

const config = multiChannelVoiceService.getMultiChannelConfig();
console.log('多声道配置:', config);
```

## ⚠️ 注意事项

1. **TTS服务要求**：需要至少一个本地TTS服务运行（GPT-SoVITS、Coqui TTS、Edge TTS等）
2. **浏览器支持**：需要支持Web Audio API的现代浏览器
3. **性能影响**：多声道播放会增加CPU和内存使用
4. **音频质量**：使用本地TTS服务时，音频质量取决于TTS服务的质量

## 🐛 故障排除

### 问题1：多声道不工作

**原因**：
- TTS服务未启动
- Web Audio API不支持
- 配置未启用

**解决**：
1. 检查TTS服务是否运行（查看控制台日志）
2. 检查浏览器是否支持Web Audio API
3. 确认配置已启用：`multiChannelVoiceService.getMultiChannelConfig()`

### 问题2：音频延迟

**原因**：
- TTS服务响应慢
- 网络延迟（如果使用远程TTS服务）
- 音频缓存未命中

**解决**：
1. 检查TTS服务健康状态
2. 使用本地TTS服务（减少网络延迟）
3. 启用音频缓存

### 问题3：声音混乱

**原因**：
- 并发数设置过高
- 音频音量不平衡

**解决**：
1. 降低 `maxConcurrentSpeakers`（建议2）
2. 调整各声道的音量配置

## 📝 示例代码

### 完整示例

```typescript
import { multiChannelVoiceService } from './services/multiChannelVoiceService';
import { ChannelType } from './services/multiChannelVoiceService';

// 1. 启用多声道
multiChannelVoiceService.updateMultiChannelConfig({
  enabled: true,
  maxConcurrentSpeakers: 2,
  useTTS: true
});

// 2. 播放语音（会自动使用多声道）
await multiChannelVoiceService.speak(
  '好牌！',
  voiceConfig,
  ChannelType.PLAYER_0,
  {
    onStart: () => console.log('开始播放'),
    onEnd: () => console.log('播放完成')
  },
  2  // 优先级：事件
);

// 3. 查看状态
const status = ttsAudioService.getStatus();
console.log('当前状态:', status);
```

## 🚀 未来优化

1. **配置界面**：添加UI开关，让用户方便地启用/禁用
2. **性能监控**：添加性能指标监控
3. **智能调整**：根据系统性能自动调整并发数
4. **更多TTS服务**：支持更多本地TTS服务

---

**最后更新**：2025-01-25


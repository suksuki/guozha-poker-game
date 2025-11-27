# 多语音聊天开发实现计划

## 📋 项目概述

实现真正的多声道语音聊天功能，允许多个玩家同时说话，营造更真实的游戏氛围。

## 🎯 目标

- **多声道同时播放**：最多支持2-3个玩家同时说话
- **音质提升**：使用本地TTS服务生成高质量音频
- **音频缓存**：缓存常用语音，减少API调用
- **向后兼容**：保留串行播放作为回退方案
- **方言支持**：支持南昌话、粤语等方言
- **文字语音同步**：确保气泡和语音同步显示

## 🔧 技术方案

### 方案选择：本地TTS服务 + Web Audio API

**为什么选择这个方案？**
- ✅ 真正的多声道，可以同时播放多个音频
- ✅ 音质好，支持多种语言和方言
- ✅ 可以缓存音频，减少API调用
- ✅ 不需要用户授权（相比系统音频捕获方案）
- ✅ 使用本地TTS服务（GPT-SoVITS、Coqui TTS、Edge TTS等），无需付费API密钥

**重要原则（按照原始设计文档）：**
- ❌ **不使用 `speechSynthesis`**：它是单通道队列，会让 AI 排队，无法实现真正的多声道并发播放
- ✅ **生成音频文件再播放**：每个 AI 话语 → 先合成独立音频段（ArrayBuffer/AudioBuffer），然后通过 Web Audio API 播放
- ✅ **真正的多声道并发**：使用 Web Audio API 的 `AudioContext`，每个角色一个 `roleGainNode + StereoPanner`，每段音频一个 `AudioBufferSourceNode`，多段同时 `start()` → 多 AI 同时说话

**备选方案对比：**

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| 本地TTS + Web Audio | 真正多声道、音质好、可缓存、免费 | 需要本地TTS服务 | ⭐⭐⭐⭐⭐ |
| 付费TTS API + Web Audio | 真正多声道、音质好、可缓存 | 需要API密钥、网络延迟、费用 | ⭐⭐⭐⭐ |
| 系统音频捕获 | 可使用浏览器语音 | 需要授权、浏览器支持有限、无法捕获系统音频 | ⭐ |
| 声像定位 | 实现简单 | 仍是单声道 | ⭐ |

## 📦 TTS 服务商选择

### 优先级1：本地TTS服务（推荐）

#### 选项1：GPT-SoVITS（本地）
- **优点**：免费、支持声音克隆、质量好、支持方言
- **缺点**：需要本地部署、需要训练数据
- **价格**：免费
- **推荐度**：⭐⭐⭐⭐⭐（优先使用）

#### 选项2：Coqui TTS（本地）
- **优点**：免费、开源、支持多语言
- **缺点**：需要本地部署
- **价格**：免费
- **推荐度**：⭐⭐⭐⭐⭐（优先使用）

#### 选项3：Edge TTS（本地服务）
- **优点**：免费、无需API密钥、质量好
- **缺点**：需要本地服务部署
- **价格**：免费
- **推荐度**：⭐⭐⭐⭐（如果可用）

### 优先级2：付费TTS API（备选）

#### 选项4：Azure TTS
- **优点**：质量好、支持方言、国内可用
- **缺点**：费用中等
- **价格**：$15/100万字符
- **推荐度**：⭐⭐⭐（如果本地TTS不可用）

#### 选项5：百度TTS
- **优点**：国内可用、费用低、支持方言
- **缺点**：质量中等
- **价格**：¥0.03/1000次
- **推荐度**：⭐⭐⭐（如果本地TTS不可用）

#### 选项6：科大讯飞TTS
- **优点**：国内可用、方言支持好、质量好
- **缺点**：费用中等
- **价格**：按调用次数计费
- **推荐度**：⭐⭐⭐（如果本地TTS不可用）

#### 选项7：Google Cloud TTS
- **优点**：质量最好、支持语言多、稳定性高
- **缺点**：费用较高、需要翻墙（国内）
- **价格**：$4/100万字符
- **推荐度**：⭐⭐（不推荐，费用高）

## 🏗️ 架构设计

### 组件结构

```
┌─────────────────────────────────────────┐
│      useChatBubbles (UI层)              │
│  - 监听聊天消息                         │
│  - 显示气泡                             │
│  - 触发语音播放                         │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│   MultiChannelVoiceService (服务层)      │
│  - 管理多声道播放                        │
│  - 队列管理                             │
│  - 优先级排序                           │
└──────────────┬──────────────────────────┘
               │
               ├─────────────────┐
               │                 │
               ↓                 ↓
┌──────────────────────┐  ┌──────────────────────┐
│  TTS API Client      │  │  Web Audio Service  │
│  - 调用TTS API       │  │  - 多声道播放        │
│  - 音频缓存          │  │  - 声像定位          │
│  - 错误处理          │  │  - 音量控制          │
└──────────────────────┘  └──────────────────────┘
```

### 数据流

```
聊天消息生成
  ↓
检查是否启用多声道
  ├─> 是 → TTS API生成音频 → Web Audio播放
  └─> 否 → speechSynthesis串行播放（回退）
  ↓
音频缓存（如果启用）
  ↓
多声道同时播放（最多2-3个）
```

## 📝 实现步骤

### 阶段1：TTS API客户端（1-2周）

#### 1.1 创建TTS API抽象接口

```typescript
// src/services/tts/TTSProvider.ts
interface TTSProvider {
  synthesize(text: string, options: TTSOptions): Promise<ArrayBuffer>;
  checkHealth(): Promise<boolean>;
  getSupportedVoices(): Promise<Voice[]>;
}
```

#### 1.2 实现各个TTS服务商客户端

- `GoogleTTSClient.ts` - Google Cloud TTS
- `AzureTTSClient.ts` - Azure TTS
- `BaiduTTSClient.ts` - 百度TTS
- `XunfeiTTSClient.ts` - 科大讯飞TTS
- `EdgeTTSClient.ts` - Edge TTS（如果可用）

#### 1.3 TTS服务管理器

```typescript
// src/services/tts/TTSServiceManager.ts
class TTSServiceManager {
  private providers: Map<string, TTSProvider>;
  private currentProvider: TTSProvider;
  
  async synthesize(text: string, options: TTSOptions): Promise<ArrayBuffer>;
  switchProvider(providerName: string): void;
  getAvailableProviders(): string[];
}
```

### 阶段2：音频缓存系统（1周）

#### 2.1 缓存策略

- **内存缓存**：最近使用的音频（LRU，最多100个）
- **IndexedDB缓存**：持久化缓存（最多1000个）
- **缓存键**：`${text}_${lang}_${voice}_${rate}_${pitch}`

#### 2.2 缓存实现

```typescript
// src/services/tts/AudioCache.ts
class AudioCache {
  async get(key: string): Promise<ArrayBuffer | null>;
  async set(key: string, audio: ArrayBuffer): Promise<void>;
  async clear(): Promise<void>;
  getStats(): CacheStats;
}
```

### 阶段3：Web Audio多声道播放（1-2周）

#### 3.1 多声道播放服务

```typescript
// src/services/audio/MultiChannelAudioPlayer.ts
class MultiChannelAudioPlayer {
  private audioContext: AudioContext;
  private channelPanners: Map<ChannelType, StereoPannerNode>;
  private channelGains: Map<ChannelType, GainNode>;
  
  async playAudio(
    audioBuffer: ArrayBuffer,
    channel: ChannelType,
    options?: PlayOptions
  ): Promise<void>;
  
  stopAll(): void;
  setChannelVolume(channel: ChannelType, volume: number): void;
}
```

#### 3.2 并发播放控制

- 最多同时播放2-3个玩家
- 超过限制时加入队列
- 按优先级排序

### 阶段4：集成到现有系统（1周）

#### 4.1 修改MultiChannelVoiceService

- 添加TTS API支持
- 添加多声道播放逻辑
- 保留串行播放作为回退

#### 4.2 配置选项

```typescript
// src/config/voiceConfig.ts
interface MultiVoiceConfig {
  enabled: boolean; // 是否启用多声道
  maxConcurrentSpeakers: number; // 最多同时播放数（2-3）
  ttsProvider: 'google' | 'azure' | 'baidu' | 'xunfei' | 'edge';
  cacheEnabled: boolean; // 是否启用缓存
  cacheSize: number; // 缓存大小
}
```

### 阶段5：方言系统优化（1-2周）

#### 5.1 方言映射扩展
- [ ] 继续扩展南昌话映射表（当前约50个，目标500+）
- [ ] 使用LLM训练生成更多映射
- [ ] 手动审核和优化映射质量

#### 5.2 方言支持扩展
- [ ] 支持更多方言（粤语、上海话、四川话等）
- [ ] 实现方言映射训练系统
- [ ] 支持方言语音包（未来）

#### 5.3 方言文本生成优化
- [ ] 优化LLM prompt，生成更地道的方言文本
- [ ] 实现方言文本后处理
- [ ] 支持方言脏话映射

### 阶段6：文字和语音同步优化（1周）

#### 6.1 同步机制优化
- [x] 确保气泡在语音真正开始时显示（已完成）
- [x] 优化 `onStart` 事件触发时机（已完成）
- [x] 处理队列中消息的同步（已完成）

#### 6.2 气泡显示优化
- [ ] 优化气泡动画
- [ ] 优化气泡位置（不遮挡UI）
- [ ] 优化气泡消失时机

#### 6.3 错误处理
- [ ] 处理语音播放失败的情况
- [ ] 处理超时情况
- [ ] 处理网络错误

### 阶段7：测试和优化（1周）

#### 7.1 功能测试
- 多声道同时播放
- 音频缓存
- 错误处理
- 回退机制
- 方言支持
- 文字语音同步

#### 7.2 性能优化
- 减少TTS调用延迟
- 优化缓存命中率
- 优化内存使用
- LLM请求优化（去重、合并、队列优化）

## 🔑 API密钥配置

### 环境变量

```bash
# .env.local
VITE_GOOGLE_TTS_API_KEY=your_key
VITE_AZURE_TTS_KEY=your_key
VITE_AZURE_TTS_REGION=your_region
VITE_BAIDU_TTS_API_KEY=your_key
VITE_BAIDU_TTS_SECRET_KEY=your_secret
VITE_XUNFEI_TTS_APP_ID=your_app_id
VITE_XUNFEI_TTS_API_KEY=your_key
VITE_XUNFEI_TTS_API_SECRET=your_secret
```

### 配置文件

```typescript
// src/config/ttsConfig.ts
export const TTS_CONFIG = {
  google: {
    apiKey: import.meta.env.VITE_GOOGLE_TTS_API_KEY,
    enabled: !!import.meta.env.VITE_GOOGLE_TTS_API_KEY
  },
  azure: {
    key: import.meta.env.VITE_AZURE_TTS_KEY,
    region: import.meta.env.VITE_AZURE_TTS_REGION,
    enabled: !!import.meta.env.VITE_AZURE_TTS_KEY
  },
  // ...
};
```

## 📊 性能指标

### 目标指标

#### 流畅度指标
- **聊天响应时间**：< 2秒（从触发到显示气泡）
- **TTS响应时间**：< 1秒（含缓存）
- **音频播放延迟**：< 200ms（从显示气泡到开始播放）
- **队列等待时间**：< 5秒

#### 同步指标
- **气泡和语音同步误差**：< 200ms
- **气泡显示时机准确率**：> 95%

#### 方言指标
- **南昌话映射表**：> 500条
- **方言转换准确率**：> 90%

#### 多声道指标
- **缓存命中率**：> 60%
- **并发播放数**：2-3个玩家同时说话
- **Ducking效果**：其他角色音量降低到 0.2~0.35

### 监控指标

- TTS调用次数
- 缓存命中率
- 平均响应时间
- 错误率
- 并发播放数
- 队列长度

## 🚀 开发优先级

### P0（核心功能 - 已完成）
1. ✅ 本地TTS服务客户端（GPT-SoVITS、Coqui TTS、Edge TTS）
2. ✅ Web Audio多声道播放
3. ✅ 集成到现有系统（multiChannelVoiceService）
4. ✅ Ducking机制（降低其他角色音量）
5. ✅ 8人支持（PLAYER_0 到 PLAYER_7）
6. ✅ 优先级管理（报牌 > 对骂 > 事件 > 随机）
7. ✅ 并发控制（最多2个同时播放）
8. ✅ 文字语音同步（气泡和语音同步显示）

### P1（优化功能 - 进行中）
1. ✅ 音频缓存（内存缓存已实现）
2. [ ] IndexedDB持久化缓存
3. [ ] 多TTS服务商支持（已支持本地TTS，付费API待实现）
4. [ ] 配置选项（部分已实现）
5. [ ] 方言映射扩展（南昌话映射表扩展）

### P2（增强功能 - 待实现）
1. [ ] DialogueScheduler（完整的对话调度器）
2. [ ] QUICK_JAB 短插一句机制（≤ 1.5s）
3. [ ] 长吵架节拍化（beats 生成 → 分段出句边播）
4. [ ] 性能监控
5. [ ] 错误恢复
6. [ ] 用户配置界面
7. [ ] 更多方言支持（粤语、上海话、四川话等）

## 📝 开发检查清单

### 阶段1：本地TTS服务客户端（已完成）
- [x] 创建TTS Provider接口
- [x] 实现GPT-SoVITS客户端
- [x] 实现Coqui TTS客户端
- [x] 实现Edge TTS客户端
- [x] 实现TTS服务管理器
- [x] 添加错误处理和重试机制
- [ ] 单元测试（待补充）

### 阶段2：音频缓存（部分完成）
- [x] 实现内存缓存（Map缓存）
- [ ] 实现IndexedDB持久化缓存
- [x] 缓存键生成逻辑
- [ ] 缓存清理策略（LRU）
- [ ] 单元测试

### 阶段3：Web Audio播放（已完成）
- [x] 创建AudioContext
- [x] 实现声道分配（StereoPannerNode）
- [x] 实现并发播放控制（最多2个同时播放）
- [x] 实现音量控制（roleGain + segGain）
- [x] 实现Ducking机制（降低其他角色音量）
- [x] 实现8人支持（PLAYER_0 到 PLAYER_7）
- [ ] 单元测试（待补充）

### 阶段4：集成（已完成）
- [x] 修改MultiChannelVoiceService
- [x] 添加配置选项（MultiChannelConfig）
- [x] 实现回退机制（speechSynthesis串行播放）
- [x] 更新useChatBubbles
- [x] 集成测试（已通过基本测试）

### 阶段5：方言系统优化（进行中）
- [ ] 扩展南昌话映射表（目标500+）
- [ ] 使用LLM训练生成更多映射
- [ ] 手动审核和优化映射质量
- [ ] 支持更多方言（粤语、上海话、四川话等）

### 阶段6：文字和语音同步（已完成）
- [x] 确保气泡在语音真正开始时显示
- [x] 优化 `onStart` 事件触发时机
- [x] 处理队列中消息的同步
- [ ] 优化气泡动画
- [ ] 优化气泡位置（不遮挡UI）

### 阶段7：测试和优化（进行中）
- [x] 功能测试（基本通过）
- [ ] 性能测试（待补充）
- [ ] 错误处理测试（待补充）
- [ ] 用户体验测试（待补充）
- [ ] 优化和调优（持续进行）

## 🐛 已知问题和限制

1. **本地TTS服务**：需要本地部署GPT-SoVITS或Coqui TTS服务，如果服务不可用会回退到speechSynthesis（串行播放）
2. **网络延迟**：首次调用TTS服务会有延迟，缓存可以缓解
3. **浏览器兼容性**：Web Audio API需要现代浏览器支持
4. **并发限制**：最多同时播放2个（符合设计文档），超过会排队
5. **Ducking效果**：当前实现会降低其他角色音量，但可能不够明显，需要调优
6. **方言支持**：南昌话映射表目前约50个，需要扩展到500+才能达到理想效果

## 📚 参考资料

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Google Cloud TTS](https://cloud.google.com/text-to-speech)
- [Azure TTS](https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/)
- [百度TTS](https://ai.baidu.com/tech/speech/tts)
- [科大讯飞TTS](https://www.xfyun.cn/doc/tts/online_tts/API.html)

## 📚 相关文档

- [原始设计文档](../design/system-design.md) - 包含"吵架王"8人房间语音调度设计
- [AudioMixer设计文档](../design/audio-mixer-design.md) - 详细的AudioMixer实现说明
- [多声道语音使用说明](../features/audio/multi-voice-chat-usage.md) - 使用指南
- [聊天和语音流程梳理](../features/chat-voice-flow.md) - 完整的流程说明

## 📝 历史记录

### 2025-01-25
- ✅ 完成本地TTS服务集成（GPT-SoVITS、Coqui TTS、Edge TTS）
- ✅ 完成Web Audio多声道播放
- ✅ 完成Ducking机制
- ✅ 完成8人支持
- ✅ 完成优先级管理
- ✅ 完成文字语音同步
- 📝 合并 `chat-voice-optimization.md` 的有效内容到此文档

---

**最后更新**：2025-01-25  
**状态**：核心功能已完成，优化功能进行中


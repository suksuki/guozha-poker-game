# LLM聊天、多语言和多通道语音流程梳理

## 📋 概述

本文档梳理了游戏中LLM聊天、多语言支持和多通道语音系统的完整流程和逻辑。

### 核心功能

1. **LLM聊天**: 使用本地Ollama生成智能聊天内容
2. **多语言支持**: 自动翻译聊天内容到当前界面语言
3. **多通道语音**: 每个玩家分配到不同声道，串行播放
4. **方言支持**: 支持普通话、粤语、南昌话等方言

### 技术栈

- **LLM**: Ollama (本地大模型)
- **TTS**: 浏览器 speechSynthesis API
- **翻译**: MyMemory Translation API (免费)
- **多语言**: i18next
- **方言**: 映射表转换

---

## 🔄 完整流程

### 1. 聊天消息生成流程

```
游戏事件触发
  ↓
ChatService.triggerEventChat() / triggerRandomChat() / triggerTaunt()
  ↓
选择聊天策略（LLM 或 Rule-based）
  ├─> LLM策略 → LLMChatStrategy.generateEventChat()
  │   ├─> 构建Prompt（包含游戏信息、玩家信息、事件信息）
  │   ├─> 加入LLM请求队列（按优先级排序：对骂3 > 事件2 > 随机1）
  │   ├─> 检查并发数（最多2个同时请求）
  │   ├─> 检查缓存（5秒内相同prompt使用缓存）
  │   ├─> 调用Ollama API（http://localhost:11434/api/chat）
  │   ├─> 后处理（contentProcessor.ts：移除冗余、截断到10字）
  │   └─> 返回ChatMessage
  │
  └─> Rule-based策略 → RuleBasedChatStrategy.generateEventChat()
      └─> 从预定义规则中随机选择 → 返回ChatMessage
  ↓
ChatService.addMessage() → 添加到消息列表
  ↓
触发订阅者通知（MessageSubscriber）
  ↓
useChatBubbles 监听新消息
```

### 2. 多语言翻译流程

```
ChatMessage生成（中文原文）
  ↓
useChatBubbles 检测到新消息
  ↓
获取当前i18n语言（i18n.language）
  ↓
translateText() 翻译服务
  ├─> 检测文本语言（detectLanguage）
  ├─> 如果文本已经是目标语言 → 直接返回
  ├─> 如果目标语言是中文 → 直接返回（不翻译）
  ├─> 如果文本不是中文 → 直接返回（可能是英文等）
  └─> 需要翻译 → translateWithAPI()
      ├─> 调用 MyMemory Translation API
      │   URL: https://api.mymemory.translated.net/get
      │   参数: q=文本&langpair=zh-CN|目标语言
      └─> 返回翻译后的文本
  ↓
创建翻译后的ChatMessage
  ├─> content: 翻译后的文本
  └─> originalContent: 原文（保存）
  ↓
使用翻译后的文本显示气泡和播放语音
```

### 3. 多通道语音播放流程

```
翻译后的ChatMessage
  ↓
useChatBubbles 准备播放语音
  ↓
获取玩家voiceConfig（包含方言、性别、语速、音调等）
  ↓
multiChannelVoiceService.speak()
  ├─> 确定声道（ChannelType）
  │   ├─> 玩家0 → PLAYER_0（左声道，pan=-0.8）
  │   ├─> 玩家1 → PLAYER_1（右声道，pan=0.8）
  │   ├─> 玩家2 → PLAYER_2（左中，pan=-0.4）
  │   ├─> 玩家3 → PLAYER_3（右中，pan=0.4）
  │   └─> 报牌 → ANNOUNCEMENT（中央，pan=0.0）
  │
  ├─> 去重检查
  │   ├─> 检查是否正在播放相同文本
  │   └─> 检查最近3秒内是否播放过（deduplicationWindow）
  │
  ├─> 优先级处理
  │   ├─> 报牌（优先级4）：可以中断聊天语音
  │   └─> 聊天语音：加入统一队列（chatQueue）
  │       ├─> 按优先级排序：对骂3 > 事件2 > 随机1
  │       └─> 串行播放（一次只播放一个）
  │
  ├─> 语言检测和语音选择
  │   ├─> detectLanguage() 检测文本语言
  │   ├─> 如果voiceConfig有dialect → 使用方言映射
  │   │   ├─> 普通话 → zh-CN
  │   │   ├─> 粤语 → zh-HK
  │   │   └─> 南昌话 → zh-CN（文本通过映射转换）
  │   ├─> 否则使用检测到的文本语言
  │   └─> 选择匹配的语音（SpeechSynthesisVoice）
  │
  ├─> 创建SpeechSynthesisUtterance
  │   ├─> lang: 目标语言代码
  │   ├─> rate: 语速（voiceConfig.rate）
  │   ├─> pitch: 音调（根据gender调整）
  │   └─> volume: 音量（voiceConfig.volume × 声道音量）
  │
  └─> 播放语音
      ├─> onStart: 显示气泡、设置播放状态
      ├─> onEnd: 隐藏气泡、继续队列下一个
      └─> onError: 立即隐藏气泡
```

---

## 🎯 核心组件

### 1. ChatService（聊天服务）

**位置**: `src/services/chatService.ts`

**职责**:
- 管理聊天消息列表
- 选择聊天策略（LLM 或 Rule-based）
- 触发各种聊天事件（随机、事件、对骂、回复）
- 消息订阅机制（通知UI更新）

**关键方法**:
- `triggerRandomChat()` - 触发随机聊天
- `triggerEventChat()` - 触发事件聊天
- `triggerTaunt()` - 触发对骂
- `triggerReply()` - 触发回复
- `addMessage()` - 添加消息到列表

### 2. LLMChatStrategy（LLM聊天策略）

**位置**: `src/chat/strategy/LLMChatStrategy.ts`

**职责**:
- 构建LLM Prompt
- 管理LLM请求队列
- 处理并发控制（最多2个同时请求）
- 请求去重和缓存（5秒TTL）
- 调用Ollama API

**关键配置**:
- `MAX_CONCURRENT_LLM_REQUESTS = 2` - 最大并发数
- `LLM_REQUEST_TIMEOUT = 20000` - 超时时间（20秒）
- `CACHE_TTL = 5000` - 缓存时间（5秒）

**优先级**:
- 对骂（priority=3）> 事件（priority=2）> 随机（priority=1）

### 3. MultiChannelVoiceService（多通道语音服务）

**位置**: `src/services/multiChannelVoiceService.ts`

**职责**:
- 管理多个声道（5个声道：4个玩家 + 1个报牌）
- 串行播放聊天语音（一次只播放一个）
- 优先级管理（报牌可以中断聊天）
- 语言检测和语音选择
- 去重检查（3秒窗口）

**声道分配**:
- `PLAYER_0`: 左声道（pan=-0.8）
- `PLAYER_1`: 右声道（pan=0.8）
- `PLAYER_2`: 左中（pan=-0.4）
- `PLAYER_3`: 右中（pan=0.4）
- `ANNOUNCEMENT`: 中央（pan=0.0）

**播放策略**:
- 聊天语音：串行播放，按优先级排序
- 报牌语音：可以中断聊天，优先级最高

### 4. TranslationService（翻译服务）

**位置**: `src/services/translationService.ts`

**职责**:
- 检测文本语言
- 翻译文本到目标语言
- 使用MyMemory Translation API（免费）

**翻译逻辑**:
- 如果文本已经是目标语言 → 不翻译
- 如果目标语言是中文 → 不翻译
- 如果文本不是中文 → 不翻译（可能是英文等）
- 需要翻译 → 调用API

### 5. useChatBubbles（聊天气泡Hook）

**位置**: `src/hooks/useChatBubbles.ts`

**职责**:
- 监听ChatService的新消息
- 翻译消息内容（如果当前语言不是中文）
- 显示聊天气泡
- 触发语音播放
- 同步气泡显示和语音播放

**关键流程**:
1. 监听消息 → 检测到新消息
2. 翻译消息 → `translateText()`
3. 显示气泡 → `setActiveChatBubbles()`
4. 播放语音 → `voiceService.speak()` 或 `gameAudio.handleChatMessage()`
5. 同步状态 → `onStart`显示气泡，`onEnd`隐藏气泡

---

## 🔀 数据流

### LLM聊天数据流

```
游戏事件
  ↓
ChatService.triggerEventChat()
  ↓
LLMChatStrategy.generateEventChat()
  ├─> 构建Prompt
  │   ├─> 游戏信息（当前轮次、分数、手牌等）
  │   ├─> 玩家信息（姓名、手牌数、得分等）
  │   └─> 事件信息（事件类型、相关数据）
  │
  ├─> 加入请求队列
  │   ├─> 检查并发数（< 2）
  │   ├─> 检查缓存（5秒内）
  │   └─> 按优先级排序
  │
  ├─> 调用Ollama API
  │   ├─> URL: http://localhost:11434/api/chat
  │   ├─> Method: POST
  │   ├─> Body: { model, messages, stream: false }
  │   └─> Timeout: 20秒
  │
  ├─> 后处理
  │   ├─> 移除冗余开头（"好的，"、"我觉得，"等）
  │   ├─> 只选择第一句话
  │   └─> 截断到最多10个字
  │
  └─> 返回ChatMessage
      ├─> content: 处理后的文本
      ├─> playerId: 玩家ID
      ├─> type: 消息类型（random/event/taunt/reply）
      └─> timestamp: 时间戳
```

### 多语言数据流

```
ChatMessage（中文原文）
  ↓
useChatBubbles 检测到新消息
  ↓
获取当前语言（i18n.language）
  ↓
translateText()
  ├─> detectLanguage() 检测文本语言
  │   ├─> 检测中文字符（\u4e00-\u9fa5）
  │   ├─> 检测韩文字符（\uac00-\ud7a3）
  │   ├─> 检测日文字符（\u3040-\u309f\u30a0-\u30ff）
  │   └─> 检测英文字符（a-zA-Z）
  │
  ├─> 判断是否需要翻译
  │   ├─> 文本已经是目标语言 → 返回原文
  │   ├─> 目标语言是中文 → 返回原文
  │   └─> 需要翻译 → 调用API
  │
  └─> translateWithAPI()
      ├─> MyMemory Translation API
      │   URL: https://api.mymemory.translated.net/get
      │   参数: q=文本&langpair=zh-CN|目标语言
      └─> 返回翻译后的文本
  ↓
创建翻译后的ChatMessage
  ├─> content: 翻译后的文本（用于显示和播放）
  └─> originalContent: 原文（保存）
```

### 多通道语音数据流

```
翻译后的ChatMessage
  ↓
useChatBubbles 准备播放
  ↓
获取玩家voiceConfig
  ├─> dialect: 方言（mandarin/cantonese/nanchang）
  ├─> gender: 性别（male/female）
  ├─> rate: 语速（0.9-1.1）
  ├─> pitch: 音调（1.0-1.3）
  └─> volume: 音量（0.95-1.0）
  ↓
multiChannelVoiceService.speak()
  ├─> 确定声道（根据playerId）
  │   └─> ChannelType = playerId % 4
  │
  ├─> 去重检查
  │   ├─> 检查是否正在播放相同文本
  │   └─> 检查最近3秒内是否播放过
  │
  ├─> 优先级处理
  │   ├─> 报牌（priority=4）→ 可以中断聊天
  │   └─> 聊天（priority=1-3）→ 加入队列
  │
  ├─> 语言检测和选择
  │   ├─> detectLanguage() 检测文本语言
  │   ├─> 如果voiceConfig有dialect → 使用方言映射
  │   │   └─> DIALECT_LANG_MAP[dialect] → 语言代码
  │   └─> 选择匹配的语音
  │       ├─> 根据语言代码过滤
  │       └─> 根据voiceIndex选择
  │
  ├─> 创建SpeechSynthesisUtterance
  │   ├─> lang: 目标语言代码
  │   ├─> rate: voiceConfig.rate
  │   ├─> pitch: 根据gender调整
  │   │   ├─> male: pitch × 0.75（0.6-0.85）
  │   │   └─> female: pitch × 1.1（1.0-1.3）
  │   └─> volume: voiceConfig.volume × 声道音量
  │
  └─> 播放
      ├─> onStart → 显示气泡
      ├─> onEnd → 隐藏气泡、处理队列
      └─> onError → 立即隐藏
```

---

## 🎨 关键设计决策

### 1. 串行播放策略

**原因**: 浏览器 `speechSynthesis` API 是单声道的，无法真正同时播放多个语音。

**实现**:
- 所有聊天语音加入统一队列（`chatQueue`）
- 按优先级排序（对骂 > 事件 > 随机）
- 一次只播放一个，确保清晰度

**优点**:
- 语音清晰，不重叠
- 实现简单，无需额外依赖
- 性能好，无网络延迟

### 2. 优先级系统

**优先级定义**:
- 报牌（priority=4）：最高，可以中断聊天
- 对骂（priority=3）：高优先级，优先播放
- 事件（priority=2）：中等优先级
- 随机（priority=1）：低优先级

**实现**:
- LLM请求队列按优先级排序
- 语音播放队列按优先级排序
- 报牌可以中断正在播放的聊天语音

### 3. 多语言支持

**翻译时机**: 在显示气泡和播放语音之前翻译

**翻译策略**:
- 如果文本已经是目标语言 → 不翻译
- 如果目标语言是中文 → 不翻译（原文就是中文）
- 需要翻译 → 调用API

**语音语言选择**:
- 优先使用检测到的文本语言
- 如果voiceConfig有dialect → 使用方言映射
- 否则使用当前i18n语言

### 4. 方言支持

**实现方式**:
- 文本转换：南昌话通过映射表转换为南昌话文本
- TTS语言：南昌话使用普通话TTS（zh-CN），因为TTS不支持南昌话
- 方言映射：`DIALECT_LANG_MAP` 定义方言到语言代码的映射

**支持的方言**:
- 普通话（mandarin）→ zh-CN
- 粤语（cantonese）→ zh-HK
- 南昌话（nanchang）→ zh-CN（文本转换）

**南昌话转换流程**:
```
LLM生成中文文本（普通话）
  ↓
检测voiceConfig.dialect === 'nanchang'
  ↓
convertToNanchang() 转换文本
  ├─> 使用映射表（NANCHANG_MAPPING）
  │   ├─> 常用词汇：'厉害' → '恰噶'
  │   ├─> 脏话映射：'傻逼' → '傻别'
  │   └─> 游戏术语：'这手不错' → '这手恰噶'
  │
  └─> 返回南昌话文本
  ↓
使用普通话TTS（zh-CN）播放南昌话文本
  └─> 虽然TTS是普通话，但文本已经是南昌话，听起来更地道
```

**映射表来源**:
- 手动维护的映射表（`nanchangDialectMapper.ts`）
- 可以通过LLM训练扩展（`trainMappingWithLLM()`）
- 映射表保存在localStorage中

**转换时机**:
- 在 `multiChannelVoiceService.createUtterance()` 中
- 如果 `voiceConfig.dialect === 'nanchang'`，调用 `convertToNanchang()`
- 转换后的文本用于TTS播放

---

## 🔧 配置参数

### LLM配置

```typescript
// src/chat/strategy/LLMChatStrategy.ts
MAX_CONCURRENT_LLM_REQUESTS = 2  // 最大并发数
LLM_REQUEST_TIMEOUT = 20000      // 超时时间（20秒）
CACHE_TTL = 5000                 // 缓存时间（5秒）
MAX_QUEUE_SIZE = 20              // 队列最大长度
```

### 语音配置

```typescript
// src/services/multiChannelVoiceService.ts
maxQueueSize = 10                // 声道队列最大长度
deduplicationWindow = 3000        // 去重时间窗口（3秒）
defaultTimeout = 5000             // 默认超时时间（5秒）
```

### 声道配置

```typescript
// 声道分配
PLAYER_0: pan=-0.8, volume=1.0   // 左声道
PLAYER_1: pan=0.8, volume=1.0    // 右声道
PLAYER_2: pan=-0.4, volume=1.0   // 左中
PLAYER_3: pan=0.4, volume=1.0     // 右中
ANNOUNCEMENT: pan=0.0, volume=1.0 // 中央
```

---

## 📊 性能优化

### LLM请求优化

1. **并发控制**: 最多2个同时请求，避免服务器过载
2. **请求去重**: 相同prompt只发送一次请求
3. **结果缓存**: 5秒内相同prompt使用缓存
4. **优先级排序**: 对骂优先处理
5. **超时控制**: 20秒超时，快速失败

### 语音播放优化

1. **串行播放**: 一次只播放一个，确保清晰
2. **去重检查**: 3秒内相同文本不重复播放
3. **队列管理**: 最多10个消息，超过丢弃旧消息
4. **优先级排序**: 重要消息优先播放

### 翻译优化

1. **智能检测**: 自动检测文本语言，避免不必要的翻译
2. **缓存机制**: 可以添加翻译结果缓存（未来优化）

---

## 🐛 常见问题

### Q: LLM响应太慢？

**A**: 
- 检查Ollama服务是否正常运行
- 检查网络连接
- 考虑使用更小的模型（如 qwen2:0.5b）
- 检查并发数是否过高

### Q: 语音播放混乱？

**A**: 
- 检查队列长度（应该≤10）
- 检查去重窗口（3秒）
- 检查优先级是否正确

### Q: 翻译失败？

**A**: 
- 检查网络连接
- 检查MyMemory API是否可用
- 翻译失败会回退到原文

### Q: 多声道不工作？

**A**: 
- 浏览器限制：`speechSynthesis` 是单声道的
- 当前实现：使用串行播放模拟多声道
- 未来方案：使用TTS API + Web Audio API实现真正的多声道

---

## 🚀 未来优化方向

### 短期（1-2周）

1. **LLM Prompt优化**: 让模型直接生成简短内容（≤10字）
2. **翻译缓存**: 缓存翻译结果，减少API调用
3. **队列优化**: 进一步减少队列等待时间

### 中期（1-2月）

1. **Few-shot学习**: 在Prompt中添加示例
2. **方言扩展**: 支持更多方言（粤语、上海话等）
3. **语音缓存**: 缓存常用语音，减少TTS调用

### 长期（3-6月）

1. **模型微调**: 使用训练数据微调模型
2. **真正多声道**: 使用TTS API + Web Audio API
3. **方言语音包**: 支持方言专用语音

---

## 📊 完整流程图

### 从游戏事件到语音播放的完整流程

```
┌─────────────────────────────────────────────────────────────┐
│ 游戏事件触发（如：玩家出牌、捡分、要不起等）                    │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ ChatService.triggerEventChat() / triggerRandomChat()         │
│ - 选择策略（LLM 或 Rule-based）                              │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        │                               │
   LLM策略                        Rule-based策略
        │                               │
        ↓                               ↓
┌──────────────────┐          ┌──────────────────┐
│ LLMChatStrategy  │          │ RuleBasedChat   │
│ - 构建Prompt     │          │ - 从预定义规则   │
│ - 加入队列       │          │   随机选择       │
│ - 调用Ollama API │          └────────┬─────────┘
│ - 后处理         │                   │
└────────┬─────────┘                   │
         │                             │
         └───────────────┬─────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ ChatMessage生成（中文原文）                                    │
│ - content: 文本内容                                           │
│ - playerId: 玩家ID                                           │
│ - type: 消息类型（random/event/taunt/reply）                 │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ useChatBubbles 检测到新消息                                    │
│ - 监听ChatService的消息变化                                   │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 多语言翻译（如果当前语言不是中文）                              │
│ translateText()                                              │
│ - 检测文本语言（detectLanguage）                             │
│ - 判断是否需要翻译                                           │
│ - 调用MyMemory Translation API                               │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 创建翻译后的ChatMessage                                        │
│ - content: 翻译后的文本（用于显示和播放）                      │
│ - originalContent: 原文（保存）                              │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 方言转换（如果voiceConfig.dialect === 'nanchang'）            │
│ convertToNanchang()                                          │
│ - 使用映射表转换文本                                          │
│ - '厉害' → '恰噶'                                            │
│ - '傻逼' → '傻别'                                            │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 显示聊天气泡                                                  │
│ setActiveChatBubbles()                                       │
│ - 在玩家头像附近显示气泡                                      │
│ - 显示翻译后的文本                                           │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 播放语音（multiChannelVoiceService.speak()）                 │
│                                                              │
│ 1. 确定声道（根据playerId）                                  │
│    - 玩家0 → PLAYER_0（左声道）                              │
│    - 玩家1 → PLAYER_1（右声道）                              │
│    - 玩家2 → PLAYER_2（左中）                                │
│    - 玩家3 → PLAYER_3（右中）                                │
│                                                              │
│ 2. 去重检查                                                  │
│    - 检查是否正在播放相同文本                                │
│    - 检查最近3秒内是否播放过                                 │
│                                                              │
│ 3. 优先级处理                                                │
│    - 报牌（priority=4）→ 可以中断聊天                        │
│    - 聊天（priority=1-3）→ 加入队列                           │
│                                                              │
│ 4. 语言检测和语音选择                                        │
│    - detectLanguage() 检测文本语言                            │
│    - 如果voiceConfig有dialect → 使用方言映射                 │
│    - 选择匹配的SpeechSynthesisVoice                          │
│                                                              │
│ 5. 创建SpeechSynthesisUtterance                              │
│    - lang: 目标语言代码                                      │
│    - rate: 语速（voiceConfig.rate）                          │
│    - pitch: 音调（根据gender调整）                            │
│    - volume: 音量（voiceConfig.volume × 声道音量）           │
│                                                              │
│ 6. 播放                                                      │
│    - onStart → 显示气泡、设置播放状态                        │
│    - onEnd → 隐藏气泡、处理队列下一个                        │
│    - onError → 立即隐藏气泡                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 相关文档

- [多通道音频实现指南](./audio/multi-channel-audio.md)
- [LLM集成实现指南](./llm/llm-integration.md)
- [聊天和语音系统优化重构计划](../development/chat-voice-optimization.md)

---

**最后更新**: 2025-01-25


# 完整系统架构方案
## 多声道AI聊天系统 + LLM训练接口

---

## 📐 总体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        游戏事件触发                               │
│              (出牌、发牌、得分、对骂等)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LLM聊天处理服务层                              │
│                  (ChatProcessingService)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 提示词预处理  │    │  LLM调用接口  │    │ 返回信息后处理│
│   Pipeline   │───▶│   Manager    │───▶│   Pipeline   │
└──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    训练数据收集器                                │
│              (TrainingDataCollector)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    聊天消息输出                                  │
│                  (ChatMessage)                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  文本显示    │    │  翻译服务    │    │  多声道播放  │
│  (气泡UI)    │    │ (Translation)│    │ (MultiChannel)│
└──────────────┘    └──────────────┘    └──────────────┘
                             │                    │
                             │                    ▼
                             │          ┌─────────────────────┐
                             │          │  频道管理器         │
                             │          │ (ChannelManager)    │
                             │          └──────────┬──────────┘
                             │                     │
                             │          ┌──────────┴──────────┐
                             │          │                     │
                             ▼          ▼                     ▼
                    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                    │ 玩家0频道   │ │ 玩家1频道   │ │ 玩家2频道   │
                    │ (左声道)    │ │ (右声道)    │ │ (左中)      │
                    └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 🏗️ 核心组件设计

### 1. LLM聊天处理服务层

#### 1.1 提示词预处理管道 (Prompt Preprocessing Pipeline)

**功能：**
- 方言处理：根据玩家方言添加方言指令
- 上下文增强：添加游戏状态、历史记录
- 提示词优化：动态调整提示词模板
- 模板渲染：填充变量，生成最终提示词

**处理器列表：**
```typescript
1. DialectPromptProcessor      // 方言处理（优先级：1）
2. ContextEnhancerProcessor    // 上下文增强（优先级：2）
3. HistoryProcessor            // 历史记录处理（优先级：3）
4. TemplateRendererProcessor   // 模板渲染（优先级：4）
```

**示例：**
```typescript
// 输入：基础提示词 + 玩家信息（南昌话）
// 输出：增强后的提示词（包含南昌话指令）

基础提示词：
"你是一个过炸牌游戏的AI玩家..."

处理后：
"你是一个过炸牌游戏的AI玩家...

方言要求（南昌话）：
- 使用南昌话表达，例如：
  * "好牌" → "恰噶"
  * "要不起" → "要不到"
- 保持口语化，符合南昌话特色

游戏状态：
- 当前轮次：第3轮
- 玩家0得分：150分
..."
```

---

#### 1.2 LLM调用接口管理器 (LLM Provider Manager)

**功能：**
- 支持多个LLM提供者（Ollama、OpenAI、自定义等）
- 自动故障转移（Fallback）
- 请求重试机制
- 性能监控

**提供者列表：**
```typescript
1. OllamaProvider        // 本地Ollama（默认）
2. OpenAIProvider        // OpenAI API（可选）
3. CustomProvider        // 自定义API（可选）
```

**调用流程：**
```typescript
1. 检查提供者可用性
2. 发送请求（带超时控制）
3. 如果失败，尝试下一个提供者
4. 记录性能指标（延迟、token数等）
```

---

#### 1.3 返回信息后处理管道 (Response Postprocessing Pipeline)

**功能：**
- 内容清理：移除冗余、过长内容
- 长度控制：限制最大长度（15字）
- 格式标准化：统一标点、格式
- 翻译处理：根据UI语言翻译
- 方言适配：确保方言文本正确

**处理器列表：**
```typescript
1. ContentCleanerProcessor     // 内容清理（优先级：1）
2. LengthControllerProcessor   // 长度控制（优先级：2）
3. FormatNormalizerProcessor   // 格式标准化（优先级：3）
4. DialectAdapterProcessor     // 方言适配（优先级：4）
5. TranslationProcessor        // 翻译处理（优先级：5）
```

**示例：**
```typescript
// 输入：LLM原始返回
"好的，我觉得这手牌不错，应该可以出。"

// 处理流程：
1. ContentCleaner: "这手牌不错，应该可以出。"
2. LengthController: "这手牌不错" (15字限制)
3. FormatNormalizer: "这手牌不错！"
4. DialectAdapter: "恰噶！" (如果是南昌话)
5. Translation: "Good hand!" (如果UI是英文)

// 输出：最终内容
"恰噶！" 或 "Good hand!"
```

---

#### 1.4 训练数据收集器 (Training Data Collector)

**功能：**
- 收集完整处理流程数据
- 记录性能指标
- 导出训练数据集
- 质量评估

**数据格式：**
```typescript
{
  // 基础信息
  timestamp: number;
  playerId: number;
  eventType: string;
  
  // 提示词相关
  originalPrompt: string;
  processedPrompt: string;
  promptProcessors: string[];
  
  // LLM相关
  llmProvider: string;
  llmModel: string;
  rawContent: string;
  llmLatency: number;
  
  // 处理相关
  processedContent: string;
  responseProcessors: string[];
  processingTime: number;
  
  // 统计信息
  processingStats: {
    originalLength: number;
    processedLength: number;
    reduction: number;
    reductionPercent: number;
  };
  
  // 上下文
  context: {
    gameState: {...},
    eventData: {...},
    chatHistory: [...]
  }
}
```

**导出格式：**
- JSONL（用于训练）
- JSON（用于分析）
- CSV（用于Excel）

---

### 2. 多声道语音系统

#### 2.1 频道管理器 (Channel Manager)

**功能：**
- 管理每个玩家的独立频道
- 处理消息队列
- 控制并发播放
- 音量混合

**频道分配：**
```typescript
玩家0 → ChannelType.PLAYER_0 (左声道, pan=-0.7)
玩家1 → ChannelType.PLAYER_1 (右声道, pan=0.7)
玩家2 → ChannelType.PLAYER_2 (左中, pan=-0.3)
玩家3 → ChannelType.PLAYER_3 (右中, pan=0.3)
系统  → ChannelType.ANNOUNCEMENT (中央, pan=0.0)
```

**队列管理策略：**
```typescript
1. 每个频道维护独立队列
2. 高优先级消息可插队（如对骂）
3. 最多同时播放2-3个频道
4. 如果所有频道都想播放，按时间片轮转
```

---

#### 2.2 语音播放服务 (Voice Service)

**技术方案：**
- 使用浏览器 `speechSynthesis` API（免费）
- 通过参数差异化区分玩家（语速、音调、音量）
- 队列管理避免重叠播放
- 时间错开模拟并发（100-200ms延迟）

**语音参数差异化：**
```typescript
玩家0: { rate: 1.0, pitch: 1.0, volume: 0.9 }   // 正常
玩家1: { rate: 1.1, pitch: 1.1, volume: 0.95 }  // 稍快稍高
玩家2: { rate: 0.95, pitch: 0.9, volume: 0.85 }  // 稍慢稍低
玩家3: { rate: 1.05, pitch: 1.05, volume: 0.9 } // 稍快稍高
```

**播放流程：**
```typescript
1. 接收聊天消息（已处理后的文本）
2. 检查频道状态（是否正在播放）
3. 如果空闲，立即播放
4. 如果忙碌，加入队列
5. 播放时使用对应玩家的语音参数
```

---

#### 2.3 翻译服务集成 (Translation Service)

**功能：**
- 根据UI语言翻译聊天内容
- 支持多语言（中文、英文、韩文、日文等）
- 缓存翻译结果

**翻译流程：**
```typescript
1. 检查UI当前语言
2. 如果非中文，调用翻译API
3. 缓存翻译结果（避免重复翻译）
4. 返回翻译后的文本
```

**注意：**
- 方言文本（如南昌话）先用普通话TTS播放
- 如果UI是英文，翻译成英文后再播放

---

## 🎬 文字气泡与语音同步方案

### 设计目标
- ✅ 文字气泡与语音同时开始显示/播放
- ✅ 文字气泡在语音播放完成后自动消失
- ✅ 支持语音播放状态反馈（播放中动画）
- ✅ 处理语音播放失败的情况

### 实现方案

#### 1. 语音服务扩展（返回播放事件）

```typescript
// src/services/voiceService.ts (扩展)

interface SpeechPlaybackEvents {
  onStart?: () => void;      // 语音开始播放
  onEnd?: () => void;        // 语音播放完成
  onError?: (error: Error) => void;  // 播放出错
  estimatedDuration?: number; // 预估播放时长（毫秒）
}

class VoiceService {
  speak(
    text: string,
    voiceConfig?: VoiceConfig,
    playerId?: number,
    events?: SpeechPlaybackEvents  // 新增：播放事件回调
  ): Promise<void> {
    // 计算预估时长
    const estimatedDuration = this.calculateDuration(text, voiceConfig);
    events?.onStart?.();  // 通知开始播放
    
    return multiChannelVoiceService.speak(
      text,
      voiceConfig,
      channel,
      {
        onStart: events?.onStart,
        onEnd: events?.onEnd,
        onError: events?.onError,
        estimatedDuration
      }
    );
  }
  
  // 计算语音时长（基于文本长度和语速）
  private calculateDuration(text: string, voiceConfig?: VoiceConfig): number {
    const rate = voiceConfig?.rate || 1.0;
    // 中文：约0.3秒/字，英文：约0.15秒/字
    const charsPerSecond = /[\u4e00-\u9fa5]/.test(text) ? 3.3 : 6.7;
    const baseDuration = (text.length / charsPerSecond) * 1000;
    return Math.ceil(baseDuration / rate);
  }
}
```

#### 2. 聊天气泡组件增强（支持播放状态）

```typescript
// src/components/ChatBubble.tsx (增强)

interface ChatBubbleProps {
  message: ChatMessage;
  playerPosition: React.CSSProperties;
  isSpeaking?: boolean;        // 新增：是否正在播放语音
  onSpeechStart?: () => void;  // 新增：语音开始回调
  onSpeechEnd?: () => void;    // 新增：语音结束回调
  onComplete?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  playerPosition,
  isSpeaking = false,
  onSpeechStart,
  onSpeechEnd,
  onComplete
}) => {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // 监听语音播放状态
  useEffect(() => {
    if (isSpeaking && !speaking) {
      // 语音开始播放
      setSpeaking(true);
      setVisible(true);
      onSpeechStart?.();
    } else if (!isSpeaking && speaking) {
      // 语音播放完成
      setSpeaking(false);
      // 开始淡出动画
      setFadeOut(true);
      onSpeechEnd?.();
      // 淡出完成后隐藏
      setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 1000); // 淡出动画1秒
    }
  }, [isSpeaking, speaking, onSpeechStart, onSpeechEnd, onComplete]);

  // 如果语音播放失败，使用超时保护
  useEffect(() => {
    if (visible && !isSpeaking) {
      // 如果3秒后还没有开始播放，显示气泡
      const showTimer = setTimeout(() => {
        if (!speaking) {
          setVisible(true);
        }
      }, 50);
      
      // 如果10秒后还没有结束，自动隐藏（保护机制）
      const hideTimer = setTimeout(() => {
        if (visible && !isSpeaking) {
          setFadeOut(true);
          setTimeout(() => {
            setVisible(false);
            onComplete?.();
          }, 1000);
        }
      }, 10000);
      
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [visible, isSpeaking, speaking, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`chat-bubble ${fadeOut ? 'fade-out' : ''} ${message.type} ${speaking ? 'speaking' : ''}`}
      style={playerPosition}
    >
      <div className="chat-bubble-content">
        <div className="chat-bubble-name">{message.playerName}</div>
        <div className="chat-bubble-text">
          {message.content}
          {speaking && <span className="speaking-indicator">🔊</span>}
        </div>
      </div>
      <div className="chat-bubble-arrow"></div>
    </div>
  );
};
```

#### 3. useChatBubbles Hook 协调（同步显示和播放）

```typescript
// src/hooks/useChatBubbles.ts (增强)

export function useChatBubbles(gameState: MultiPlayerGameState) {
  const [activeChatBubbles, setActiveChatBubbles] = useState<Map<number, ChatMessage>>(new Map());
  const [speakingStates, setSpeakingStates] = useState<Map<number, boolean>>(new Map());
  const lastMessageIdRef = useRef<string | null>(null);

  // 监听聊天消息并同步显示和播放
  useEffect(() => {
    const messages = getChatMessages();
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      const messageId = `${latestMessage.playerId}-${latestMessage.timestamp}`;
      
      if (lastMessageIdRef.current === messageId) {
        return;
      }
      lastMessageIdRef.current = messageId;
      
      const player = gameState.players.find(p => p.id === latestMessage.playerId);
      
      // 翻译消息
      translateText(latestMessage.content, i18n.language || 'zh-CN')
        .then(translatedContent => {
          const translatedMessage: ChatMessage = {
            ...latestMessage,
            content: translatedContent
          };
          
          // 先显示气泡（但不完全显示，等待语音开始）
          setActiveChatBubbles(prev => {
            const newMap = new Map(prev);
            newMap.set(translatedMessage.playerId, translatedMessage);
            return newMap;
          });
          
          // 播放语音，并同步状态
          if (player?.voiceConfig) {
            const voiceConfigForTaunt = translatedMessage.type === 'taunt' 
              ? { ...player.voiceConfig, volume: Math.min(1.0, (player.voiceConfig.volume || 1.0) * 1.5) }
              : player.voiceConfig;
            
            // 设置播放状态
            setSpeakingStates(prev => {
              const newMap = new Map(prev);
              newMap.set(translatedMessage.playerId, true);
              return newMap;
            });
            
            // 播放语音，传入事件回调
            voiceService.speak(
              translatedContent,
              voiceConfigForTaunt,
              translatedMessage.playerId,
              {
                onStart: () => {
                  // 语音开始，确保气泡显示
                  setSpeakingStates(prev => {
                    const newMap = new Map(prev);
                    newMap.set(translatedMessage.playerId, true);
                    return newMap;
                  });
                },
                onEnd: () => {
                  // 语音结束，标记为不播放状态（触发淡出）
                  setSpeakingStates(prev => {
                    const newMap = new Map(prev);
                    newMap.set(translatedMessage.playerId, false);
                    return newMap;
                  });
                },
                onError: (error) => {
                  console.warn('[useChatBubbles] 语音播放失败:', error);
                  // 播放失败，3秒后自动隐藏
                  setTimeout(() => {
                    setSpeakingStates(prev => {
                      const newMap = new Map(prev);
                      newMap.set(translatedMessage.playerId, false);
                      return newMap;
                    });
                  }, 3000);
                }
              }
            ).catch(err => {
              console.warn('[useChatBubbles] 播放语音失败:', err);
              // 失败后3秒隐藏
              setTimeout(() => {
                setSpeakingStates(prev => {
                  const newMap = new Map(prev);
                  newMap.set(translatedMessage.playerId, false);
                  return newMap;
                });
              }, 3000);
            });
          } else {
            // 没有语音配置，3秒后自动隐藏
            setTimeout(() => {
              setSpeakingStates(prev => {
                const newMap = new Map(prev);
                newMap.set(translatedMessage.playerId, false);
                return newMap;
              });
            }, 3000);
          }
        });
    }
  }, [gameState.players, gameState.currentPlayerIndex]);

  // 移除聊天气泡
  const removeChatBubble = useCallback((playerId: number) => {
    setActiveChatBubbles(prev => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
    setSpeakingStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
  }, []);

  return {
    activeChatBubbles,
    speakingStates,  // 新增：播放状态
    removeChatBubble,
    getPlayerBubblePosition
  };
}
```

#### 4. 多声道服务扩展（支持事件回调）

```typescript
// src/services/multiChannelVoiceService.ts (扩展)

async speak(
  text: string,
  voiceConfig?: VoiceConfig,
  channel: ChannelType = ChannelType.PLAYER_0,
  events?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
    estimatedDuration?: number;
  }
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // ... 现有代码 ...
    
    const utterance = this.createUtterance(text, voiceConfig, voices);
    
    // 设置事件回调
    utterance.onstart = () => {
      events?.onStart?.();
      console.log(`[${channelConfig.name}] 开始播放:`, text);
    };
    
    utterance.onend = () => {
      events?.onEnd?.();
      cleanup();
      resolve();
    };
    
    utterance.onerror = (error) => {
      events?.onError?.(error as Error);
      cleanup();
      reject(error as Error);
    };
    
    // 播放
    window.speechSynthesis.speak(utterance);
  });
}
```

#### 5. CSS增强（播放中动画）

```css
/* src/components/ChatBubble.css (增强) */

.chat-bubble.speaking {
  animation: pulse 1.5s ease-in-out infinite;
}

.chat-bubble.speaking .chat-bubble-content {
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
}

.speaking-indicator {
  display: inline-block;
  margin-left: 8px;
  animation: bounce 0.6s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}
```

### 同步流程

```
1. 聊天消息生成
   ↓
2. 显示气泡（初始状态：等待语音）
   ↓
3. 开始播放语音
   ├─> onStart 事件触发
   ├─> 气泡完全显示（speaking=true）
   └─> 显示播放指示器 🔊
   ↓
4. 语音播放中
   ├─> 气泡保持显示
   └─> 播放动画效果
   ↓
5. 语音播放完成
   ├─> onEnd 事件触发
   ├─> speaking=false
   ├─> 开始淡出动画（1秒）
   └─> 淡出完成后隐藏气泡
```

### 错误处理

1. **语音播放失败**：3秒后自动隐藏气泡
2. **语音超时**：10秒保护机制，自动隐藏
3. **无语音配置**：3秒后自动隐藏

---

## 🔄 完整数据流

### 场景：玩家0出好牌，触发聊天

```
1. 游戏事件触发
   └─> 玩家0出好牌 → triggerEventChat(玩家0, GOOD_PLAY)

2. LLM聊天处理
   ├─> 提示词预处理
   │   ├─> DialectProcessor: 添加南昌话指令
   │   ├─> ContextProcessor: 添加游戏状态
   │   └─> TemplateProcessor: 渲染提示词
   │
   ├─> LLM调用
   │   ├─> 选择提供者（Ollama）
   │   ├─> 发送请求
   │   └─> 接收原始返回："好的，我觉得这手牌不错"
   │
   ├─> 返回信息后处理
   │   ├─> ContentCleaner: 移除"好的，我觉得"
   │   ├─> LengthController: 限制15字
   │   ├─> DialectAdapter: "这手牌不错" → "恰噶！"
   │   └─> Translation: 如果UI是英文 → "Good hand!"
   │
   └─> 训练数据收集
       └─> 保存完整处理流程数据

3. 聊天消息输出
   └─> ChatMessage {
         playerId: 0,
         content: "恰噶！",  // 或 "Good hand!"
         type: 'event'
       }

4. UI显示
   ├─> 显示聊天气泡（玩家0位置）
   └─> 触发语音播放

5. 多声道播放
   ├─> 获取玩家0的频道（ChannelType.PLAYER_0）
   ├─> 检查频道状态（空闲）
   ├─> 使用语音参数（rate: 1.0, pitch: 1.0）
   ├─> 调用 speechSynthesis 播放
   └─> 播放完成，释放频道
```

---

## 📦 文件结构

```
src/
├── services/
│   ├── chatProcessingService.ts      # 主处理服务（整合所有组件）
│   │
│   ├── prompt/
│   │   ├── promptPreprocessingPipeline.ts  # 提示词预处理管道
│   │   ├── processors/
│   │   │   ├── dialectPromptProcessor.ts  # 方言处理
│   │   │   ├── contextEnhancerProcessor.ts # 上下文增强
│   │   │   ├── historyProcessor.ts         # 历史记录
│   │   │   └── templateRendererProcessor.ts # 模板渲染
│   │   └── promptBuilder.ts               # 基础提示词构建
│   │
│   ├── llm/
│   │   ├── llmProviderManager.ts          # LLM提供者管理器
│   │   ├── providers/
│   │   │   ├── ILLMProvider.ts            # 接口定义
│   │   │   ├── ollamaProvider.ts          # Ollama提供者
│   │   │   ├── openAIProvider.ts          # OpenAI提供者（可选）
│   │   │   └── customProvider.ts          # 自定义提供者（可选）
│   │   └── llmConfig.ts                   # LLM配置
│   │
│   ├── response/
│   │   ├── responsePostprocessingPipeline.ts # 返回信息后处理管道
│   │   ├── processors/
│   │   │   ├── contentCleanerProcessor.ts    # 内容清理
│   │   │   ├── lengthControllerProcessor.ts # 长度控制
│   │   │   ├── formatNormalizerProcessor.ts  # 格式标准化
│   │   │   ├── dialectAdapterProcessor.ts    # 方言适配
│   │   │   └── translationProcessor.ts      # 翻译处理
│   │   └── contentProcessor.ts              # 现有内容处理（保留）
│   │
│   ├── training/
│   │   ├── trainingDataCollector.ts         # 训练数据收集器（扩展）
│   │   ├── trainingDataExporter.ts         # 数据导出工具
│   │   └── qualityAssessor.ts              # 质量评估（可选）
│   │
│   ├── voice/
│   │   ├── channelManager.ts               # 频道管理器
│   │   ├── multiChannelVoiceService.ts     # 多声道语音服务（现有，增强）
│   │   ├── voiceService.ts                 # 语音服务包装（现有）
│   │   └── voiceQueueManager.ts            # 语音队列管理
│   │
│   └── translationService.ts               # 翻译服务（现有，增强）
│
├── hooks/
│   ├── useChatBubbles.ts                   # 聊天气泡Hook（现有，增强）
│   └── useChatProcessing.ts                # 聊天处理Hook（新建）
│
└── config/
    ├── chatConfig.ts                       # 聊天配置（现有，扩展）
    ├── voiceConfig.ts                      # 语音配置（现有）
    └── trainingConfig.ts                   # 训练配置（新建）
```

---

## 🎯 核心优势

### 1. 成本优势
- ✅ **完全免费**：使用浏览器内置API
- ✅ **无需TTS API**：节省大量费用
- ✅ **本地LLM**：Ollama本地运行，无API费用

### 2. 功能优势
- ✅ **真正的多声道**：每个玩家独立频道
- ✅ **方言支持**：LLM生成方言文本
- ✅ **多语言支持**：自动翻译
- ✅ **训练数据完整**：记录全流程数据

### 3. 技术优势
- ✅ **可扩展架构**：易于添加新功能
- ✅ **可维护性**：职责分离，易于测试
- ✅ **高性能**：本地处理，延迟低
- ✅ **可插拔**：处理器可动态启用/禁用

---

## 🚀 实现优先级

### Phase 1: 核心架构（1-2周）
1. 实现提示词预处理管道
2. 实现LLM提供者管理器
3. 实现返回信息后处理管道
4. 扩展训练数据收集器
5. 创建统一聊天处理服务

### Phase 2: 多声道系统（1周）
1. 实现频道管理器
2. 增强多声道语音服务
3. 实现语音队列管理
4. 集成翻译服务

### Phase 3: 集成和优化（1周）
1. 集成所有组件
2. 优化性能
3. 添加错误处理
4. 编写测试

### Phase 4: 高级功能（可选）
1. 质量评估系统
2. A/B测试支持
3. 实时监控
4. 数据分析工具

---

## 📊 数据流示例

### 完整示例：玩家0（南昌话）出好牌

```typescript
// 1. 游戏事件
triggerEventChat(player0, ChatEventType.GOOD_PLAY)

// 2. 提示词预处理
原始提示词: "你是一个过炸牌游戏的AI玩家..."
↓
DialectProcessor: 添加南昌话指令
↓
ContextProcessor: 添加游戏状态
↓
最终提示词: "你是一个过炸牌游戏的AI玩家...\n方言要求（南昌话）...\n游戏状态..."

// 3. LLM调用
OllamaProvider.call({
  prompt: "最终提示词",
  model: "qwen2:0.5b"
})
↓
原始返回: "好的，我觉得这手牌不错，应该可以出。"

// 4. 返回信息后处理
ContentCleaner: "这手牌不错，应该可以出。"
↓
LengthController: "这手牌不错" (15字)
↓
DialectAdapter: "恰噶！" (南昌话)
↓
Translation: "恰噶！" (UI是中文，不翻译)

// 5. 训练数据收集
collectFullSample({
  originalPrompt: "...",
  processedPrompt: "...",
  rawContent: "好的，我觉得这手牌不错...",
  processedContent: "恰噶！",
  processingStats: {...},
  context: {...}
})

// 6. 输出聊天消息
ChatMessage {
  playerId: 0,
  content: "恰噶！",
  type: 'event'
}

// 7. UI显示
显示聊天气泡（玩家0位置，显示"恰噶！"）

// 8. 语音播放
ChannelManager.getChannel(0) → ChannelType.PLAYER_0
↓
VoiceService.speak("恰噶！", voiceConfig0, ChannelType.PLAYER_0)
↓
speechSynthesis.speak(utterance) // 使用普通话TTS播放南昌话文本
```

---

## 🔧 配置示例

### 聊天处理配置
```typescript
{
  // 提示词预处理
  promptProcessors: [
    'dialect',
    'context-enhancer',
    'history',
    'template-renderer'
  ],
  
  // LLM配置
  llm: {
    provider: 'ollama',
    model: 'qwen2:0.5b',
    temperature: 0.8,
    maxTokens: 50,
    timeout: 60000
  },
  
  // 返回信息后处理
  responseProcessors: [
    'content-cleaner',
    'length-controller',
    'format-normalizer',
    'dialect-adapter',
    'translation'
  ],
  
  // 训练数据收集
  training: {
    enabled: true,
    maxSamples: 10000,
    autoExport: false,
    exportFormat: 'jsonl'
  }
}
```

### 多声道配置
```typescript
{
  // 频道配置
  channels: {
    maxConcurrent: 2,  // 最多同时播放2个频道
    queueStrategy: 'priority',  // 优先级队列
    timeOffset: 150  // 时间错开（毫秒）
  },
  
  // 语音参数
  voiceParams: {
    player0: { rate: 1.0, pitch: 1.0, volume: 0.9 },
    player1: { rate: 1.1, pitch: 1.1, volume: 0.95 },
    player2: { rate: 0.95, pitch: 0.9, volume: 0.85 },
    player3: { rate: 1.05, pitch: 1.05, volume: 0.9 }
  }
}
```

---

## ✅ 总结

这个架构整合了：
1. ✅ **LLM聊天处理**：完整的预处理、调用、后处理流程
2. ✅ **训练数据收集**：记录全流程数据，支持未来训练
3. ✅ **多声道系统**：每个玩家独立频道，免费实现
4. ✅ **方言支持**：LLM生成方言文本，普通话TTS播放
5. ✅ **多语言支持**：自动翻译，国际化
6. ✅ **可扩展性**：易于添加新功能

**成本：0元**（完全免费）
**功能：完整**（满足所有需求）
**可维护性：高**（架构清晰，易于扩展）


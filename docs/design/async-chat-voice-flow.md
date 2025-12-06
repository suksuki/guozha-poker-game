# 异步聊天+语音流程设计

## 🎯 设计目标

1. **异步操作链**：LLM生成 → TTS生成 → 语音播放
2. **事件驱动**：使用事件总线处理异步回调
3. **队列管理**：确保消息不丢失，按优先级处理
4. **错误处理**：每个环节都有回退机制

## 📊 完整流程

```
游戏事件触发
  ↓
AI Brain 批量生成聊天（异步）
  ├─> 事件: communication:generated
  │   ├─> playerId: 1
  │   ├─> content: "就这？"
  │   ├─> intent: "taunt"
  │   └─> timestamp: 1234567890
  ↓
ChatStore 接收消息
  ├─> 添加到消息列表
  ├─> 显示聊天气泡
  └─> 触发事件: chat:message:received
  ↓
TTS服务生成语音（异步）
  ├─> 事件: tts:request
  │   ├─> messageId: "msg-xxx"
  │   ├─> text: "就这？"
  │   ├─> playerId: 1
  │   └─> priority: 3
  ├─> 调用TTS API（异步）
  │   ├─> 等待服务器响应
  │   └─> 返回音频文件（ArrayBuffer）
  └─> 事件: tts:complete
      ├─> messageId: "msg-xxx"
      ├─> audioBuffer: ArrayBuffer
      └─> duration: 1500
  ↓
语音播放服务（异步）
  ├─> 事件: audio:play:request
  │   ├─> messageId: "msg-xxx"
  │   ├─> audioBuffer: ArrayBuffer
  │   ├─> channel: PLAYER_1
  │   └─> priority: 3
  ├─> 加入播放队列
  ├─> 开始播放
  └─> 事件: audio:play:complete
      ├─> messageId: "msg-xxx"
      └─> duration: 1500
```

## 🔄 事件定义

### 1. 聊天生成事件

```typescript
// 事件: communication:generated
interface CommunicationGeneratedEvent {
  playerId: number;
  message: CommunicationMessage;
  timestamp: number;
}

// 事件: chat:message:received
interface ChatMessageReceivedEvent {
  messageId: string;
  playerId: number;
  content: string;
  intent: string;
  emotion?: string;
  timestamp: number;
}
```

### 2. TTS事件

```typescript
// 事件: tts:request
interface TTSRequestEvent {
  messageId: string;
  text: string;
  playerId: number;
  language?: string;
  voiceConfig?: VoiceConfig;
  priority: number;
}

// 事件: tts:complete
interface TTSCompleteEvent {
  messageId: string;
  audioBuffer: ArrayBuffer;
  duration: number;
  error?: Error;
}

// 事件: tts:error
interface TTSErrorEvent {
  messageId: string;
  error: Error;
  fallback?: boolean; // 是否使用回退方案
}
```

### 3. 语音播放事件

```typescript
// 事件: audio:play:request
interface AudioPlayRequestEvent {
  messageId: string;
  audioBuffer: ArrayBuffer;
  channel: ChannelType;
  priority: number;
}

// 事件: audio:play:start
interface AudioPlayStartEvent {
  messageId: string;
  channel: ChannelType;
  timestamp: number;
}

// 事件: audio:play:complete
interface AudioPlayCompleteEvent {
  messageId: string;
  channel: ChannelType;
  duration: number;
  timestamp: number;
}

// 事件: audio:play:error
interface AudioPlayErrorEvent {
  messageId: string;
  channel: ChannelType;
  error: Error;
}
```

## 🏗️ 架构设计

### 1. 聊天消息管理器（ChatMessageManager）

```typescript
class ChatMessageManager {
  private eventBus: EventBus;
  private pendingMessages: Map<string, PendingMessage> = new Map();
  
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // 监听AI Brain生成的聊天
    this.eventBus.on('communication:generated', (event: CommunicationGeneratedEvent) => {
      this.handleCommunicationGenerated(event);
    });
    
    // 监听TTS完成
    this.eventBus.on('tts:complete', (event: TTSCompleteEvent) => {
      this.handleTTSComplete(event);
    });
    
    // 监听TTS错误
    this.eventBus.on('tts:error', (event: TTSErrorEvent) => {
      this.handleTTSError(event);
    });
    
    // 监听播放完成
    this.eventBus.on('audio:play:complete', (event: AudioPlayCompleteEvent) => {
      this.handlePlayComplete(event);
    });
  }
  
  private handleCommunicationGenerated(event: CommunicationGeneratedEvent): void {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建待处理消息
    const pendingMessage: PendingMessage = {
      messageId,
      playerId: event.playerId,
      content: event.message.content,
      intent: event.message.intent,
      emotion: event.message.emotion,
      timestamp: event.timestamp,
      status: 'text_received', // text_received → tts_requested → tts_complete → audio_playing → complete
      ttsRequestTime: null,
      ttsCompleteTime: null,
      audioStartTime: null,
      audioCompleteTime: null
    };
    
    this.pendingMessages.set(messageId, pendingMessage);
    
    // 立即显示文字气泡
    this.eventBus.emit('chat:message:received', {
      messageId,
      playerId: event.playerId,
      content: event.message.content,
      intent: event.message.intent,
      emotion: event.message.emotion,
      timestamp: event.timestamp
    });
    
    // 触发TTS请求
    this.requestTTS(pendingMessage);
  }
  
  private requestTTS(message: PendingMessage): void {
    message.status = 'tts_requested';
    message.ttsRequestTime = Date.now();
    
    // 触发TTS请求事件
    this.eventBus.emit('tts:request', {
      messageId: message.messageId,
      text: message.content,
      playerId: message.playerId,
      language: this.determineLanguage(message.content),
      voiceConfig: this.getVoiceConfig(message.playerId),
      priority: this.getPriority(message.intent)
    });
  }
  
  private handleTTSComplete(event: TTSCompleteEvent): void {
    const message = this.pendingMessages.get(event.messageId);
    if (!message) {
      console.warn(`[ChatMessageManager] 收到TTS完成事件，但找不到消息: ${event.messageId}`);
      return;
    }
    
    message.status = 'tts_complete';
    message.ttsCompleteTime = Date.now();
    
    // 触发音频播放请求
    this.requestAudioPlay(message, event.audioBuffer);
  }
  
  private requestAudioPlay(message: PendingMessage, audioBuffer: ArrayBuffer): void {
    message.status = 'audio_requested';
    
    // 触发音频播放请求事件
    this.eventBus.emit('audio:play:request', {
      messageId: message.messageId,
      audioBuffer,
      channel: this.getChannelForPlayer(message.playerId),
      priority: this.getPriority(message.intent)
    });
  }
  
  private handlePlayComplete(event: AudioPlayCompleteEvent): void {
    const message = this.pendingMessages.get(event.messageId);
    if (!message) {
      return;
    }
    
    message.status = 'complete';
    message.audioCompleteTime = Date.now();
    
    // 清理（可选：保留一段时间用于统计）
    setTimeout(() => {
      this.pendingMessages.delete(event.messageId);
    }, 60000); // 1分钟后清理
  }
  
  private handleTTSError(event: TTSErrorEvent): void {
    const message = this.pendingMessages.get(event.messageId);
    if (!message) {
      return;
    }
    
    console.error(`[ChatMessageManager] TTS错误: ${event.error.message}`);
    
    // 如果启用回退，使用浏览器TTS
    if (event.fallback) {
      // 使用浏览器TTS作为回退
      this.fallbackToBrowserTTS(message);
    } else {
      // 标记为失败，只显示文字
      message.status = 'tts_failed';
    }
  }
  
  private fallbackToBrowserTTS(message: PendingMessage): void {
    // 使用浏览器TTS（同步，不需要等待）
    // 这里可以触发一个简化的事件
    this.eventBus.emit('audio:play:browser-tts', {
      messageId: message.messageId,
      text: message.content,
      playerId: message.playerId,
      channel: this.getChannelForPlayer(message.playerId)
    });
  }
  
  // 辅助方法
  private determineLanguage(text: string): string {
    // 简单的语言检测
    return 'zh-CN'; // 默认中文
  }
  
  private getVoiceConfig(playerId: number): VoiceConfig {
    // 根据玩家ID返回语音配置
    return {
      speaker: `player${playerId}`,
      rate: 1.0
    };
  }
  
  private getPriority(intent: string): number {
    const priorityMap: Record<string, number> = {
      'taunt': 3,
      'tactical_signal': 2,
      'social_chat': 1,
      'celebrate': 2
    };
    return priorityMap[intent] || 1;
  }
  
  private getChannelForPlayer(playerId: number): ChannelType {
    const channelMap: Record<number, ChannelType> = {
      0: ChannelType.PLAYER_0,
      1: ChannelType.PLAYER_1,
      2: ChannelType.PLAYER_2,
      3: ChannelType.PLAYER_3
    };
    return channelMap[playerId] || ChannelType.PLAYER_0;
  }
  
  // 获取统计信息
  getStatistics(): ChatMessageStatistics {
    const messages = Array.from(this.pendingMessages.values());
    return {
      total: messages.length,
      byStatus: {
        text_received: messages.filter(m => m.status === 'text_received').length,
        tts_requested: messages.filter(m => m.status === 'tts_requested').length,
        tts_complete: messages.filter(m => m.status === 'tts_complete').length,
        audio_playing: messages.filter(m => m.status === 'audio_playing').length,
        complete: messages.filter(m => m.status === 'complete').length,
        failed: messages.filter(m => m.status === 'tts_failed').length
      },
      averageTTSTime: this.calculateAverageTTSTime(messages),
      averageAudioTime: this.calculateAverageAudioTime(messages)
    };
  }
  
  private calculateAverageTTSTime(messages: PendingMessage[]): number {
    const completed = messages.filter(m => m.ttsCompleteTime && m.ttsRequestTime);
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, m) => sum + (m.ttsCompleteTime! - m.ttsRequestTime!), 0);
    return total / completed.length;
  }
  
  private calculateAverageAudioTime(messages: PendingMessage[]): number {
    const completed = messages.filter(m => m.audioCompleteTime && m.audioStartTime);
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, m) => sum + (m.audioCompleteTime! - m.audioStartTime!), 0);
    return total / completed.length;
  }
}
```

### 2. TTS服务适配器（TTSServiceAdapter）

```typescript
class TTSServiceAdapter {
  private eventBus: EventBus;
  private ttsService: TTSServiceManager;
  private pendingRequests: Map<string, TTSRequest> = new Map();
  
  constructor(eventBus: EventBus, ttsService: TTSServiceManager) {
    this.eventBus = eventBus;
    this.ttsService = ttsService;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // 监听TTS请求
    this.eventBus.on('tts:request', async (event: TTSRequestEvent) => {
      await this.handleTTSRequest(event);
    });
  }
  
  private async handleTTSRequest(event: TTSRequestEvent): Promise<void> {
    const request: TTSRequest = {
      messageId: event.messageId,
      text: event.text,
      playerId: event.playerId,
      language: event.language || 'zh-CN',
      voiceConfig: event.voiceConfig,
      priority: event.priority,
      timestamp: Date.now()
    };
    
    this.pendingRequests.set(event.messageId, request);
    
    try {
      // 调用TTS服务（异步）
      const result = await this.ttsService.synthesizeForScene(
        'chat',
        event.text,
        {
          language: event.language || 'zh-CN',
          voiceConfig: event.voiceConfig
        }
      );
      
      // 触发TTS完成事件
      this.eventBus.emit('tts:complete', {
        messageId: event.messageId,
        audioBuffer: result.audioBuffer,
        duration: result.duration
      });
      
      this.pendingRequests.delete(event.messageId);
    } catch (error) {
      // 触发TTS错误事件
      this.eventBus.emit('tts:error', {
        messageId: event.messageId,
        error: error as Error,
        fallback: true // 启用回退
      });
      
      this.pendingRequests.delete(event.messageId);
    }
  }
}
```

### 3. 音频播放适配器（AudioPlayAdapter）

```typescript
class AudioPlayAdapter {
  private eventBus: EventBus;
  private audioService: TTSAudioService;
  private pendingPlays: Map<string, AudioPlayRequest> = new Map();
  
  constructor(eventBus: EventBus, audioService: TTSAudioService) {
    this.eventBus = eventBus;
    this.audioService = audioService;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // 监听播放请求
    this.eventBus.on('audio:play:request', async (event: AudioPlayRequestEvent) => {
      await this.handlePlayRequest(event);
    });
    
    // 监听浏览器TTS回退
    this.eventBus.on('audio:play:browser-tts', (event: BrowserTTSEvent) => {
      this.handleBrowserTTS(event);
    });
  }
  
  private async handlePlayRequest(event: AudioPlayRequestEvent): Promise<void> {
    const request: AudioPlayRequest = {
      messageId: event.messageId,
      audioBuffer: event.audioBuffer,
      channel: event.channel,
      priority: event.priority,
      timestamp: Date.now()
    };
    
    this.pendingPlays.set(event.messageId, request);
    
    // 触发播放开始事件
    this.eventBus.emit('audio:play:start', {
      messageId: event.messageId,
      channel: event.channel,
      timestamp: Date.now()
    });
    
    try {
      // 调用音频服务播放（异步）
      await this.audioService.speak(
        '', // 文本为空，因为已经有audioBuffer
        undefined, // voiceConfig为空
        event.channel,
        {
          onStart: () => {
            // 播放真正开始时（可选）
          },
          onEnd: () => {
            // 触发播放完成事件
            this.eventBus.emit('audio:play:complete', {
              messageId: event.messageId,
              channel: event.channel,
              duration: Date.now() - request.timestamp,
              timestamp: Date.now()
            });
            
            this.pendingPlays.delete(event.messageId);
          },
          onError: (error) => {
            // 触发播放错误事件
            this.eventBus.emit('audio:play:error', {
              messageId: event.messageId,
              channel: event.channel,
              error
            });
            
            this.pendingPlays.delete(event.messageId);
          }
        },
        event.priority
      );
    } catch (error) {
      this.eventBus.emit('audio:play:error', {
        messageId: event.messageId,
        channel: event.channel,
        error: error as Error
      });
      
      this.pendingPlays.delete(event.messageId);
    }
  }
  
  private handleBrowserTTS(event: BrowserTTSEvent): void {
    // 使用浏览器TTS作为回退（同步）
    // 这里可以调用speechSynthesis
    // ...
  }
}
```

## 🔗 集成到AI Brain

```typescript
// 在 MasterAIBrain 或 GameBridge 中初始化
class GameBridge {
  private eventBus: EventBus;
  private chatMessageManager: ChatMessageManager;
  private ttsAdapter: TTSServiceAdapter;
  private audioAdapter: AudioPlayAdapter;
  
  constructor() {
    this.eventBus = new EventBus();
    
    // 初始化各个适配器
    this.chatMessageManager = new ChatMessageManager(this.eventBus);
    this.ttsAdapter = new TTSServiceAdapter(this.eventBus, ttsServiceManager);
    this.audioAdapter = new AudioPlayAdapter(this.eventBus, ttsAudioService);
    
    // 监听AI Brain的通信事件
    this.eventBus.on('communication:generated', (event) => {
      // ChatMessageManager会自动处理
    });
  }
}
```

## 📝 优势

1. **解耦**：每个环节独立，通过事件通信
2. **可追踪**：每个消息都有唯一ID，可以追踪整个流程
3. **错误处理**：每个环节都有错误处理和回退机制
4. **可扩展**：可以轻松添加新的环节（如翻译、情绪分析等）
5. **可测试**：每个组件都可以独立测试

## 🎯 下一步

1. 实现 `ChatMessageManager`
2. 实现 `TTSServiceAdapter`
3. 实现 `AudioPlayAdapter`
4. 集成到 `GameBridge`
5. 添加单元测试和集成测试


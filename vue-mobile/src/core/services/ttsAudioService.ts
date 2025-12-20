// @ts-nocheck
/**
 * 基于 TTS API 服务 + Web Audio API 的多声道语音服务
 * 
 * 方案：使用 TTS API 服务（GPT-SoVITS、Coqui TTS、Edge TTS等）生成音频文件，
 * 然后用 Web Audio API 播放，支持真正的多声道同时播放
 * 
 * 特性：
 * 1. 支持最多2-3个玩家同时说话
 * 2. 优先级管理（报牌 > 对骂 > 事件 > 随机）
 * 3. 音频缓存（减少API调用）
 * 4. 只使用TTS API服务，不使用speechSynthesis
 */

import { VoiceConfig } from '../types/card';
import { ChannelType } from '../types/channel';
import { getTTSServiceManager } from '../tts/ttsServiceManager';
import { TTSOptions, TTSLanguage } from '../tts/ttsClient';
import { DIALECT_LANG_MAP } from '../config/voiceConfig';
import { detectLanguage } from '../utils/languageDetection';
import { i18n } from '@/core/i18n';

interface ChannelConfig {
  pan: number;  // 声像位置 (-1 到 1)
  volume: number;  // 音量 (0 到 1)
  name: string;  // 声道名称
}

const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  [ChannelType.PLAYER_0]: { pan: -0.7, volume: 1.0, name: '玩家0（左）' },
  [ChannelType.PLAYER_1]: { pan: 0.7, volume: 1.0, name: '玩家1（右）' },
  [ChannelType.PLAYER_2]: { pan: -0.5, volume: 1.0, name: '玩家2（左中）' },
  [ChannelType.PLAYER_3]: { pan: 0.5, volume: 1.0, name: '玩家3（右中）' },
  [ChannelType.PLAYER_4]: { pan: -0.3, volume: 1.0, name: '玩家4（左环绕）' },
  [ChannelType.PLAYER_5]: { pan: 0.3, volume: 1.0, name: '玩家5（右环绕）' },
  [ChannelType.PLAYER_6]: { pan: -0.15, volume: 1.0, name: '玩家6（左后）' },
  [ChannelType.PLAYER_7]: { pan: 0.15, volume: 1.0, name: '玩家7（右后）' },
  [ChannelType.ANNOUNCEMENT]: { pan: 0.0, volume: 1.2, name: '报牌（中央）' }
};

// 播放项接口
interface PlayItem {
  text: string;
  voiceConfig?: VoiceConfig;
  channel: ChannelType;
  priority: number;  // 优先级：4=报牌，3=对骂，2=事件，1=随机
  audioBuffer: AudioBuffer;
  resolve: () => void;
  reject: (error: Error) => void;
  events?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  };
  source?: AudioBufferSourceNode;
}

// TTS服务商类型
import type { TTSProvider } from '../config/voiceConfig';

// 多声道播放配置
interface MultiChannelConfig {
  enabled: boolean;  // 是否启用多声道
  maxConcurrentSpeakers: number;  // 最多同时播放数（2-3）
  useTTS: boolean;  // 是否使用TTS服务（否则回退到speechSynthesis）
  ttsProvider?: TTSProvider;  // 指定TTS服务商（'auto'表示自动选择）
  enableDucking?: boolean;  // 是否启用ducking
  duckingLevel?: number;  // ducking时其他角色的音量级别
  enableAudioCache?: boolean;  // 是否启用音频缓存
  cacheSize?: number;  // 音频缓存大小
}

class TTSAudioService {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelGains: Map<ChannelType, GainNode> = new Map();
  private channelPanners: Map<ChannelType, StereoPannerNode> = new Map();
  
  // 当前正在播放的音频源（每个声道一个）
  private activeSources: Map<ChannelType, AudioBufferSourceNode> = new Map();
  
  // 每个声道的播放队列（按优先级排序）
  private channelQueues: Map<ChannelType, PlayItem[]> = new Map();
  
  // 当前并发播放数（用于统计，但不作为限制条件）
  private currentConcurrentCount: number = 0;
  
  // TTS服务管理器（使用单例）
  private ttsManager = getTTSServiceManager();
  
  // 音频缓存（缓存生成的AudioBuffer，避免重复生成）
  private audioCache: Map<string, AudioBuffer> = new Map();
  
  // 配置
  private config: MultiChannelConfig = {
    enabled: true,
    maxConcurrentSpeakers: 2,  // 默认最多2个同时播放
    useTTS: true,  // 默认使用TTS API服务
    ttsProvider: 'auto',  // 自动选择最佳TTS服务商
    enableDucking: true,  // 启用ducking
    duckingLevel: 0.25,  // ducking时其他角色音量降低到25%
    enableAudioCache: true,  // 启用音频缓存
    cacheSize: 100  // 缓存最多100个音频
  };

  // Ducking配置：当某个角色说话时，其他角色的音量降低
  private duckingConfig = {
    enabled: true,  // 是否启用ducking
    otherLevel: 0.25  // 其他角色的音量级别（0.2~0.35）
  };

  constructor() {
    this.initAudioContext();
  }

  /**
   * 初始化 Web Audio API
   */
  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 创建主音量控制
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioContext.destination);

      // 为每个声道创建节点
      Object.keys(CHANNEL_CONFIGS).forEach((key) => {
        const channel = parseInt(key) as ChannelType;
        const config = CHANNEL_CONFIGS[channel];

        const gainNode = this.audioContext!.createGain();
        gainNode.gain.value = config.volume;

        const pannerNode = this.audioContext!.createStereoPanner();
        pannerNode.pan.value = config.pan;

        gainNode.connect(pannerNode);
        pannerNode.connect(this.masterGain!);

        this.channelGains.set(channel, gainNode);
        this.channelPanners.set(channel, pannerNode);
      });

    } catch (error) {
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MultiChannelConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 更新ducking配置
    if (config.enableDucking !== undefined) {
      this.duckingConfig.enabled = config.enableDucking;
    }
    if (config.duckingLevel !== undefined) {
      this.duckingConfig.otherLevel = config.duckingLevel;
    }
    
    // 更新缓存大小
    if (config.cacheSize !== undefined && config.cacheSize < this.audioCache.size) {
      // 如果新缓存大小小于当前缓存，清理多余的缓存
      const entries = Array.from(this.audioCache.entries());
      const toKeep = entries.slice(-config.cacheSize);
      this.audioCache.clear();
      toKeep.forEach(([key, value]) => {
        this.audioCache.set(key, value);
      });
    }
    
    // 如果禁用缓存，清空缓存
    if (config.enableAudioCache === false) {
      this.audioCache.clear();
    }
    
  }

  /**
   * 播放语音（多声道）
   * 只使用TTS API服务，不使用speechSynthesis
   */
  async speak(
    text: string,
    voiceConfig?: VoiceConfig,
    channel: ChannelType = ChannelType.PLAYER_0,
    events?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    },
    priority: number = 1  // 优先级：3=对骂，2=事件，1=随机，4=报牌（最高）
  ): Promise<void> {
    // 如果未启用多声道或AudioContext未初始化，直接失败
    if (!this.config.enabled || !this.audioContext) {
      const error = new Error('多声道未启用或AudioContext未初始化');
      if (events?.onError) {
        events.onError(error);
      }
      return Promise.reject(error);
    }

    return new Promise(async (resolve, reject) => {
      try {
        // 生成音频（只使用TTS API服务）
        const audioBuffer = await this.generateAudio(text, voiceConfig, channel);
        
        if (!audioBuffer) {
          // 生成失败，直接失败（不使用speechSynthesis）
          const error = new Error('TTS服务音频生成失败');
          if (events?.onError) {
            events.onError(error);
          }
          reject(error);
          return;
        }

        // 音频生成完成，立即调用 onStart（让动画可以开始）
        // 这样动画和语音生成是同步的，播放会在生成完成后立即开始
        if (events?.onStart) {
          events.onStart();
        }

        // 创建播放项
        const playItem: PlayItem = {
          text,
          voiceConfig,
          channel,
          priority,
          audioBuffer,
          resolve,
          reject,
          events: {
            // 不在这里调用 onStart，因为已经在上面调用了
            // 只在播放真正开始时调用（用于其他用途）
            onEnd: events?.onEnd,
            onError: events?.onError
          }
        };

        // 添加到队列或立即播放
        this.addToQueue(playItem);
      } catch (error) {
        if (events?.onError) {
          events.onError(error as Error);
        }
        reject(error);
      }
    });
  }

  /**
   * 生成音频（使用本地TTS服务）
   * 
   * 注意：按照设计文档，不使用 speechSynthesis（它是单通道队列，会让 AI 排队）
   * 必须使用本地TTS服务生成音频文件（ArrayBuffer/AudioBuffer），然后通过Web Audio播放
   */
  private async generateAudio(
    text: string,
    voiceConfig?: VoiceConfig,
    channel?: ChannelType
  ): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      return null;
    }

    // 根据场景选择TTS提供者
    // 优先使用新的场景配置系统，回退到旧的localStorage配置
    let selectedProvider: TTSProvider | 'auto' = this.config.ttsProvider || 'auto';
    
    if (selectedProvider === 'auto' || !selectedProvider) {
      // 尝试从新的场景配置系统获取（通过TTSServiceManager）
      const ttsManager = getTTSServiceManager();
      const sceneConfig = ttsManager.getSceneConfig?.();
      
      if (sceneConfig) {
        // 使用新的场景配置
        if (channel === ChannelType.ANNOUNCEMENT) {
          // 报牌场景
          const serverIds = sceneConfig.announcementSound?.serverIds || [];
          if (serverIds.length > 0) {
            // 如果配置了特定服务器，使用场景化合成
            // 这里只是标记，实际合成由TTSServiceManager处理
            selectedProvider = 'auto'; // 使用自动选择
          } else {
            selectedProvider = 'piper'; // 默认使用piper
          }
        } else {
          // 聊天场景
          const serverIds = sceneConfig.chatSound?.serverIds || [];
          if (serverIds.length > 0) {
            selectedProvider = 'auto';
          } else {
            selectedProvider = 'piper';
          }
        }
      } else {
        // 回退到旧的localStorage配置（向后兼容）
        const announcementProvider = typeof window !== 'undefined' 
          ? (localStorage.getItem('tts_provider_announcement') as TTSProvider | null)
          : null;
        const chatProvider = typeof window !== 'undefined'
          ? (localStorage.getItem('tts_provider_chat') as TTSProvider | null)
          : null;
        
        if (channel === ChannelType.ANNOUNCEMENT) {
          selectedProvider = announcementProvider || 'piper';
        } else {
          selectedProvider = chatProvider || 'piper';
        }
      }
    }

    // 检查缓存（如果启用）- 缓存键需要包含 channel 和 provider 信息
    if (this.config.enableAudioCache !== false) {
      const cacheKey = this.getCacheKey(text, voiceConfig, channel, selectedProvider as TTSProvider);
      const cached = this.audioCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 尝试使用本地TTS服务生成音频
    // 如果 useTTS=false 或 TTS服务不可用，返回null，让调用者回退到speechSynthesis
    if (!this.config.useTTS) {
      return null;
    }

    try {
      // 确定语言
      const lang = this.determineLanguage(text, voiceConfig);
      
      // 构建TTS选项
      const ttsOptions: TTSOptions = {
        lang: lang as TTSLanguage,
        voiceConfig,
        useCache: true
      };

      // selectedProvider 已经在上面确定了（用于缓存键）
      
      // 使用TTS服务管理器生成音频
      const channelName = channel === ChannelType.ANNOUNCEMENT ? '📢报牌' : '💬聊天';
      let result;
      if (selectedProvider && selectedProvider !== 'auto') {
        // 使用指定的TTS服务商
        result = await this.ttsManager.synthesizeWithProvider(
          selectedProvider as any,
          text,
          ttsOptions
        );
      } else {
        // 自动选择最佳TTS服务商
        result = await this.ttsManager.synthesize(text, ttsOptions);
      }
      
      // 解码音频数据
      const audioBuffer = await this.audioContext.decodeAudioData(result.audioBuffer);
      
      // 缓存音频（如果启用）- 使用包含 channel 和 provider 的缓存键
      if (this.config.enableAudioCache !== false) {
        const cacheKey = this.getCacheKey(text, voiceConfig, channel, selectedProvider as TTSProvider);
        // 检查缓存大小限制
        if (this.audioCache.size >= (this.config.cacheSize || 100)) {
          // 删除最旧的缓存（FIFO）
          const firstKey = this.audioCache.keys().next().value;
          if (firstKey) {
            this.audioCache.delete(firstKey);
          }
        }
        this.audioCache.set(cacheKey, audioBuffer);
      }
      return audioBuffer;
    } catch (error) {
      return null;
    }
  }

  /**
   * 生成缓存键
   * 注意：缓存键需要包含 channel 信息，因为不同场景可能使用不同的 TTS 提供者
   */
  private getCacheKey(text: string, voiceConfig?: VoiceConfig, channel?: ChannelType, provider?: TTSProvider): string {
    const lang = voiceConfig?.lang || 'zh-CN';
    const dialect = voiceConfig?.dialect || '';
    const rate = voiceConfig?.rate || 1.0;
    const pitch = voiceConfig?.pitch || 1.0;
    const channelStr = channel !== undefined ? `|channel:${channel}` : '';
    const providerStr = provider ? `|provider:${provider}` : '';
    return `${text}|${lang}|${dialect}|${rate}|${pitch}${channelStr}${providerStr}`;
  }


  /**
   * 确定语言
   */
  private determineLanguage(text: string, voiceConfig?: VoiceConfig): string {
    // 检测文本语言
    const detectedLang = detectLanguage(text);
    const currentLang = i18n.language || 'zh-CN';

    // 如果voiceConfig有dialect，使用方言映射
    if (voiceConfig?.dialect) {
      if (currentLang.startsWith('zh')) {
        const lang = voiceConfig.dialect in DIALECT_LANG_MAP 
          ? DIALECT_LANG_MAP[voiceConfig.dialect as keyof typeof DIALECT_LANG_MAP]
          : 'zh-CN';
        return lang;
      } else {
        return detectedLang !== 'zh-CN' ? detectedLang : currentLang;
      }
    }

    // 否则使用检测到的语言或当前i18n语言
    return detectedLang !== 'zh-CN' ? detectedLang : currentLang;
  }

  /**
   * 添加到播放队列
   * 
   * 多声道并发控制策略：
   * 1. 报牌（ANNOUNCEMENT）：使用独立专用通道，与玩家聊天通道完全隔离，可以同时播放
   * 2. 玩家聊天（PLAYER_0-PLAYER_3）：每个玩家声道独立，可以同时播放
   * 3. 每个声道维护独立队列，不共享并发数限制
   * 4. 报牌和聊天使用不同通道，互不干扰，可以同时播放
   */
  private addToQueue(item: PlayItem): void {
    // 报牌使用独立的 ANNOUNCEMENT 声道，与玩家聊天通道完全隔离
    // 报牌和聊天可以同时播放，不需要中断聊天
    if (item.channel === ChannelType.ANNOUNCEMENT && item.priority === 4) {
      // 检查报牌通道是否正在播放
      const isAnnouncementBusy = this.activeSources.has(ChannelType.ANNOUNCEMENT);
      if (!isAnnouncementBusy) {
        // 报牌通道空闲，立即播放
        this.playAudio(item);
      } else {
        // 报牌通道正在播放，加入队列（或替换当前播放，根据需求）
        // 这里选择替换当前播放（后一个报牌替换前一个）
        const currentSource = this.activeSources.get(ChannelType.ANNOUNCEMENT);
        if (currentSource) {
          try {
            currentSource.stop();
          } catch (e) {
            // 忽略已停止的错误
          }
          this.activeSources.delete(ChannelType.ANNOUNCEMENT);
          this.currentConcurrentCount--;
        }
        this.playAudio(item);
      }
      return;
    }

    // 检查该声道是否正在播放
    const isChannelBusy = this.activeSources.has(item.channel);
    
    if (!isChannelBusy) {
      // 声道空闲，立即播放
      this.playAudio(item);
    } else {
      // 声道正在播放，加入该声道的队列
      this.addToChannelQueue(item);
    }
  }

  /**
   * 添加到声道队列
   */
  private addToChannelQueue(item: PlayItem): void {
    const queue = this.channelQueues.get(item.channel) || [];
    queue.push(item);
    // 按优先级排序（优先级高的在前）
    queue.sort((a, b) => b.priority - a.priority);
    this.channelQueues.set(item.channel, queue);
  }

  /**
   * 播放音频
   * 
   * 音频连接图（按照设计文档）：
   * source -> segGain -> roleGain -> panner -> masterGain -> destination
   */
  private async playAudio(item: PlayItem): Promise<void> {
    if (!this.audioContext) {
      item.reject(new Error('AudioContext 未初始化'));
      return;
    }

    // 确保 AudioContext 处于运行状态（浏览器可能暂停了）
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        item.reject(new Error('AudioContext 无法恢复运行'));
        return;
      }
    }

    // 注意：不同声道可以同时播放（多声道支持）
    // 只有同一声道的新播放才会停止该声道的旧播放
    // 报牌声道（ANNOUNCEMENT）是独立的，不会被聊天占用
    if (this.activeSources.has(item.channel)) {
      // 同一声道正在播放，停止它（让新播放开始）
      // 但不同声道可以同时播放，不会互相影响
      this.stopChannel(item.channel);
    } else {
      // 声道空闲，可以立即播放（与其他声道并行）
    }

    try {
      // 创建音频源
      const source = this.audioContext.createBufferSource();
      source.buffer = item.audioBuffer;
      item.source = source;

      // 获取声道节点（roleGain 和 panner）
      const roleGain = this.channelGains.get(item.channel);
      const panner = this.channelPanners.get(item.channel);
      if (!roleGain || !panner) {
        item.reject(new Error(`声道 ${item.channel} 不存在`));
        return;
      }

      // 创建段增益节点（segGain）- 用于单个音频段的音量控制
      const segGain = this.audioContext.createGain();
      const baseVolume = CHANNEL_CONFIGS[item.channel].volume;
      const voiceVolume = item.voiceConfig?.volume || 1.0;
      segGain.gain.value = baseVolume * voiceVolume;

      // 连接音频图：source -> segGain -> roleGain -> panner -> masterGain -> destination
      source.connect(segGain);
      segGain.connect(roleGain);
      // 注意：roleGain 已经连接到 panner，panner 已经连接到 masterGain（在 initAudioContext 中）
      // 所以这里只需要连接 segGain -> roleGain 即可

      // 验证连接

      // 应用ducking：降低其他角色的音量
      if (this.duckingConfig.enabled) {
        this.duckOthers(item.channel);
      }

      // 播放结束处理
      source.onended = () => {
        this.activeSources.delete(item.channel);
        this.currentConcurrentCount--;
        
        // 恢复其他角色的音量
        if (this.duckingConfig.enabled) {
          this.restoreOthersVolume();
        }
        
        // 触发onEnd事件
        if (item.events?.onEnd) {
          item.events.onEnd();
        }
        
        item.resolve();
        
        // 处理该声道队列中的下一个
        this.processChannelQueue(item.channel);
      };

      // 错误处理
      source.onerror = (error) => {
        this.activeSources.delete(item.channel);
        this.currentConcurrentCount--;
        
        // 恢复其他角色的音量
        if (this.duckingConfig.enabled) {
          this.restoreOthersVolume();
        }
        
        if (item.events?.onError) {
          item.events.onError(error as Error);
        }
        
        item.reject(error as Error);
        
        // 处理该声道队列中的下一个
        this.processChannelQueue(item.channel);
      };

      // 开始播放
      try {
        
        source.start(0);
        this.activeSources.set(item.channel, source);
        this.currentConcurrentCount++;

        // 注意：onStart 已经在音频生成完成后调用了（在 speak 方法中）
        // 这里不再调用，避免重复调用
        // 如果需要在播放真正开始时做其他事情，可以在这里添加

        // 显示当前所有正在播放的声道
        const activeChannels = Array.from(this.activeSources.keys()).map(ch => CHANNEL_CONFIGS[ch].name).join(', ');
      } catch (error) {
        this.currentConcurrentCount--;
        if (item.events?.onError) {
          item.events.onError(error as Error);
        }
        item.reject(error as Error);
        this.processQueue();
        return;
      }
    } catch (error) {
      this.currentConcurrentCount--;
      item.reject(error as Error);
    }
  }

  /**
   * Ducking：降低其他角色的音量
   * 当某个角色说话时，其他角色的音量降低到 otherLevel
   */
  private duckOthers(activeChannel: ChannelType): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const fadeTime = 0.05; // 50ms 淡入淡出时间

    this.channelGains.forEach((gain, channel) => {
      // 检查 setTargetAtTime 方法是否可用（测试环境可能没有）
      if (!gain.gain.setTargetAtTime) {
        return;
      }

      if (channel !== activeChannel) {
        const targetVolume = this.duckingConfig.otherLevel;
        const currentVolume = gain.gain.value;
        const baseVolume = CHANNEL_CONFIGS[channel].volume;
        
        // 计算目标音量（保持相对比例）
        const targetGain = baseVolume * targetVolume;
        
        // 平滑降低音量
        gain.gain.setTargetAtTime(targetGain, now, fadeTime);
      } else {
        // 当前说话的角色保持正常音量
        const baseVolume = CHANNEL_CONFIGS[channel].volume;
        gain.gain.setTargetAtTime(baseVolume, now, fadeTime);
      }
    });
  }

  /**
   * 恢复其他角色的音量
   */
  private restoreOthersVolume(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const fadeTime = 0.05; // 50ms 淡入淡出时间

    this.channelGains.forEach((gain, channel) => {
      // 检查 setTargetAtTime 方法是否可用（测试环境可能没有）
      if (!gain.gain.setTargetAtTime) {
        return;
      }

      const baseVolume = CHANNEL_CONFIGS[channel].volume;
      gain.gain.setTargetAtTime(baseVolume, now, fadeTime);
    });
  }

  /**
   * 处理声道队列
   * 当声道空闲时，播放队列中的下一个
   */
  private processChannelQueue(channel: ChannelType): void {
    // 检查声道是否空闲
    if (this.activeSources.has(channel)) {
      return; // 声道还在播放，不处理队列
    }

    // 获取该声道的队列
    const queue = this.channelQueues.get(channel);
    if (!queue || queue.length === 0) {
      return; // 队列为空
    }

    // 播放队列中的下一个
    const nextItem = queue.shift();
    if (nextItem) {
      this.playAudio(nextItem).catch(error => {
        nextItem.reject(error);
        // 继续处理队列
        this.processChannelQueue(channel);
      });
    }
  }

  /**
   * 中断所有非报牌播放
   * 报牌使用独立的 ANNOUNCEMENT 声道，可以中断所有聊天播放
   */
  private interruptNonAnnouncement(): void {
    let interruptedCount = 0;
    this.activeSources.forEach((source, channel) => {
      if (channel !== ChannelType.ANNOUNCEMENT) {
        try {
          source.stop();
          interruptedCount++;
        } catch (e) {
          // 忽略已停止的错误
        }
        this.activeSources.delete(channel);
        this.currentConcurrentCount--;
        
        // 注意：不清理声道队列，让它们继续等待播放
        // 这样当报牌结束后，玩家聊天可以继续
      }
    });
    
    if (interruptedCount > 0) {
    }
    // 清空所有声道队列中的非报牌项（报牌使用独立声道，不受聊天影响）
    this.channelQueues.forEach((queue, channel) => {
      if (channel !== ChannelType.ANNOUNCEMENT) {
        // 清空聊天声道的队列（报牌结束后，聊天会重新触发）
        this.channelQueues.set(channel, []);
      }
    });
  }

  /**
   * 停止指定声道
   */
  stopChannel(channel: ChannelType): void {
    const source = this.activeSources.get(channel);
    if (source) {
      try {
        source.stop();
      } catch (e) {
        // 忽略已停止的错误
      }
      this.activeSources.delete(channel);
      this.currentConcurrentCount--;
      
      // 处理队列
      this.processQueue();
    }
  }

  /**
   * 停止所有播放
   */
  stop(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // 忽略已停止的错误
      }
    });
    this.activeSources.clear();
    // 清空所有声道队列
    this.channelQueues.clear();
    this.currentConcurrentCount = 0;
  }

  /**
   * 回退到 speechSynthesis（单声道串行播放）
   */
  private fallbackToSpeechSynthesis(
    text: string,
    voiceConfig: VoiceConfig | undefined,
    channel: ChannelType,
    events?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        if (events?.onError) {
          events.onError(new Error('speechSynthesis 不支持'));
        }
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const config = CHANNEL_CONFIGS[channel];

      if (voiceConfig) {
        utterance.lang = voiceConfig.lang || 'zh-CN';
        utterance.rate = voiceConfig.rate || 1.0;
        utterance.pitch = voiceConfig.pitch || 1.0;
        utterance.volume = (voiceConfig.volume || 1.0) * config.volume;
      } else {
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = config.volume;
      }

      if (events?.onStart) {
        utterance.onstart = () => {
          events.onStart!();
        };
      }

      utterance.onend = () => {
        if (events?.onEnd) {
          events.onEnd();
        }
        resolve();
      };

      utterance.onerror = (error) => {
        if (events?.onError) {
          events.onError(error as Error);
        }
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    enabled: boolean;
    currentConcurrent: number;
    maxConcurrent: number;
    queueLength: number;
    activeChannels: ChannelType[];
    cacheSize: number;
    cacheMaxSize: number;
    ttsProvider: string;
    duckingEnabled: boolean;
  } {
    return {
      enabled: this.config.enabled,
      currentConcurrent: this.currentConcurrentCount,
      maxConcurrent: this.config.maxConcurrentSpeakers,
      queueLength: Array.from(this.channelQueues.values()).reduce((sum, queue) => sum + queue.length, 0),
      activeChannels: Array.from(this.activeSources.keys()),
      cacheSize: this.audioCache.size,
      cacheMaxSize: this.config.cacheSize || 100,
      ttsProvider: this.config.ttsProvider || 'auto',
      duckingEnabled: this.duckingConfig.enabled
    };
  }

  /**
   * 获取TTS服务商状态
   */
  async getTTSProviderStatus(): Promise<Record<string, { enabled: boolean; healthy: boolean }>> {
    return this.ttsManager.getProviderStatus();
  }

  /**
   * 清空音频缓存
   */
  clearCache(): void {
    this.audioCache.clear();
  }

  /**
   * 设置声道的声像位置（pan值）
   * @param channel 声道
   * @param pan 声像位置（-1 到 1）
   */
  setChannelPan(channel: ChannelType, pan: number): void {
    const panner = this.channelPanners.get(channel);
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
    } else {
    }
  }
}

export const ttsAudioService = new TTSAudioService();
// @ts-nocheck

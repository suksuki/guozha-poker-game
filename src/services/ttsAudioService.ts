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
import { TTSServiceManager } from '../tts/ttsServiceManager';
import { TTSOptions, TTSLanguage } from '../tts/ttsClient';
import { DIALECT_LANG_MAP } from '../config/voiceConfig';
import { detectLanguage } from '../utils/languageDetection';
import i18n from '../i18n';

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
  
  // 当前正在播放的音频源
  private activeSources: Map<ChannelType, AudioBufferSourceNode> = new Map();
  
  // 播放队列（按优先级排序）
  private playQueue: PlayItem[] = [];
  
  // 当前并发播放数
  private currentConcurrentCount: number = 0;
  
  // TTS服务管理器
  private ttsManager: TTSServiceManager;
  
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
    this.ttsManager = new TTSServiceManager();
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

      console.log('[TTSAudioService] Web Audio API 已初始化');
    } catch (error) {
      console.error('[TTSAudioService] 初始化失败:', error);
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
    
    console.log('[TTSAudioService] 配置已更新:', this.config);
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
      console.error('[TTSAudioService]', error.message);
      if (events?.onError) {
        events.onError(error);
      }
      return Promise.reject(error);
    }

    return new Promise(async (resolve, reject) => {
      try {
        // 生成音频（只使用TTS API服务）
        const audioBuffer = await this.generateAudio(text, voiceConfig);
        
        if (!audioBuffer) {
          // 生成失败，直接失败（不使用speechSynthesis）
          const error = new Error('TTS服务音频生成失败');
          console.error('[TTSAudioService]', error.message);
          if (events?.onError) {
            events.onError(error);
          }
          reject(error);
          return;
        }

        // 音频生成完成，立即调用 onStart（让动画可以开始）
        // 这样动画和语音生成是同步的，播放会在生成完成后立即开始
        console.log(`[TTSAudioService] ✅ 音频生成完成: "${text.substring(0, 20)}..." (时长: ${audioBuffer.duration.toFixed(2)}s, 采样率: ${audioBuffer.sampleRate}Hz)`);
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
        console.error('[TTSAudioService] 播放失败:', error);
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
    voiceConfig?: VoiceConfig
  ): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      return null;
    }

    // 检查缓存（如果启用）
    if (this.config.enableAudioCache !== false) {
      const cacheKey = this.getCacheKey(text, voiceConfig);
      const cached = this.audioCache.get(cacheKey);
      if (cached) {
        console.log(`[TTSAudioService] 使用缓存音频: ${text.substring(0, 20)}...`);
        return cached;
      }
    }

    // 尝试使用本地TTS服务生成音频
    // 如果 useTTS=false 或 TTS服务不可用，返回null，让调用者回退到speechSynthesis
    if (!this.config.useTTS) {
      console.warn('[TTSAudioService] useTTS=false，将回退到speechSynthesis（单声道串行播放）');
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

      // 使用TTS服务管理器生成音频
      let result;
      if (this.config.ttsProvider && this.config.ttsProvider !== 'auto') {
        // 使用指定的TTS服务商
        result = await this.ttsManager.synthesizeWithProvider(
          this.config.ttsProvider as any,
          text,
          ttsOptions
        );
      } else {
        // 自动选择最佳TTS服务商
        result = await this.ttsManager.synthesize(text, ttsOptions);
      }
      
      // 解码音频数据
      const audioBuffer = await this.audioContext.decodeAudioData(result.audioBuffer);
      
      // 缓存音频（如果启用）
      if (this.config.enableAudioCache !== false) {
        const cacheKey = this.getCacheKey(text, voiceConfig);
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
      
      console.log(`[TTSAudioService] TTS服务音频生成成功: ${text.substring(0, 20)}... (${audioBuffer.duration.toFixed(2)}s)`);
      return audioBuffer;
    } catch (error) {
      console.error('[TTSAudioService] TTS服务生成失败，将回退到speechSynthesis（单声道串行播放）:', error);
      return null;
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(text: string, voiceConfig?: VoiceConfig): string {
    const lang = voiceConfig?.lang || 'zh-CN';
    const dialect = voiceConfig?.dialect || '';
    const rate = voiceConfig?.rate || 1.0;
    const pitch = voiceConfig?.pitch || 1.0;
    return `${text}|${lang}|${dialect}|${rate}|${pitch}`;
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
   */
  private addToQueue(item: PlayItem): void {
    // 报牌优先级最高，可以中断其他播放
    if (item.channel === ChannelType.ANNOUNCEMENT && item.priority === 4) {
      // 中断所有非报牌播放
      this.interruptNonAnnouncement();
      // 立即播放报牌
      this.playAudio(item);
      return;
    }

    // 检查是否可以立即播放
    if (this.currentConcurrentCount < this.config.maxConcurrentSpeakers) {
      this.playAudio(item);
    } else {
      // 加入队列（按优先级排序）
      this.playQueue.push(item);
      this.playQueue.sort((a, b) => b.priority - a.priority);  // 优先级高的在前
      console.log(`[TTSAudioService] 队列已满，加入队列（队列长度: ${this.playQueue.length}）:`, item.text.substring(0, 20));
    }
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
        console.log('[TTSAudioService] AudioContext 已恢复运行');
      } catch (error) {
        console.error('[TTSAudioService] 恢复 AudioContext 失败:', error);
        item.reject(new Error('AudioContext 无法恢复运行'));
        return;
      }
    }

    // 如果该声道正在播放，先停止
    this.stopChannel(item.channel);

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
      console.log(`[TTSAudioService] 音频连接验证:`, {
        channel: CHANNEL_CONFIGS[item.channel].name,
        segGain: segGain.gain.value,
        roleGain: roleGain.gain.value,
        panner: panner.pan.value,
        masterGain: this.masterGain?.gain.value,
        audioBufferDuration: item.audioBuffer.duration,
        audioBufferSampleRate: item.audioBuffer.sampleRate,
        audioBufferChannels: item.audioBuffer.numberOfChannels
      });

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
        
        // 处理队列中的下一个
        this.processQueue();
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
        
        // 处理队列中的下一个
        this.processQueue();
      };

      // 开始播放
      try {
        source.start(0);
        this.activeSources.set(item.channel, source);
        this.currentConcurrentCount++;

        // 注意：onStart 已经在音频生成完成后调用了（在 speak 方法中）
        // 这里不再调用，避免重复调用
        // 如果需要在播放真正开始时做其他事情，可以在这里添加

        console.log(`[TTSAudioService] ✅ 音频开始播放: ${CHANNEL_CONFIGS[item.channel].name} - "${item.text.substring(0, 20)}..." (并发数: ${this.currentConcurrentCount}/${this.config.maxConcurrentSpeakers}, 时长: ${item.audioBuffer.duration.toFixed(2)}s)`);
      } catch (error) {
        console.error(`[TTSAudioService] ❌ 播放失败:`, error);
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
      const baseVolume = CHANNEL_CONFIGS[channel].volume;
      gain.gain.setTargetAtTime(baseVolume, now, fadeTime);
    });
  }

  /**
   * 处理播放队列
   */
  private processQueue(): void {
    // 如果还有空位且队列不为空
    while (this.currentConcurrentCount < this.config.maxConcurrentSpeakers && this.playQueue.length > 0) {
      const nextItem = this.playQueue.shift();
      if (nextItem) {
        this.playAudio(nextItem).catch(error => {
          console.error('[TTSAudioService] 播放队列项失败:', error);
          nextItem.reject(error);
        });
      }
    }
  }

  /**
   * 中断所有非报牌播放
   */
  private interruptNonAnnouncement(): void {
    this.activeSources.forEach((source, channel) => {
      if (channel !== ChannelType.ANNOUNCEMENT) {
        try {
          source.stop();
        } catch (e) {
          // 忽略已停止的错误
        }
        this.activeSources.delete(channel);
        this.currentConcurrentCount--;
      }
    });
    
    // 清空队列中的非报牌项
    this.playQueue = this.playQueue.filter(item => item.channel === ChannelType.ANNOUNCEMENT);
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
    this.playQueue = [];
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
        console.error('[TTSAudioService] speechSynthesis 不支持');
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
          console.log(`[TTSAudioService] 开始播放（speechSynthesis）: ${CHANNEL_CONFIGS[channel].name} - "${text.substring(0, 30)}..."`);
          events.onStart!();
        };
      }

      utterance.onend = () => {
        console.log(`[TTSAudioService] 播放完成（speechSynthesis）: ${CHANNEL_CONFIGS[channel].name} - "${text.substring(0, 30)}..."`);
        if (events?.onEnd) {
          events.onEnd();
        }
        resolve();
      };

      utterance.onerror = (error) => {
        console.error(`[TTSAudioService] 播放错误（speechSynthesis）: ${CHANNEL_CONFIGS[channel].name} - "${text.substring(0, 30)}..."`, error);
        if (events?.onError) {
          events.onError(error as Error);
        }
        resolve();
      };

      console.log(`[TTSAudioService] 使用speechSynthesis播放: ${CHANNEL_CONFIGS[channel].name} - "${text.substring(0, 30)}..." (lang: ${utterance.lang}, volume: ${utterance.volume})`);
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
      queueLength: this.playQueue.length,
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
    console.log('[TTSAudioService] 音频缓存已清空');
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
      console.log(`[TTSAudioService] 设置声道 ${channel} 的pan值为 ${pan}`);
    } else {
      console.warn(`[TTSAudioService] 声道 ${channel} 不存在，无法设置pan值`);
    }
  }
}

export const ttsAudioService = new TTSAudioService();

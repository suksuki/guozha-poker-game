// @ts-nocheck
/**
 * 多声道语音服务（串行播放版本）
 * 使用浏览器原生 speechSynthesis API
 * 每个玩家分配一个声道，报牌使用独立声道
 * 支持多语言语音（根据当前 i18n 语言选择）
 * 
 * 注意：由于 speechSynthesis 是单声道API，采用串行播放策略
 * - 聊天语音：一次只播放一个，按优先级排序（对骂 > 事件 > 随机）
 * - 报牌语音：可以中断聊天，优先级最高
 */

import { VoiceConfig } from '../types/card';
import { ChannelType } from '../types/channel';
import {
  DIALECT_LANG_MAP,
  VoiceServiceConfig,
  DEFAULT_VOICE_SERVICE_CONFIG,
  MultiChannelConfig,
  DEFAULT_MULTI_CHANNEL_CONFIG,
  TTSProvider
} from '../config/voiceConfig';
import { i18n } from '../i18n';
import { detectLanguage } from '../utils/languageDetection';
import { ttsAudioService } from './ttsAudioService';
import { ChannelScheduler, PlaybackPriority, PlayRequest, ChannelUsage } from './channelScheduler';

// 声道配置
interface ChannelConfig {
  pan: number;  // 声道位置 (-1 到 1，-1=左，0=中，1=右)
  volume: number;  // 音量 (0 到 1)
  name: string;  // 声道名称
}

// 默认声道配置（支持8个玩家）
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

// 语音播放项
interface SpeechItem {
  text: string;
  voiceConfig?: VoiceConfig;
  channel: ChannelType;
  resolve: () => void;
  reject: (error: Error) => void;
  utterance: SpeechSynthesisUtterance;
  priority: number; // 优先级：3=对骂，2=事件，1=随机，4=报牌（最高）
  events?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
    estimatedDuration?: number;
  };
}

// 多声道语音服务类
class MultiChannelVoiceService {
  private config: VoiceServiceConfig;
  private multiChannelConfig: MultiChannelConfig;
  private voicesReady: boolean = false;
  private voicesLoadPromise: Promise<SpeechSynthesisVoice[]> | null = null;
  
  // 声道调度器（可选，如果启用则使用新的调度逻辑）
  private channelScheduler?: ChannelScheduler;
  private useChannelScheduler: boolean = false;
  
  // 每个声道的当前播放项
  private channelItems: Map<ChannelType, SpeechItem> = new Map();
  
  // 每个声道的语音队列（用于排队播放）
  private channelQueues: Map<ChannelType, SpeechItem[]> = new Map();
  
  // 串行播放控制（方案A：一次只播放一个聊天语音）
  private isPlayingChat: boolean = false; // 是否正在播放聊天语音
  private chatQueue: SpeechItem[] = []; // 统一聊天队列（按优先级排序）
  
  // 去重检查
  private lastSpeechText: Map<ChannelType, string> = new Map();
  private lastSpeechTime: Map<ChannelType, number> = new Map();
  
  // 正在处理的请求（防止并发调用）
  private pendingRequests: Map<ChannelType, Set<string>> = new Map();

  constructor(
    config: VoiceServiceConfig = DEFAULT_VOICE_SERVICE_CONFIG,
    multiChannelConfig: MultiChannelConfig = DEFAULT_MULTI_CHANNEL_CONFIG,
    useChannelScheduler: boolean = true // 默认启用新的调度器
  ) {
    this.config = config;
    this.multiChannelConfig = multiChannelConfig;
    this.useChannelScheduler = useChannelScheduler;
    this.preloadVoices();
    
    // 如果启用新的调度器，创建实例
    if (this.useChannelScheduler && this.multiChannelConfig.enabled) {
      this.channelScheduler = new ChannelScheduler();
    }
    
    // 如果启用多声道，同步配置到ttsAudioService
    if (this.multiChannelConfig.enabled) {
      this.syncConfigToTTSAudioService();
    }
  }

  /**
   * 同步配置到ttsAudioService
   */
  private syncConfigToTTSAudioService(): void {
    ttsAudioService.updateConfig({
      enabled: true,
      maxConcurrentSpeakers: this.multiChannelConfig.maxConcurrentSpeakers,
      useTTS: this.multiChannelConfig.useTTS,
      enableDucking: this.multiChannelConfig.enableDucking ?? true,
      duckingLevel: this.multiChannelConfig.duckingLevel ?? 0.25,
      enableAudioCache: this.multiChannelConfig.enableAudioCache ?? true,
      cacheSize: this.multiChannelConfig.cacheSize ?? 100,
      ttsProvider: this.multiChannelConfig.ttsProvider || 'auto'
    });
  }

  /**
   * 更新多声道配置
   */
  updateMultiChannelConfig(config: Partial<MultiChannelConfig>): void {
    this.multiChannelConfig = { ...this.multiChannelConfig, ...config };
    
    // 同步配置到ttsAudioService
    if (this.multiChannelConfig.enabled) {
      this.syncConfigToTTSAudioService();
    } else {
      ttsAudioService.updateConfig({ enabled: false });
    }
    
  }

  /**
   * 获取多声道配置
   */
  getMultiChannelConfig(): MultiChannelConfig {
    return { ...this.multiChannelConfig };
  }

  /**
   * 获取TTS服务商状态
   */
  async getTTSProviderStatus(): Promise<Record<string, { enabled: boolean; healthy: boolean }>> {
    if (!this.multiChannelConfig.enabled || !this.multiChannelConfig.useTTS) {
      return {};
    }
    
    try {
      const { getTTSServiceManager } = await import('../tts/ttsServiceManager');
      const ttsManager = getTTSServiceManager();
      return ttsManager.getProviderStatus();
    } catch (error) {
      return {};
    }
  }

  /**
   * 设置TTS服务商（便捷方法）
   */
  setTTSProvider(provider: TTSProvider): void {
    this.updateMultiChannelConfig({
      ttsProvider: provider
    });
  }

  /**
   * 恢复AudioContext（如果被暂停）
   */
  async resumeAudioContext(): Promise<void> {
    if (this.multiChannelConfig.enabled) {
      await ttsAudioService.resumeAudioContext();
    }
  }

  // 预加载语音
  private preloadVoices(): void {
    if (!('speechSynthesis' in window)) {
      this.voicesReady = true;
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      this.voicesReady = true;
      return;
    }

    this.voicesLoadPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
      const checkVoices = () => {
        const loadedVoices = window.speechSynthesis.getVoices();
        if (loadedVoices.length > 0) {
          this.voicesReady = true;
          resolve(loadedVoices);
        } else {
          window.speechSynthesis.onvoiceschanged = () => {
            const finalVoices = window.speechSynthesis.getVoices();
            this.voicesReady = true;
            resolve(finalVoices);
          };
        }
      };
      
      checkVoices();
      
      setTimeout(() => {
        if (!this.voicesReady) {
          const fallbackVoices = window.speechSynthesis.getVoices();
          this.voicesReady = true;
          resolve(fallbackVoices);
        }
      }, 1000);
    });
  }

  // 确保语音已加载
  private async ensureVoicesReady(): Promise<SpeechSynthesisVoice[]> {
    if (this.voicesReady) {
      return window.speechSynthesis.getVoices();
    }

    if (this.voicesLoadPromise) {
      return this.voicesLoadPromise;
    }

    this.preloadVoices();
    if (this.voicesLoadPromise) {
      return this.voicesLoadPromise;
    }

    return window.speechSynthesis.getVoices();
  }

  // 创建语音合成对象
  private createUtterance(
    text: string,
    voiceConfig: VoiceConfig | undefined,
    voices: SpeechSynthesisVoice[]
  ): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);

    // 首先检测文本的实际语言
    const detectedLang = detectLanguage(text);
    const currentLang = i18n.language || 'zh-CN';

    // 优先使用检测到的文本语言，但如果用户设置了语言，也考虑用户设置
    let targetLang: string;

    if (voiceConfig?.dialect) {
      // 如果当前语言是中文，使用 dialect 映射；否则使用检测到的文本语言
      if (currentLang.startsWith('zh')) {
        const lang = voiceConfig.dialect in DIALECT_LANG_MAP 
          ? DIALECT_LANG_MAP[voiceConfig.dialect as keyof typeof DIALECT_LANG_MAP]
          : 'zh-CN';
        targetLang = lang;
      } else {
        // 非中文语言，优先使用检测到的文本语言，如果检测不到则使用当前 i18n 语言
        targetLang = detectedLang !== 'zh-CN' ? detectedLang : currentLang;
      }
    } else {
      // 没有 voiceConfig，优先使用检测到的文本语言，如果检测不到则使用当前 i18n 语言
      targetLang = detectedLang !== 'zh-CN' ? detectedLang : currentLang;
    }

    utterance.lang = targetLang;

    utterance.rate = voiceConfig?.rate ?? 1.0;
    let basePitch = voiceConfig?.pitch ?? 1.0;
    if (voiceConfig?.gender === 'male') {
      utterance.pitch = Math.max(0.6, Math.min(0.85, basePitch * 0.75));
    } else if (voiceConfig?.gender === 'female') {
      utterance.pitch = Math.max(1.0, Math.min(1.3, basePitch * 1.1));
    } else {
      utterance.pitch = basePitch;
    }
    utterance.volume = voiceConfig?.volume ?? 1.0;

    // 根据 utterance.lang 选择匹配的语音
    if (voices.length > 0) {
      // 根据语言代码选择匹配的语音
      const targetLang = utterance.lang.toLowerCase();
      const langPrefix = targetLang.split('-')[0]; // 如 'en', 'zh', 'ko', 'ja'
      
      let matchingVoices = voices.filter(voice => {
        const voiceLang = voice.lang.toLowerCase();
        // 精确匹配或部分匹配
        return voiceLang === targetLang || 
               voiceLang.startsWith(langPrefix) ||
               targetLang.startsWith(voiceLang.split('-')[0]);
      });

      // 如果找不到匹配的语音，尝试查找同语系的语音
      if (matchingVoices.length === 0) {
        matchingVoices = voices.filter(voice => {
          const voiceLang = voice.lang.toLowerCase();
          return voiceLang.includes(langPrefix) || langPrefix.includes(voiceLang.split('-')[0]);
        });
      }

      if (matchingVoices.length > 0) {
        if (voiceConfig?.voiceIndex !== undefined) {
          const index = voiceConfig.voiceIndex % matchingVoices.length;
          utterance.voice = matchingVoices[index];
        } else {
          utterance.voice = matchingVoices[0];
        }
      } else {
        // 如果没有匹配的语音，尝试查找默认语音
        const defaultVoice = voices.find(voice => voice.default) || voices[0];
        if (defaultVoice) {
          utterance.voice = defaultVoice;
        } else {
        }
      }
    }

    return utterance;
  }

  // 设置音频参数（根据声道配置调整音量）
  private setupAudioParams(item: SpeechItem, channel: ChannelType): void {
    const channelConfig = CHANNEL_CONFIGS[channel];
    if (item.utterance) {
      item.utterance.volume = (item.voiceConfig?.volume ?? 1.0) * channelConfig.volume;
    }
  }

  // 播放语音（多声道）
  async speak(
    text: string,
    voiceConfig?: VoiceConfig,
    channel: ChannelType = ChannelType.PLAYER_0,
    events?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
      estimatedDuration?: number;
    },
    priority: number = 1, // 优先级：3=对骂，2=事件，1=随机，4=报牌（最高）
    playerId?: number // 玩家ID（用于声道调度）
  ): Promise<void> {
    // 如果启用了新的调度器，使用调度器分配声道，然后使用TTS Audio Service播放
    if (this.useChannelScheduler && this.channelScheduler && this.multiChannelConfig.enabled) {
      try {
        // 确定播放类型和通道
        const isAnnouncement = channel === ChannelType.ANNOUNCEMENT;
        const playbackType: 'announcement' | 'chat' = isAnnouncement ? 'announcement' : 'chat';
        
        // 如果是聊天但没有提供playerId，尝试从channel推断
        let finalPlayerId = playerId;
        if (playbackType === 'chat' && finalPlayerId === undefined) {
          // 尝试从channel推断playerId（仅当channel是玩家通道时）
          if (channel >= ChannelType.PLAYER_0 && channel <= ChannelType.PLAYER_3) {
            finalPlayerId = channel;
          }
        }
        
        // 使用调度器分配声道
        const allocation = this.channelScheduler.allocateChannel({
          usage: playbackType === 'announcement' ? ChannelUsage.ANNOUNCEMENT : ChannelUsage.PLAYER,
          playerId: finalPlayerId,
          priority: priority
        });
        
        let finalChannel = allocation.channel;
        
        // 如果被加入队列，等待声道可用
        if (allocation.isQueued) {
          // 等待当前播放完成（最多等待30秒）
          const startTime = Date.now();
          while (this.channelScheduler.isChannelActive(finalChannel)) {
            if (Date.now() - startTime > 30000) {
              throw new Error(`等待声道 ${finalChannel} 可用超时`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // 标记声道为活跃（在播放开始前）
        // 注意：allocateChannel已经分配了声道，但我们需要标记为活跃以便后续请求知道
        // 实际上，allocateChannel内部已经标记了，这里只是为了确保
        
        // 使用TTS Audio Service播放，播放完成后释放声道
        try {
          // 包装事件回调，在播放完成后释放声道
          const wrappedEvents = {
            ...events,
            onStart: () => {
              // 调用原始onStart回调
              if (events?.onStart) {
                events.onStart();
              }
            },
            onEnd: () => {
              // 释放声道
              this.channelScheduler?.releaseChannel(finalChannel, finalPlayerId);
              // 调用原始回调
              if (events?.onEnd) {
                events.onEnd();
              }
            },
            onError: (error: Error) => {
              // 释放声道
              this.channelScheduler?.releaseChannel(finalChannel, finalPlayerId);
              // 调用原始回调
              if (events?.onError) {
                events.onError(error);
              }
            }
          };
          
          // 使用TTS Audio Service播放
          await ttsAudioService.speak(text, voiceConfig, finalChannel, wrappedEvents, priority);
          return; // 重要：播放完成后直接返回，避免继续执行下面的代码
        } catch (playError) {
          // 播放失败，释放声道
          this.channelScheduler?.releaseChannel(finalChannel, finalPlayerId);
          throw playError;
        }
      } catch (error) {
        if (events?.onError) {
          events.onError(error as Error);
        }
        throw error;
      }
    }
    
    // 如果启用多声道，使用TTS Audio Service（只使用TTS API，不使用speechSynthesis）
    if (this.multiChannelConfig.enabled) {
      try {
        return await ttsAudioService.speak(text, voiceConfig, channel, events, priority);
      } catch (error) {
        // TTS服务失败，直接失败（不使用speechSynthesis）
        if (events?.onError) {
          events.onError(error as Error);
        }
        throw error;
      }
    }
    
    // 使用串行播放（speechSynthesis）
    
    // 使用串行播放（speechSynthesis）
    return new Promise(async (resolve, reject) => {
      // 检查是否有相同的请求正在处理（防止重复调用）
      // 使用同步检查，确保原子性
      const pendingSet = this.pendingRequests.get(channel) || new Set();
      if (pendingSet.has(text)) {
        resolve();
        return;
      }
      // 立即添加到 pendingSet，防止竞态条件
      pendingSet.add(text);
      this.pendingRequests.set(channel, pendingSet);
      
      // 获取当前声道的播放项（用于后续检查）
      const currentItem = this.channelItems.get(channel);
      
      // 报牌声道特殊处理：报牌优先级最高，可以中断其他语音
      if (channel === ChannelType.ANNOUNCEMENT) {
        // 如果正在播放相同文本，跳过（去重）
        if (currentItem && currentItem.text === text) {
          pendingSet.delete(text);
          resolve();
          return;
        }
        
        // 检查报牌声道最近是否刚播放过相同文本（去重）
        const lastText = this.lastSpeechText.get(channel);
        const lastTime = this.lastSpeechTime.get(channel);
        const now = Date.now();
        
        if (text === lastText && lastTime && (now - lastTime) < this.config.deduplicationWindow) {
          pendingSet.delete(text);
          resolve();
          return;
        }
        
        // 报牌优先级高：如果正在播放其他报牌，新报牌加入队列而不是中断（减少频繁中断）
        if (currentItem) {
          // 如果旧报牌刚开始播放（1秒内），新报牌加入队列
          const lastTime = this.lastSpeechTime.get(channel);
          const now = Date.now();
          if (lastTime && (now - lastTime) < 1000) {
            const queue = this.channelQueues.get(channel) || [];
            if (queue.length < this.config.maxQueueSize) {
              queue.push({
                text,
                voiceConfig,
                channel,
                resolve,
                reject,
                utterance: null as any,
                events
              });
              this.channelQueues.set(channel, queue);
              return;
            } else {
              // 队列已满，中断旧报牌
              if (currentItem.utterance) {
                (currentItem.utterance as any).__interrupted = true;
              }
              this.channelItems.delete(channel);
            }
          } else {
            // 旧报牌播放时间较长，可以中断
            if (currentItem.utterance) {
              (currentItem.utterance as any).__interrupted = true;
            }
            this.channelItems.delete(channel);
          }
        }
        
        // 如果有其他声道的语音在播放，只标记为中断（不立即清空，让它们自然结束）
        if (window.speechSynthesis.speaking) {
          // 只标记非报牌声道的语音为中断，减少对聊天语音的影响
          this.channelItems.forEach((item, ch) => {
            if (ch !== channel && ch !== ChannelType.ANNOUNCEMENT && item.utterance) {
              (item.utterance as any).__interrupted = true;
            }
          });
        }
      } else {
        // 非报牌声道：只检查当前声道
        if (currentItem && currentItem.text === text) {
          resolve();
          return;
        }

        // 去重检查2：如果最近刚播放过相同文本，且时间窗口内，则跳过
        const lastText = this.lastSpeechText.get(channel);
        const lastTime = this.lastSpeechTime.get(channel);
        const now = Date.now();
        
        if (text === lastText && lastTime && (now - lastTime) < this.config.deduplicationWindow) {
          resolve();
          return;
        }
      }

      // 非报牌声道：如果正在播放，加入队列而不是中断
      if (currentItem && channel !== ChannelType.ANNOUNCEMENT) {
        // 非报牌：将新语音加入队列，等待当前播放完成
        const queue = this.channelQueues.get(channel) || [];
        
        // 检查声道队列长度，如果超过限制，丢弃最旧的消息
        if (queue.length >= this.config.maxQueueSize) {
          const removed = queue.shift();
          if (removed) {
            removed.reject(new Error('声道队列已满，消息被丢弃'));
          }
        }
        
        queue.push({
          text,
          voiceConfig,
          channel,
          resolve,
          reject,
          utterance: null as any, // 稍后创建
          events // 保存事件回调，确保队列中的消息也能触发气泡显示
        });
        this.channelQueues.set(channel, queue);
        return; // 不立即播放，等待队列处理
      }

      if (!('speechSynthesis' in window)) {
        setTimeout(() => resolve(), 300);
        return;
      }

      try {
        const voices = await Promise.race([
          this.ensureVoicesReady(),
          new Promise<SpeechSynthesisVoice[]>((resolve) => {
            setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
          })
        ]);

        if (voices.length === 0) {
        }

        const utterance = this.createUtterance(text, voiceConfig, voices);
        
        // 添加调试信息
        
        const item: SpeechItem = {
          text,
          voiceConfig,
          channel,
          resolve,
          reject,
          utterance,
          priority, // 保存优先级
          events // 保存事件回调
        };

        // 设置音频参数
        this.setupAudioParams(item, channel);

        // 记录当前播放
        this.channelItems.set(channel, item);
        this.lastSpeechText.set(channel, text);
        this.lastSpeechTime.set(channel, Date.now());

        const channelConfig = CHANNEL_CONFIGS[channel];

        let cleaned = false;
        const cleanup = () => {
          if (cleaned) {
            return; // 防止重复调用
          }
          cleaned = true;
          this.channelItems.delete(channel);
          // 如果是聊天语音，标记为不播放
          if (channel !== ChannelType.ANNOUNCEMENT) {
            this.isPlayingChat = false;
          }
          // 清除待处理请求标记
          const pendingSet = this.pendingRequests.get(channel);
          if (pendingSet) {
            pendingSet.delete(text);
          }
          resolve();
        };

        // 设置事件回调（在 playUtterance 中统一设置，避免重复）
        // 注意：onstart 事件在 playUtterance 中设置，确保同步

        utterance.onend = () => {
          // 检查是否被中断
          if ((utterance as any).__interrupted) {
            return; // 被中断的 utterance，不处理 onend 事件
          }
          // 检查是否还是当前项（可能已被新的报牌替换）
          if (this.channelItems.get(channel) === item) {
            // 调用事件回调（优先使用 item.events，如果没有则使用参数中的 events）
            (item.events || events)?.onEnd?.();
            cleanup();
            
            // 如果是聊天语音，标记为不播放，处理下一个
            if (channel !== ChannelType.ANNOUNCEMENT) {
              this.isPlayingChat = false;
              // 处理聊天队列中的下一个
              this.processNextChat();
            } else {
              // 报牌播放完成，处理报牌队列
              this.processNextInQueue(channel);
            }
          }
        };

        utterance.onerror = (error) => {
          // 检查是否被中断
          if ((utterance as any).__interrupted) {
            return; // 被中断的 utterance，不处理 onerror 事件
          }
          // 检查是否还是当前项
          if (this.channelItems.get(channel) === item) {
            const errorObj = error as any;
            const errorMessage = errorObj.error || errorObj.message || '未知错误';
            // 调用事件回调（优先使用 item.events，如果没有则使用参数中的 events）
            (item.events || events)?.onError?.(new Error(errorMessage));
            cleanup();
          }
        };

        // 注意：onend 和 onerror 事件处理器在 playUtterance 中设置

        // 计算超时
        const estimatedDuration = Math.max(
          text.length * 0.4 * (1 / (utterance.rate || 1.0)),
          500
        );

        setTimeout(() => {
          if (this.channelItems.get(channel) === item) {
            // 超时处理：标记为中断，但不调用 cancel()（会取消所有语音）
            if (item.utterance) {
              (item.utterance as any).__interrupted = true;
            }
            cleanup();
            // 处理队列中的下一个（如果超时）
            if (channel !== ChannelType.ANNOUNCEMENT) {
              this.processNextInQueue(channel);
            }
          }
        }, estimatedDuration + this.config.defaultTimeout);

        // 报牌声道：立即播放（优先级最高，可以中断聊天）
        if (channel === ChannelType.ANNOUNCEMENT) {
          // 如果有聊天语音在播放，中断它
          if (this.isPlayingChat) {
            // 中断所有非报牌声道的语音
            this.channelItems.forEach((otherItem, ch) => {
              if (ch !== ChannelType.ANNOUNCEMENT && otherItem.utterance) {
                (otherItem.utterance as any).__interrupted = true;
                this.channelItems.delete(ch);
              }
            });
            this.isPlayingChat = false;
          }
          // 立即播放报牌
          this.playUtterance(utterance, item, channel);
          return;
        }
        
        // 聊天语音：串行播放（一次只播放一个）
        // 如果正在播放聊天，加入队列
        if (this.isPlayingChat) {
          this.addToChatQueue(item);
          return;
        }
        
        // 立即播放聊天
        this.isPlayingChat = true;
        this.playUtterance(utterance, item, channel);
      } catch (error) {
        this.channelItems.delete(channel);
        // 清除待处理请求标记
        const pendingSet = this.pendingRequests.get(channel);
        if (pendingSet) {
          pendingSet.delete(text);
        }
        reject(error as Error);
      }
    });
  }

  /**
   * 播放 utterance（实际播放逻辑）
   */
  private playUtterance(
    utterance: SpeechSynthesisUtterance,
    item: SpeechItem,
    channel: ChannelType
  ): void {
    const channelConfig = CHANNEL_CONFIGS[channel];
    
    // 设置事件处理器
    utterance.onstart = () => {
      if ((utterance as any).__interrupted) {
        return;
      }
      if (this.channelItems.get(channel) === item) {
        // 使用 requestAnimationFrame 确保在下一帧触发，提高同步性
        requestAnimationFrame(() => {
          // 再次检查，确保还是当前项（防止在 requestAnimationFrame 期间被替换）
          if (this.channelItems.get(channel) === item && !(utterance as any).__interrupted) {
            // 调用事件回调（队列中的消息也能触发气泡显示）
            item.events?.onStart?.();
          }
        });
      }
    };

    utterance.onend = () => {
      if ((utterance as any).__interrupted) {
        return;
      }
      if (this.channelItems.get(channel) === item) {
        // 调用事件回调（队列中的消息也能触发气泡隐藏）
        item.events?.onEnd?.();
        this.channelItems.delete(channel);
        
        // 如果是聊天语音，标记为不播放，处理下一个
        if (channel !== ChannelType.ANNOUNCEMENT) {
          this.isPlayingChat = false;
          item.resolve();
          // 处理聊天队列中的下一个
          this.processNextChat();
        } else {
          // 报牌播放完成
          item.resolve();
          // 处理报牌声道的队列
          this.processNextInQueue(channel);
        }
      }
    };

    utterance.onerror = (error) => {
      if ((utterance as any).__interrupted) {
        return;
      }
      if (this.channelItems.get(channel) === item) {
        const errorType = (error as any).error || (error as any).type || '';
        if (errorType !== 'interrupted') {
        }
        // 调用事件回调
        item.events?.onError?.(error as Error);
        this.channelItems.delete(channel);
        // 如果是聊天语音，标记为不播放，继续处理下一个
        if (channel !== ChannelType.ANNOUNCEMENT) {
          this.isPlayingChat = false;
          this.processNextChat();
        }
        item.reject(error as Error);
      }
    };

    // 记录当前播放
    this.channelItems.set(channel, item);
    this.lastSpeechText.set(channel, item.text);
    this.lastSpeechTime.set(channel, Date.now());

    // 播放
    window.speechSynthesis.speak(utterance);
  }

  /**
   * 将聊天语音加入队列（按优先级排序）
   */
  private addToChatQueue(item: SpeechItem): void {
    // 检查队列长度，如果超过限制，丢弃最旧的低优先级消息
    if (this.chatQueue.length >= this.config.maxQueueSize) {
      // 按优先级排序，丢弃最低优先级的消息
      this.chatQueue.sort((a, b) => b.priority - a.priority);
      const removed = this.chatQueue.pop();
      if (removed) {
        removed.reject(new Error('聊天队列已满，消息被丢弃'));
      }
    }
    
    // 按优先级插入（对骂>事件>随机）
    let inserted = false;
    for (let i = 0; i < this.chatQueue.length; i++) {
      if (item.priority > this.chatQueue[i].priority) {
        this.chatQueue.splice(i, 0, item);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.chatQueue.push(item);
    }
    
  }
  
  /**
   * 处理聊天队列中的下一个语音（串行播放）
   */
  private processNextChat(): void {
    if (this.chatQueue.length === 0) {
      return;
    }
    
    const nextItem = this.chatQueue.shift()!;
    
    // 重新创建 utterance（如果还没有创建）
    if (!nextItem.utterance) {
      // 需要异步创建，这里先标记为播放中
      this.isPlayingChat = true;
      this.ensureVoicesReady().then(voices => {
        nextItem.utterance = this.createUtterance(nextItem.text, nextItem.voiceConfig, voices);
        this.setupAudioParams(nextItem, nextItem.channel);
        this.playUtterance(nextItem.utterance, nextItem, nextItem.channel);
      }).catch(err => {
        nextItem.reject(err);
        this.isPlayingChat = false;
        this.processNextChat(); // 继续处理下一个
      });
    } else {
      this.isPlayingChat = true;
      this.playUtterance(nextItem.utterance, nextItem, nextItem.channel);
    }
  }

  /**
   * 处理队列中的下一个语音（该声道的队列，用于报牌）
   */
  private processNextInQueue(channel: ChannelType): void {
    const queue = this.channelQueues.get(channel);
    if (!queue || queue.length === 0) {
      return;
    }

    const nextItem = queue.shift()!;
    
    // 递归调用 speak 来播放队列中的下一个，传递保存的 events 和 priority
    this.speak(nextItem.text, nextItem.voiceConfig, channel, nextItem.events, nextItem.priority)
      .then(() => {
        nextItem.resolve();
      })
      .catch((error) => {
        nextItem.reject(error);
      });
  }

  // 立即播放（报牌专用）
  async speakImmediate(
    text: string,
    voiceConfig?: VoiceConfig
  ): Promise<void> {
    return this.speak(text, voiceConfig, ChannelType.ANNOUNCEMENT, undefined, 4); // 报牌优先级最高
  }

  // 停止所有语音
  stop(): void {
    // 如果启用多声道，也停止多声道播放
    if (this.multiChannelConfig.enabled) {
      ttsAudioService.stop();
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.channelItems.clear();
  }

  // 停止指定声道的语音
  stopChannel(channel: ChannelType): void {
    // 如果启用多声道，也停止该声道的多声道播放
    if (this.multiChannelConfig.enabled) {
      ttsAudioService.stopChannel(channel);
    }
    
    const item = this.channelItems.get(channel);
    if (item) {
      window.speechSynthesis.cancel();
      this.channelItems.delete(channel);
    }
  }

  // 检查是否正在播放
  isCurrentlySpeaking(channel?: ChannelType): boolean {
    // 如果启用多声道，也检查多声道播放状态
    if (this.multiChannelConfig.enabled) {
      const status = ttsAudioService.getStatus();
      if (channel !== undefined) {
        return status.activeChannels.includes(channel) || this.channelItems.has(channel);
      }
      return status.currentConcurrent > 0 || this.channelItems.size > 0;
    }
    
    if (channel !== undefined) {
      return this.channelItems.has(channel);
    }
    return this.channelItems.size > 0;
  }

  // 获取玩家对应的声道
  getPlayerChannel(playerId: number): ChannelType {
    // 如果使用新的调度器，使用调度器的分配逻辑（4个通道）
    if (this.useChannelScheduler && this.channelScheduler) {
      return this.channelScheduler.getPlayerChannel(playerId);
    }
    // 否则使用旧的逻辑（8个通道，向后兼容）
    const channelIndex = playerId % 8;
    return channelIndex as ChannelType;
  }

  /**
   * 将数字优先级映射为PlaybackPriority
   * @param priority 数字优先级
   * @returns PlaybackPriority
   */
  private mapPriorityToPlaybackPriority(priority: number): PlaybackPriority {
    switch (priority) {
      case 4:
        return PlaybackPriority.ANNOUNCEMENT;
      case 3:
        return PlaybackPriority.QUARREL;
      case 2:
        return PlaybackPriority.EVENT;
      case 1:
      default:
        return PlaybackPriority.CHAT;
    }
  }

  // 获取聊天队列状态（用于评估是否应该触发自发聊天）
  getChatQueueStatus(): {
    isPlaying: boolean; // 是否正在播放聊天语音
    queueLength: number; // 队列长度
    maxQueueSize: number; // 最大队列长度
    isIdle: boolean; // 是否空闲（未播放且队列为空或很少）
  } {
    return {
      isPlaying: this.isPlayingChat,
      queueLength: this.chatQueue.length,
      maxQueueSize: this.config.maxQueueSize,
      isIdle: !this.isPlayingChat && this.chatQueue.length <= 1 // 空闲：未播放且队列≤1
    };
  }

}

// 创建全局多声道语音服务实例
export const multiChannelVoiceService = new MultiChannelVoiceService();

// 导出获取玩家声道的函数
export function getPlayerChannel(playerId: number): ChannelType {
  return multiChannelVoiceService.getPlayerChannel(playerId);
}

// 导出便捷函数：设置TTS服务商
export function setTTSProvider(provider: TTSProvider): void {
  multiChannelVoiceService.setTTSProvider(provider);
}

// 导出便捷函数：恢复AudioContext
export async function resumeAudioContext(): Promise<void> {
  await multiChannelVoiceService.resumeAudioContext();
}

// 重新导出 ChannelType（供测试和其他模块使用）
export { ChannelType } from '../types/channel';
// @ts-nocheck

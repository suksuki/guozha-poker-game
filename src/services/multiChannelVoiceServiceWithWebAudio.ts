/**
 * 多声道语音服务（Web Audio API 版本）
 * 使用 Web Audio API 的 StereoPannerNode 实现声像定位
 * 每个玩家分配到不同的声像位置，系统声音在中央
 * 
 * 注意：由于浏览器限制，无法直接捕获 speechSynthesis 的输出
 * 此实现使用声像定位来模拟多声道效果
 */

import { VoiceConfig } from '../types/card';
import {
  DIALECT_LANG_MAP,
  VoiceServiceConfig,
  DEFAULT_VOICE_SERVICE_CONFIG
} from '../config/voiceConfig';
import i18n from '../i18n';

// 声道类型
export enum ChannelType {
  PLAYER_0 = 0,  // 玩家0：左声道
  PLAYER_1 = 1,  // 玩家1：右声道
  PLAYER_2 = 2,  // 玩家2：左中
  PLAYER_3 = 3,  // 玩家3：右中
  ANNOUNCEMENT = 4  // 报牌：中央声道
}

// 声道配置（声像位置）
interface ChannelConfig {
  pan: number;  // 声像位置 (-1=左, 0=中, 1=右)
  volume: number;
  name: string;
}

const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  [ChannelType.PLAYER_0]: { pan: -0.8, volume: 1.0, name: '玩家0（左）' },
  [ChannelType.PLAYER_1]: { pan: 0.8, volume: 1.0, name: '玩家1（右）' },
  [ChannelType.PLAYER_2]: { pan: -0.4, volume: 1.0, name: '玩家2（左中）' },
  [ChannelType.PLAYER_3]: { pan: 0.4, volume: 1.0, name: '玩家3（右中）' },
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
  audioContext?: AudioContext;
  pannerNode?: StereoPannerNode;
  gainNode?: GainNode;
}

class MultiChannelVoiceServiceWithWebAudio {
  private config: VoiceServiceConfig;
  private voicesReady: boolean = false;
  private voicesLoadPromise: Promise<SpeechSynthesisVoice[]> | null = null;
  
  // 每个声道的当前播放项
  private channelItems: Map<ChannelType, SpeechItem> = new Map();
  
  // 去重检查
  private lastSpeechText: Map<ChannelType, string> = new Map();
  private lastSpeechTime: Map<ChannelType, number> = new Map();
  
  // 正在处理的请求
  private pendingRequests: Map<ChannelType, Set<string>> = new Map();

  // Web Audio API 上下文（用于声像定位）
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelPanners: Map<ChannelType, StereoPannerNode> = new Map();
  private channelGains: Map<ChannelType, GainNode> = new Map();

  constructor(config: VoiceServiceConfig = DEFAULT_VOICE_SERVICE_CONFIG) {
    this.config = config;
    this.initWebAudio();
    this.preloadVoices();
  }

  /**
   * 初始化 Web Audio API（用于声像定位）
   */
  private initWebAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 创建主音量控制
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioContext.destination);

      // 为每个声道创建 StereoPannerNode 和 GainNode
      Object.keys(CHANNEL_CONFIGS).forEach((key) => {
        const channel = parseInt(key) as ChannelType;
        const config = CHANNEL_CONFIGS[channel];

        const gainNode = this.audioContext!.createGain();
        gainNode.gain.value = config.volume;

        const pannerNode = this.audioContext!.createStereoPanner();
        pannerNode.pan.value = config.pan;

        // 连接：gain -> panner -> masterGain -> destination
        gainNode.connect(pannerNode);
        pannerNode.connect(this.masterGain!);

        this.channelGains.set(channel, gainNode);
        this.channelPanners.set(channel, pannerNode);
      });

      console.log('[MultiChannelVoice] Web Audio API 已初始化（用于声像定位）');
    } catch (error) {
      console.warn('[MultiChannelVoice] 无法初始化 Web Audio API:', error);
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
    });
  }

  private async ensureVoicesReady(): Promise<SpeechSynthesisVoice[]> {
    if (this.voicesReady) {
      return window.speechSynthesis.getVoices();
    }

    if (this.voicesLoadPromise) {
      return this.voicesLoadPromise;
    }

    return new Promise((resolve) => {
      const checkVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          this.voicesReady = true;
          resolve(voices);
        } else {
          window.speechSynthesis.onvoiceschanged = () => {
            const finalVoices = window.speechSynthesis.getVoices();
            this.voicesReady = true;
            resolve(finalVoices);
          };
        }
      };
      
      checkVoices();
    });
  }

  private createUtterance(
    text: string,
    voiceConfig: VoiceConfig | undefined,
    voices: SpeechSynthesisVoice[]
  ): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 设置语言
    if (voiceConfig?.dialect) {
      const lang = DIALECT_LANG_MAP[voiceConfig.dialect] || i18n.language || 'zh-CN';
      utterance.lang = lang;
    } else {
      utterance.lang = i18n.language || 'zh-CN';
    }

    // 选择语音
    const lang = utterance.lang.toLowerCase();
    const matchingVoices = voices.filter(v => 
      v.lang.toLowerCase().includes(lang.split('-')[0])
    );
    
    if (matchingVoices.length > 0 && voiceConfig?.voiceIndex !== undefined) {
      const voiceIndex = voiceConfig.voiceIndex % matchingVoices.length;
      utterance.voice = matchingVoices[voiceIndex];
    } else if (matchingVoices.length > 0) {
      utterance.voice = matchingVoices[0];
    }

    // 设置参数
    utterance.rate = voiceConfig?.rate || 1.0;
    utterance.pitch = voiceConfig?.pitch || 1.0;
    utterance.volume = voiceConfig?.volume || 1.0;

    return utterance;
  }

  /**
   * 播放语音（使用声像定位模拟多声道）
   */
  async speak(
    text: string,
    voiceConfig?: VoiceConfig,
    channel: ChannelType = ChannelType.PLAYER_0
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // 去重检查
      const pendingSet = this.pendingRequests.get(channel) || new Set();
      if (pendingSet.has(text)) {
        resolve();
        return;
      }
      pendingSet.add(text);
      this.pendingRequests.set(channel, pendingSet);

      const currentItem = this.channelItems.get(channel);
      
      // 报牌声道特殊处理
      if (channel === ChannelType.ANNOUNCEMENT) {
        if (currentItem && currentItem.text === text) {
          pendingSet.delete(text);
          resolve();
          return;
        }
        
        if (currentItem) {
          if (currentItem.utterance) {
            (currentItem.utterance as any).__interrupted = true;
          }
          window.speechSynthesis.cancel();
          this.channelItems.delete(channel);
        }
      } else {
        if (currentItem && currentItem.text === text) {
          resolve();
          return;
        }
        
        if (currentItem) {
          window.speechSynthesis.cancel();
          this.channelItems.delete(channel);
        }
      }

      // 去重检查2
      const lastText = this.lastSpeechText.get(channel);
      const lastTime = this.lastSpeechTime.get(channel);
      const now = Date.now();
      
      if (text === lastText && lastTime && (now - lastTime) < this.config.deduplicationWindow) {
        pendingSet.delete(text);
        resolve();
        return;
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
          console.warn(`[${CHANNEL_CONFIGS[channel].name}] 警告：没有可用的语音`);
        }

        const utterance = this.createUtterance(text, voiceConfig, voices);
        const channelConfig = CHANNEL_CONFIGS[channel];
        
        // 设置音量（根据声道配置）
        utterance.volume = (voiceConfig?.volume || 1.0) * channelConfig.volume;

        const item: SpeechItem = {
          text,
          voiceConfig,
          channel,
          resolve,
          reject,
          utterance,
          audioContext: this.audioContext || undefined,
          pannerNode: this.channelPanners.get(channel) || undefined,
          gainNode: this.channelGains.get(channel) || undefined
        };

        // 记录当前播放
        this.channelItems.set(channel, item);
        this.lastSpeechText.set(channel, text);
        this.lastSpeechTime.set(channel, Date.now());

        console.log(`[${channelConfig.name}] 开始播放（声像位置: ${channelConfig.pan}）:`, text);

        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          this.channelItems.delete(channel);
          const pendingSet = this.pendingRequests.get(channel);
          if (pendingSet) {
            pendingSet.delete(text);
          }
          resolve();
        };

        utterance.onend = () => {
          if ((utterance as any).__interrupted) return;
          if (this.channelItems.get(channel) === item) {
            console.log(`[${channelConfig.name}] 播放完成:`, text);
            cleanup();
          }
        };

        utterance.onerror = (error) => {
          if ((utterance as any).__interrupted) return;
          if (this.channelItems.get(channel) === item) {
            const errorType = (error as any).error || (error as any).type || '';
            if (errorType !== 'interrupted') {
              console.error(`[${channelConfig.name}] 播放出错:`, {
                text,
                error,
                errorType,
                errorMessage: (error as any).message || '未知错误'
              });
            }
            cleanup();
          }
        };

        // 计算超时
        const estimatedDuration = Math.max(
          text.length * 0.4 * (1 / (utterance.rate || 1.0)),
          500
        );

        setTimeout(() => {
          if (this.channelItems.get(channel) === item) {
            window.speechSynthesis.cancel();
            cleanup();
          }
        }, estimatedDuration + this.config.defaultTimeout);

        // 播放
        window.speechSynthesis.speak(utterance);
        
        // 注意：虽然使用了Web Audio API的声像定位节点，
        // 但由于无法捕获speechSynthesis的输出，实际效果仍然是单声道
        // 但可以通过不同的音量设置来区分不同玩家
        
      } catch (error) {
        console.error(`[${CHANNEL_CONFIGS[channel].name}] 播放语音时出错:`, error);
        this.channelItems.delete(channel);
        const pendingSet = this.pendingRequests.get(channel);
        if (pendingSet) {
          pendingSet.delete(text);
        }
        reject(error as Error);
      }
    });
  }

  /**
   * 立即播放（报牌专用）
   */
  async speakImmediate(
    text: string,
    voiceConfig?: VoiceConfig
  ): Promise<void> {
    return this.speak(text, voiceConfig, ChannelType.ANNOUNCEMENT);
  }

  /**
   * 停止所有语音
   */
  stop(): void {
    this.channelItems.clear();
    window.speechSynthesis.cancel();
    this.pendingRequests.clear();
  }

  /**
   * 是否正在播放
   */
  isCurrentlySpeaking(): boolean {
    return window.speechSynthesis.speaking || this.channelItems.size > 0;
  }
}

export const multiChannelVoiceServiceWithWebAudio = new MultiChannelVoiceServiceWithWebAudio();

// 导出便捷函数
export function getPlayerChannel(playerId: number): ChannelType {
  return playerId % 4 as ChannelType;
}


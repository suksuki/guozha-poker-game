/**
 * 多声道语音服务
 * 使用 Web Audio API 实现真正的多声道音频
 * 每个玩家分配一个声道，报牌使用独立声道
 * 支持多语言语音（根据当前 i18n 语言选择）
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
  PLAYER_2 = 2,  // 玩家2：左环绕
  PLAYER_3 = 3,  // 玩家3：右环绕
  ANNOUNCEMENT = 4  // 报牌：中央声道
}

// 声道配置
interface ChannelConfig {
  pan: number;  // 声道位置 (-1 到 1，-1=左，0=中，1=右)
  volume: number;  // 音量 (0 到 1)
  name: string;  // 声道名称
}

// 默认声道配置
const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  [ChannelType.PLAYER_0]: { pan: -0.7, volume: 1.0, name: '玩家0（左）' },
  [ChannelType.PLAYER_1]: { pan: 0.7, volume: 1.0, name: '玩家1（右）' },
  [ChannelType.PLAYER_2]: { pan: -0.3, volume: 1.0, name: '玩家2（左中）' },
  [ChannelType.PLAYER_3]: { pan: 0.3, volume: 1.0, name: '玩家3（右中）' },
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
}

// 多声道语音服务类
class MultiChannelVoiceService {
  private config: VoiceServiceConfig;
  private voicesReady: boolean = false;
  private voicesLoadPromise: Promise<SpeechSynthesisVoice[]> | null = null;
  
  // 每个声道的当前播放项
  private channelItems: Map<ChannelType, SpeechItem> = new Map();
  
  // 去重检查
  private lastSpeechText: Map<ChannelType, string> = new Map();
  private lastSpeechTime: Map<ChannelType, number> = new Map();
  
  // 正在处理的请求（防止并发调用）
  private pendingRequests: Map<ChannelType, Set<string>> = new Map();

  constructor(config: VoiceServiceConfig = DEFAULT_VOICE_SERVICE_CONFIG) {
    this.config = config;
    this.preloadVoices();
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

    // 根据当前 i18n 语言和玩家的 dialect 选择语音语言
    const currentLang = i18n.language || 'zh-CN';

    if (voiceConfig?.dialect) {
      // 如果当前语言是中文，使用 dialect 映射；否则使用当前 i18n 语言
      if (currentLang.startsWith('zh')) {
      const lang = voiceConfig.dialect in DIALECT_LANG_MAP 
        ? DIALECT_LANG_MAP[voiceConfig.dialect as keyof typeof DIALECT_LANG_MAP]
        : 'zh-CN';
      utterance.lang = lang;
    } else {
        // 非中文语言，使用当前 i18n 语言
        utterance.lang = currentLang;
      }
    } else {
      // 没有 voiceConfig，使用当前 i18n 语言
      utterance.lang = currentLang;
    }

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
      const matchingVoices = voices.filter(voice => {
        const voiceLang = voice.lang.toLowerCase();
        // 精确匹配或部分匹配
        return voiceLang === targetLang || 
               voiceLang.startsWith(targetLang.split('-')[0]) ||
               targetLang.startsWith(voiceLang.split('-')[0]);
      });

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
        }
      }
    }

    return utterance;
  }

  // 设置音频参数（根据声道配置调整音量）
  private setupAudioParams(item: SpeechItem, channel: ChannelType): void {
    const channelConfig = CHANNEL_CONFIGS[channel];
    
    // 设置 utterance 的音量（根据声道配置）
    if (item.utterance) {
      item.utterance.volume = (item.voiceConfig?.volume ?? 1.0) * channelConfig.volume;
    }
  }

  // 播放语音（多声道）
  async speak(
    text: string,
    voiceConfig?: VoiceConfig,
    channel: ChannelType = ChannelType.PLAYER_0
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // 检查是否有相同的请求正在处理（防止并发调用）
      // 使用同步检查，确保原子性
      const pendingSet = this.pendingRequests.get(channel) || new Set();
      if (pendingSet.has(text)) {
        console.log(`[${CHANNEL_CONFIGS[channel].name}] 去重：相同请求正在处理，跳过:`, text);
        resolve();
        return;
      }
      // 立即添加到 pendingSet，防止竞态条件
      pendingSet.add(text);
      this.pendingRequests.set(channel, pendingSet);
      
      // 获取当前声道的播放项（用于后续检查）
      const currentItem = this.channelItems.get(channel);
      
      // 报牌声道特殊处理：新报牌可以中断旧报牌（因为游戏流程会等1.5秒，有足够时间播放）
      if (channel === ChannelType.ANNOUNCEMENT) {
        // 如果正在播放相同文本，跳过（去重）
        if (currentItem && currentItem.text === text) {
          console.log(`[${CHANNEL_CONFIGS[channel].name}] 去重：正在播放相同文本，跳过:`, text);
          pendingSet.delete(text);
          resolve();
          return;
        }
        
        // 如果正在播放其他文本，中断旧报牌，播放新报牌
        if (currentItem) {
          console.log(`[${CHANNEL_CONFIGS[channel].name}] 中断旧报牌，播放新报牌:`, text, '旧报牌:', currentItem.text);
          // 标记旧 utterance 为已中断，防止 onend 事件处理
          if (currentItem.utterance) {
            (currentItem.utterance as any).__interrupted = true;
          }
          window.speechSynthesis.cancel();
          this.channelItems.delete(channel);
        }
        
        // 检查报牌声道最近是否刚播放过相同文本（去重）
        const lastText = this.lastSpeechText.get(channel);
        const lastTime = this.lastSpeechTime.get(channel);
        const now = Date.now();
        
        if (text === lastText && lastTime && (now - lastTime) < this.config.deduplicationWindow) {
          console.log(`[${CHANNEL_CONFIGS[channel].name}] 去重：最近刚播放过，跳过:`, text, '时间差:', now - lastTime, 'ms');
          pendingSet.delete(text);
          resolve();
          return;
        }
      } else {
        // 非报牌声道：只检查当前声道
        if (currentItem && currentItem.text === text) {
          console.log(`[${CHANNEL_CONFIGS[channel].name}] 去重：正在播放相同文本，跳过:`, text);
          resolve();
          return;
        }

        // 去重检查2：如果最近刚播放过相同文本，且时间窗口内，则跳过
        const lastText = this.lastSpeechText.get(channel);
        const lastTime = this.lastSpeechTime.get(channel);
        const now = Date.now();
        
        if (text === lastText && lastTime && (now - lastTime) < this.config.deduplicationWindow) {
          console.log(`[${CHANNEL_CONFIGS[channel].name}] 去重：最近刚播放过，跳过:`, text, '时间差:', now - lastTime, 'ms');
          resolve();
          return;
        }
      }

      // 非报牌声道：如果正在播放其他文本，中断当前播放
      if (currentItem && channel !== ChannelType.ANNOUNCEMENT) {
        // 非报牌：只中断当前声道
        window.speechSynthesis.cancel();
        this.channelItems.delete(channel);
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

        const utterance = this.createUtterance(text, voiceConfig, voices);
        
        const item: SpeechItem = {
          text,
          voiceConfig,
          channel,
          resolve,
          reject,
          utterance
        };

        // 设置音频参数
        this.setupAudioParams(item, channel);

        // 记录当前播放
        this.channelItems.set(channel, item);
        this.lastSpeechText.set(channel, text);
        this.lastSpeechTime.set(channel, Date.now());

        const channelConfig = CHANNEL_CONFIGS[channel];
        console.log(`[${channelConfig.name}] 开始播放:`, text);

        let cleaned = false;
        const cleanup = () => {
          if (cleaned) {
            return; // 防止重复调用
          }
          cleaned = true;
          this.channelItems.delete(channel);
          // 清除待处理请求标记
          const pendingSet = this.pendingRequests.get(channel);
          if (pendingSet) {
            pendingSet.delete(text);
          }
          resolve();
        };

        utterance.onend = () => {
          // 检查是否被中断
          if ((utterance as any).__interrupted) {
            return; // 被中断的 utterance，不处理 onend 事件
          }
          // 检查是否还是当前项（可能已被新的报牌替换）
          if (this.channelItems.get(channel) === item) {
            console.log(`[${channelConfig.name}] 播放完成:`, text);
            cleanup();
          }
        };

        utterance.onerror = (error) => {
          // 检查是否被中断
          if ((utterance as any).__interrupted) {
            return; // 被中断的 utterance，不处理 onerror 事件
          }
          const errorType = (error as any).error || (error as any).type || '';
          if (errorType === 'interrupted') {
            // 被中断是正常情况，不记录日志
            // 检查是否还是当前项
            if (this.channelItems.get(channel) === item) {
              cleanup();
            }
            return;
          }
          // 检查是否还是当前项
          if (this.channelItems.get(channel) === item) {
            console.warn(`[${channelConfig.name}] 播放出错:`, text, error);
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

        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('播放语音时出错:', error);
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

  // 立即播放（报牌专用）
  async speakImmediate(
    text: string,
    voiceConfig?: VoiceConfig
  ): Promise<void> {
    return this.speak(text, voiceConfig, ChannelType.ANNOUNCEMENT);
  }

  // 停止所有语音
  stop(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.channelItems.clear();
  }

  // 停止指定声道的语音
  stopChannel(channel: ChannelType): void {
    const item = this.channelItems.get(channel);
    if (item) {
      window.speechSynthesis.cancel();
      this.channelItems.delete(channel);
    }
  }

  // 检查是否正在播放
  isCurrentlySpeaking(channel?: ChannelType): boolean {
    if (channel !== undefined) {
      return this.channelItems.has(channel);
    }
    return this.channelItems.size > 0;
  }

  // 获取玩家对应的声道
  getPlayerChannel(playerId: number): ChannelType {
    // 玩家ID映射到声道（0-3对应PLAYER_0到PLAYER_3）
    const channelIndex = playerId % 4;
    return channelIndex as ChannelType;
  }
}

// 导出获取玩家声道的函数
export function getPlayerChannel(playerId: number): ChannelType {
  return multiChannelVoiceService.getPlayerChannel(playerId);
}

// 创建全局多声道语音服务实例
export const multiChannelVoiceService = new MultiChannelVoiceService();

// 导出便捷函数
export function speakTextMultiChannel(
  text: string,
  voiceConfig?: VoiceConfig,
  channel?: ChannelType
): Promise<void> {
  if (channel !== undefined) {
    return multiChannelVoiceService.speak(text, voiceConfig, channel);
  }
  return multiChannelVoiceService.speak(text, voiceConfig);
}

export function stopSpeechMultiChannel(): void {
  multiChannelVoiceService.stop();
}

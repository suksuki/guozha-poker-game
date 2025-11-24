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
import { detectLanguage } from '../utils/languageDetection';

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
  
  // 每个声道的语音队列（用于排队播放）
  private channelQueues: Map<ChannelType, SpeechItem[]> = new Map();
  
  // 全局语音队列（所有声道共享，确保按顺序播放）
  private globalQueue: Array<{ channel: ChannelType; item: SpeechItem }> = [];
  private isProcessingGlobalQueue: boolean = false;
  
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
        console.warn(`[MultiChannelVoice] 未找到 ${targetLang} 的语音，尝试查找同语系语音`);
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
        console.log(`[MultiChannelVoice] 选择语音: ${utterance.voice.name} (${utterance.voice.lang}) 用于文本: "${text.substring(0, 20)}..."`);
      } else {
        // 如果没有匹配的语音，尝试查找默认语音
        const defaultVoice = voices.find(voice => voice.default) || voices[0];
        if (defaultVoice) {
          utterance.voice = defaultVoice;
          console.warn(`[MultiChannelVoice] 未找到匹配的语音，使用默认语音: ${defaultVoice.name} (${defaultVoice.lang})`);
        } else {
          console.error(`[MultiChannelVoice] 无法找到任何可用语音！`);
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
      
      // 报牌声道特殊处理：报牌优先级最高，可以中断其他语音
      if (channel === ChannelType.ANNOUNCEMENT) {
        // 如果正在播放相同文本，跳过（去重）
        if (currentItem && currentItem.text === text) {
          console.log(`[${CHANNEL_CONFIGS[channel].name}] 去重：正在播放相同文本，跳过:`, text);
          pendingSet.delete(text);
          resolve();
          return;
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
        
        // 报牌优先级高：如果有其他语音在播放，中断它们（报牌是游戏流程的一部分）
        if (currentItem) {
          console.log(`[${CHANNEL_CONFIGS[channel].name}] 中断旧报牌，播放新报牌:`, text, '旧报牌:', currentItem.text);
          if (currentItem.utterance) {
            (currentItem.utterance as any).__interrupted = true;
          }
          // 注意：不能使用 cancel()，因为会取消所有语音
          // 只能标记为中断，等待自然结束或超时
          this.channelItems.delete(channel);
        }
        
        // 如果有其他声道的语音在播放，也标记为中断（报牌优先级最高）
        if (window.speechSynthesis.speaking) {
          console.log(`[${CHANNEL_CONFIGS[channel].name}] 报牌优先级高，将中断其他语音`);
          // 标记所有正在播放的语音为中断
          this.channelItems.forEach((item, ch) => {
            if (ch !== channel && item.utterance) {
              (item.utterance as any).__interrupted = true;
            }
          });
          // 清空其他声道（但保留报牌声道）
          this.channelItems.forEach((item, ch) => {
            if (ch !== channel) {
              this.channelItems.delete(ch);
            }
          });
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

      // 非报牌声道：如果正在播放，加入队列而不是中断
      if (currentItem && channel !== ChannelType.ANNOUNCEMENT) {
        // 非报牌：将新语音加入队列，等待当前播放完成
        const queue = this.channelQueues.get(channel) || [];
        queue.push({
          text,
          voiceConfig,
          channel,
          resolve,
          reject,
          utterance: null as any // 稍后创建
        });
        this.channelQueues.set(channel, queue);
        console.log(`[${CHANNEL_CONFIGS[channel].name}] 当前正在播放，加入队列（队列长度: ${queue.length}）:`, text);
        return; // 不立即播放，等待队列处理
      }

      if (!('speechSynthesis' in window)) {
        console.error(`[${CHANNEL_CONFIGS[channel].name}] 错误：浏览器不支持语音合成API`);
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
          console.warn(`[${CHANNEL_CONFIGS[channel].name}] 警告：没有可用的语音，尝试使用默认语音`);
        }

        const utterance = this.createUtterance(text, voiceConfig, voices);
        
        // 添加调试信息
        console.log(`[${CHANNEL_CONFIGS[channel].name}] 语音配置:`, {
          text,
          lang: utterance.lang,
          voice: utterance.voice?.name || '默认',
          rate: utterance.rate,
          pitch: utterance.pitch,
          volume: utterance.volume
        });
        
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
            
            // 处理队列中的下一个语音（仅非报牌声道）
            if (channel !== ChannelType.ANNOUNCEMENT) {
              this.processNextInQueue(channel);
            }
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

        // 报牌声道：立即播放（优先级最高，不加入队列）
        if (channel === ChannelType.ANNOUNCEMENT) {
          // 如果有其他语音在播放，标记为中断（报牌优先级最高）
          if (window.speechSynthesis.speaking) {
            console.log(`[${CHANNEL_CONFIGS[channel].name}] 报牌优先级高，将中断其他语音`);
            // 标记所有正在播放的语音为中断
            this.channelItems.forEach((otherItem, ch) => {
              if (ch !== channel && otherItem.utterance) {
                (otherItem.utterance as any).__interrupted = true;
              }
            });
            // 清空其他声道（但保留报牌声道）
            this.channelItems.forEach((otherItem, ch) => {
              if (ch !== channel) {
                this.channelItems.delete(ch);
              }
            });
          }
          // 立即播放报牌
          this.playUtterance(utterance, item, channel);
          return;
        }
        
        // 非报牌声道：检查是否有其他语音正在播放
        const isOtherSpeaking = Array.from(this.channelItems.values()).some(
          otherItem => otherItem !== item && otherItem.utterance
        );
        
        if (window.speechSynthesis.speaking || isOtherSpeaking) {
          console.log(`[${CHANNEL_CONFIGS[channel].name}] 注意：已有语音正在播放，当前语音将加入全局队列`);
          // 加入全局队列，等待其他语音完成
          this.addToGlobalQueue(channel, item);
          return; // 不立即播放，等待全局队列处理
        }
        
        // 立即播放（没有其他语音在播放）
        this.playUtterance(utterance, item, channel);
        
        // 验证是否成功开始播放
        setTimeout(() => {
          if (window.speechSynthesis.pending) {
            console.log(`[${CHANNEL_CONFIGS[channel].name}] 语音已加入队列，等待播放`);
          } else if (window.speechSynthesis.speaking) {
            console.log(`[${CHANNEL_CONFIGS[channel].name}] 语音正在播放`);
          } else {
            console.warn(`[${CHANNEL_CONFIGS[channel].name}] 警告：语音可能没有开始播放`);
          }
        }, 100);
      } catch (error) {
        console.error(`[${CHANNEL_CONFIGS[channel].name}] 播放语音时出错:`, {
          error,
          text,
          errorMessage: (error as Error).message,
          stack: (error as Error).stack
        });
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
   * 将语音加入全局队列
   */
  private addToGlobalQueue(channel: ChannelType, item: SpeechItem): void {
    this.globalQueue.push({ channel, item });
    console.log(`[${CHANNEL_CONFIGS[channel].name}] 加入全局队列（队列长度: ${this.globalQueue.length}）:`, item.text);
    
    // 如果全局队列处理器未运行，启动它
    if (!this.isProcessingGlobalQueue) {
      this.processGlobalQueue();
    }
  }

  /**
   * 处理全局队列（确保所有语音按顺序播放）
   */
  private async processGlobalQueue(): Promise<void> {
    if (this.isProcessingGlobalQueue) {
      return; // 已经在处理
    }

    this.isProcessingGlobalQueue = true;

    while (this.globalQueue.length > 0) {
      // 等待当前语音完成
      while (window.speechSynthesis.speaking) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const next = this.globalQueue.shift();
      if (!next) {
        break;
      }

      const { channel, item } = next;
      console.log(`[${CHANNEL_CONFIGS[channel].name}] 从全局队列中取出:`, item.text);

      // 重新创建 utterance（因为之前可能没有创建）
      if (!item.utterance) {
        try {
          const voices = await this.ensureVoicesReady();
          item.utterance = this.createUtterance(item.text, item.voiceConfig, voices);
        } catch (error) {
          console.error(`[${CHANNEL_CONFIGS[channel].name}] 创建utterance失败:`, error);
          item.reject(error as Error);
          continue;
        }
      }

      // 播放语音
      this.playUtterance(item.utterance, item, channel);
      
      // 等待播放完成
      await new Promise<void>((resolve) => {
        const originalOnEnd = item.utterance!.onend;
        item.utterance!.onend = () => {
          if (originalOnEnd) {
            originalOnEnd.call(item.utterance!);
          }
          resolve();
        };
      });
    }

    this.isProcessingGlobalQueue = false;
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
    utterance.onend = () => {
      if ((utterance as any).__interrupted) {
        return;
      }
      if (this.channelItems.get(channel) === item) {
        console.log(`[${channelConfig.name}] 播放完成:`, item.text);
        this.channelItems.delete(channel);
        item.resolve();
        
        // 处理该声道的队列
        this.processNextInQueue(channel);
      }
    };

    utterance.onerror = (error) => {
      if ((utterance as any).__interrupted) {
        return;
      }
      if (this.channelItems.get(channel) === item) {
        const errorType = (error as any).error || (error as any).type || '';
        if (errorType !== 'interrupted') {
          console.error(`[${channelConfig.name}] 播放出错:`, error);
        }
        this.channelItems.delete(channel);
        item.reject(error as Error);
      }
    };

    // 记录当前播放
    this.channelItems.set(channel, item);
    this.lastSpeechText.set(channel, item.text);
    this.lastSpeechTime.set(channel, Date.now());

    // 播放
    window.speechSynthesis.speak(utterance);
    console.log(`[${channelConfig.name}] 开始播放:`, item.text);
  }

  /**
   * 处理队列中的下一个语音（该声道的队列）
   */
  private processNextInQueue(channel: ChannelType): void {
    const queue = this.channelQueues.get(channel);
    if (!queue || queue.length === 0) {
      return;
    }

    const nextItem = queue.shift()!;
    console.log(`[${CHANNEL_CONFIGS[channel].name}] 从声道队列中取出下一个语音:`, nextItem.text);
    
    // 递归调用 speak 来播放队列中的下一个
    this.speak(nextItem.text, nextItem.voiceConfig, channel)
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

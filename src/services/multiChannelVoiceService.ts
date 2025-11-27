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
  private voicesReady: boolean = false;
  private voicesLoadPromise: Promise<SpeechSynthesisVoice[]> | null = null;
  
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
    priority: number = 1 // 优先级：3=对骂，2=事件，1=随机，4=报牌（最高）
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // 检查是否有相同的请求正在处理（防止重复调用）
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
        
        // 报牌优先级高：如果正在播放其他报牌，新报牌加入队列而不是中断（减少频繁中断）
        if (currentItem) {
          // 如果旧报牌刚开始播放（1秒内），新报牌加入队列
          const lastTime = this.lastSpeechTime.get(channel);
          const now = Date.now();
          if (lastTime && (now - lastTime) < 1000) {
            console.log(`[${CHANNEL_CONFIGS[channel].name}] 旧报牌刚开始播放，新报牌加入队列:`, text, '旧报牌:', currentItem.text);
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
              console.log(`[${CHANNEL_CONFIGS[channel].name}] 队列已满，中断旧报牌，播放新报牌:`, text, '旧报牌:', currentItem.text);
              if (currentItem.utterance) {
                (currentItem.utterance as any).__interrupted = true;
              }
              this.channelItems.delete(channel);
            }
          } else {
            // 旧报牌播放时间较长，可以中断
            console.log(`[${CHANNEL_CONFIGS[channel].name}] 中断旧报牌，播放新报牌:`, text, '旧报牌:', currentItem.text);
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
        
        // 检查声道队列长度，如果超过限制，丢弃最旧的消息
        if (queue.length >= this.config.maxQueueSize) {
          const removed = queue.shift();
          console.warn(`[${CHANNEL_CONFIGS[channel].name}] ⚠️ 声道队列已满，丢弃旧消息:`, removed?.text);
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
        console.log(`[${CHANNEL_CONFIGS[channel].name}] 当前正在播放，加入队列（队列长度: ${queue.length}/${this.config.maxQueueSize}）:`, text);
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
        console.log(`[${channelConfig.name}] 开始播放:`, text);

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
            console.log(`[${channelConfig.name}] 播放完成:`, text);
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
            console.error(`[${channelConfig.name}] 播放出错:`, {
              text,
              error,
              errorMessage,
              utterance: {
                lang: utterance.lang,
                voice: utterance.voice?.name,
                rate: utterance.rate,
                pitch: utterance.pitch,
                volume: utterance.volume
              }
            });
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
            console.log(`[${CHANNEL_CONFIGS[channel].name}] 报牌中断聊天语音`);
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
          console.log(`[${CHANNEL_CONFIGS[channel].name}] 正在播放聊天，加入队列:`, text);
          this.addToChatQueue(item);
          return;
        }
        
        // 立即播放聊天
        this.isPlayingChat = true;
        this.playUtterance(utterance, item, channel);
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
            console.log(`[${channelConfig.name}] 语音开始播放:`, item.text);
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
        console.log(`[${channelConfig.name}] 播放完成:`, item.text);
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
          console.error(`[${channelConfig.name}] 播放出错:`, error);
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
    console.log(`[${channelConfig.name}] 开始播放:`, item.text);
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
      console.warn(`[MultiChannelVoice] ⚠️ 聊天队列已满，丢弃低优先级消息:`, removed?.text);
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
    
    console.log(`[MultiChannelVoice] 加入聊天队列（队列长度: ${this.chatQueue.length}/${this.config.maxQueueSize}，优先级: ${item.priority}）:`, item.text);
  }
  
  /**
   * 处理聊天队列中的下一个语音（串行播放）
   */
  private processNextChat(): void {
    if (this.chatQueue.length === 0) {
      return;
    }
    
    const nextItem = this.chatQueue.shift()!;
    console.log(`[MultiChannelVoice] 从聊天队列中取出（优先级: ${nextItem.priority}）:`, nextItem.text);
    
    // 重新创建 utterance（如果还没有创建）
    if (!nextItem.utterance) {
      // 需要异步创建，这里先标记为播放中
      this.isPlayingChat = true;
      this.ensureVoicesReady().then(voices => {
        nextItem.utterance = this.createUtterance(nextItem.text, nextItem.voiceConfig, voices);
        this.setupAudioParams(nextItem, nextItem.channel);
        this.playUtterance(nextItem.utterance, nextItem, nextItem.channel);
      }).catch(err => {
        console.error(`[MultiChannelVoice] 创建utterance失败:`, err);
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
    console.log(`[${CHANNEL_CONFIGS[channel].name}] 从声道队列中取出下一个语音:`, nextItem.text);
    
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

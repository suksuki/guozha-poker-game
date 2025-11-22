/**
 * 语音服务
 * 独立的语音服务模块，提供统一的语音播放接口
 */

import { VoiceConfig } from '../types/card';
import {
  VoiceGender,
  VoiceDialect,
  DIALECT_LANG_MAP,
  VoiceParamRanges,
  DEFAULT_VOICE_CONFIG_PARAMS,
  VoiceServiceConfig,
  DEFAULT_VOICE_SERVICE_CONFIG
} from '../config/voiceConfig';

// 检查浏览器是否支持语音合成
export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window;
}

// 语音播放队列项
interface SpeechQueueItem {
  text: string;
  voiceConfig?: VoiceConfig;
  resolve: () => void;
  reject: (error: Error) => void;
}

// 语音服务类
class VoiceService {
  private isSpeaking = false;
  private speechQueue: SpeechQueueItem[] = [];
  private lastSpeechText = '';
  private lastSpeechTime = 0;
  private currentSpeechText = '';
  private config: VoiceServiceConfig;

  constructor(config: VoiceServiceConfig = DEFAULT_VOICE_SERVICE_CONFIG) {
    this.config = config;
  }

  // 更新配置
  updateConfig(config: Partial<VoiceServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 处理语音队列
  private processSpeechQueue(): void {
    if (this.isSpeaking || this.speechQueue.length === 0) {
      return;
    }

    const item = this.speechQueue.shift();
    if (!item) return;

    this.isSpeaking = true;
    const { text, voiceConfig, resolve, reject } = item;
    this.currentSpeechText = text;

    if (!isSpeechSupported()) {
      console.warn('浏览器不支持语音合成');
      setTimeout(() => {
        this.isSpeaking = false;
        resolve();
        this.processSpeechQueue();
      }, 300);
      return;
    }

    try {
      const voices = window.speechSynthesis.getVoices();
      const utterance = this.createUtterance(text, voiceConfig, voices);
      
      // 计算预计播放时间
      const estimatedDuration = Math.max(
        text.length * 0.4 * (1 / (utterance.rate || 1.0)),
        500
      );

      let resolved = false;
      let timeoutId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (!resolved) {
          resolved = true;
          this.isSpeaking = false;
          this.lastSpeechText = text;
          this.lastSpeechTime = Date.now();
          this.currentSpeechText = '';
          resolve();
          setTimeout(() => {
            this.processSpeechQueue();
          }, 100);
        }
      };

      utterance.onend = () => cleanup();
      utterance.onerror = (error) => {
        console.warn('语音播放出错:', error);
        cleanup();
      };

      timeoutId = setTimeout(() => {
        if (!resolved && this.isSpeaking) {
          window.speechSynthesis.cancel();
          cleanup();
        }
      }, estimatedDuration + this.config.defaultTimeout);

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('播放语音时出错:', error);
      this.isSpeaking = false;
      reject(error as Error);
      this.processSpeechQueue();
    }
  }

  // 创建语音合成对象
  private createUtterance(
    text: string,
    voiceConfig: VoiceConfig | undefined,
    voices: SpeechSynthesisVoice[]
  ): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);

    // 设置语言
    if (voiceConfig?.dialect) {
      utterance.lang = DIALECT_LANG_MAP[voiceConfig.dialect] || 'zh-CN';
    } else {
      utterance.lang = 'zh-CN';
    }

    // 设置语音参数（根据性别调整pitch）
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

    // 选择语音
    if (voices.length > 0 && voiceConfig) {
      const chineseVoices = voices.filter(voice => {
        const lang = voice.lang.toLowerCase();
        return lang.includes('zh') || lang.includes('cn') || lang.includes('hk') || lang.includes('tw');
      });

      if (chineseVoices.length > 0) {
        if (voiceConfig.voiceIndex !== undefined) {
          const index = voiceConfig.voiceIndex % chineseVoices.length;
          utterance.voice = chineseVoices[index];
        } else {
          utterance.voice = chineseVoices[0];
        }
      }
    } else if (voices.length > 0) {
      const chineseVoice = voices.find(voice => {
        const lang = voice.lang.toLowerCase();
        return lang.includes('zh') || lang.includes('cn');
      });
      if (chineseVoice) {
        utterance.voice = chineseVoice;
      }
    }

    return utterance;
  }

  // 播放语音（返回Promise）
  speak(text: string, voiceConfig?: VoiceConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // 去重检查
      const now = Date.now();
      if (text === this.currentSpeechText) {
        resolve();
        return;
      }
      if (text === this.lastSpeechText && (now - this.lastSpeechTime) < this.config.deduplicationWindow) {
        resolve();
        return;
      }
      if (this.speechQueue.some(item => item.text === text)) {
        resolve();
        return;
      }

      // 检查队列大小
      if (this.speechQueue.length >= this.config.maxQueueSize) {
        console.warn('语音队列已满，丢弃最旧的消息');
        this.speechQueue.shift();
      }

      // 添加到队列
      this.speechQueue.push({ text, voiceConfig, resolve, reject });
      this.processSpeechQueue();
    });
  }

  // 停止所有语音
  stop(): void {
    if (isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
    this.speechQueue = [];
    this.isSpeaking = false;
    this.currentSpeechText = '';
  }

  // 清空队列
  clearQueue(): void {
    this.speechQueue = [];
  }

  // 获取队列长度
  getQueueLength(): number {
    return this.speechQueue.length;
  }

  // 是否正在播放
  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}

// 创建全局语音服务实例
export const voiceService = new VoiceService();

// 导出便捷函数
export function speakText(text: string, voiceConfig?: VoiceConfig): Promise<void> {
  return voiceService.speak(text, voiceConfig);
}

export function stopSpeech(): void {
  voiceService.stop();
}

export function clearSpeechQueue(): void {
  voiceService.clearQueue();
}

// 等待语音加载完成
export function waitForVoices(callback: () => void): void {
  if (!isSpeechSupported()) {
    callback();
    return;
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    callback();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      callback();
    };
  }
}

// 列出所有可用语音（用于调试）
export function listAvailableVoices(): void {
  if (!isSpeechSupported()) {
    console.warn('浏览器不支持语音合成');
    return;
  }

  const voices = window.speechSynthesis.getVoices();
  console.log(`\n=== 可用语音列表 (共${voices.length}个) ===`);

  const chineseVoices = voices.filter(voice => {
    const lang = voice.lang.toLowerCase();
    return lang.includes('zh') || lang.includes('cn') || lang.includes('hk') || lang.includes('tw');
  });

  console.log(`\n中文语音 (共${chineseVoices.length}个):`);
  chineseVoices.forEach((voice, index) => {
    console.log(`  [${index}] ${voice.name} (${voice.lang}) - ${voice.default ? '默认' : ''}`);
  });

  console.log(`\n所有语音:`);
  voices.forEach((voice, index) => {
    console.log(`  [${index}] ${voice.name} (${voice.lang})`);
  });
  console.log('=====================================\n');
}


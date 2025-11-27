/**
 * 语音服务
 * 统一的语音播放接口，内部使用多声道服务
 * 每个玩家分配一个声道，报牌使用独立声道
 */

import { VoiceConfig } from '../types/card';
import { ChannelType } from '../types/channel';
import { 
  multiChannelVoiceService, 
  getPlayerChannel
} from './multiChannelVoiceService';

// 检查浏览器是否支持语音合成
export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window;
}

// 语音播放事件回调接口
export interface SpeechPlaybackEvents {
  onStart?: () => void;      // 语音开始播放
  onEnd?: () => void;        // 语音播放完成
  onError?: (error: Error) => void;  // 播放出错
  estimatedDuration?: number; // 预估播放时长（毫秒，只读）
}

// 语音服务类（多声道服务的包装器）
class VoiceService {
  /**
   * 计算语音播放时长（基于文本长度和语速）
   */
  private calculateDuration(text: string, voiceConfig?: VoiceConfig): number {
    const rate = voiceConfig?.rate || 1.0;
    // 中文：约0.3秒/字，英文：约0.15秒/字
    const isChinese = /[\u4e00-\u9fa5]/.test(text);
    const charsPerSecond = isChinese ? 3.3 : 6.7;
    const baseDuration = (text.length / charsPerSecond) * 1000;
    return Math.ceil(baseDuration / rate);
  }

  /**
   * 播放语音（聊天等）
   * @param text 要播放的文本
   * @param voiceConfig 语音配置
   * @param _priority 优先级（已废弃，保留用于兼容）
   * @param playerId 玩家ID，用于分配声道
   * @param events 播放事件回调（新增）
   */
  speak(
    text: string, 
    voiceConfig?: VoiceConfig, 
    priority: number = 1, // 优先级：3=对骂，2=事件，1=随机，4=报牌（最高）
    playerId?: number,
    events?: SpeechPlaybackEvents
  ): Promise<void> {
    // 计算预估时长
    const estimatedDuration = this.calculateDuration(text, voiceConfig);
    if (events) {
      events.estimatedDuration = estimatedDuration;
    }

    if (playerId !== undefined) {
      // 有玩家ID，使用多声道服务
      const channel = getPlayerChannel(playerId);
      return multiChannelVoiceService.speak(text, voiceConfig, channel, {
        onStart: events?.onStart,
        onEnd: events?.onEnd,
        onError: events?.onError,
        estimatedDuration
      }, priority);
    } else {
      // 没有玩家ID，使用默认声道（玩家0）
      return multiChannelVoiceService.speak(text, voiceConfig, ChannelType.PLAYER_0, {
        onStart: events?.onStart,
        onEnd: events?.onEnd,
        onError: events?.onError,
        estimatedDuration
      }, priority);
    }
  }

  /**
   * 立即播放高优先级语音（报牌专用）
   * @param text 要播放的文本
   * @param voiceConfig 语音配置
   * @param events 播放事件回调（用于同步动画）
   */
  speakImmediate(
    text: string, 
    voiceConfig?: VoiceConfig,
    events?: SpeechPlaybackEvents
  ): Promise<void> {
    // 计算预估时长
    const estimatedDuration = this.calculateDuration(text, voiceConfig);
    if (events) {
      events.estimatedDuration = estimatedDuration;
    }
    
    return multiChannelVoiceService.speak(
      text, 
      voiceConfig, 
      ChannelType.ANNOUNCEMENT, 
      events,
      4 // 报牌优先级最高
    );
  }

  /**
   * 停止所有语音
   */
  stop(): void {
    multiChannelVoiceService.stop();
  }

  /**
   * 是否正在播放
   */
  isCurrentlySpeaking(): boolean {
    return multiChannelVoiceService.isCurrentlySpeaking();
  }
}

// 创建全局语音服务实例
export const voiceService = new VoiceService();

// 导出便捷函数
export function speakText(
  text: string, 
  voiceConfig?: VoiceConfig, 
  priority?: number, 
  playerId?: number,
  events?: SpeechPlaybackEvents
): Promise<void> {
  return voiceService.speak(text, voiceConfig, priority, playerId, events);
}

export function stopSpeech(): void {
  voiceService.stop();
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

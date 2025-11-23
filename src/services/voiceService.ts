/**
 * 语音服务
 * 统一的语音播放接口，内部使用多声道服务
 * 每个玩家分配一个声道，报牌使用独立声道
 */

import { VoiceConfig } from '../types/card';
import { 
  multiChannelVoiceService, 
  getPlayerChannel,
  ChannelType
} from './multiChannelVoiceService';

// 检查浏览器是否支持语音合成
export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window;
}

// 语音服务类（多声道服务的包装器）
class VoiceService {
  /**
   * 播放语音（聊天等）
   * @param text 要播放的文本
   * @param voiceConfig 语音配置
   * @param _priority 优先级（已废弃，保留用于兼容）
   * @param playerId 玩家ID，用于分配声道
   */
  speak(
    text: string, 
    voiceConfig?: VoiceConfig, 
    _priority: number = 0, 
    playerId?: number
  ): Promise<void> {
    if (playerId !== undefined) {
      // 有玩家ID，使用多声道服务
      const channel = getPlayerChannel(playerId);
      return multiChannelVoiceService.speak(text, voiceConfig, channel);
    } else {
      // 没有玩家ID，使用默认声道（玩家0）
      return multiChannelVoiceService.speak(text, voiceConfig, ChannelType.PLAYER_0);
    }
  }

  /**
   * 立即播放高优先级语音（报牌专用）
   * @param text 要播放的文本
   * @param voiceConfig 语音配置
   */
  speakImmediate(text: string, voiceConfig?: VoiceConfig): Promise<void> {
    return multiChannelVoiceService.speakImmediate(text, voiceConfig);
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
  playerId?: number
): Promise<void> {
  return voiceService.speak(text, voiceConfig, priority, playerId);
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

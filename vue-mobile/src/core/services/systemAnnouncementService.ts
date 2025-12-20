/**
 * 系统报牌服务
 * 用于出牌时的报牌（系统信息）
 * 与聊天系统（chatService）分离：聊天是随机的，报牌是必须的
 * 注意：报牌是异步的，不等待完成
 */

import { Play } from '../types/card';
import { VoiceConfig } from '../types/card';
import { playToSpeechText } from '../utils/speechUtils';
import { voiceService } from './voiceService';
import { i18n } from '../i18n';
import { createVoiceConfig } from './voiceConfigService';

/**
 * 系统报牌服务
 * 负责出牌时的报牌
 */
class SystemAnnouncementService {
  // 去重机制：记录最近播放的文本和时间
  private lastAnnounceText: string | null = null;
  private lastAnnounceTime: number = 0;
  private readonly deduplicationWindow = 500; // 500ms 内的重复调用会被忽略
  private isAnnouncing = false; // 防止并发调用
  
  // 报牌默认使用男声配置
  private readonly defaultAnnouncementVoiceConfig: VoiceConfig = createVoiceConfig(
    -1, // 使用特殊ID表示系统报牌
    'male', // 男声
    'mandarin', // 普通话
    {
      rate: { min: 1.0, max: 1.0 },
      pitch: { min: 0.9, max: 0.9 }, // 稍低音调，更符合男声
      volume: { min: 1.0, max: 1.0 }
    }
  );

  /**
   * 报牌（出牌时）
   * 立即开始生成音频，不等待完成
   * 使用回调来确保语音和动画同步
   * @param play 出牌信息
   * @param voiceConfig 语音配置
   * @param callbacks 回调函数
   * @param callbacks.onStart 语音开始播放时的回调（用于同步动画）
   * @param callbacks.onEnd 语音播放完成时的回调
   * @param callbacks.onError 语音播放失败时的回调
   * @returns Promise（不等待完成）
   */
  async announcePlay(
    play: Play, 
    voiceConfig?: VoiceConfig,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    const onStart = callbacks?.onStart;
    const onEnd = callbacks?.onEnd;
    const onError = callbacks?.onError;
    const text = playToSpeechText(play);    const now = Date.now();
    
    // 去重检查1：如果最近刚播放过相同文本，跳过（防止 React StrictMode 导致的重复调用）
    if (text === this.lastAnnounceText && (now - this.lastAnnounceTime) < this.deduplicationWindow) {
      // 即使去重，也调用 onStart（因为动画可能已经开始了）
      if (onStart) {
        onStart();
      }
      return;
    }
    
    // 去重检查2：防止并发调用（如果正在播放相同文本，跳过）
    if (this.isAnnouncing && text === this.lastAnnounceText) {
      // 即使去重，也调用 onStart（因为动画可能已经开始了）
      if (onStart) {
        onStart();
      }
      return;
    }
    
    // 记录当前调用
    this.lastAnnounceText = text;
    this.lastAnnounceTime = now;
    this.isAnnouncing = true;
    
    try {
      // 立即开始播放（不等待完成）
      // 使用 speakImmediate 确保使用 ANNOUNCEMENT 声道，并传递 onStart 回调
      // 如果没有传入 voiceConfig，使用默认的男声配置
      const finalVoiceConfig = voiceConfig || this.defaultAnnouncementVoiceConfig;
      await voiceService.speakImmediate(
        text, 
        finalVoiceConfig,
        {
          onStart: () => {
            // 调用外部传入的 onStart 回调（用于同步动画）
            if (onStart) {
              onStart();
            }
          },
          onEnd: () => {
            this.isAnnouncing = false;
            // 调用外部传入的 onEnd 回调
            if (onEnd) {
              onEnd();
            }
          },
          onError: (error) => {
            this.isAnnouncing = false;
            // 即使失败，也调用 onStart（让动画继续）
            if (onStart) {
              onStart();
            }
            // 调用外部传入的 onError 回调
            if (onError) {
              onError(error);
            }
          }
        }
      );
    } catch (error) {
      this.isAnnouncing = false;
      // 即使失败，也调用 onStart（让动画继续）
      if (onStart) {
        onStart();
      }
      // 调用外部传入的 onError 回调
      if (onError) {
        onError(error as Error);
      }
    }
  }

  /**
   * 报"要不起"（要不起时）
   * 立即播放，不等待完成
   * @param voiceConfig 语音配置
   * @param onStart 语音开始播放时的回调（用于同步动画）
   * @returns Promise（不等待完成）
   */
  async announcePass(voiceConfig?: VoiceConfig, onStart?: () => void): Promise<void> {
    // 根据当前语言获取"要不起"的翻译文本
    const passText = i18n.t('game:actions.pass');
    const now = Date.now();
    
    // 去重检查：如果最近刚播放过，跳过（防止重复调用）
    if (passText === this.lastAnnounceText && (now - this.lastAnnounceTime) < this.deduplicationWindow) {
      // 即使去重，也调用 onStart（因为动画可能已经开始了）
      if (onStart) {
        onStart();
      }
      return;
    }
    
    // 记录当前调用
    this.lastAnnounceText = passText;
    this.lastAnnounceTime = now;
    
    try {
      // 立即播放，不等待完成
      // 如果没有传入 voiceConfig，使用默认的男声配置
      const finalVoiceConfig = voiceConfig || this.defaultAnnouncementVoiceConfig;
      await voiceService.speakImmediate(passText, finalVoiceConfig, {
        onStart: () => {
          // 调用外部传入的 onStart 回调（用于同步动画）
          if (onStart) {
            onStart();
          }
        },
        onEnd: () => {
        },
        onError: (error) => {
          // 即使失败，也调用 onStart（让动画继续）
          if (onStart) {
            onStart();
          }
        }
      });
    } catch (error) {
      // 即使失败，也调用 onStart（让动画继续）
      if (onStart) {
        onStart();
      }
    }
  }
}

// 创建全局系统报牌服务实例
export const systemAnnouncementService = new SystemAnnouncementService();

// 导出便捷函数
export function announcePlay(
  play: Play, 
  voiceConfig?: VoiceConfig,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  }
): Promise<void> {
  return systemAnnouncementService.announcePlay(play, voiceConfig, callbacks);
}

export function announcePass(voiceConfig?: VoiceConfig, onStart?: () => void): Promise<void> {
  return systemAnnouncementService.announcePass(voiceConfig, onStart);
}

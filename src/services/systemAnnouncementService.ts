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

  /**
   * 报牌（出牌时）
   * 立即播放，不等待完成
   * @param play 出牌信息
   * @param voiceConfig 语音配置
   * @returns Promise（不等待完成）
   */
  async announcePlay(play: Play, voiceConfig?: VoiceConfig): Promise<void> {
    const text = playToSpeechText(play);
    const now = Date.now();
    
    // 去重检查1：如果最近刚播放过相同文本，跳过（防止 React StrictMode 导致的重复调用）
    if (text === this.lastAnnounceText && (now - this.lastAnnounceTime) < this.deduplicationWindow) {
      return;
    }
    
    // 去重检查2：防止并发调用（如果正在播放相同文本，跳过）
    if (this.isAnnouncing && text === this.lastAnnounceText) {
      return;
    }
    
    // 记录当前调用
    this.lastAnnounceText = text;
    this.lastAnnounceTime = now;
    this.isAnnouncing = true;
    
    try {
      // 立即播放，不等待完成
      await voiceService.speakImmediate(text, voiceConfig);
    } finally {
      // 延迟重置标志，确保去重窗口有效
      setTimeout(() => {
        this.isAnnouncing = false;
      }, this.deduplicationWindow);
    }
  }

  /**
   * 报"要不起"（要不起时）
   * 立即播放，不等待完成
   * @param voiceConfig 语音配置
   * @returns Promise（不等待完成）
   */
  async announcePass(voiceConfig?: VoiceConfig): Promise<void> {
    // 立即播放，不等待完成
    return voiceService.speakImmediate('要不起', voiceConfig);
  }
}

// 创建全局系统报牌服务实例
export const systemAnnouncementService = new SystemAnnouncementService();

// 导出便捷函数
export function announcePlay(play: Play, voiceConfig?: VoiceConfig): Promise<void> {
  return systemAnnouncementService.announcePlay(play, voiceConfig);
}

export function announcePass(voiceConfig?: VoiceConfig): Promise<void> {
  return systemAnnouncementService.announcePass(voiceConfig);
}

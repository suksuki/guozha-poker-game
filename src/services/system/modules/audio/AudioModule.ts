/**
 * 音频模块
 * 统一管理所有音频相关服务
 */

import { SystemModule, SystemContext, ModuleStatus } from '../../types/SystemModule';
import { AudioConfig } from '../../types/SystemConfig';
import { systemAnnouncementService } from '../../../systemAnnouncementService';
import { voiceService } from '../../../voiceService';
import { soundService } from '../../../soundService';
import type { Play, VoiceConfig } from '../../../../types/card';
import type { Player } from '../../../../types/card';

export class AudioModule implements SystemModule {
  name = 'audio';
  dependencies = ['event']; // 依赖事件模块
  
  private config: AudioConfig | null = null;
  private context: SystemContext | null = null;
  private initialized = false;
  private enabled = true;
  
  async initialize(config: AudioConfig, context: SystemContext): Promise<void> {
    this.config = config;
    this.context = context;
    this.enabled = config.enabled;
    this.initialized = true;
  }
  
  configure(config: Partial<AudioConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...config };
      this.enabled = this.config.enabled;
    }
  }
  
  async shutdown(): Promise<void> {
    this.initialized = false;
    this.config = null;
    this.context = null;
  }
  
  getStatus(): ModuleStatus {
    return {
      initialized: this.initialized,
      enabled: this.enabled,
    };
  }
  
  isEnabled(): boolean {
    return this.enabled && this.initialized;
  }
  
  /**
   * 报牌（出牌时）
   * 报牌功能必须始终可用，不依赖于 AudioModule 的配置
   */
  async announcePlay(
    play: Play,
    voiceConfig?: VoiceConfig,
    onStart?: () => void
  ): Promise<void> {
    
    // 报牌功能必须始终可用，直接调用 systemAnnouncementService
    // 不检查 AudioModule 的配置，确保报牌始终工作
    return systemAnnouncementService.announcePlay(play, voiceConfig, onStart);
  }
  
  /**
   * 报"要不起"
   */
  async announcePass(
    voiceConfig?: VoiceConfig,
    onStart?: () => void
  ): Promise<void> {
    if (!this.isEnabled() || !this.config?.announcement.enabled) {
      return;
    }
    return systemAnnouncementService.announcePass(voiceConfig, onStart);
  }
  
  /**
   * 预加载音效
   */
  async preloadSounds(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    return soundService.preloadSounds();
  }
  
  /**
   * 播放音效
   */
  playSound(soundName: string, volume: number = 1.0): void {
    if (!this.isEnabled()) {
      return;
    }
    soundService.playSound(soundName, volume);
  }
  
  /**
   * 检查语音支持
   */
  isSpeechSupported(): boolean {
    if (!this.isEnabled()) {
      return false;
    }
    return voiceService.isSpeechSupported();
  }
  
  /**
   * 获取可用语音列表
   */
  async listAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.isEnabled()) {
      return [];
    }
    return voiceService.listAvailableVoices();
  }
  
  /**
   * 获取语音服务实例（用于需要直接访问的情况）
   */
  getVoiceService() {
    return voiceService;
  }
  
  /**
   * 获取音效服务实例（用于需要直接访问的情况）
   */
  getSoundService() {
    return soundService;
  }
  
  /**
   * 获取报牌服务实例（用于需要直接访问的情况）
   */
  getAnnouncementService() {
    return systemAnnouncementService;
  }
}


/**
 * TTS服务类型定义
 */

import { VoiceConfig } from '../../types/voice';

export type TTSLanguage = 'zh' | 'ja' | 'ko' | 'en';

export interface TTSOptions {
  lang?: TTSLanguage;
  voiceConfig?: VoiceConfig;
  useCache?: boolean;  // 是否使用缓存，默认 true
}

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  duration: number;  // 音频时长（秒）
  format: string;    // 音频格式（如 'audio/wav'）
}

/**
 * TTS 客户端接口
 */
export interface ITTSClient {
  /**
   * 生成语音音频（异步）
   * @param text 文本
   * @param options 选项
   * @returns 音频数据
   */
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
  
  /**
   * 检查服务是否可用
   */
  isAvailable(): Promise<boolean>;
}

/**
 * TTS服务提供商类型
 */
export type TTSProvider = 'browser' | 'piper' | 'melo';

/**
 * TTS服务器配置
 */
export interface TTSServerConfig {
  id: string;
  name: string;
  type: TTSProvider;
  enabled: boolean;
  priority: number;  // 优先级（数字越小优先级越高）
  timeout?: number;
  retryCount?: number;
  // 连接配置
  connection: {
    host: string;
    port: number;
    protocol: 'http' | 'https';
  };
  // 声道分配（可选，如果指定则只用于该声道）
  assignedChannels?: number[];  // ChannelType数组，如[0,1,2]表示用于玩家0,1,2
  // 状态信息
  status?: {
    health: 'available' | 'unavailable' | 'checking';
    latency?: number;
    lastCheck?: number;
  };
  // 提供者特定配置
  providerConfig?: {
    piper?: {
      model?: string;
    };
    melo?: {
      speaker?: string;
      speed?: number;
    };
  };
}


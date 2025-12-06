/**
 * TTS播报服务
 * 支持超时、降级、缓存机制
 * 用于报牌和聊天消息的语音播报
 * 
 * 注意：不使用ttsService.synthesize()，因为它会回退到浏览器TTS（单声道）
 * 直接调用TTS客户端（piper/melo）获取音频文件，然后用Web Audio API播放（多声道）
 */

import { getMultiChannelAudioService } from '../multiChannelAudioService';
import { ChannelType } from '../../types/channel';
import type { TTSOptions, TTSResult } from './types';
import type { TTSServerConfig } from './types';
import { PiperTTSClient } from './piperTTSClient';
import { MeloTTSClient } from './meloTTSClient';
import { useSettingsStore } from '../../stores/settingsStore';

interface PlaybackOptions {
  timeout?: number;  // 超时时间（毫秒）
  fallbackTimeout?: number;  // 降级超时时间（毫秒）
  enableCache?: boolean;  // 是否启用缓存
  priority?: number;  // 优先级
  channel?: ChannelType;  // 声道
  onAudioGenerated?: () => void;  // 音频文件生成完成回调（在TTS返回音频后立即触发）
  onStart?: () => void;  // 开始播放回调
  onEnd?: () => void;  // 播放完成回调
  onError?: (error: Error) => void;  // 错误回调
}

interface CachedAudio {
  audioBuffer: ArrayBuffer;
  duration: number;
  format: string;
  timestamp: number;
}

/**
 * TTS播报服务
 */
export class TTSPlaybackService {
  private audioCache: Map<string, CachedAudio> = new Map();
  private readonly CACHE_EXPIRY = 60 * 60 * 1000; // 1小时过期

  /**
   * 播报文本（带超时和降级）
   * @param text 要播报的文本
   * @param options 播报选项
   * @returns Promise，在音频播放完成后resolve
   */
  async speak(
    text: string,
    options: PlaybackOptions = {}
  ): Promise<void> {
    const {
      timeout = 5000,  // 默认5秒
      fallbackTimeout = 5000,  // 降级超时5秒
      enableCache = true,
      priority = 1,
      channel = ChannelType.ANNOUNCEMENT,
      onAudioGenerated,
      onStart,
      onEnd,
      onError
    } = options;

    // 检查缓存
    if (enableCache) {
      const cacheKey = this.getCacheKey(text, channel);
      const cached = this.audioCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_EXPIRY) {
        // 检查缓存音频是否有效
        if (cached.audioBuffer && cached.audioBuffer.byteLength > 0) {
          // 使用缓存的音频，等待音频完全播放完成后再触发onAudioGenerated（确保用户听到完整的报牌）
          this.playAudio(cached.audioBuffer, cached.duration, channel, priority, () => {
            onStart?.();
          }, () => {
            // 音频完全播放完成时，触发onAudioGenerated回调
            onAudioGenerated?.();
            onEnd?.();
          }, onError).catch(err => {
            console.error('[TTSPlayback] 播放缓存音频失败:', err);
            onError?.(err);
          });
          return Promise.resolve();
        } else {
          console.warn(`[TTSPlayback] ⚠️ 缓存音频无效（空数据），重新生成`);
          // 删除无效缓存
          this.audioCache.delete(cacheKey);
        }
      }
    }

    // 生成音频（带超时和降级）
    const audioResult = await this.generateAudioWithFallback(text, timeout, fallbackTimeout, channel);
    
    if (!audioResult) {
      console.warn('[TTSPlayback] ⚠️ 所有TTS服务器都失败或不可用');
    }

    // TTS文件返回后，等待音频解码、播放并完全播放完成，在onEnd回调中触发onAudioGenerated
    // 这样可以确保用户听到完整的报牌内容，游戏流程在报牌完全结束后才继续
    if (audioResult) {
      // 缓存音频
      if (enableCache) {
        const cacheKey = this.getCacheKey(text, channel);
        this.audioCache.set(cacheKey, {
          audioBuffer: audioResult.audioBuffer,
          duration: audioResult.duration,
          format: audioResult.format,
          timestamp: Date.now()
        });
      }
      
      // 播放音频（异步，不阻塞）
      // 在音频完全播放完成时（onEnd回调）触发onAudioGenerated，确保用户听到完整的报牌内容
      this.playAudio(audioResult.audioBuffer, audioResult.duration, channel, priority, () => {
        onStart?.();
      }, () => {
        // 音频完全播放完成时，触发onAudioGenerated回调
        onAudioGenerated?.();
        onEnd?.();
      }, (err) => {
        // 播放失败时，也触发onAudioGenerated，确保游戏流程继续
        console.error('[TTSPlayback] 播放音频失败:', err);
        onAudioGenerated?.();
        onError?.(err);
      }).catch(err => {
        // 播放异常时，也触发onAudioGenerated，确保游戏流程继续
        console.error('[TTSPlayback] 播放音频异常:', err);
        onAudioGenerated?.();
        onError?.(err);
      });
      return Promise.resolve();
    } else {
      // 所有TTS都失败，但仍然触发回调让游戏继续
      console.warn('[TTSPlayback] ⚠️ 所有TTS服务都失败，但触发回调让游戏继续');
      const error = new Error('所有TTS服务都不可用');
      onError?.(error);
      // 即使失败，也触发onAudioGenerated，确保游戏流程继续
      onAudioGenerated?.();
      // 不抛出错误，而是返回resolved promise，让游戏继续
      return Promise.resolve();
    }
  }

  /**
   * 生成音频（带降级机制）
   * 直接调用TTS客户端（piper/melo），不使用ttsService.synthesize()（避免回退到浏览器TTS单声道）
   * 按优先级尝试所有非浏览器TTS服务器，如果都失败则返回null（不使用浏览器TTS）
   */
  private async generateAudioWithFallback(
    text: string,
    primaryTimeout: number,
    fallbackTimeout: number,
    channel: ChannelType
  ): Promise<TTSResult | null> {
    const settingsStore = useSettingsStore();
    const servers = settingsStore.ttsServers;
    
    // 只使用非浏览器TTS服务器（piper/melo），排除浏览器TTS
    const candidateServers = servers.filter(s => 
      s.enabled && 
      s.type !== 'browser' && 
      (s.type === 'piper' || s.type === 'melo')
    );
    
    // 如果指定了声道，优先选择分配给该声道的服务器
    let filteredServers = candidateServers;
    if (channel !== undefined) {
      const assignedServers = candidateServers.filter(s => 
        s.assignedChannels && s.assignedChannels.includes(channel)
      );
      if (assignedServers.length > 0) {
        filteredServers = assignedServers;
      }
    }
    
    // 按优先级排序（优先级数字越小，优先级越高）
    filteredServers.sort((a, b) => a.priority - b.priority);
    
    if (filteredServers.length === 0) {
      console.warn('[TTSPlayback] 没有可用的TTS服务器（piper/melo）');
      return null;
    }
    
    const options: TTSOptions = {
      lang: 'zh',
      useCache: true
    };
    
    // 总超时时间 = primaryTimeout + fallbackTimeout（10秒）
    const totalTimeout = primaryTimeout + fallbackTimeout;
    
    // 按优先级尝试所有服务器
    for (const server of filteredServers) {
      try {
        // 创建TTS客户端
        let client;
        if (server.type === 'piper') {
          client = new PiperTTSClient(server);
        } else if (server.type === 'melo') {
          client = new MeloTTSClient(server);
        } else {
          continue; // 跳过不支持的服务器类型
        }
        
        // 检查服务器是否可用
        const isAvailable = await Promise.race([
          client.isAvailable(),
          new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(false), 2000); // 健康检查超时2秒
          })
        ]);
        
        if (!isAvailable) {
          console.warn(`[TTSPlayback] TTS服务器 ${server.name} 不可用，尝试下一个`);
          continue;
        }
        
        // 调用TTS客户端生成音频（带超时）
        const synthesizePromise = client.synthesize(text, options);
        const timeoutPromise = new Promise<TTSResult | null>((resolve) => {
          setTimeout(() => resolve(null), totalTimeout);
        });
        
        const result = await Promise.race([synthesizePromise, timeoutPromise]);
        if (result) {
          return result;
        } else {
          console.warn(`[TTSPlayback] TTS服务器 ${server.name} 合成超时，尝试下一个`);
          continue;
        }
      } catch (error) {
        console.warn(`[TTSPlayback] TTS服务器 ${server.name} 失败:`, error);
        continue;
      }
    }
    
    // 所有服务器都失败
    console.warn('[TTSPlayback] 所有TTS服务器都失败');
    return null;
  }

  /**
   * 播放音频
   */
  private async playAudio(
    audioBuffer: ArrayBuffer,
    duration: number,
    channel: ChannelType,
    priority: number,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    // 检查音频数据是否有效
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      const error = new Error('音频数据为空');
      console.error('[TTSPlayback] 音频数据无效:', error);
      onError?.(error);
      throw error;
    }
    
    const audioService = getMultiChannelAudioService();
    const audioContext = audioService.getAudioContext();
    if (!audioContext) {
      const error = new Error('AudioContext不可用');
      console.error('[TTSPlayback] AudioContext不可用');
      onError?.(error);
      throw error;
    }

    try {
      const decodedBuffer = await audioContext.decodeAudioData(audioBuffer.slice(0));
      return audioService.playAudioBuffer(
        decodedBuffer,
        channel,
        priority,
        {
          onStart: () => {
            onStart?.();
          },
          onEnd: () => {
            onEnd?.();
          },
          onError: (err) => {
            console.error('[TTSPlayback] 音频播放错误:', err);
            onError?.(err);
          }
        }
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[TTSPlayback] 播放音频失败:', err);
      onError?.(err);
      throw err;
    }
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(text: string, channel: ChannelType): string {
    return `tts_${text}_${channel}`;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.audioCache.clear();
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache(): void {
    const now = Date.now();
    let clearedCount = 0;
    for (const [key, cached] of this.audioCache.entries()) {
      if (now - cached.timestamp > this.CACHE_EXPIRY) {
        this.audioCache.delete(key);
        clearedCount++;
      } else if (!cached.audioBuffer || cached.audioBuffer.byteLength === 0) {
        // 清除无效缓存（空数据）
        this.audioCache.delete(key);
        clearedCount++;
      }
    }
    if (clearedCount > 0) {
      console.log(`[TTSPlayback] 清除 ${clearedCount} 个过期或无效缓存`);
    }
  }
  
  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    const count = this.audioCache.size;
    this.audioCache.clear();
    console.log(`[TTSPlayback] 清除所有缓存 (${count} 个)`);
  }
}

// 单例
let ttsPlaybackService: TTSPlaybackService | null = null;

export function getTTSPlaybackService(): TTSPlaybackService {
  if (!ttsPlaybackService) {
    ttsPlaybackService = new TTSPlaybackService();
  }
  return ttsPlaybackService;
}


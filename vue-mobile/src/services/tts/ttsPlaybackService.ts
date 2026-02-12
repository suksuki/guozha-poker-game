/**
 * TTS播报服务
 * 支持超时、降级、缓存机制
 * 用于报牌和聊天消息的语音播报
 * 
 * 注意：不使用ttsService.synthesize()，因为它会回退到浏览器TTS（单声道）
 * 直接调用TTS客户端（piper/melo）获取音频文件，然后用Web Audio API播放（多声道）
 */

import { getMultiChannelAudioService } from '../audio/multiChannelAudioService';
import { ChannelType } from '../../types/channel';
import type { TTSOptions, TTSResult, TTSLanguage } from './types';
import type { TTSServerConfig } from './types';
import { PiperTTSClient } from './piperTTSClient';
import { MeloTTSClient } from './meloTTSClient';
import { QwenTTSClient } from './qwenTTSClient';
import { useSettingsStore } from '../../stores/settingsStore';

/** 从 VITE_TTS_BASE_URL 解析出默认 Qwen 服务器配置（仅当设置里没有任何可用 TTS 时使用） */
function getDefaultQwenServerFromEnv(): TTSServerConfig | null {
  const url = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TTS_BASE_URL;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
  try {
    const u = new URL(url);
    const port = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
    return {
      id: 'default-qwen-env',
      name: 'Qwen TTS (环境变量)',
      type: 'qwen',
      enabled: true,
      priority: 0,
      connection: {
        host: u.hostname,
        port: Number.isNaN(port) ? 8000 : port,
        protocol: u.protocol === 'https:' ? 'https' : 'http'
      },
      providerConfig: { qwen: { speaker: 'Vivian', instruct: '牌桌氛围，语气轻松一点', language: 'Chinese' } }
    };
  } catch {
    return null;
  }
}

interface PlaybackOptions {
  timeout?: number;
  fallbackTimeout?: number;
  enableCache?: boolean;
  priority?: number;
  channel?: ChannelType;
  /** TTS 发音语言（与界面语言一致时即可说韩文/日文等） */
  lang?: TTSLanguage;
  onAudioGenerated?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

interface CachedAudio {
  audioBuffer: ArrayBuffer;
  duration: number;
  format: string;
  timestamp: number;
}

/** 健康检查通过后在此时间内不再重复请求 GET /health */
const HEALTH_CACHE_TTL_MS = 30 * 1000;

function serverHealthKey(server: TTSServerConfig): string {
  const c = server.connection;
  return `${c.protocol}://${c.host}:${c.port}`;
}

/**
 * TTS播报服务
 */
export class TTSPlaybackService {
  private audioCache: Map<string, CachedAudio> = new Map();
  private readonly CACHE_EXPIRY = 60 * 60 * 1000; // 1小时过期
  /** 健康检查通过时间戳，避免每次报牌都打 GET /health */
  private healthCheckedAt: Map<string, number> = new Map();
  /** 串行队列：报牌与玩家说话依次播放，互不重叠、互不影响 */
  private speakQueue: Promise<void> = Promise.resolve();

  /**
   * 播报文本（带超时和降级）。报牌与玩家泡泡共用队列，保证不会同时播放。
   */
  async speak(
    text: string,
    options: PlaybackOptions = {}
  ): Promise<void> {
    const run = () => this.doSpeak(text, options);
    this.speakQueue = this.speakQueue.then(run, run);
    return this.speakQueue;
  }

  private async doSpeak(
    text: string,
    options: PlaybackOptions = {}
  ): Promise<void> {
    const {
      timeout = 5000,
      fallbackTimeout = 5000,
      enableCache = true,
      priority = 1,
      channel = ChannelType.SYSTEM,
      lang,
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
          // 使用缓存的音频，等待音频完全播放完成
          try {
            await this.playAudio(cached.audioBuffer, cached.duration, channel, priority, () => {
              onStart?.();
            }, () => {
              // 音频完全播放完成时，触发回调
              onAudioGenerated?.();
              onEnd?.();
            }, onError);
          } catch (err) {
            onError?.(err instanceof Error ? err : new Error(String(err)));
          }
          return;
        } else {
          // 删除无效缓存
          this.audioCache.delete(cacheKey);
        }
      }
    }

    const audioResult = await this.generateAudioWithFallback(text, timeout, fallbackTimeout, channel, lang);

    if (!audioResult) {
      onAudioGenerated?.();
      onError?.(new Error('所有TTS服务都不可用'));
      return;
    }

    if (enableCache) {
      const cacheKey = this.getCacheKey(text, channel);
      this.audioCache.set(cacheKey, {
        audioBuffer: audioResult.audioBuffer,
        duration: audioResult.duration,
        format: audioResult.format,
        timestamp: Date.now()
      });
    }

    try {
      await this.playAudio(audioResult.audioBuffer, audioResult.duration, channel, priority, () => onStart?.(), () => {
        onAudioGenerated?.();
        onEnd?.();
      }, (err) => {
        onAudioGenerated?.();
        onError?.(err);
      });
    } catch (err) {
      onAudioGenerated?.();
      onError?.(err instanceof Error ? err : new Error(String(err)));
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
    channel: ChannelType,
    lang?: TTSLanguage
  ): Promise<TTSResult | null> {
    const settingsStore = useSettingsStore();
    let servers = settingsStore.ttsServers;

    // 只使用非浏览器TTS服务器（piper/melo/qwen），排除浏览器TTS
    let candidateServers = servers.filter(s =>
      s.enabled &&
      s.type !== 'browser' &&
      (s.type === 'piper' || s.type === 'melo' || s.type === 'qwen')
    );

    // 兜底：设置里没有任何可用 TTS 时，尝试环境变量 VITE_TTS_BASE_URL（如 http://192.168.0.10:8000）
    if (candidateServers.length === 0) {
      const defaultQwen = getDefaultQwenServerFromEnv();
      if (defaultQwen) {
        candidateServers = [defaultQwen];
      }
    }

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
      return null;
    }

    const options: TTSOptions = {
      lang: lang ?? 'zh',
      useCache: true
    };

    // 总超时时间 = primaryTimeout + fallbackTimeout（10秒）
    const totalTimeout = primaryTimeout + fallbackTimeout;

    let lastError: Error | string | null = null;

    for (const server of filteredServers) {
      const serverKey = serverHealthKey(server);
      try {
        let client;
        if (server.type === 'piper') {
          client = new PiperTTSClient(server);
        } else if (server.type === 'melo') {
          client = new MeloTTSClient(server);
        } else if (server.type === 'qwen') {
          client = new QwenTTSClient(server);
        } else {
          continue;
        }

        const cachedAt = this.healthCheckedAt.get(serverKey);
        const skipHealth = cachedAt != null && (Date.now() - cachedAt) < HEALTH_CACHE_TTL_MS;
        let isAvailable: boolean;
        if (skipHealth) {
          isAvailable = true;
        } else {
          isAvailable = await Promise.race([
            client.isAvailable(),
            new Promise<boolean>((resolve) => {
              setTimeout(() => resolve(false), 2000);
            })
          ]);
          if (isAvailable) {
            this.healthCheckedAt.set(serverKey, Date.now());
          }
        }

        if (!isAvailable) {
          lastError = `服务器 ${server.connection?.host}:${server.connection?.port} 健康检查未通过`;
          continue;
        }

        const synthesizePromise = client.synthesize(text, options);
        const timeoutPromise = new Promise<TTSResult | null>((resolve) => {
          setTimeout(() => resolve(null), totalTimeout);
        });

        const result = await Promise.race([synthesizePromise, timeoutPromise]);
        if (result) {
          return result;
        }
        this.healthCheckedAt.delete(serverKey);
        lastError = '合成超时或返回空';
      } catch (error) {
        this.healthCheckedAt.delete(serverKey);
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

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
      onError?.(error);
      throw error;
    }

    const audioService = getMultiChannelAudioService();
    const audioContext = audioService.getAudioContext();
    if (!audioContext) {
      const error = new Error('AudioContext不可用');
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
            onError?.(err);
          }
        }
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
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
    }
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    const count = this.audioCache.size;
    this.audioCache.clear();
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


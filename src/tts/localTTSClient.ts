/**
 * 本地 TTS API 客户端
 * 支持连接到本地 TTS 服务（如 GPT-SoVITS、Coqui TTS、Edge-TTS 等）
 */

import { type ITTSClient, type TTSOptions, type TTSResult, type TTSLanguage } from './ttsClient';
import { VoiceConfig } from '../types/card';

export interface LocalTTSConfig {
  baseUrl?: string;  // TTS 服务地址，默认 'http://localhost:8000'
  timeout?: number;  // 请求超时时间（毫秒），默认 10000
  retryCount?: number;  // 重试次数，默认 2
}

/**
 * 本地 TTS API 客户端实现
 */
export class LocalTTSAPIClient implements ITTSClient {
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private cache: Map<string, TTSResult> = new Map();

  constructor(config: LocalTTSConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:8000';
    this.timeout = config.timeout || 10000;
    this.retryCount = config.retryCount || 2;
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const { useCache = true, lang = 'zh', voiceConfig } = options;

    // 检查缓存
    if (useCache) {
      const cacheKey = this.getCacheKey(text, lang, voiceConfig);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log(`[LocalTTSAPIClient] 使用缓存: ${text.substring(0, 20)}...`);
        return cached;
      }
    }

    // 调用 TTS API
    let lastError: Error | null = null;
    for (let i = 0; i <= this.retryCount; i++) {
      try {
        const result = await this.callTTSAPI(text, lang, voiceConfig);

        // 保存到缓存
        if (useCache && result) {
          const cacheKey = this.getCacheKey(text, lang, voiceConfig);
          this.cache.set(cacheKey, result);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[LocalTTSAPIClient] 第 ${i + 1} 次尝试失败:`, lastError);
        if (i < this.retryCount) {
          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError || new Error('TTS API 调用失败');
  }

  /**
   * 调用本地 TTS API
   */
  private async callTTSAPI(
    text: string,
    lang: TTSLanguage,
    voiceConfig?: VoiceConfig
  ): Promise<TTSResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          lang,
          voice: voiceConfig,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`TTS API 错误: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const duration = parseFloat(response.headers.get('X-Audio-Duration') || '0');
      const format = response.headers.get('Content-Type') || 'audio/wav';

      return {
        audioBuffer: arrayBuffer,
        duration,
        format,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`TTS API 请求超时 (${this.timeout}ms)`);
      }
      throw error;
    }
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(text: string, lang: TTSLanguage, voiceConfig?: VoiceConfig): string {
    return `${text}_${lang}_${voiceConfig?.rate || 1.0}_${voiceConfig?.pitch || 1.0}_${voiceConfig?.volume || 1.0}`;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 检查 TTS 服务是否可用
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Edge-TTS 客户端（使用 Edge TTS API）
 * 这是一个免费的在线 TTS 服务，无需 API Key
 */
export class EdgeTTSClient implements ITTSClient {
  private cache: Map<string, TTSResult> = new Map();

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const { useCache = true, lang = 'zh', voiceConfig } = options;

    // 检查缓存
    if (useCache) {
      const cacheKey = this.getCacheKey(text, lang, voiceConfig);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 调用 Edge TTS API
    const result = await this.callEdgeTTS(text, lang, voiceConfig);

    // 保存到缓存
    if (useCache && result) {
      const cacheKey = this.getCacheKey(text, lang, voiceConfig);
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * 调用 Edge TTS API
   * 注意：这需要后端代理，因为 Edge TTS 有 CORS 限制
   */
  private async callEdgeTTS(
    text: string,
    lang: TTSLanguage,
    voiceConfig?: VoiceConfig
  ): Promise<TTSResult> {
    // 语言代码映射
    const langMap: Record<TTSLanguage, string> = {
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
      nanchang: 'zh-CN',  // 南昌话使用普通话
    };

    const langCode = langMap[lang] || 'zh-CN';

    // 选择语音（根据语言和性别）
    const voice = this.selectVoice(langCode, voiceConfig);

    try {
      // 调用 Edge TTS API（需要后端代理）
      const response = await fetch('/api/edge-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
          rate: voiceConfig?.rate || 1.0,
          pitch: voiceConfig?.pitch || 1.0,
        }),
      });

      if (!response.ok) {
        // Edge TTS 后端代理不存在时，静默失败，不抛出错误
        // 这样系统可以自动降级到其他 TTS 提供者
        throw new Error(`Edge TTS API 错误: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const duration = parseFloat(response.headers.get('X-Audio-Duration') || '0');

      return {
        audioBuffer: arrayBuffer,
        duration,
        format: 'audio/mpeg',
      };
    } catch (error) {
      // 静默失败，让 TTS 服务管理器自动降级
      // 不输出错误日志，避免噪音（健康检查时会静默处理）
      throw error;
    }
  }

  /**
   * 选择语音
   */
  private selectVoice(langCode: string, voiceConfig?: VoiceConfig): string {
    // 默认语音映射
    const defaultVoices: Record<string, string> = {
      'zh-CN': 'zh-CN-XiaoxiaoNeural',  // 中文女声
      'ja-JP': 'ja-JP-NanamiNeural',    // 日文女声
      'ko-KR': 'ko-KR-SunHiNeural',     // 韩文女声
    };

    return defaultVoices[langCode] || defaultVoices['zh-CN'];
  }

  private getCacheKey(text: string, lang: TTSLanguage, voiceConfig?: VoiceConfig): string {
    return `${text}_${lang}_${voiceConfig?.rate || 1.0}_${voiceConfig?.pitch || 1.0}_${voiceConfig?.volume || 1.0}`;
  }

  clearCache(): void {
    this.cache.clear();
  }
}


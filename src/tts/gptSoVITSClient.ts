/**
 * GPT-SoVITS TTS 客户端
 * 支持本地 GPT-SoVITS 服务
 * 
 * GPT-SoVITS 是一个零样本 TTS 模型，支持：
 * - 声音克隆
 * - 多语言支持
 * - 高质量语音合成
 * 
 * API 文档参考：https://github.com/RVC-Boss/GPT-SoVITS
 */

import { type ITTSClient, type TTSOptions, type TTSResult, type TTSLanguage } from './ttsClient';
import { VoiceConfig } from '../types/card';
import { getAudioCache } from './audioCache';

export interface GPTSoVITSConfig {
  baseUrl?: string;  // GPT-SoVITS 服务地址，默认 'http://localhost:9880'
  timeout?: number;  // 请求超时时间（毫秒），默认 30000
  retryCount?: number;  // 重试次数，默认 2
  refAudioUrl?: string;  // 参考音频 URL（用于声音克隆）
  refText?: string;  // 参考文本（用于声音克隆）
  language?: string;  // 语言代码（zh, en, ja 等）
  cutMethod?: 'cut0' | 'cut1' | 'cut2';  // 文本切分方法
  topK?: number;  // Top-K 采样
  topP?: number;  // Top-P 采样
  temperature?: number;  // 温度参数
}

/**
 * GPT-SoVITS 客户端实现
 */
export class GPTSoVITSClient implements ITTSClient {
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private config: GPTSoVITSConfig;
  private audioCache = getAudioCache();

  constructor(config: GPTSoVITSConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:9880';
    this.timeout = config.timeout || 30000;
    this.retryCount = config.retryCount || 2;
    this.config = {
      refAudioUrl: config.refAudioUrl,
      refText: config.refText,
      language: config.language || 'zh',
      cutMethod: config.cutMethod || 'cut0',
      topK: config.topK || 5,
      topP: config.topP || 1.0,
      temperature: config.temperature || 1.0,
    };
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const { useCache = true, lang = 'zh', voiceConfig } = options;

    // 生成缓存键
    const cacheKey = this.getCacheKey(text, lang, voiceConfig);

    // 检查缓存
    if (useCache) {
      const cached = await this.audioCache.get(cacheKey);
      if (cached) {
        console.log(`[GPTSoVITSClient] 使用缓存: ${text.substring(0, 20)}...`);
        return cached;
      }
    }

    // 调用 GPT-SoVITS API
    let lastError: Error | null = null;
    for (let i = 0; i <= this.retryCount; i++) {
      try {
        const result = await this.callGPTSoVITS(text, lang, voiceConfig);

        // 保存到缓存
        if (useCache && result) {
          await this.audioCache.set(cacheKey, result);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[GPTSoVITSClient] 第 ${i + 1} 次尝试失败:`, lastError);
        if (i < this.retryCount) {
          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError || new Error('GPT-SoVITS API 调用失败');
  }

  /**
   * 调用 GPT-SoVITS API
   */
  private async callGPTSoVITS(
    text: string,
    lang: TTSLanguage,
    voiceConfig?: VoiceConfig
  ): Promise<TTSResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // GPT-SoVITS API 端点
      const endpoint = `${this.baseUrl}/tts`;

      // 构建请求体
      const requestBody: any = {
        text,
        text_language: this.mapLanguage(lang),
        ref_audio_path: this.config.refAudioUrl,
        ref_text: this.config.refText,
        top_k: this.config.topK,
        top_p: this.config.topP,
        temperature: this.config.temperature,
        text_split_method: this.config.cutMethod,
      };

      // 如果提供了参考音频和文本，使用声音克隆模式
      if (this.config.refAudioUrl && this.config.refText) {
        requestBody.ref_audio_path = this.config.refAudioUrl;
        requestBody.ref_text = this.config.refText;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GPT-SoVITS API 错误: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // GPT-SoVITS 返回音频数据
      const arrayBuffer = await response.arrayBuffer();
      
      // 尝试从响应头获取时长
      const durationHeader = response.headers.get('X-Audio-Duration');
      const duration = durationHeader ? parseFloat(durationHeader) : this.estimateDuration(text);

      return {
        audioBuffer: arrayBuffer,
        duration,
        format: 'audio/wav',  // GPT-SoVITS 通常返回 WAV 格式
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`GPT-SoVITS API 请求超时 (${this.timeout}ms)`);
      }
      throw error;
    }
  }

  /**
   * 映射语言代码
   */
  private mapLanguage(lang: TTSLanguage): string {
    const langMap: Record<TTSLanguage, string> = {
      zh: 'zh',
      ja: 'ja',
      ko: 'ko',
      nanchang: 'zh',  // 南昌话使用中文
    };
    return langMap[lang] || 'zh';
  }

  /**
   * 估算音频时长
   */
  private estimateDuration(text: string): number {
    // 假设语速 150 字/分钟
    return (text.length / 150) * 60;
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(text: string, lang: TTSLanguage, voiceConfig?: VoiceConfig): string {
    const refAudio = this.config.refAudioUrl || '';
    const refText = this.config.refText || '';
    return `gpt_sovits_${text}_${lang}_${refAudio}_${refText}_${voiceConfig?.rate || 1.0}_${voiceConfig?.pitch || 1.0}_${voiceConfig?.volume || 1.0}`;
  }

  /**
   * 检查 GPT-SoVITS 服务是否可用
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      // 如果 /health 端点不存在，尝试调用 /tts 端点（带空文本）
      try {
        const response = await fetch(`${this.baseUrl}/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: '',
            text_language: 'zh',
          }),
          signal: AbortSignal.timeout(3000),
        });
        // 即使返回错误，也说明服务可用
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * 设置参考音频（用于声音克隆）
   */
  setReferenceAudio(refAudioUrl: string, refText: string): void {
    this.config.refAudioUrl = refAudioUrl;
    this.config.refText = refText;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<GPTSoVITSConfig>): void {
    Object.assign(this.config, config);
  }
}


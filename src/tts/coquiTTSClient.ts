/**
 * Coqui TTS 客户端
 * 支持本地 Coqui TTS 服务
 * 
 * Coqui TTS 是一个开源的多语言 TTS 系统，支持：
 * - 多语言 TTS
 * - 高质量语音合成
 * - 声音克隆
 * 
 * API 文档参考：https://github.com/coqui-ai/TTS
 */

import { type ITTSClient, type TTSOptions, type TTSResult, type TTSLanguage } from './ttsClient';
import { VoiceConfig } from '../types/card';
import { getAudioCache } from './audioCache';

export interface CoquiTTSConfig {
  baseUrl?: string;  // Coqui TTS 服务地址，默认 'http://localhost:5002'
  timeout?: number;  // 请求超时时间（毫秒），默认 30000
  retryCount?: number;  // 重试次数，默认 2
  speakerId?: string;  // 说话人 ID（用于多说话人模型）
  language?: string;  // 语言代码
  modelName?: string;  // 模型名称（如 'tts_models/zh-CN/baker/tacotron2-DDC-GST'）
}

/**
 * Coqui TTS 客户端实现
 */
export class CoquiTTSClient implements ITTSClient {
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private config: CoquiTTSConfig;
  private audioCache = getAudioCache();

  constructor(config: CoquiTTSConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:5002';
    this.timeout = config.timeout || 30000;
    this.retryCount = config.retryCount || 2;
    this.config = {
      speakerId: config.speakerId,
      language: config.language || 'zh',
      modelName: config.modelName || 'tts_models/zh-CN/baker/tacotron2-DDC-GST',
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
        console.log(`[CoquiTTSClient] 使用缓存: ${text.substring(0, 20)}...`);
        return cached;
      }
    }

    // 调用 Coqui TTS API
    let lastError: Error | null = null;
    for (let i = 0; i <= this.retryCount; i++) {
      try {
        const result = await this.callCoquiTTS(text, lang, voiceConfig);

        // 保存到缓存
        if (useCache && result) {
          await this.audioCache.set(cacheKey, result);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[CoquiTTSClient] 第 ${i + 1} 次尝试失败:`, lastError);
        if (i < this.retryCount) {
          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Coqui TTS API 调用失败');
  }

  /**
   * 调用 Coqui TTS API
   */
  private async callCoquiTTS(
    text: string,
    lang: TTSLanguage,
    voiceConfig?: VoiceConfig
  ): Promise<TTSResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Coqui TTS API 端点
      const endpoint = `${this.baseUrl}/api/tts`;

      // 构建请求体
      const requestBody: any = {
        text,
        model_name: this.config.modelName,
        speaker_id: this.config.speakerId,
        language: this.mapLanguage(lang),
      };

      // 如果提供了说话人配置，使用它
      if (voiceConfig) {
        // Coqui TTS 可能不支持直接设置 rate/pitch/volume
        // 这些参数可能需要通过模型配置或后处理实现
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
        throw new Error(`Coqui TTS API 错误: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Coqui TTS 返回音频数据
      const arrayBuffer = await response.arrayBuffer();
      
      // 尝试从响应头获取时长
      const durationHeader = response.headers.get('X-Audio-Duration');
      const duration = durationHeader ? parseFloat(durationHeader) : this.estimateDuration(text);

      return {
        audioBuffer: arrayBuffer,
        duration,
        format: 'audio/wav',  // Coqui TTS 通常返回 WAV 格式
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Coqui TTS API 请求超时 (${this.timeout}ms)`);
      }
      throw error;
    }
  }

  /**
   * 映射语言代码
   */
  private mapLanguage(lang: TTSLanguage): string {
    const langMap: Record<TTSLanguage, string> = {
      zh: 'zh-cn',
      ja: 'ja',
      ko: 'ko',
      nanchang: 'zh-cn',  // 南昌话使用中文
    };
    return langMap[lang] || 'zh-cn';
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
    const speakerId = this.config.speakerId || '';
    const modelName = this.config.modelName || '';
    return `coqui_tts_${text}_${lang}_${speakerId}_${modelName}_${voiceConfig?.rate || 1.0}_${voiceConfig?.pitch || 1.0}_${voiceConfig?.volume || 1.0}`;
  }

  /**
   * 检查 Coqui TTS 服务是否可用
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'test',
          model_name: this.config.modelName,
        }),
        signal: AbortSignal.timeout(5000),
      });
      // 即使返回错误，也说明服务可用
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取可用的模型列表
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.models || [];
    } catch {
      return [];
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CoquiTTSConfig>): void {
    Object.assign(this.config, config);
  }
}


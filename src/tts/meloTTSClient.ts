/**
 * MeLo TTS 客户端
 * 支持连接到 MeLo TTS 服务（本地或远程）
 * 
 * MeLo TTS 是一个高质量的多语言 TTS 系统，特点：
 * - 支持多种语言（中文、英文、日文等）
 * - 音质高，支持多种说话人
 * - 可在 CPU 上运行
 * 
 * GitHub: https://github.com/myshell-ai/MeloTTS
 * API 端口：7860
 */

import { type ITTSClient, type TTSOptions, type TTSResult, type TTSLanguage } from './ttsClient';
import { VoiceConfig } from '../types/card';
import { getAudioCache } from './audioCache';

export interface MeloTTSConfig {
  baseUrl?: string;  // MeLo TTS 服务地址，默认 'http://localhost:7860'
  timeout?: number;  // 请求超时时间（毫秒），默认 30000
  retryCount?: number;  // 重试次数，默认 2
  defaultSpeaker?: string;  // 默认说话人，默认 'ZH'
}

/**
 * MeLo TTS 客户端实现
 */
export class MeloTTSClient implements ITTSClient {
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private defaultSpeaker: string;
  private audioCache = getAudioCache();

  constructor(config: MeloTTSConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:7860';
    this.timeout = config.timeout || 30000;
    this.retryCount = config.retryCount || 2;
    this.defaultSpeaker = config.defaultSpeaker || 'ZH';
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const { useCache = true, lang = 'zh', voiceConfig } = options;

    // 生成缓存键
    const cacheKey = this.getCacheKey(text, lang, voiceConfig);

    // 检查缓存
    if (useCache) {
      const cached = await this.audioCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 调用 MeLo TTS API
    let lastError: Error | null = null;
    for (let i = 0; i <= this.retryCount; i++) {
      try {
        const result = await this.callMeloTTS(text, lang, voiceConfig);

        // 保存到缓存
        if (useCache && result) {
          await this.audioCache.set(cacheKey, result);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < this.retryCount) {
          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError || new Error('MeLo TTS API 调用失败');
  }

  /**
   * 调用 MeLo TTS API
   */
  private async callMeloTTS(
    text: string,
    lang: TTSLanguage,
    voiceConfig?: VoiceConfig
  ): Promise<TTSResult> {
    const controller = new AbortController();
    const timeout = Math.max(this.timeout, 30000);
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // MeLo TTS API 端点
      const endpoint = `${this.baseUrl}/tts`;

      // 将语言代码转换为 MeLo TTS 格式
      const meloLang = this.convertToMeloLang(lang);
      
      // 确定说话人（根据 voiceConfig 或使用默认）
      // 支持多种英文说话人：EN-US, EN-BR, EN_INDIA, EN-AU, EN-Default
      const speaker = voiceConfig?.speaker || this.getSpeakerForLanguage(meloLang);

      // 构建请求体
      const requestBody: any = {
        text,
        lang: meloLang,
      };
      
      // 只在需要时添加 speaker 参数
      if (speaker && speaker !== meloLang) {
        requestBody.speaker = speaker;
      }
      
      // 支持语速调整
      if (voiceConfig?.rate && voiceConfig.rate !== 1.0) {
        requestBody.speed = voiceConfig.rate;
      }

      console.log(`[MeLo TTS] 发送请求: ${this.baseUrl}/tts`, requestBody);

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
        throw new Error(`MeLo TTS API 错误: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // MeLo TTS 返回音频数据（WAV格式）
      const arrayBuffer = await response.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('MeLo TTS API 返回空音频数据');
      }
      
      console.log(`[MeLo TTS] 成功生成音频，大小: ${arrayBuffer.byteLength} 字节`);

      // 估算时长
      const duration = this.estimateDuration(text);

      return {
        audioBuffer: arrayBuffer,
        duration,
        format: 'audio/wav',  // MeLo TTS 返回 WAV 格式
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`MeLo TTS API 请求超时 (${timeout}ms)`);
      }
      throw error;
    }
  }

  /**
   * 将通用语言代码转换为 MeLo TTS 格式
   */
  private convertToMeloLang(lang: TTSLanguage): string {
    const langMap: Record<string, string> = {
      'zh': 'ZH',
      'zh-CN': 'ZH',
      'en': 'EN',
      'en-US': 'EN',
      'en-GB': 'EN',
      'ja': 'JP',
      'ja-JP': 'JP',
      'es': 'ES',
      'es-ES': 'ES',
      'fr': 'FR',
      'fr-FR': 'FR',
      'kr': 'KR',
      'ko': 'KR',
      'ko-KR': 'KR',
    };

    return langMap[lang] || 'ZH';  // 默认中文
  }

  /**
   * 根据语言获取默认说话人
   */
  private getSpeakerForLanguage(lang: string): string {
    // 英文默认使用美式英语
    if (lang === 'EN') {
      return 'EN-US';
    }
    // 其他语言使用语言代码作为说话人
    return lang;
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
    const speaker = voiceConfig?.speaker || this.defaultSpeaker;
    return `melo_tts_${text}_${lang}_${speaker}_${voiceConfig?.rate || 1.0}_${voiceConfig?.pitch || 1.0}_${voiceConfig?.volume || 1.0}`;
  }

  /**
   * 检查 MeLo TTS 服务是否可用
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      console.log(`[MeLo TTS] 健康检查成功:`, data);
      return data.status === 'ok';
    } catch (error) {
      console.warn(`[MeLo TTS] 健康检查失败:`, error);
      return false;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MeloTTSConfig>): void {
    if (config.baseUrl !== undefined) {
      this.baseUrl = config.baseUrl;
    }
    if (config.timeout !== undefined) {
      this.timeout = config.timeout;
    }
    if (config.retryCount !== undefined) {
      this.retryCount = config.retryCount;
    }
    if (config.defaultSpeaker !== undefined) {
      this.defaultSpeaker = config.defaultSpeaker;
    }
  }

  /**
   * 清除缓存
   */
  async clearCache(): Promise<void> {
    await this.audioCache.clear();
  }
}


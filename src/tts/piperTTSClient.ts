/**
 * Piper TTS 客户端
 * 支持本地 Piper TTS 服务
 * 
 * Piper TTS 是一个极轻量的开源 TTS 系统，特点：
 * - 模型只有几MB，内存占用小
 * - 速度快，实时合成
 * - 音质好，基于VITS架构
 * - 支持多语言（包括中文）
 * 
 * 安装指南：见 docs/setup/piper-tts-setup.md
 */

import { type ITTSClient, type TTSOptions, type TTSResult, type TTSLanguage } from './ttsClient';
import { VoiceConfig } from '../types/card';
import { getAudioCache } from './audioCache';

export interface PiperTTSConfig {
  baseUrl?: string;  // Piper TTS 服务地址，默认 'http://localhost:5000'
  timeout?: number;  // 请求超时时间（毫秒），默认 10000
  retryCount?: number;  // 重试次数，默认 2
}

/**
 * Piper TTS 客户端实现
 */
export class PiperTTSClient implements ITTSClient {
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private audioCache = getAudioCache();

  constructor(config: PiperTTSConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:5000';
    this.timeout = config.timeout || 10000;
    this.retryCount = config.retryCount || 2;
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const { useCache = true, lang = 'zh', voiceConfig } = options;

    // 生成缓存键
    const cacheKey = this.getCacheKey(text, lang, voiceConfig);

    // 检查缓存
    if (useCache) {
      const cached = await this.audioCache.get(cacheKey);
      if (cached) {
        console.log(`[PiperTTSClient] 使用缓存: ${text.substring(0, 20)}...`);
        return cached;
      }
    }

    // 调用 Piper TTS API
    let lastError: Error | null = null;
    for (let i = 0; i <= this.retryCount; i++) {
      try {
        const result = await this.callPiperTTS(text, lang, voiceConfig);

        // 保存到缓存
        if (useCache && result) {
          await this.audioCache.set(cacheKey, result);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[PiperTTSClient] 第 ${i + 1} 次尝试失败:`, lastError);
        if (i < this.retryCount) {
          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Piper TTS API 调用失败');
  }

  /**
   * 调用 Piper TTS API
   */
  private async callPiperTTS(
    text: string,
    lang: TTSLanguage,
    voiceConfig?: VoiceConfig
  ): Promise<TTSResult> {
    const controller = new AbortController();
    // 增加超时时间到 20 秒，避免短文本也超时
    const timeout = Math.max(this.timeout, 20000);
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Piper TTS API 端点
      const endpoint = `${this.baseUrl}/api/tts`;
      console.log(`[PiperTTSClient] 🎯 调用 Piper TTS API: ${endpoint}, 文本: "${text.substring(0, 30)}..."`);

      // 构建请求体
      const requestBody: any = {
        text,
      };

      // 传递 gender 参数给 Piper TTS 服务器，用于选择模型（男声/女声）
      if (voiceConfig?.gender) {
        requestBody.gender = voiceConfig.gender; // 'male' 或 'female'
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
        console.error(`[PiperTTSClient] ❌ API 错误: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Piper TTS API 错误: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log(`[PiperTTSClient] ✅ API 响应成功: ${response.status}, Content-Type: ${response.headers.get('content-type')}`);

      // Piper TTS 返回音频数据（WAV格式）
      const arrayBuffer = await response.arrayBuffer();
      console.log(`[PiperTTSClient] ✅ 收到音频数据: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error(`[PiperTTSClient] ❌ 音频数据为空`);
        throw new Error('Piper TTS API 返回空音频数据');
      }
      
      // 估算时长（Piper TTS API 可能不返回时长信息）
      const duration = this.estimateDuration(text);
      console.log(`[PiperTTSClient] ✅ 音频生成成功: ${text.substring(0, 20)}... (时长: ${duration.toFixed(2)}s, 大小: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB)`);

      return {
        audioBuffer: arrayBuffer,
        duration,
        format: 'audio/wav',  // Piper TTS 通常返回 WAV 格式
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Piper TTS API 请求超时 (${this.timeout}ms)`);
      }
      throw error;
    }
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
    // 包含 gender 在缓存键中，因为不同性别使用不同的模型
    return `piper_tts_${text}_${lang}_${voiceConfig?.gender || 'female'}_${voiceConfig?.rate || 1.0}_${voiceConfig?.pitch || 1.0}_${voiceConfig?.volume || 1.0}`;
  }

  /**
   * 检查 Piper TTS 服务是否可用
   */
  async checkHealth(): Promise<boolean> {
    try {
      console.log(`[PiperTTSClient] 检查健康状态: ${this.baseUrl}/health`);
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      const isOk = response.ok;
      console.log(`[PiperTTSClient] 健康检查响应: ${response.status} ${response.statusText} (${isOk ? '✅' : '❌'})`);
      return isOk;
    } catch (error) {
      console.warn(`[PiperTTSClient] 健康检查失败:`, error);
      return false;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PiperTTSConfig>): void {
    if (config.baseUrl !== undefined) {
      this.baseUrl = config.baseUrl;
    }
    if (config.timeout !== undefined) {
      this.timeout = config.timeout;
    }
    if (config.retryCount !== undefined) {
      this.retryCount = config.retryCount;
    }
  }
}


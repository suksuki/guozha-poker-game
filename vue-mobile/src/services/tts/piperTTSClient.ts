/**
 * Piper TTS 客户端
 * 支持本地或远程 Piper TTS 服务
 */

import { ITTSClient, TTSOptions, TTSResult } from './types';
import type { TTSServerConfig } from './types';

export class PiperTTSClient implements ITTSClient {
  private config: TTSServerConfig;

  constructor(config: TTSServerConfig) {
    this.config = config;
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const baseUrl = `${this.config.connection.protocol}://${this.config.connection.host}:${this.config.connection.port}`;
    const endpoint = `${baseUrl}/api/tts`;
    
    const controller = new AbortController();
    const timeout = this.config.timeout || 20000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const requestBody: any = {
        text,
      };

      // 传递 gender 参数
      if (options.voiceConfig?.gender) {
        requestBody.gender = options.voiceConfig.gender;
      }

      // 传递 model 参数（如果配置了）
      if (this.config.providerConfig?.piper?.model) {
        requestBody.model = this.config.providerConfig.piper.model;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '未知错误');
        throw new Error(`Piper TTS API 错误: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Piper TTS API 返回空音频数据');
      }

      // 估算时长（假设采样率44.1kHz，16bit，单声道）
      const estimatedDuration = arrayBuffer.byteLength / (44100 * 2);

      return {
        audioBuffer: arrayBuffer,
        duration: estimatedDuration,
        format: 'audio/wav'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Piper TTS API 请求超时 (${timeout}ms)`);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const baseUrl = `${this.config.connection.protocol}://${this.config.connection.host}:${this.config.connection.port}`;
      const healthUrl = `${baseUrl}/health`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}


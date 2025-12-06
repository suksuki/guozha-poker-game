/**
 * MeLo TTS 客户端
 * 支持本地或远程 MeLo TTS 服务
 */

import { ITTSClient, TTSOptions, TTSResult } from './types';
import type { TTSServerConfig } from './types';

export class MeloTTSClient implements ITTSClient {
  private config: TTSServerConfig;

  constructor(config: TTSServerConfig) {
    this.config = config;
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const baseUrl = `${this.config.connection.protocol}://${this.config.connection.host}:${this.config.connection.port}`;
    const endpoint = `${baseUrl}/tts`;
    
    const controller = new AbortController();
    const timeout = this.config.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // 将语言代码转换为 MeLo TTS 格式
      const meloLang = this.convertToMeloLang(options.lang || 'zh');
      
      // 确定说话人
      const speaker = options.voiceConfig?.speaker || 
                     this.config.providerConfig?.melo?.speaker || 
                     this.getSpeakerForLanguage(meloLang);

      const requestBody: any = {
        text,
        lang: meloLang
      };
      
      // 只在需要时添加 speaker 参数（如果speaker与lang不同）
      if (speaker && speaker !== meloLang) {
        requestBody.speaker = speaker;
      }

      // 添加语速（如果配置了）
      if (this.config.providerConfig?.melo?.speed) {
        requestBody.speed = this.config.providerConfig.melo.speed;
      } else if (options.voiceConfig?.rate && options.voiceConfig.rate !== 1.0) {
        // 也可以从voiceConfig中获取语速
        requestBody.speed = options.voiceConfig.rate;
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
        throw new Error(`MeLo TTS API 错误: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // 检查Content-Type
      const contentType = response.headers.get('Content-Type') || '';
      console.log('[MeloTTS] 响应Content-Type:', contentType);
      console.log('[MeloTTS] 响应状态:', response.status, response.statusText);
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('[MeloTTS] 音频数据大小:', arrayBuffer.byteLength, 'bytes');
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('MeLo TTS API 返回空音频数据');
      }

      // 估算时长（假设采样率44.1kHz，16bit，单声道）
      const estimatedDuration = arrayBuffer.byteLength / (44100 * 2);
      console.log('[MeloTTS] 估算时长:', estimatedDuration, '秒');

      return {
        audioBuffer: arrayBuffer,
        duration: estimatedDuration,
        format: contentType.includes('wav') ? 'audio/wav' : contentType.includes('mp3') ? 'audio/mpeg' : 'audio/wav'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`MeLo TTS API 请求超时 (${timeout}ms)`);
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
      
      if (!response.ok) {
        return false;
      }

      // MeLo TTS返回JSON，需要检查status字段
      try {
        const data = await response.json();
        return data.status === 'ok';
      } catch (e) {
        // 如果JSON解析失败，但响应ok，仍然认为可用
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  private convertToMeloLang(lang: string): string {
    const langMap: Record<string, string> = {
      'zh': 'ZH',
      'en': 'EN',
      'ja': 'JP',
      'ko': 'KR',
      'es': 'ES',
      'fr': 'FR'
    };
    return langMap[lang] || 'ZH';
  }

  private getSpeakerForLanguage(lang: string): string {
    const speakerMap: Record<string, string> = {
      'ZH': 'ZH',
      'EN': 'EN-US',
      'JP': 'JP',
      'KR': 'KR',
      'ES': 'ES',
      'FR': 'FR'
    };
    return speakerMap[lang] || 'ZH';
  }
}


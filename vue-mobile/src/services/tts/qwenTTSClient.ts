/**
 * Qwen TTS 客户端
 * 对接 GET /health、POST /tts（JSON: text, speaker, instruct, language），响应 WAV 二进制
 */

import { ITTSClient, TTSOptions, TTSResult, TTSLanguage } from './types';
import type { TTSServerConfig } from './types';

/** TTS 语言码 -> Qwen API 的 language 字段（Qwen3-TTS 支持 Chinese/Korean/Japanese/English 等） */
function toQwenLanguage(lang: TTSLanguage | undefined): string {
  if (!lang) return 'Chinese';
  const map: Record<TTSLanguage, string> = {
    zh: 'Chinese',
    ko: 'Korean',
    ja: 'Japanese',
    en: 'English'
  };
  return map[lang] ?? 'Chinese';
}

/** 按语言给出默认 instruct，与 language 一致时合成更自然 */
function defaultInstructForLang(lang: TTSLanguage | undefined): string {
  if (!lang) return '语气自然';
  const map: Record<TTSLanguage, string> = {
    zh: '语气自然',
    ko: '자연스럽고 친근하게',
    ja: '自然で親しみやすく',
    en: 'Natural and friendly'
  };
  return map[lang] ?? '语气自然';
}

/** Qwen3-TTS 支持的说话人（小写），传 default 或其它不支持值会 500 */
const SUPPORTED_SPEAKERS = ['aiden', 'dylan', 'eric', 'ono_anna', 'ryan', 'serena', 'sohee', 'uncle_fu', 'vivian'];

function normalizeSpeaker(raw: string | undefined): string {
  const s = (raw || 'vivian').trim().toLowerCase();
  if (!s || s === 'default') return 'vivian';
  return SUPPORTED_SPEAKERS.includes(s) ? s : 'vivian';
}

export class QwenTTSClient implements ITTSClient {
  private config: TTSServerConfig;

  constructor(config: TTSServerConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    const { protocol, host, port } = this.config.connection;
    return `${protocol}://${host}:${port}`;
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/tts`;

    const qwen = this.config.providerConfig?.qwen;
    const speaker = normalizeSpeaker(
      options.voiceConfig?.speaker ?? qwen?.speaker
    );
    const instruct = qwen?.instruct ?? defaultInstructForLang(options.lang);
    const language = options.lang ? toQwenLanguage(options.lang) : (qwen?.language ?? 'Chinese');

    const controller = new AbortController();
    const timeout = this.config.timeout ?? 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker, instruct, language }),
        signal: controller.signal,
        credentials: 'omit'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Qwen TTS API 错误: ${response.status} ${response.statusText}${errorText ? ' - ' + errorText : ''}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Qwen TTS API 返回空音频数据');
      }

      const contentType = response.headers.get('Content-Type') || 'audio/wav';
      const estimatedDuration = arrayBuffer.byteLength / (44100 * 2);

      return {
        audioBuffer: arrayBuffer,
        duration: estimatedDuration,
        format: contentType.includes('wav') ? 'audio/wav' : 'audio/wav'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Qwen TTS API 请求超时 (${timeout}ms)`);
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const baseUrl = this.getBaseUrl();
      const healthUrl = `${baseUrl}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(healthUrl, {
        method: 'GET',
        credentials: 'omit',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }
}

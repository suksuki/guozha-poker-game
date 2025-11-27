/**
 * TTS 客户端
 * 统一封装 TTS 接口，生成音频数据（ArrayBuffer）
 * 支持多语言和多种 TTS 后端
 */

import { VoiceConfig } from '../types/card';
import { DIALECT_LANG_MAP } from '../config/voiceConfig';
import { convertToNanchang } from '../ai/dialect/nanchang_rules';
import { getAudioCache } from './audioCache';

export type TTSLanguage = 'zh' | 'ja' | 'ko' | 'nanchang';

export interface TTSOptions {
  lang?: TTSLanguage;
  voiceConfig?: VoiceConfig;
  useCache?: boolean;  // 是否使用缓存，默认 true
}

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  duration: number;  // 音频时长（秒）
  format: string;    // 音频格式（如 'audio/wav'）
}

/**
 * TTS 客户端接口
 */
export interface ITTSClient {
  /**
   * 生成语音音频
   * @param text 文本
   * @param options 选项
   * @returns 音频数据
   */
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
}

/**
 * 浏览器 TTS 客户端（使用 speechSynthesis）
 * 注意：这是基础实现，需要配合 MediaRecorder 或 Web Audio API 捕获音频
 */
export class BrowserTTSClient implements ITTSClient {
  private audioContext: AudioContext | null = null;
  private memoryCache: Map<string, TTSResult> = new Map();  // 内存缓存（快速访问）
  private audioCache = getAudioCache();  // 持久化缓存

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('[BrowserTTSClient] 初始化 AudioContext 失败:', error);
    }
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const { useCache = true, lang = 'zh', voiceConfig } = options;

    // 如果是南昌话，先转换文本
    let finalText = text;
    if (lang === 'nanchang') {
      finalText = convertToNanchang(text, true, true);
      console.log(`[BrowserTTSClient] 南昌话转换: "${text}" -> "${finalText}"`);
    }

    // 检查缓存（使用转换后的文本）
    if (useCache) {
      const cacheKey = this.getCacheKey(finalText, lang, voiceConfig);
      
      // 先检查内存缓存
      const memoryCached = this.memoryCache.get(cacheKey);
      if (memoryCached) {
        console.log(`[BrowserTTSClient] 使用内存缓存: ${finalText.substring(0, 20)}...`);
        return memoryCached;
      }

      // 检查持久化缓存
      const cached = await this.audioCache.get(cacheKey);
      if (cached) {
        console.log(`[BrowserTTSClient] 使用持久化缓存: ${finalText.substring(0, 20)}...`);
        // 添加到内存缓存
        this.addToMemoryCache(cacheKey, cached);
        return cached;
      }
    }

    // 生成音频（使用转换后的文本）
    const result = await this.generateAudio(finalText, lang, voiceConfig);

    // 保存到缓存
    if (useCache && result) {
      const cacheKey = this.getCacheKey(finalText, lang, voiceConfig);
      // 保存到内存缓存
      this.addToMemoryCache(cacheKey, result);
      // 保存到持久化缓存
      await this.audioCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * 生成音频（使用 speechSynthesis + MediaRecorder）
   * 注意：这个方法需要用户授权音频捕获权限
   */
  private async generateAudio(
    text: string,
    lang: TTSLanguage,
    voiceConfig?: VoiceConfig
  ): Promise<TTSResult> {
    if (!this.audioContext) {
      throw new Error('AudioContext 未初始化');
    }

    try {
      // 方案1：尝试使用 MediaRecorder 捕获 speechSynthesis 输出
      const result = await this.captureSpeechSynthesis(text, lang, voiceConfig);
      if (result) {
        return result;
      }
    } catch (error) {
      console.warn('[BrowserTTSClient] MediaRecorder 捕获失败，尝试其他方案:', error);
    }

    // 方案2：使用 Web Audio API 的 Oscillator 生成占位音频
    // 注意：这只是占位实现，实际应该使用真正的 TTS API
    console.warn('[BrowserTTSClient] 使用占位音频，实际应该使用真正的 TTS API');
    return this.generatePlaceholderAudio(text);
  }

  /**
   * 捕获 speechSynthesis 输出
   */
  private async captureSpeechSynthesis(
    text: string,
    lang: TTSLanguage,
    voiceConfig?: VoiceConfig
  ): Promise<TTSResult | null> {
    // 注意：这个方法需要系统音频捕获权限，且浏览器支持有限
    // 实际项目中应该使用真正的 TTS API（如 Google Cloud TTS、Azure TTS 等）

    try {
      // 请求音频捕获权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      return new Promise((resolve) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();

          try {
            const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer.slice(0));
            const duration = audioBuffer.duration;

            // 停止所有轨道
            stream.getTracks().forEach((track) => track.stop());

            resolve({
              audioBuffer: arrayBuffer,
              duration,
              format: 'audio/webm',
            });
          } catch (e) {
            console.error('[BrowserTTSClient] 音频解码失败:', e);
            stream.getTracks().forEach((track) => track.stop());
            resolve(null);
          }
        };

        // 开始录制
        mediaRecorder.start();

        // 使用 speechSynthesis 播放
        const utterance = new SpeechSynthesisUtterance(text);
        const langCode = lang === 'nanchang' ? DIALECT_LANG_MAP.nanchang : this.getLangCode(lang);

        utterance.lang = voiceConfig?.lang || langCode;
        utterance.rate = voiceConfig?.rate || 1.0;
        utterance.pitch = voiceConfig?.pitch || 1.0;
        utterance.volume = voiceConfig?.volume || 1.0;

        utterance.onend = () => {
          setTimeout(() => {
            mediaRecorder.stop();
          }, 100);
        };

        utterance.onerror = () => {
          mediaRecorder.stop();
        };

        window.speechSynthesis.speak(utterance);
      });
    } catch (error) {
      console.warn('[BrowserTTSClient] 无法捕获音频:', error);
      return null;
    }
  }

  /**
   * 生成占位音频（用于测试）
   */
  private async generatePlaceholderAudio(text: string): Promise<TTSResult> {
    if (!this.audioContext) {
      throw new Error('AudioContext 未初始化');
    }

    // 根据文本长度估算时长（假设语速 150 字/分钟）
    const estimatedDuration = (text.length / 150) * 60; // 秒
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = Math.floor(estimatedDuration * sampleRate);

    // 创建静音音频（占位）
    const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // 生成简单的提示音（用于测试）
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      channelData[i] = Math.sin(2 * Math.PI * 440 * t) * 0.1 * Math.exp(-t * 2);
    }

    // 转换为 ArrayBuffer
    const arrayBuffer = await audioBufferToArrayBuffer(audioBuffer);

    return {
      audioBuffer: arrayBuffer,
      duration: estimatedDuration,
      format: 'audio/wav',
    };
  }

  /**
   * 获取语言代码
   */
  private getLangCode(lang: TTSLanguage): string {
    const langMap: Record<TTSLanguage, string> = {
      zh: 'zh-CN',
      ja: 'ja-JP',
      ko: 'ko-KR',
      nanchang: 'zh-CN', // 南昌话使用普通话 TTS
    };
    return langMap[lang] || 'zh-CN';
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(text: string, lang: TTSLanguage, voiceConfig?: VoiceConfig): string {
    return `${text}_${lang}_${voiceConfig?.rate || 1.0}_${voiceConfig?.pitch || 1.0}_${voiceConfig?.volume || 1.0}`;
  }

  /**
   * 添加到内存缓存
   */
  private addToMemoryCache(key: string, result: TTSResult): void {
    // 限制内存缓存大小
    if (this.memoryCache.size >= 100) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }
    this.memoryCache.set(key, result);
  }

  /**
   * 清空缓存
   */
  async clearCache(): Promise<void> {
    this.memoryCache.clear();
    await this.audioCache.clear();
  }
}

/**
 * 本地 TTS API 客户端（需要后端支持）
 * 可以连接到本地 TTS 服务（如 GPT-SoVITS、Coqui TTS 等）
 */
export class LocalTTSClient implements ITTSClient {
  private baseUrl: string;
  private cache: Map<string, TTSResult> = new Map();

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

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

    // 调用本地 TTS API
    const result = await this.callTTSAPI(text, lang, voiceConfig);

    // 保存到缓存
    if (useCache && result) {
      const cacheKey = this.getCacheKey(text, lang, voiceConfig);
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * 调用本地 TTS API
   */
  private async callTTSAPI(
    text: string,
    lang: TTSLanguage,
    voiceConfig?: VoiceConfig
  ): Promise<TTSResult> {
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
      });

      if (!response.ok) {
        throw new Error(`TTS API 错误: ${response.statusText}`);
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
      console.error('[LocalTTSClient] TTS API 调用失败:', error);
      throw error;
    }
  }

  private getCacheKey(text: string, lang: TTSLanguage, voiceConfig?: VoiceConfig): string {
    return `${text}_${lang}_${voiceConfig?.rate || 1.0}_${voiceConfig?.pitch || 1.0}_${voiceConfig?.volume || 1.0}`;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * 将 AudioBuffer 转换为 ArrayBuffer
 */
async function audioBufferToArrayBuffer(audioBuffer: AudioBuffer): Promise<ArrayBuffer> {
  // 简单的 WAV 编码（用于测试）
  // 实际项目中应该使用更完善的音频编码库
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;
  const bitsPerSample = 16;

  const buffer = new ArrayBuffer(44 + length * channels * 2);
  const view = new DataView(buffer);

  // WAV 文件头
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * channels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, length * channels * 2, true);

  // 写入音频数据
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
}

// 默认使用浏览器 TTS 客户端
let defaultTTSClient: ITTSClient = new BrowserTTSClient();

/**
 * 设置默认 TTS 客户端
 */
export function setDefaultTTSClient(client: ITTSClient): void {
  defaultTTSClient = client;
}

/**
 * 获取默认 TTS 客户端
 */
export function getDefaultTTSClient(): ITTSClient {
  return defaultTTSClient;
}

/**
 * 便捷函数：生成语音
 * 默认使用 TTS 服务管理器（如果可用），否则使用默认客户端
 */
export async function synthesizeSpeech(
  text: string,
  options?: TTSOptions
): Promise<TTSResult> {
  // 尝试使用 TTS 服务管理器（如果已初始化）
  try {
    const { getTTSServiceManager } = require('./ttsServiceManager');
    const ttsManager = getTTSServiceManager();
    return await ttsManager.synthesize(text, options);
  } catch {
    // 如果服务管理器不可用，使用默认客户端
    return defaultTTSClient.synthesize(text, options);
  }
}


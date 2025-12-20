/**
 * Azure Speech Service TTS 客户端
 * 使用 Azure Cognitive Services Speech API
 * 
 * Azure Speech Service 是一个强大的云端 TTS 服务，特点：
 * - 支持 140+ 种语言和方言
 * - 400+ 种神经网络语音
 * - 高质量语音合成
 * - 支持中文、英文、日文、韩文等多种语言
 * 
 * 配置指南：
 * 1. 在 Azure Portal 创建 Speech Service 资源
 * 2. 获取 Subscription Key 和 Region
 * 3. 设置环境变量 VITE_AZURE_SPEECH_KEY 和 VITE_AZURE_SPEECH_REGION
 * 
 * 文档：https://learn.microsoft.com/azure/ai-services/speech-service/
 */

import { type ITTSClient, type TTSOptions, type TTSResult, type TTSLanguage } from './ttsClient';
import { VoiceConfig } from '../types/card';
import { getAudioCache } from './audioCache';

export interface AzureSpeechTTSConfig {
  subscriptionKey?: string;  // Azure Speech Service Subscription Key
  region?: string;  // Azure 区域，如 'eastus', 'westus2' 等
  voiceName?: string;  // 语音名称，默认根据语言自动选择
  timeout?: number;  // 请求超时时间（毫秒），默认 30000
  retryCount?: number;  // 重试次数，默认 2
}

/**
 * Azure Speech Service TTS 客户端实现
 */
export class AzureSpeechTTSClient implements ITTSClient {
  private subscriptionKey: string | null;
  private region: string;
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private config: AzureSpeechTTSConfig;
  private audioCache = getAudioCache();

  constructor(config: AzureSpeechTTSConfig = {}) {
    // 从环境变量或配置中获取 Subscription Key
    this.subscriptionKey = config.subscriptionKey || 
                          (import.meta.env?.VITE_AZURE_SPEECH_KEY as string | undefined) ||
                          (typeof window !== 'undefined' && (window as any).AZURE_SPEECH_KEY) ||
                          null;
    
    // 从环境变量或配置中获取 Region
    this.region = config.region || 
                  (import.meta.env?.VITE_AZURE_SPEECH_REGION as string | undefined) ||
                  (typeof window !== 'undefined' && (window as any).AZURE_SPEECH_REGION) ||
                  'eastus';  // 默认区域
    
    this.timeout = config.timeout || 30000;
    this.retryCount = config.retryCount || 2;
    this.config = {
      voiceName: config.voiceName,  // 如果未指定，将根据语言自动选择
    };

    // 构建 API 端点 URL
    this.baseUrl = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    if (!this.subscriptionKey) {
    } else {
    }
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (!this.subscriptionKey) {
      throw new Error('Azure Speech Service Subscription Key 未配置');
    }

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

    // 调用 Azure Speech Service API
    let lastError: Error | null = null;
    for (let i = 0; i <= this.retryCount; i++) {
      try {
        const result = await this.callAzureSpeechTTS(text, lang, voiceConfig);

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

    throw lastError || new Error('Azure Speech Service API 调用失败');
  }

  /**
   * 调用 Azure Speech Service TTS API
   */
  private async callAzureSpeechTTS(
    text: string,
    lang: TTSLanguage,
    voiceConfig?: VoiceConfig
  ): Promise<TTSResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // 映射语言代码到 Azure 语音服务格式
      const languageCode = this.mapLanguage(lang);
      
      // 选择语音名称（根据 gender 或使用默认）
      let voiceName = this.config.voiceName;
      if (!voiceName) {
        voiceName = this.selectVoiceByLanguage(languageCode, voiceConfig?.gender);
      }

      // 构建 SSML（Speech Synthesis Markup Language）
      const ssml = this.buildSSML(text, voiceName, languageCode, voiceConfig);


      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.subscriptionKey!,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',  // MP3 格式
        },
        body: ssml,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Azure Speech Service API 错误: ${response.status} ${response.statusText}`;
        
        try {
          // Azure 可能返回 XML 格式的错误
          if (errorText.includes('<')) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(errorText, 'text/xml');
            const errorElement = xmlDoc.querySelector('Message') || xmlDoc.querySelector('message');
            if (errorElement) {
              errorMessage += `\n错误消息: ${errorElement.textContent}`;
            }
          } else {
            errorMessage += ` - ${errorText}`;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }
        
        // 如果是认证错误，提供更详细的提示
        if (response.status === 401 || response.status === 403) {
          errorMessage += '\n\n💡 可能的原因：';
          errorMessage += '\n1. Subscription Key 无效或已过期';
          errorMessage += '\n2. Region 配置错误';
          errorMessage += '\n3. 请检查 Azure Portal 中的密钥和区域设置';
        }
        
        throw new Error(errorMessage);
      }

      // Azure Speech Service 直接返回音频数据（二进制）
      const audioData = await response.arrayBuffer();
      
      if (!audioData || audioData.byteLength === 0) {
        throw new Error('Azure Speech Service API 返回空音频数据');
      }

      // 估算音频时长
      const duration = this.estimateDuration(text, voiceConfig?.rate || 1.0);

      return {
        audioBuffer: audioData,
        duration,
        format: 'audio/mpeg',  // MP3 格式
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Azure Speech Service API 请求超时 (${this.timeout}ms)`);
      }
      throw error;
    }
  }

  /**
   * 构建 SSML（Speech Synthesis Markup Language）
   */
  private buildSSML(
    text: string,
    voiceName: string,
    languageCode: string,
    voiceConfig?: VoiceConfig
  ): string {
    // 转义 XML 特殊字符
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // 计算语速（Azure 使用相对值，1.0 为正常速度）
    const rate = voiceConfig?.rate || 1.0;
    const ratePercent = Math.round((rate - 1.0) * 100);  // 转换为百分比偏移
    const rateValue = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    // 计算音调（Azure 使用相对值，+0st 为正常音调）
    const pitch = voiceConfig?.pitch || 0.0;
    const pitchValue = pitch >= 0 ? `+${pitch.toFixed(1)}st` : `${pitch.toFixed(1)}st`;

    // 计算音量（Azure 使用相对值，+0% 为正常音量）
    const volume = voiceConfig?.volume || 1.0;
    const volumePercent = Math.round((volume - 1.0) * 100);
    const volumeValue = volumePercent >= 0 ? `+${volumePercent}%` : `${volumePercent}%`;

    // 构建 SSML
    const ssml = `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${languageCode}">
  <voice name="${voiceName}">
    <prosody rate="${rateValue}" pitch="${pitchValue}" volume="${volumeValue}">
      ${escapedText}
    </prosody>
  </voice>
</speak>`;

    return ssml;
  }

  /**
   * 检查 Azure Speech Service 是否可用
   */
  async checkHealth(): Promise<boolean> {
    if (!this.subscriptionKey) {
      return false;
    }

    try {
      // 使用一个简短的测试请求
      const testText = 'test';
      const languageCode = 'en-US';
      const voiceName = 'en-US-JennyNeural';

      const ssml = this.buildSSML(testText, voiceName, languageCode);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        },
        body: ssml,
        signal: AbortSignal.timeout(5000),
      });

      // 检查响应状态
      if (response.status === 401 || response.status === 403) {
        return false;
      }
      
      // 如果返回 200 且有音频数据，认为服务可用
      if (response.ok) {
        const audioData = await response.arrayBuffer();
        return audioData.byteLength > 0;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 映射语言代码到 Azure 语音服务格式
   */
  private mapLanguage(lang: TTSLanguage): string {
    const langMap: Record<TTSLanguage, string> = {
      'zh': 'zh-CN',  // 中文（简体）
      'ja': 'ja-JP',  // 日语
      'ko': 'ko-KR',  // 韩语
      'nanchang': 'zh-CN',  // 南昌话暂时使用中文
    };
    return langMap[lang] || 'zh-CN';
  }

  /**
   * 根据语言和性别选择语音
   */
  private selectVoiceByLanguage(languageCode: string, gender?: 'male' | 'female'): string {
    // 如果配置中指定了语音名称，优先使用
    if (this.config.voiceName) {
      return this.config.voiceName;
    }

    // Azure Speech Service 语音名称映射
    const voiceMap: Record<string, { male: string; female: string }> = {
      'zh-CN': {
        male: 'zh-CN-YunxiNeural',  // 中文男声（年轻）
        female: 'zh-CN-XiaoxiaoNeural',  // 中文女声（年轻，推荐）
      },
      'en-US': {
        male: 'en-US-GuyNeural',
        female: 'en-US-JennyNeural',
      },
      'ja-JP': {
        male: 'ja-JP-KeitaNeural',
        female: 'ja-JP-NanamiNeural',
      },
      'ko-KR': {
        male: 'ko-KR-InJoonNeural',
        female: 'ko-KR-SunHiNeural',
      },
    };

    const voices = voiceMap[languageCode] || voiceMap['zh-CN'];
    return gender === 'male' ? voices.male : voices.female;
  }

  /**
   * 获取可用的中文语音列表
   */
  static getAvailableChineseVoices(): Array<{ name: string; displayName: string; gender: string; style?: string }> {
    return [
      { name: 'zh-CN-XiaoxiaoNeural', displayName: '晓晓（女，年轻活泼）', gender: '女', style: '年轻活泼' },
      { name: 'zh-CN-YunxiNeural', displayName: '云希（男，年轻）', gender: '男', style: '年轻' },
      { name: 'zh-CN-YunyangNeural', displayName: '云扬（男，成熟）', gender: '男', style: '成熟' },
      { name: 'zh-CN-XiaoyiNeural', displayName: '晓伊（女，温柔）', gender: '女', style: '温柔' },
      { name: 'zh-CN-YunjianNeural', displayName: '云健（男，成熟稳重）', gender: '男', style: '成熟稳重' },
      { name: 'zh-CN-XiaohanNeural', displayName: '晓涵（女，活泼）', gender: '女', style: '活泼' },
      { name: 'zh-CN-XiaomoNeural', displayName: '晓墨（女，温柔）', gender: '女', style: '温柔' },
      { name: 'zh-CN-XiaoxuanNeural', displayName: '晓萱（女，温柔）', gender: '女', style: '温柔' },
      { name: 'zh-CN-XiaoruiNeural', displayName: '晓睿（女，成熟）', gender: '女', style: '成熟' },
      { name: 'zh-CN-XiaoshuangNeural', displayName: '晓双（女，活泼）', gender: '女', style: '活泼' },
      { name: 'zh-CN-XiaoyanNeural', displayName: '晓颜（女，温柔）', gender: '女', style: '温柔' },
      { name: 'zh-CN-XiaoyouNeural', displayName: '晓悠（女，年轻）', gender: '女', style: '年轻' },
      { name: 'zh-CN-YunxiaNeural', displayName: '云夏（男，年轻）', gender: '男', style: '年轻' },
      { name: 'zh-CN-YunyeNeural', displayName: '云野（男，成熟）', gender: '男', style: '成熟' },
    ];
  }

  /**
   * 更新语音配置
   */
  updateVoiceName(voiceName: string): void {
    this.config.voiceName = voiceName;
    // 清除缓存，确保新语音立即生效
    this.audioCache.clear().catch(err => {
    });
  }

  /**
   * 估算音频时长
   */
  private estimateDuration(text: string, rate: number): number {
    // 简单估算：中文大约每秒 3-4 个字，英文大约每秒 4-5 个单词
    // 根据语速调整
    const isChinese = /[\u4e00-\u9fa5]/.test(text);
    const charsPerSecond = isChinese ? 3.5 * rate : 4.5 * rate;
    return text.length / charsPerSecond;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(text: string, lang: TTSLanguage, voiceConfig?: VoiceConfig): string {
    // 获取实际使用的语音名称
    const languageCode = this.mapLanguage(lang);
    const actualVoiceName = this.config.voiceName || this.selectVoiceByLanguage(languageCode, voiceConfig?.gender);
    
    const parts = [
      'azure-speech',
      this.region,
      lang,
      actualVoiceName,  // 包含语音名称，确保切换语音后不使用旧缓存
      text,
      voiceConfig?.gender || '',
      voiceConfig?.rate?.toString() || '',
      voiceConfig?.pitch?.toString() || '',
      voiceConfig?.volume?.toString() || '',
    ];
    return parts.join('|');
  }
}


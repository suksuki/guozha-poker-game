/**
 * 基于 TTS API + Web Audio API 的多声道语音服务
 * 
 * 方案：使用在线 TTS API 生成音频文件，然后用 Web Audio API 播放
 * 支持真正的多声道同时播放
 * 
 * 可用的 TTS API：
 * 1. Google Cloud TTS（需要 API Key）
 * 2. Azure Cognitive Services TTS（需要 API Key）
 * 3. 浏览器内置 TTS + 音频文件缓存（推荐，无需 API Key）
 */

import { VoiceConfig } from '../types/card';
import { ChannelType } from './multiChannelVoiceService';

interface ChannelConfig {
  pan: number;
  volume: number;
  name: string;
}

const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  [ChannelType.PLAYER_0]: { pan: -0.7, volume: 1.0, name: '玩家0（左）' },
  [ChannelType.PLAYER_1]: { pan: 0.7, volume: 1.0, name: '玩家1（右）' },
  [ChannelType.PLAYER_2]: { pan: -0.3, volume: 1.0, name: '玩家2（左中）' },
  [ChannelType.PLAYER_3]: { pan: 0.3, volume: 1.0, name: '玩家3（右中）' },
  [ChannelType.ANNOUNCEMENT]: { pan: 0.0, volume: 1.2, name: '报牌（中央）' }
};

class TTSAudioService {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelGains: Map<ChannelType, GainNode> = new Map();
  private channelPanners: Map<ChannelType, StereoPannerNode> = new Map();
  private activeSources: Map<ChannelType, AudioBufferSourceNode> = new Map();
  private audioCache: Map<string, AudioBuffer> = new Map(); // 音频缓存

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioContext.destination);

      // 为每个声道创建节点
      Object.keys(CHANNEL_CONFIGS).forEach((key) => {
        const channel = parseInt(key) as ChannelType;
        const config = CHANNEL_CONFIGS[channel];

        const gainNode = this.audioContext!.createGain();
        gainNode.gain.value = config.volume;

        const pannerNode = this.audioContext!.createStereoPanner();
        pannerNode.pan.value = config.pan;

        gainNode.connect(pannerNode);
        pannerNode.connect(this.masterGain!);

        this.channelGains.set(channel, gainNode);
        this.channelPanners.set(channel, pannerNode);
      });

      console.log('[TTSAudioService] Web Audio API 已初始化');
    } catch (error) {
      console.error('[TTSAudioService] 初始化失败:', error);
    }
  }

  /**
   * 使用浏览器 TTS 生成音频并缓存
   * 通过 MediaRecorder 捕获音频流（需要用户授权）
   */
  async speak(
    text: string,
    voiceConfig?: VoiceConfig,
    channel: ChannelType = ChannelType.PLAYER_0
  ): Promise<void> {
    if (!this.audioContext) {
      return this.fallbackToSpeechSynthesis(text, voiceConfig, channel);
    }

    // 检查缓存
    const cacheKey = this.getCacheKey(text, voiceConfig);
    let audioBuffer = this.audioCache.get(cacheKey);

    if (!audioBuffer) {
      // 尝试从 TTS API 获取音频
      audioBuffer = await this.generateAudioFromTTS(text, voiceConfig);
      if (audioBuffer) {
        this.audioCache.set(cacheKey, audioBuffer);
      }
    }

    if (audioBuffer) {
      this.playAudioBuffer(audioBuffer, channel);
    } else {
      // 回退到 speechSynthesis
      this.fallbackToSpeechSynthesis(text, voiceConfig, channel);
    }
  }

  /**
   * 从 TTS API 生成音频
   * 这里使用浏览器内置的 speechSynthesis + MediaRecorder
   */
  private async generateAudioFromTTS(
    text: string,
    voiceConfig?: VoiceConfig
  ): Promise<AudioBuffer | null> {
    // 方案：使用 MediaRecorder 捕获 speechSynthesis 输出
    // 注意：这需要系统音频捕获权限，且浏览器支持有限
    
    try {
      // 请求音频捕获权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });

      // 创建 MediaRecorder
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
            const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
            resolve(audioBuffer);
          } catch (e) {
            console.error('[TTSAudioService] 音频解码失败:', e);
            resolve(null);
          }

          // 停止所有轨道
          stream.getTracks().forEach(track => track.stop());
        };

        // 开始录制
        mediaRecorder.start();

        // 使用 speechSynthesis 播放
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceConfig) {
          utterance.lang = voiceConfig.lang || 'zh-CN';
          utterance.rate = voiceConfig.rate || 1.0;
          utterance.pitch = voiceConfig.pitch || 1.0;
        }

        utterance.onend = () => {
          setTimeout(() => {
            mediaRecorder.stop();
          }, 100); // 等待音频完全捕获
        };

        window.speechSynthesis.speak(utterance);
      });
    } catch (error) {
      console.warn('[TTSAudioService] 无法捕获音频，回退到 speechSynthesis:', error);
      return null;
    }
  }

  private getCacheKey(text: string, voiceConfig?: VoiceConfig): string {
    return `${text}_${voiceConfig?.lang || 'zh-CN'}_${voiceConfig?.rate || 1.0}_${voiceConfig?.pitch || 1.0}`;
  }

  private playAudioBuffer(audioBuffer: AudioBuffer, channel: ChannelType): void {
    if (!this.audioContext || !this.channelGains.has(channel)) {
      return;
    }

    this.stopChannel(channel);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = this.channelGains.get(channel)!;
    source.connect(gainNode);

    this.activeSources.set(channel, source);
    source.start(0);

    source.onended = () => {
      this.activeSources.delete(channel);
    };
  }

  private fallbackToSpeechSynthesis(
    text: string,
    voiceConfig: VoiceConfig | undefined,
    channel: ChannelType
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const config = CHANNEL_CONFIGS[channel];

      if (voiceConfig) {
        utterance.lang = voiceConfig.lang || 'zh-CN';
        utterance.rate = voiceConfig.rate || 1.0;
        utterance.pitch = voiceConfig.pitch || 1.0;
        utterance.volume = (voiceConfig.volume || 1.0) * config.volume;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  stopChannel(channel: ChannelType): void {
    const source = this.activeSources.get(channel);
    if (source) {
      try {
        source.stop();
      } catch (e) {}
      this.activeSources.delete(channel);
    }
  }

  stop(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {}
    });
    this.activeSources.clear();
    window.speechSynthesis.cancel();
  }
}

export const ttsAudioService = new TTSAudioService();


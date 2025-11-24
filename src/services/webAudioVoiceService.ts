/**
 * 基于 Web Audio API 的多声道语音服务
 * 使用 TTS API 生成音频，然后通过 Web Audio API 播放到不同声道
 * 
 * 方案：
 * 1. 使用 speechSynthesis 生成语音（浏览器内置）
 * 2. 通过 MediaRecorder + getUserMedia 捕获音频（需要权限）
 * 3. 或者使用在线 TTS API 生成音频文件
 * 4. 使用 Web Audio API 的 StereoPannerNode 进行声道定位
 * 5. 系统声音也通过 Web Audio API 播放
 */

import { VoiceConfig } from '../types/card';
import { ChannelType } from './multiChannelVoiceService';

// 声道配置
interface ChannelConfig {
  pan: number;  // 声像位置 (-1=左, 0=中, 1=右)
  volume: number;
  name: string;
}

const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  [ChannelType.PLAYER_0]: { pan: -0.8, volume: 1.0, name: '玩家0（左）' },
  [ChannelType.PLAYER_1]: { pan: 0.8, volume: 1.0, name: '玩家1（右）' },
  [ChannelType.PLAYER_2]: { pan: -0.4, volume: 1.0, name: '玩家2（左中）' },
  [ChannelType.PLAYER_3]: { pan: 0.4, volume: 1.0, name: '玩家3（右中）' },
  [ChannelType.ANNOUNCEMENT]: { pan: 0.0, volume: 1.2, name: '报牌（中央）' }
};

// 系统声音声道配置（中央，稍大音量）
const SYSTEM_SOUND_CHANNEL: ChannelConfig = { pan: 0.0, volume: 1.0, name: '系统声音（中央）' };

class WebAudioVoiceService {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // 语音声道
  private voiceChannelGains: Map<ChannelType, GainNode> = new Map();
  private voiceChannelPanners: Map<ChannelType, StereoPannerNode> = new Map();
  private activeVoiceSources: Map<ChannelType, AudioBufferSourceNode> = new Map();
  
  // 系统声音声道
  private systemGain: GainNode | null = null;
  private systemPanner: StereoPannerNode | null = null;
  private activeSystemSources: Set<AudioBufferSourceNode> = new Set();
  
  // 音频缓存（避免重复生成）
  private audioCache: Map<string, AudioBuffer> = new Map();
  
  // 是否支持音频捕获
  private supportsAudioCapture: boolean = false;

  constructor() {
    this.initAudioContext();
    this.checkAudioCaptureSupport();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 创建主音量控制
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioContext.destination);

      // 为每个语音声道创建 GainNode 和 StereoPannerNode
      Object.keys(CHANNEL_CONFIGS).forEach((key) => {
        const channel = parseInt(key) as ChannelType;
        const config = CHANNEL_CONFIGS[channel];

        const gainNode = this.audioContext!.createGain();
        gainNode.gain.value = config.volume;

        const pannerNode = this.audioContext!.createStereoPanner();
        pannerNode.pan.value = config.pan;

        gainNode.connect(pannerNode);
        pannerNode.connect(this.masterGain!);

        this.voiceChannelGains.set(channel, gainNode);
        this.voiceChannelPanners.set(channel, pannerNode);
      });

      // 创建系统声音声道
      this.systemGain = this.audioContext.createGain();
      this.systemGain.gain.value = SYSTEM_SOUND_CHANNEL.volume;
      
      this.systemPanner = this.audioContext.createStereoPanner();
      this.systemPanner.pan.value = SYSTEM_SOUND_CHANNEL.pan;
      
      this.systemGain.connect(this.systemPanner!);
      this.systemPanner.connect(this.masterGain!);

      console.log('[WebAudioVoice] Web Audio API 上下文已初始化');
    } catch (error) {
      console.error('[WebAudioVoice] 无法初始化 Web Audio API:', error);
    }
  }

  /**
   * 检查是否支持音频捕获
   */
  private async checkAudioCaptureSupport(): Promise<void> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // 尝试请求音频捕获权限（不实际获取流）
        this.supportsAudioCapture = true;
      }
    } catch (e) {
      this.supportsAudioCapture = false;
    }
  }

  /**
   * 播放语音到指定声道
   * 使用 speechSynthesis + MediaRecorder 捕获，然后通过 Web Audio API 播放
   */
  async speak(
    text: string,
    voiceConfig?: VoiceConfig,
    channel: ChannelType = ChannelType.PLAYER_0
  ): Promise<void> {
    if (!this.audioContext || !this.voiceChannelGains.has(channel)) {
      // 回退到普通 speechSynthesis
      return this.fallbackToSpeechSynthesis(text, voiceConfig, channel);
    }

    // 检查缓存
    const cacheKey = `${text}_${voiceConfig?.lang || 'zh-CN'}_${voiceConfig?.rate || 1}_${voiceConfig?.pitch || 1}`;
    let audioBuffer = this.audioCache.get(cacheKey);

    if (!audioBuffer) {
      // 尝试捕获 speechSynthesis 输出
      audioBuffer = await this.captureSpeechSynthesis(text, voiceConfig);
      
      if (audioBuffer) {
        // 缓存音频
        this.audioCache.set(cacheKey, audioBuffer);
      }
    }

    if (audioBuffer) {
      this.playAudioBuffer(audioBuffer, channel);
    } else {
      // 回退到普通 speechSynthesis
      return this.fallbackToSpeechSynthesis(text, voiceConfig, channel);
    }
  }

  /**
   * 捕获 speechSynthesis 的音频输出
   * 使用 MediaRecorder + getUserMedia 捕获系统音频
   */
  private async captureSpeechSynthesis(
    text: string,
    voiceConfig?: VoiceConfig
  ): Promise<AudioBuffer | null> {
    if (!this.audioContext || !this.supportsAudioCapture) {
      return null;
    }

    try {
      // 请求音频捕获权限（捕获系统音频输出）
      // 注意：这需要用户授权，且浏览器支持有限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          // 尝试捕获系统音频（如果浏览器支持）
          // @ts-ignore - 实验性API
          systemAudio: true
        } as any
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
          try {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
            
            // 停止所有轨道
            stream.getTracks().forEach(track => track.stop());
            
            resolve(audioBuffer);
          } catch (e) {
            console.warn('[WebAudioVoice] 音频解码失败:', e);
            stream.getTracks().forEach(track => track.stop());
            resolve(null);
          }
        };

        // 开始录制
        mediaRecorder.start();

        // 使用 speechSynthesis 播放
        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceConfig) {
          utterance.lang = voiceConfig.lang || 'zh-CN';
          utterance.rate = voiceConfig.rate || 1.0;
          utterance.pitch = voiceConfig.pitch || 1.0;
          utterance.volume = voiceConfig.volume || 1.0;
        }

        utterance.onend = () => {
          setTimeout(() => {
            mediaRecorder.stop();
          }, 200); // 等待音频完全捕获
        };

        utterance.onerror = () => {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
          resolve(null);
        };

        window.speechSynthesis.speak(utterance);
      });
    } catch (error) {
      console.warn('[WebAudioVoice] 无法捕获音频，回退到 speechSynthesis:', error);
      return null;
    }
  }

  /**
   * 播放音频缓冲区到指定声道
   */
  private playAudioBuffer(audioBuffer: AudioBuffer, channel: ChannelType): void {
    if (!this.audioContext || !this.voiceChannelGains.has(channel)) {
      return;
    }

    // 停止该声道的当前播放
    this.stopChannel(channel);

    // 创建音频源
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // 连接到该声道的增益节点
    const gainNode = this.voiceChannelGains.get(channel)!;
    source.connect(gainNode);

    // 记录活动源
    this.activeVoiceSources.set(channel, source);

    // 播放
    source.start(0);

    // 播放完成后清理
    source.onended = () => {
      this.activeVoiceSources.delete(channel);
    };
  }

  /**
   * 播放系统声音（音效）
   */
  playSystemSound(audioBuffer: AudioBuffer, volume: number = 1.0): void {
    if (!this.audioContext || !this.systemGain) {
      return;
    }

    // 创建音频源
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // 创建临时增益节点（用于音量控制）
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;

    // 连接：source -> gain -> systemGain -> systemPanner -> masterGain
    source.connect(gainNode);
    gainNode.connect(this.systemGain);

    // 记录活动源
    this.activeSystemSources.add(source);

    // 播放
    source.start(0);

    // 播放完成后清理
    source.onended = () => {
      this.activeSystemSources.delete(source);
    };
  }

  /**
   * 回退到普通的 speechSynthesis
   */
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

  /**
   * 停止指定声道的播放
   */
  stopChannel(channel: ChannelType): void {
    const source = this.activeVoiceSources.get(channel);
    if (source) {
      try {
        source.stop();
      } catch (e) {
        // 可能已经停止
      }
      this.activeVoiceSources.delete(channel);
    }
  }

  /**
   * 停止所有语音
   */
  stopAllVoices(): void {
    this.activeVoiceSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // 可能已经停止
      }
    });
    this.activeVoiceSources.clear();
    window.speechSynthesis.cancel();
  }

  /**
   * 停止所有系统声音
   */
  stopAllSystemSounds(): void {
    this.activeSystemSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // 可能已经停止
      }
    });
    this.activeSystemSources.clear();
  }

  /**
   * 停止所有声音（语音 + 系统声音）
   */
  stopAll(): void {
    this.stopAllVoices();
    this.stopAllSystemSounds();
  }

  /**
   * 设置声道音量
   */
  setChannelVolume(channel: ChannelType, volume: number): void {
    const gainNode = this.voiceChannelGains.get(channel);
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }

  /**
   * 设置系统声音音量
   */
  setSystemVolume(volume: number): void {
    if (this.systemGain) {
      this.systemGain.gain.value = volume;
    }
  }

  /**
   * 设置声道声像位置
   */
  setChannelPan(channel: ChannelType, pan: number): void {
    const pannerNode = this.voiceChannelPanners.get(channel);
    if (pannerNode) {
      pannerNode.pan.value = Math.max(-1, Math.min(1, pan));
    }
  }
}

export const webAudioVoiceService = new WebAudioVoiceService();


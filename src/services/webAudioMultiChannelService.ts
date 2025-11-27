/**
 * 基于 Web Audio API 的多声道语音服务
 * 使用 MediaRecorder + AudioContext 实现真正的多声道音频处理
 * 
 * 方案说明：
 * 1. 使用 speechSynthesis 生成语音
 * 2. 通过 MediaRecorder 捕获音频流（需要系统音频捕获权限）
 * 3. 使用 Web Audio API 的 StereoPannerNode 进行声道定位
 * 4. 混合多个声道输出
 * 
 * 注意：由于浏览器限制，此方案需要用户授权音频捕获权限
 * 备选方案：使用 TTS API 生成音频文件，然后用 Web Audio API 播放
 * 
 * @deprecated 此文件目前未被使用，已改用串行播放策略（multiChannelVoiceService.ts）
 * 保留此文件仅作为未来可能的参考实现
 */

import { VoiceConfig } from '../types/card';
import { ChannelType } from '../types/channel';

// 声道配置
interface ChannelConfig {
  pan: number;  // 声道位置 (-1 到 1)
  volume: number;
  name: string;
}

const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  [ChannelType.PLAYER_0]: { pan: -0.7, volume: 1.0, name: '玩家0（左）' },
  [ChannelType.PLAYER_1]: { pan: 0.7, volume: 1.0, name: '玩家1（右）' },
  [ChannelType.PLAYER_2]: { pan: -0.5, volume: 1.0, name: '玩家2（左中）' },
  [ChannelType.PLAYER_3]: { pan: 0.5, volume: 1.0, name: '玩家3（右中）' },
  [ChannelType.PLAYER_4]: { pan: -0.3, volume: 1.0, name: '玩家4（左环绕）' },
  [ChannelType.PLAYER_5]: { pan: 0.3, volume: 1.0, name: '玩家5（右环绕）' },
  [ChannelType.PLAYER_6]: { pan: -0.15, volume: 1.0, name: '玩家6（左后）' },
  [ChannelType.PLAYER_7]: { pan: 0.15, volume: 1.0, name: '玩家7（右后）' },
  [ChannelType.ANNOUNCEMENT]: { pan: 0.0, volume: 1.2, name: '报牌（中央）' }
};

class WebAudioMultiChannelService {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelGains: Map<ChannelType, GainNode> = new Map();
  private channelPanners: Map<ChannelType, StereoPannerNode> = new Map();
  private activeSources: Map<ChannelType, AudioBufferSourceNode> = new Map();

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 创建主音量控制
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.audioContext.destination);

      // 为每个声道创建 GainNode 和 StereoPannerNode
      Object.keys(CHANNEL_CONFIGS).forEach((key) => {
        const channel = parseInt(key) as ChannelType;
        const config = CHANNEL_CONFIGS[channel];

        // 创建声道增益节点
        const gainNode = this.audioContext!.createGain();
        gainNode.gain.value = config.volume;

        // 创建立体声声像节点
        const pannerNode = this.audioContext!.createStereoPanner();
        pannerNode.pan.value = config.pan;

        // 连接：gain -> panner -> masterGain -> destination
        gainNode.connect(pannerNode);
        pannerNode.connect(this.masterGain!);

        this.channelGains.set(channel, gainNode);
        this.channelPanners.set(channel, pannerNode);
      });

      console.log('[WebAudioMultiChannel] Web Audio API 上下文已初始化');
    } catch (error) {
      console.error('[WebAudioMultiChannel] 无法初始化 Web Audio API:', error);
    }
  }

  /**
   * 使用 TTS API 生成音频，然后通过 Web Audio API 播放
   * 这是最实用的方案，不需要系统音频捕获权限
   */
  async speakWithTTS(
    text: string,
    voiceConfig?: VoiceConfig,
    channel: ChannelType = ChannelType.PLAYER_0
  ): Promise<void> {
    if (!this.audioContext) {
      console.warn('[WebAudioMultiChannel] AudioContext 未初始化，回退到 speechSynthesis');
      return this.fallbackToSpeechSynthesis(text, voiceConfig, channel);
    }

    try {
      // 方案1：使用浏览器的 speechSynthesis + MediaRecorder 捕获
      // 注意：这需要用户授权，且浏览器支持有限
      const audioBuffer = await this.captureSpeechSynthesis(text, voiceConfig);
      
      if (audioBuffer) {
        this.playAudioBuffer(audioBuffer, channel);
      } else {
        // 回退到普通 speechSynthesis
        this.fallbackToSpeechSynthesis(text, voiceConfig, channel);
      }
    } catch (error) {
      console.error('[WebAudioMultiChannel] TTS 生成失败，回退到 speechSynthesis:', error);
      this.fallbackToSpeechSynthesis(text, voiceConfig, channel);
    }
  }

  /**
   * 捕获 speechSynthesis 的音频输出
   * 注意：此方法需要系统音频捕获权限，且浏览器支持有限
   */
  private async captureSpeechSynthesis(
    text: string,
    voiceConfig?: VoiceConfig
  ): Promise<AudioBuffer | null> {
    // 由于浏览器限制，无法直接捕获 speechSynthesis 的输出
    // 这里返回 null，使用回退方案
    return null;
  }

  /**
   * 播放音频缓冲区到指定声道
   */
  private playAudioBuffer(audioBuffer: AudioBuffer, channel: ChannelType): void {
    if (!this.audioContext || !this.channelGains.has(channel)) {
      return;
    }

    // 停止该声道的当前播放
    this.stopChannel(channel);

    // 创建音频源
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // 连接到该声道的增益节点
    const gainNode = this.channelGains.get(channel)!;
    source.connect(gainNode);

    // 记录活动源
    this.activeSources.set(channel, source);

    // 播放
    source.start(0);

    // 播放完成后清理
    source.onended = () => {
      this.activeSources.delete(channel);
    };
  }

  /**
   * 回退到普通的 speechSynthesis（当前实现）
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

      // 设置语音参数
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
    const source = this.activeSources.get(channel);
    if (source) {
      try {
        source.stop();
      } catch (e) {
        // 可能已经停止
      }
      this.activeSources.delete(channel);
    }
  }

  /**
   * 停止所有声道
   */
  stop(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // 可能已经停止
      }
    });
    this.activeSources.clear();
    window.speechSynthesis.cancel();
  }

  /**
   * 设置声道音量
   */
  setChannelVolume(channel: ChannelType, volume: number): void {
    const gainNode = this.channelGains.get(channel);
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }

  /**
   * 设置声道声像位置
   */
  setChannelPan(channel: ChannelType, pan: number): void {
    const pannerNode = this.channelPanners.get(channel);
    if (pannerNode) {
      pannerNode.pan.value = Math.max(-1, Math.min(1, pan));
    }
  }
}

export const webAudioMultiChannelService = new WebAudioMultiChannelService();


/**
 * 多通道音频服务
 * 支持同时多人发声，异步TTS调用，优先级管理
 */

import { ChannelType } from '../../types/channel';
import { VoiceConfig } from '../../types/voice';
import { getSmartChannelScheduler, ChannelUsage, ChannelAllocation } from './smartChannelScheduler';
import { getTTSService, TTSOptions } from '../tts/ttsService';

interface ChannelConfig {
  pan: number;  // 声像位置 (-1 到 1)
  volume: number;  // 音量 (0 到 1)
  name: string;  // 声道名称
}

const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  [ChannelType.SYSTEM]: { pan: 0.0, volume: 1.2, name: '系统（专用）' },
  [ChannelType.PLAYER_1]: { pan: 0.7, volume: 1.0, name: '玩家声道1' },
  [ChannelType.PLAYER_2]: { pan: -0.5, volume: 1.0, name: '玩家声道2' },
  [ChannelType.PLAYER_3]: { pan: 0.5, volume: 1.0, name: '玩家声道3' },
  [ChannelType.PLAYER_4]: { pan: -0.3, volume: 1.0, name: '玩家声道4' },
  [ChannelType.PLAYER_5]: { pan: 0.3, volume: 1.0, name: '玩家声道5' },
  [ChannelType.PLAYER_6]: { pan: -0.15, volume: 1.0, name: '玩家声道6' },
  [ChannelType.PLAYER_7]: { pan: 0.15, volume: 1.0, name: '玩家声道7' }
};

interface PlayItem {
  text: string;
  voiceConfig?: VoiceConfig;
  channel: ChannelType;
  priority: number;  // 优先级：4=系统，3=对骂，2=事件，1=随机
  playerId?: number;
  audioBuffer?: AudioBuffer;
  resolve: () => void;
  reject: (error: Error) => void;
  events?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  };
  source?: AudioBufferSourceNode;
}

export class MultiChannelAudioService {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelGains: Map<ChannelType, GainNode> = new Map();
  private channelPanners: Map<ChannelType, StereoPannerNode> = new Map();

  // 当前正在播放的音频源（每个声道一个）
  private activeSources: Map<ChannelType, AudioBufferSourceNode> = new Map();

  // 每个声道的播放队列（按优先级排序）
  private channelQueues: Map<ChannelType, PlayItem[]> = new Map();

  // 智能通道调度器
  private channelScheduler = getSmartChannelScheduler();

  // TTS服务
  private ttsService = getTTSService();

  // 配置
  private maxConcurrentPlayers: number = 3;
  private enabled: boolean = true;
  private masterVolume: number = 1.0;
  private totalPlayers: number = 4;  // 总玩家数（用于智能调度）

  constructor() {
    this.initAudioContext();
    // 初始化时从设置中读取配置（如果可用）
    this.loadSettingsFromStore();
  }

  /**
   * 从设置Store加载配置（如果可用）
   */
  private async loadSettingsFromStore(): Promise<void> {
    try {
      // 动态导入settingsStore，避免循环依赖
      const { useSettingsStore } = await import('../../stores/settingsStore');
      const settingsStore = useSettingsStore();
      const voiceSettings = settingsStore.voicePlaybackSettings;

      // 应用设置
      this.updateConfig({
        enabled: voiceSettings.enabled,
        maxConcurrentPlayers: voiceSettings.maxConcurrentPlayers,
        masterVolume: voiceSettings.volume
      });
    } catch (error) {
      // 设置Store可能还未初始化，使用默认值
    }
  }

  /**
   * 初始化 Web Audio API
   */
  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // 创建主音量控制
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterVolume;
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
    } catch (error) {
    }
  }

  /**
   * 播放语音（异步TTS调用）
   */
  async speak(
    text: string,
    voiceConfig?: VoiceConfig,
    playerId?: number,
    priority: number = 1,
    events?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    if (!this.enabled || !this.audioContext) {
      const error = new Error('多通道音频服务未启用');
      events?.onError?.(error);
      return Promise.reject(error);
    }

    return new Promise(async (resolve, reject) => {
      try {
        // 1. 确定通道用途和分配通道
        const usage: ChannelUsage = priority === 4 ? ChannelUsage.SYSTEM : ChannelUsage.PLAYER;
        const allocation = this.channelScheduler.allocateChannel({
          usage,
          playerId,
          priority
        });

        const channel = allocation.channel;

        // 2. 异步生成TTS音频
        let audioBuffer: AudioBuffer | null = null;
        try {
          const ttsOptions: TTSOptions = {
            lang: voiceConfig?.lang as any || 'zh',
            voiceConfig,
            useCache: true
          };

          const ttsResult = await this.ttsService.synthesize(text, ttsOptions, channel);

          // 将ArrayBuffer转换为AudioBuffer
          try {
            audioBuffer = await this.audioContext!.decodeAudioData(ttsResult.audioBuffer.slice(0));
          } catch (decodeError) {
            throw decodeError;
          }
        } catch (error) {
          this.channelScheduler.releaseChannel(channel, playerId);
          const ttsError = new Error(`TTS生成失败: ${error}`);
          events?.onError?.(ttsError);
          reject(ttsError);
          return;
        }

        if (!audioBuffer) {
          this.channelScheduler.releaseChannel(channel, playerId);
          const error = new Error('音频生成失败');
          events?.onError?.(error);
          reject(error);
          return;
        }

        // 3. 创建播放项
        const playItem: PlayItem = {
          text,
          voiceConfig,
          channel,
          priority,
          playerId,
          audioBuffer,
          resolve: () => {
            this.channelScheduler.releaseChannel(channel, playerId);
            resolve();
          },
          reject: (error) => {
            this.channelScheduler.releaseChannel(channel, playerId);
            reject(error);
          },
          events
        };

        // 4. 如果通道空闲，立即播放；否则加入队列
        if (!allocation.isQueued && !this.activeSources.has(channel)) {
          this.playAudio(playItem);
        } else {
          this.addToChannelQueue(playItem);
        }
      } catch (error) {
        events?.onError?.(error as Error);
        reject(error);
      }
    });
  }

  /**
   * 播放音频
   */
  private playAudio(item: PlayItem): void {
    if (!this.audioContext || !item.audioBuffer) {
      const error = new Error('AudioContext或音频数据不可用');
      item.reject(error);
      return;
    }

    const channel = item.channel;
    const config = CHANNEL_CONFIGS[channel];

    // 检查AudioContext状态
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        // 递归调用，重新播放
        this.playAudio(item);
      }).catch(err => {
        item.reject(err);
      });
      return;
    }


    // 创建音频源
    const source = this.audioContext.createBufferSource();
    source.buffer = item.audioBuffer;

    // 获取声道节点
    const gainNode = this.channelGains.get(channel);
    const pannerNode = this.channelPanners.get(channel);

    if (!gainNode || !pannerNode) {
      const error = new Error(`声道 ${channel} 的节点不存在`);
      item.reject(error);
      return;
    }

    // 设置音量（考虑voiceConfig中的音量）
    const volume = (item.voiceConfig?.volume ?? 1.0) * config.volume * this.masterVolume;
    gainNode.gain.value = volume;

    // 连接音频节点
    source.connect(gainNode);

    // 保存音频源
    item.source = source;
    this.activeSources.set(channel, source);

    // 设置事件监听
    source.onended = () => {
      this.activeSources.delete(channel);

      // 先释放声道（通知调度器声道已释放）
      const playerId = item.playerId;
      this.channelScheduler.releaseChannel(channel, playerId);

      item.events?.onEnd?.();
      item.resolve();

      // 处理队列中的下一个（会减少队列长度）
      this.processNextInQueue(channel);
    };

    // 开始播放
    try {
      source.start(0);
      item.events?.onStart?.();
    } catch (error) {
      this.activeSources.delete(channel);
      item.reject(error as Error);
      item.events?.onError?.(error as Error);
    }
  }

  /**
   * 添加到声道队列
   */
  private addToChannelQueue(item: PlayItem): void {
    const queue = this.channelQueues.get(item.channel) || [];

    // 按优先级插入（优先级高的在前）
    let insertIndex = queue.findIndex(q => q.priority < item.priority);
    if (insertIndex === -1) {
      insertIndex = queue.length;
    }

    queue.splice(insertIndex, 0, item);
    this.channelQueues.set(item.channel, queue);
  }

  /**
   * 处理队列中的下一个
   */
  private processNextInQueue(channel: ChannelType): void {
    const queue = this.channelQueues.get(channel) || [];

    if (queue.length === 0) {
      return;
    }

    // 取出优先级最高的
    const nextItem = queue.shift()!;
    this.channelQueues.set(channel, queue);

    // 通知调度器队列长度已减少（因为从队列中取出了一个项目）
    // 注意：这里直接访问调度器的内部状态来减少队列长度，不调用releaseChannel
    // 因为releaseChannel会释放声道，但这里只是从队列中取出，声道还在使用中
    const scheduler = this.channelScheduler as any;
    const state = scheduler.getChannelState(channel);
    if (state && state.queueLength > 0) {
      state.queueLength--;
    }

    // 播放
    this.playAudio(nextItem);
  }

  /**
   * 停止指定声道的播放
   */
  stopChannel(channel: ChannelType): void {
    const source = this.activeSources.get(channel);
    if (source) {
      try {
        source.stop();
      } catch (error) {
        // 忽略已停止的错误
      }
      this.activeSources.delete(channel);
    }

    // 清空队列
    const queue = this.channelQueues.get(channel) || [];
    queue.forEach(item => {
      item.reject(new Error('播放被中断'));
      item.events?.onError?.(new Error('播放被中断'));
    });
    this.channelQueues.set(channel, []);
  }

  /**
   * 直接播放AudioBuffer（用于已生成的音频）
   */
  async playAudioBuffer(
    audioBuffer: AudioBuffer,
    channel: ChannelType,
    priority: number = 1,
    events?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    if (!this.enabled || !this.audioContext) {
      const error = new Error('多通道音频服务未启用');
      events?.onError?.(error);
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      try {
        // 如果明确指定了channel，直接使用（不重新分配）
        // 系统声音使用SYSTEM专用声道，聊天使用玩家声道（智能调度）
        let finalChannel = channel;
        let allocation;
        let playerIdForRelease: number | undefined = undefined;  // 用于释放声道的playerId

        if (channel === ChannelType.SYSTEM) {
          // 系统声道（报牌等），使用SYSTEM用途
          // 系统声道专用，永远不与其他声道冲突
          allocation = this.channelScheduler.allocateChannel({
            usage: ChannelUsage.SYSTEM,
            priority
          });
          finalChannel = allocation.channel;
        } else {
          // 玩家声道（聊天），使用PLAYER用途，智能调度
          // 从channel反推playerId（用于玩家声道分配）
          const playerId = channel - ChannelType.PLAYER_1;
          playerIdForRelease = playerId >= 0 && playerId < 7 ? playerId : undefined;
          // 获取总玩家数（用于智能调度）
          const totalPlayers = this.getTotalPlayers();
          allocation = this.channelScheduler.allocateChannel({
            usage: ChannelUsage.PLAYER,
            playerId: playerIdForRelease,
            priority,
            totalPlayers
          });
          // 如果分配器返回了不同的声道（智能调度），使用分配的声道
          if (allocation.channel !== channel && !allocation.isQueued) {
            finalChannel = allocation.channel;
            // 如果声道改变了，需要重新计算playerId
            const newPlayerId = finalChannel - ChannelType.PLAYER_1;
            playerIdForRelease = newPlayerId >= 0 && newPlayerId < 7 ? newPlayerId : undefined;
          }
        }

        // 创建播放项
        const playItem: PlayItem = {
          text: '',  // 不需要文本
          channel: finalChannel,
          priority,
          audioBuffer,
          playerId: playerIdForRelease,  // 保存playerId用于释放
          resolve: () => {
            // 注意：实际的释放会在onended回调中进行
            resolve();
          },
          reject: (error) => {
            // 播放失败时也需要释放声道
            this.channelScheduler.releaseChannel(finalChannel, playerIdForRelease);
            reject(error);
          },
          events
        };

        // 如果通道空闲，立即播放；否则加入队列
        if (!allocation.isQueued && !this.activeSources.has(finalChannel)) {
          this.playAudio(playItem);
        } else {
          this.addToChannelQueue(playItem);
        }
      } catch (error) {
        events?.onError?.(error as Error);
        reject(error);
      }
    });
  }

  /**
   * 获取AudioContext（用于外部解码音频）
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * 停止所有播放
   */
  stopAll(): void {
    this.activeSources.forEach((source, channel) => {
      try {
        source.stop();
      } catch (error) {
        // 忽略已停止的错误
      }
    });
    this.activeSources.clear();

    // 清空所有队列
    this.channelQueues.forEach((queue) => {
      queue.forEach(item => {
        item.reject(new Error('播放被中断'));
        item.events?.onError?.(new Error('播放被中断'));
      });
    });
    this.channelQueues.clear();
  }

  /**
   * 更新配置
   */
  updateConfig(config: {
    enabled?: boolean;
    maxConcurrentPlayers?: number;
    masterVolume?: number;
  }): void {
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }
    if (config.maxConcurrentPlayers !== undefined) {
      // 限制在1-7之间（7个玩家声道）
      const maxPlayers = Math.max(1, Math.min(7, config.maxConcurrentPlayers));
      this.maxConcurrentPlayers = maxPlayers;
      this.channelScheduler.setMaxConcurrentPlayers(maxPlayers);
    }
    if (config.masterVolume !== undefined) {
      this.masterVolume = Math.max(0, Math.min(1, config.masterVolume));
      if (this.masterGain) {
        this.masterGain.gain.value = this.masterVolume;
      }
    }
  }

  /**
   * 获取总玩家数（用于智能调度）
   */
  getTotalPlayers(): number {
    return this.totalPlayers;
  }

  /**
   * 更新总玩家数（用于智能调度）
   */
  updateTotalPlayers(totalPlayers: number): void {
    this.totalPlayers = totalPlayers;
    this.channelScheduler.updateTotalPlayers(totalPlayers);
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    return {
      enabled: this.enabled,
      maxConcurrentPlayers: this.maxConcurrentPlayers,
      totalPlayers: this.totalPlayers,
      activeChannels: this.activeSources.size,
      totalQueueLength: Array.from(this.channelQueues.values())
        .reduce((sum, queue) => sum + queue.length, 0),
      channelStates: this.channelScheduler.getAllChannelStates(),
      schedulerStats: this.channelScheduler.getStatistics()
    };
  }
}

// 单例实例
let multiChannelAudioServiceInstance: MultiChannelAudioService | null = null;

/**
 * 获取多通道音频服务单例
 */
export function getMultiChannelAudioService(): MultiChannelAudioService {
  if (!multiChannelAudioServiceInstance) {
    multiChannelAudioServiceInstance = new MultiChannelAudioService();
  }
  return multiChannelAudioServiceInstance;
}


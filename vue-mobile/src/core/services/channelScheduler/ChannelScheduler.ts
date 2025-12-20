// @ts-nocheck
/**
 * 声道调度器核心类
 * 统一管理所有声道的分配、优先级和播放控制
 */

import { ChannelType } from '../../types/channel';
import {
  PlayRequest,
  ChannelStatus,
  ChannelState,
  ChannelSchedulerConfig,
  DEFAULT_CHANNEL_SCHEDULER_CONFIG,
  PlaybackPriority,
  PlaybackType
} from './types';
import { ChannelAllocator } from './ChannelAllocator';
import { InterruptManager } from './InterruptManager';
import { PlaybackController } from './PlaybackController';

/**
 * 声道调度器类
 */
export class ChannelScheduler {
  private config: ChannelSchedulerConfig;
  private allocator: ChannelAllocator;
  private interruptManager: InterruptManager;
  private playbackController: PlaybackController;

  // 所有声道的状态（玩家通道和报牌通道完全隔离）
  private playerChannelStates: Map<ChannelType, ChannelState> = new Map();
  private announcementChannelState: ChannelState;

  constructor(config: ChannelSchedulerConfig = DEFAULT_CHANNEL_SCHEDULER_CONFIG) {
    this.config = config;
    this.allocator = new ChannelAllocator(config);
    this.interruptManager = new InterruptManager(this.allocator);
    this.playbackController = new PlaybackController(this.allocator);

    // 初始化通道状态
    this.initializeChannels();

    // 设置中断回调
    this.interruptManager.setInterruptCallback((channel) => {
      const state = this.getChannelState(channel);
      if (state) {
        this.playbackController.interrupt(channel, state);
      }
    });

    // 设置播放回调
    this.playbackController.setCallbacks({
      onEnd: (channel, request) => {
        this.processNextInQueue(channel);
      }
    });
  }

  /**
   * 初始化通道状态
   */
  private initializeChannels(): void {
    // 初始化玩家聊天通道（4个）
    const playerChannels = this.allocator.getAllPlayerChannels();
    for (const channel of playerChannels) {
      this.playerChannelStates.set(channel, {
        channel,
        isPlaying: false,
        queue: [],
        lastPlayTime: 0
      });
    }

    // 初始化报牌通道（独立）
    this.announcementChannelState = {
      channel: this.allocator.getAnnouncementChannel(),
      isPlaying: false,
      queue: [],
      lastPlayTime: 0
    };
  }

  /**
   * 获取通道状态
   * @param channel 通道
   * @returns 通道状态
   */
  private getChannelState(channel: ChannelType): ChannelState | undefined {
    if (this.allocator.isAnnouncementChannel(channel)) {
      return this.announcementChannelState;
    } else if (this.allocator.isPlayerChannel(channel)) {
      return this.playerChannelStates.get(channel);
    }
    return undefined;
  }

  /**
   * 获取所有通道状态（用于中断管理器）
   * @returns 所有通道状态
   */
  private getAllChannelStates(): Map<ChannelType, ChannelState> {
    const allStates = new Map<ChannelType, ChannelState>();
    
    // 添加玩家通道状态
    this.playerChannelStates.forEach((state, channel) => {
      allStates.set(channel, state);
    });
    
    // 添加报牌通道状态
    allStates.set(this.announcementChannelState.channel, this.announcementChannelState);
    
    return allStates;
  }

  /**
   * 请求播放
   * @param request 播放请求
   * @returns Promise<void> 播放完成时resolve
   */
  async requestPlay(request: PlayRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      // 创建带resolve/reject的请求
      const requestWithCallbacks: PlayRequest = {
        ...request,
        events: {
          ...request.events,
          onEnd: () => {
            if (request.events?.onEnd) {
              request.events.onEnd();
            }
            resolve();
          },
          onError: (error: Error) => {
            if (request.events?.onError) {
              request.events.onError(error);
            }
            reject(error);
          }
        }
      };

      // 根据类型处理
      if (request.type === 'announcement') {
        this.handleAnnouncementRequest(requestWithCallbacks);
      } else if (request.type === 'chat') {
        this.handleChatRequest(requestWithCallbacks);
      } else {
        reject(new Error(`未知的播放类型: ${request.type}`));
      }
    });
  }

  /**
   * 处理报牌请求
   * @param request 播放请求
   */
  private handleAnnouncementRequest(request: PlayRequest): void {
    const state = this.announcementChannelState;

    // 报牌通道完全独立，不与其他通道共享资源
    // 报牌和聊天使用不同通道，可以同时播放，不需要中断聊天
    
    // 1. 如果配置了中断聊天（默认false），则中断所有玩家聊天通道
    // 注意：根据设计，报牌和聊天应该可以同时播放，所以默认不中断
    if (this.config.announcementInterruptsChat) {
      this.interruptManager.interruptPlayerChannelsForAnnouncement(this.getAllChannelStates());
    }

    // 2. 处理报牌通道的队列
    if (state.isPlaying) {
      // 如果报牌通道正在播放，替换当前播放（后一个替换前一个）
      this.playbackController.interrupt(state.channel, state);
    }

    // 3. 立即播放报牌（与聊天通道并行，不互相影响）
    this.playbackController.play(request, state).catch((error) => {
    });
  }

  /**
   * 处理聊天请求
   * @param request 播放请求
   */
  private handleChatRequest(request: PlayRequest): void {
    if (request.playerId === undefined) {
      return;
    }

    // 1. 获取玩家对应的声道（4个玩家共享4个通道）
    const preferredChannel = this.allocator.getPlayerChannel(request.playerId);
    const state = this.playerChannelStates.get(preferredChannel);

    if (!state) {
      return;
    }

    // 2. 检查声道是否正在播放
    if (state.isPlaying) {
      // 如果正在播放，检查是否是同一玩家
      if (state.currentPlayerId === request.playerId) {
        // 同一玩家的多个聊天请求，加入该声道的队列
        this.addToChannelQueue(state, request);
      } else {
        // 不同玩家，尝试分配其他可用通道
        const availableChannel = this.findAvailableChannel(request.playerId);
        if (availableChannel !== null) {
          const availableState = this.playerChannelStates.get(availableChannel);
          if (availableState) {
            this.playbackController.play(request, availableState).catch((error) => {
            });
          }
        } else {
          // 所有通道都被占用，加入首选通道的队列
          this.addToChannelQueue(state, request);
        }
      }
    } else {
      // 如果空闲，立即播放
      this.playbackController.play(request, state).catch((error) => {
      });
    }
  }

  /**
   * 查找可用通道
   * @param playerId 玩家ID
   * @returns 可用通道，如果没有则返回null
   */
  private findAvailableChannel(playerId: number): ChannelType | null {
    // 优先使用玩家ID对应的通道
    const preferredChannel = this.allocator.getPlayerChannel(playerId);
    const preferredState = this.playerChannelStates.get(preferredChannel);
    if (preferredState && !preferredState.isPlaying) {
      return preferredChannel;
    }

    // 如果首选通道被占用，查找其他可用通道
    const playerChannels = this.allocator.getAllPlayerChannels();
    for (const channel of playerChannels) {
      const state = this.playerChannelStates.get(channel);
      if (state && !state.isPlaying) {
        return channel;
      }
    }

    // 所有通道都被占用，返回null（需要排队）
    return null;
  }

  /**
   * 添加到通道队列
   * @param state 通道状态
   * @param request 播放请求
   */
  private addToChannelQueue(state: ChannelState, request: PlayRequest): void {
    if (state.queue.length >= this.config.maxQueueLength) {
      return;
    }

    state.queue.push(request);
    // 按优先级排序（优先级高的在前）
    state.queue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 处理队列中的下一个请求
   * @param channel 通道
   */
  private processNextInQueue(channel: ChannelType): void {
    const state = this.getChannelState(channel);
    if (!state) {
      return;
    }

    // 如果队列中有请求，处理下一个
    if (state.queue.length > 0) {
      const nextRequest = state.queue.shift()!;
      this.playbackController.play(nextRequest, state).catch((error) => {
        // 播放失败，继续处理下一个
        this.processNextInQueue(channel);
      });
    }
  }

  /**
   * 中断播放
   * @param channel 要中断的声道（可选，不传则中断所有）
   * @param exceptChannels 排除的声道（不中断这些声道）
   */
  interrupt(channel?: ChannelType, exceptChannels: ChannelType[] = []): void {
    if (channel !== undefined) {
      // 中断指定通道
      if (!exceptChannels.includes(channel)) {
        const state = this.getChannelState(channel);
        if (state) {
          this.playbackController.interrupt(channel, state);
        }
      }
    } else {
      // 中断所有通道（除了排除的）
      const allStates = this.getAllChannelStates();
      allStates.forEach((state, ch) => {
        if (!exceptChannels.includes(ch)) {
          this.playbackController.interrupt(ch, state);
        }
      });
    }
  }

  /**
   * 检查声道是否正在播放
   * @param channel 声道
   * @returns 是否正在播放
   */
  isChannelPlaying(channel: ChannelType): boolean {
    const state = this.getChannelState(channel);
    return state?.isPlaying ?? false;
  }

  /**
   * 获取声道状态
   * @param channel 声道（可选，不传则返回所有声道状态）
   * @returns 声道状态
   */
  getChannelStatus(channel?: ChannelType): ChannelStatus | Map<ChannelType, ChannelStatus> {
    if (channel !== undefined) {
      const state = this.getChannelState(channel);
      if (!state) {
        throw new Error(`通道 ${channel} 不存在`);
      }
      return this.stateToStatus(state);
    } else {
      // 返回所有通道状态
      const allStatuses = new Map<ChannelType, ChannelStatus>();
      
      // 添加玩家通道状态
      this.playerChannelStates.forEach((state, ch) => {
        allStatuses.set(ch, this.stateToStatus(state));
      });
      
      // 添加报牌通道状态
      allStatuses.set(
        this.announcementChannelState.channel,
        this.stateToStatus(this.announcementChannelState)
      );
      
      return allStatuses;
    }
  }

  /**
   * 将内部状态转换为公开状态
   * @param state 内部状态
   * @returns 公开状态
   */
  private stateToStatus(state: ChannelState): ChannelStatus {
    return {
      channel: state.channel,
      isPlaying: state.isPlaying,
      currentText: state.currentRequest?.text,
      currentPlayerId: state.currentPlayerId,
      queueLength: state.queue.length,
      priority: state.currentRequest?.priority ?? PlaybackPriority.CHAT
    };
  }

  /**
   * 获取玩家对应的声道
   * @param playerId 玩家ID
   * @returns 声道类型
   */
  getPlayerChannel(playerId: number): ChannelType {
    return this.allocator.getPlayerChannel(playerId);
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<ChannelSchedulerConfig>): void {
    this.config = { ...this.config, ...config };
    this.allocator.updateConfig(this.config);
  }
}

// @ts-nocheck

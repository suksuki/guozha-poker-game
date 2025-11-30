/**
 * 中断管理器
 * 负责处理播放中断策略
 */

import { ChannelType } from '../../types/channel';
import { ChannelAllocator } from './ChannelAllocator';
import { ChannelState } from './types';

/**
 * 中断回调类型
 */
export type InterruptCallback = (channel: ChannelType) => void;

/**
 * 中断管理器类
 */
export class InterruptManager {
  private allocator: ChannelAllocator;
  private interruptCallback?: InterruptCallback;

  constructor(allocator: ChannelAllocator) {
    this.allocator = allocator;
  }

  /**
   * 设置中断回调
   * @param callback 中断回调函数
   */
  setInterruptCallback(callback: InterruptCallback): void {
    this.interruptCallback = callback;
  }

  /**
   * 报牌中断所有玩家聊天（但不影响报牌通道本身）
   * @param channelStates 所有通道状态
   */
  interruptPlayerChannelsForAnnouncement(channelStates: Map<ChannelType, ChannelState>): void {
    // 只中断玩家聊天通道（PLAYER_0 到 PLAYER_3，共4个通道）
    // 报牌通道（ANNOUNCEMENT）不受影响
    const playerChannels = this.allocator.getAllPlayerChannels();
    
    for (const channel of playerChannels) {
      const state = channelStates.get(channel);
      if (state && state.isPlaying) {
        this.interruptChannel(channel);
      }
    }
  }

  /**
   * 中断指定玩家声道
   * @param channel 声道
   */
  interruptPlayerChannel(channel: ChannelType): void {
    // 只处理玩家聊天通道（0-3）
    if (this.allocator.isPlayerChannel(channel)) {
      this.interruptChannel(channel);
    }
  }

  /**
   * 中断报牌通道（仅用于内部管理）
   * @param channelStates 所有通道状态
   */
  interruptAnnouncementChannel(channelStates: Map<ChannelType, ChannelState>): void {
    const announcementChannel = this.allocator.getAnnouncementChannel();
    const state = channelStates.get(announcementChannel);
    if (state && state.isPlaying) {
      this.interruptChannel(announcementChannel);
    }
  }

  /**
   * 中断所有玩家声道（报牌通道不受影响）
   * @param channelStates 所有通道状态
   */
  interruptAllPlayerChannels(channelStates: Map<ChannelType, ChannelState>): void {
    // 只中断玩家聊天通道（0-3，共4个通道）
    const playerChannels = this.allocator.getAllPlayerChannels();
    
    for (const channel of playerChannels) {
      const state = channelStates.get(channel);
      if (state && state.isPlaying) {
        this.interruptChannel(channel);
      }
    }
  }

  /**
   * 中断指定通道（内部方法）
   * @param channel 声道
   */
  private interruptChannel(channel: ChannelType): void {
    if (this.interruptCallback) {
      this.interruptCallback(channel);
    }
  }
}


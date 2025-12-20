// @ts-nocheck
/**
 * 播放控制器
 * 负责实际播放逻辑的调用和管理
 */

import { ChannelType } from '../../types/channel';
import { PlayRequest, ChannelState, PlaybackPriority } from './types';
import { ChannelAllocator } from './ChannelAllocator';
import { ttsAudioService } from '../ttsAudioService';

/**
 * 播放回调类型
 */
export interface PlaybackCallbacks {
  onStart?: (channel: ChannelType, request: PlayRequest) => void;
  onEnd?: (channel: ChannelType, request: PlayRequest) => void;
  onError?: (channel: ChannelType, request: PlayRequest, error: Error) => void;
  onInterrupt?: (channel: ChannelType) => void;
}

/**
 * 播放控制器类
 */
export class PlaybackController {
  private allocator: ChannelAllocator;
  private callbacks?: PlaybackCallbacks;

  constructor(allocator: ChannelAllocator) {
    this.allocator = allocator;
  }

  /**
   * 设置播放回调
   * @param callbacks 播放回调
   */
  setCallbacks(callbacks: PlaybackCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * 播放请求
   * @param request 播放请求
   * @param channelState 通道状态
   */
  async play(request: PlayRequest, channelState: ChannelState): Promise<void> {
    try {
      // 更新通道状态
      channelState.isPlaying = true;
      channelState.currentRequest = request;
      channelState.lastPlayTime = Date.now();
      if (request.playerId !== undefined) {
        channelState.currentPlayerId = request.playerId;
      }

      // 触发开始回调
      if (this.callbacks?.onStart) {
        this.callbacks.onStart(request.channel, request);
      }

      // 调用实际播放服务
      await ttsAudioService.speak(
        request.text,
        request.voiceConfig,
        request.channel,
        {
          onStart: request.events?.onStart,
          onEnd: () => {
            // 播放完成
            this.handlePlayEnd(request, channelState);
            if (request.events?.onEnd) {
              request.events.onEnd();
            }
          },
          onError: (error: Error) => {
            // 播放错误
            this.handlePlayError(request, channelState, error);
            if (request.events?.onError) {
              request.events.onError(error);
            }
          },
          estimatedDuration: request.events?.estimatedDuration
        },
        this.mapPriorityToNumber(request.priority)
      );
    } catch (error) {
      this.handlePlayError(request, channelState, error as Error);
      throw error;
    }
  }

  /**
   * 中断通道播放
   * @param channel 通道
   * @param channelState 通道状态
   */
  interrupt(channel: ChannelType, channelState: ChannelState): void {
    // 停止当前播放
    ttsAudioService.stopChannel(channel);

    // 更新状态
    channelState.isPlaying = false;
    channelState.currentRequest = undefined;
    channelState.currentPlayerId = undefined;

    // 触发中断回调
    if (this.callbacks?.onInterrupt) {
      this.callbacks.onInterrupt(channel);
    }
  }

  /**
   * 处理播放完成
   * @param request 播放请求
   * @param channelState 通道状态
   */
  private handlePlayEnd(request: PlayRequest, channelState: ChannelState): void {
    // 更新状态
    channelState.isPlaying = false;
    channelState.currentRequest = undefined;
    channelState.currentPlayerId = undefined;

    // 触发结束回调
    if (this.callbacks?.onEnd) {
      this.callbacks.onEnd(request.channel, request);
    }
  }

  /**
   * 处理播放错误
   * @param request 播放请求
   * @param channelState 通道状态
   * @param error 错误
   */
  private handlePlayError(
    request: PlayRequest,
    channelState: ChannelState,
    error: Error
  ): void {
    // 更新状态
    channelState.isPlaying = false;
    channelState.currentRequest = undefined;
    channelState.currentPlayerId = undefined;

    // 触发错误回调
    if (this.callbacks?.onError) {
      this.callbacks.onError(request.channel, request, error);
    }
  }

  /**
   * 将优先级枚举转换为数字
   * @param priority 优先级
   * @returns 优先级数字
   */
  private mapPriorityToNumber(priority: PlaybackPriority): number {
    switch (priority) {
      case PlaybackPriority.ANNOUNCEMENT:
        return 4; // 报牌最高优先级
      case PlaybackPriority.QUARREL:
        return 3; // 对骂
      case PlaybackPriority.EVENT:
        return 2; // 事件
      case PlaybackPriority.CHAT:
        return 1; // 聊天
      default:
        return 1;
    }
  }
}
// @ts-nocheck

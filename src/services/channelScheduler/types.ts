/**
 * 声道调度器类型定义
 */

import { ChannelType } from '../../types/channel';
import { VoiceConfig } from '../../types/card';

/**
 * 播放优先级
 */
export enum PlaybackPriority {
  ANNOUNCEMENT = 10,    // 报牌：最高优先级，可以中断所有其他播放
  QUARREL = 3,          // 对骂：高优先级
  EVENT = 2,            // 事件：中优先级
  CHAT = 1              // 聊天：普通优先级
}

/**
 * 播放类型
 */
export type PlaybackType = 'announcement' | 'chat';

/**
 * 播放请求
 */
export interface PlayRequest {
  text: string;
  voiceConfig?: VoiceConfig;
  channel: ChannelType;              // 目标声道
  priority: PlaybackPriority;        // 优先级
  type: PlaybackType;                // 播放类型
  playerId?: number;                  // 玩家ID（聊天时使用）
  events?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
    estimatedDuration?: number;
  };
}

/**
 * 声道状态
 */
export interface ChannelStatus {
  channel: ChannelType;
  isPlaying: boolean;
  currentText?: string;
  currentPlayerId?: number;          // 当前播放的玩家ID（聊天时）
  queueLength: number;
  priority: PlaybackPriority;
}

/**
 * 声道状态（内部使用）
 */
export interface ChannelState {
  channel: ChannelType;
  isPlaying: boolean;
  currentRequest?: PlayRequest;
  queue: PlayRequest[];
  lastPlayTime: number;
  currentPlayerId?: number;           // 当前播放的玩家ID（聊天时）
}

/**
 * 声道调度器配置
 */
export interface ChannelSchedulerConfig {
  // 是否启用多声道并发播放
  enableConcurrentPlayback: boolean;

  // 每个声道的最大队列长度
  maxQueueLength: number;

  // 报牌是否中断聊天
  announcementInterruptsChat: boolean;

  // 玩家聊天通道数量（固定4个）
  chatChannelCount: number;
}

/**
 * 默认配置
 */
export const DEFAULT_CHANNEL_SCHEDULER_CONFIG: ChannelSchedulerConfig = {
  enableConcurrentPlayback: true,
  maxQueueLength: 10,
  announcementInterruptsChat: false, // 报牌和聊天使用不同通道，可以同时播放，不需要中断
  chatChannelCount: 4
};


/**
 * 声道调度器模块
 * 统一管理所有声道的分配、优先级和播放控制
 */

export { ChannelScheduler } from './ChannelScheduler';
export { ChannelAllocator } from './ChannelAllocator';
export { InterruptManager } from './InterruptManager';
export { PlaybackController } from './PlaybackController';

export type {
  PlayRequest,
  ChannelStatus,
  ChannelState,
  ChannelSchedulerConfig,
  PlaybackPriority,
  PlaybackType
} from './types';

export {
  DEFAULT_CHANNEL_SCHEDULER_CONFIG,
  PlaybackPriority
} from './types';


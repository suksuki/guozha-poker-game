/**
 * 音频模块导出
 */

export { AudioMixer, getAudioMixer, type RoleAudioNodes, type PlayOptions } from './AudioMixer';
export {
  DialogueScheduler,
  type Utter,
  type Priority,
  type Language,
  type DialogueSchedulerConfig,
} from './DialogueScheduler';
export {
  useAudioRoom,
  type UseAudioRoomConfig,
  type UseAudioRoomReturn,
} from './useAudioRoom';

export {
  GameAudioIntegration,
  getGameAudioIntegration,
  type GameAudioConfig,
  type GameAudioEvent,
} from './GameAudioIntegration';

export {
  AudioPreloader,
  getAudioPreloader,
  preloadCommonAudio,
  COMMON_GAME_PHRASES,
  type PreloadItem,
} from './audioPreloader';

export {
  SegmentedPlayback,
  type SegmentedPlaybackConfig,
  type SegmentedPlaybackResult,
} from './SegmentedPlayback';

export {
  InterruptionManager,
  getInterruptionManager,
  type InterruptionConfig,
} from './InterruptionManager';


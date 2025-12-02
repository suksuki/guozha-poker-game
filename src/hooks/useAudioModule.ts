/**
 * 音频模块 React Hook
 */

import { useSystemApplication } from './useSystemApplication';
import { AudioModule } from '../services/system/modules/audio/AudioModule';
import type { Play, VoiceConfig } from '../types/card';

export interface UseAudioModuleReturn {
  audioModule: AudioModule | null;
  isReady: boolean;
  announcePlay: (play: Play, voiceConfig?: VoiceConfig, onStart?: () => void) => Promise<void>;
  announcePass: (voiceConfig?: VoiceConfig, onStart?: () => void) => Promise<void>;
  preloadSounds: () => Promise<void>;
  playSound: (soundName: string, volume?: number) => void;
}

/**
 * 使用音频模块
 */
export function useAudioModule(): UseAudioModuleReturn {
  const { getModule, isInitialized } = useSystemApplication();
  const audioModule = getModule<AudioModule>('audio');
  const isReady = isInitialized && !!audioModule;
  
  const announcePlay = async (play: Play, voiceConfig?: VoiceConfig, onStart?: () => void) => {
    if (audioModule && isReady) {
      return audioModule.announcePlay(play, voiceConfig, onStart);
    } else {
      // 如果音频模块未初始化，直接调用 systemAnnouncementService
      const { announcePlay: systemAnnouncePlay } = await import('../services/systemAnnouncementService');
      return systemAnnouncePlay(play, voiceConfig, onStart);
    }
  };
  
  const announcePass = async (voiceConfig?: VoiceConfig, onStart?: () => void) => {
    if (audioModule && isReady) {
      return audioModule.announcePass(voiceConfig, onStart);
    }
  };
  
  const preloadSounds = async () => {
    if (audioModule && isReady) {
      return audioModule.preloadSounds();
    }
  };
  
  const playSound = (soundName: string, volume: number = 1.0) => {
    if (audioModule && isReady) {
      audioModule.playSound(soundName, volume);
    }
  };
  
  return {
    audioModule,
    isReady,
    announcePlay,
    announcePass,
    preloadSounds,
    playSound,
  };
}


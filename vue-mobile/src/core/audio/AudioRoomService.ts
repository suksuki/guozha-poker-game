/**
 * 音频房间服务
 * 整合 TTS 和多声道系统，提供完整的音频播放解决方案
 */

import { getTTSServiceManager, TTSOptions } from '../tts';
import { defaultSpeakerManager } from '../tts/speakers';
import { Utter, Priority, Language } from './DialogueScheduler';
import { useAudioRoom, UseAudioRoomReturn } from './useAudioRoom';

/**
 * 音频房间服务类
 * 提供高级 API，自动处理 TTS 生成和播放
 */
export class AudioRoomService {
  private audioRoom: UseAudioRoomReturn | null = null;
  private ttsManager = getTTSServiceManager();

  /**
   * 初始化音频房间
   */
  async init(config?: Parameters<typeof useAudioRoom>[0]): Promise<void> {
    // 注意：useAudioRoom 是 Hook，需要在 React 组件中使用
    // 这里提供一个服务类，但实际使用应该在组件中调用 useAudioRoom
  }

  /**
   * 让角色说话（自动生成 TTS 并播放）
   * @param roleId 角色ID
   * @param text 文本
   * @param options 选项
   */
  async speak(
    roleId: string,
    text: string,
    options: {
      priority?: Priority;
      civility?: number;
      lang?: Language;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<void> {
    if (!this.audioRoom) {
      throw new Error('音频房间未初始化，请在 React 组件中使用 useAudioRoom');
    }

    const {
      priority = 'NORMAL_CHAT',
      civility = 1,
      lang = 'zh',
      onStart,
      onEnd,
      onError,
    } = options;

    // 获取角色配置
    const speaker = defaultSpeakerManager.getSpeaker(roleId);
    if (!speaker) {
    }

    try {
      // 1. 生成 TTS 音频
      const ttsOptions: TTSOptions = {
        lang: lang === 'nanchang' ? 'nanchang' : lang,
        voiceConfig: speaker?.voiceConfig,
        useCache: true,
      };

      const ttsResult = await this.ttsManager.synthesize(text, ttsOptions);

      // 2. 提交到音频房间
      const utter: Utter = {
        roleId,
        text,
        priority,
        civility,
        lang,
        audioBuffer: ttsResult.audioBuffer,
        pan: speaker?.pan,
        volume: speaker?.volume,
        onStart,
        onEnd,
        onError,
      };

      this.audioRoom.submitUtter(utter);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (onError) {
        onError(err);
      }
      throw err;
    }
  }

  /**
   * 设置音频房间实例（由 React Hook 提供）
   */
  setAudioRoom(audioRoom: UseAudioRoomReturn): void {
    this.audioRoom = audioRoom;
  }

  /**
   * 停止所有播放
   */
  stopAll(): void {
    if (this.audioRoom) {
      this.audioRoom.stopAll();
    }
  }

  /**
   * 停止指定角色
   */
  stopRole(roleId: string): void {
    if (this.audioRoom) {
      this.audioRoom.stopRole(roleId);
    }
  }
}

// 单例实例
let audioRoomServiceInstance: AudioRoomService | null = null;

/**
 * 获取音频房间服务单例
 */
export function getAudioRoomService(): AudioRoomService {
  if (!audioRoomServiceInstance) {
    audioRoomServiceInstance = new AudioRoomService();
  }
  return audioRoomServiceInstance;
}

/**
 * React Hook：使用音频房间服务
 * 整合 TTS 和多声道系统
 */
export function useAudioRoomService(config?: Parameters<typeof import('./useAudioRoom').useAudioRoom>[0]) {
  // 动态导入避免循环依赖
  const { useAudioRoom } = require('./useAudioRoom');
  const React = require('react');
  
  const audioRoom = useAudioRoom(config);
  const service = getAudioRoomService();

  // 设置音频房间实例
  React.useEffect(() => {
    service.setAudioRoom(audioRoom);
  }, [audioRoom, service]);

  return {
    ...audioRoom,
    // 便捷方法：直接说话
    speak: async (
      roleId: string,
      text: string,
      options?: {
        priority?: Priority;
        civility?: number;
        lang?: Language;
        onStart?: () => void;
        onEnd?: () => void;
        onError?: (error: Error) => void;
      }
    ) => {
      return service.speak(roleId, text, options);
    },
  };
}

